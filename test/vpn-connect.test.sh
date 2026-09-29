#!/bin/bash
# Runs vpn-connect.exp for real, with a fake `sudo` first on PATH.
# The fake records the exact arguments openconnect would receive and answers
# the sudo, username and password prompts. No root and no network needed.
#
# Usage: npm run test:expect

set -u

repo="$(cd "$(dirname "$0")/.." && pwd)"
script="$repo/vpn-connect.exp"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/bin"
cat > "$tmp/bin/sudo" <<'FAKE'
#!/bin/bash
# Stands in for `sudo -S <openconnect> <args...>`.
stty -echo 2>/dev/null
: > "$FAKE_OUT.argv"
for a in "$@"; do printf '%s\0' "$a" >> "$FAKE_OUT.argv"; done
if [ -z "${FAKE_SUDO_CACHED:-}" ]; then
  printf 'Password:'; IFS= read -r v; printf 'sudo:%s\n' "${v%$'\r'}" >> "$FAKE_OUT.input"
fi
printf 'Username:'; IFS= read -r v; printf 'user:%s\n' "${v%$'\r'}" >> "$FAKE_OUT.input"
printf 'Password:'; IFS= read -r v; printf 'vpn:%s\n' "${v%$'\r'}" >> "$FAKE_OUT.input"
echo "CONNECTED"
FAKE
chmod +x "$tmp/bin/sudo"

passed=0
failed=0

# Per-case settings; reset after every case.
sudo_pw=SUDOPW
vpn_user=alice
vpn_pw=VPNPW
cached=""
reset_settings() { sudo_pw=SUDOPW; vpn_user=alice; vpn_pw=VPNPW; cached=""; }

# run_case NAME OPENCONNECT_PATH ARG...
# Runs the script and checks that openconnect gets `-S`, the path and every
# ARG unchanged, one argument each, and that the prompts are answered in order.
run_case() {
  local name="$1"; shift
  local oc="$1"; shift
  local out="$tmp/$name"
  local log="$out.log"

  PATH="$tmp/bin:$PATH" FAKE_OUT="$out" FAKE_SUDO_CACHED="$cached" \
    expect "$script" "$oc" "$sudo_pw" "$vpn_user" "$vpn_pw" "$@" > "$log" 2>&1 &
  local pid=$!
  # Stop a hung run after 20 seconds. Polls instead of one long sleep, so no
  # stray sleep outlives the case and holds a piped test run open.
  local waited=0
  while kill -0 "$pid" 2>/dev/null && [ "$waited" -lt 200 ]; do
    sleep 0.1
    waited=$((waited + 1))
  done
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null

  local expected=(-S "$oc" "$@")
  local got=()
  if [ -f "$out.argv" ]; then
    while IFS= read -r -d '' a; do got+=("$a"); done < "$out.argv"
  fi

  local problem=""
  if [ "${#got[@]}" -ne "${#expected[@]}" ]; then
    problem="openconnect got ${#got[@]} arguments, expected ${#expected[@]}"
  else
    local i
    for i in "${!expected[@]}"; do
      [ "${got[$i]}" = "${expected[$i]}" ] && continue
      problem="argument $i is <${got[$i]}>, expected <${expected[$i]}>"
      break
    done
  fi

  local want_input="user:$vpn_user"$'\n'"vpn:$vpn_pw"
  [ -z "$cached" ] && want_input="sudo:$sudo_pw"$'\n'"$want_input"
  if [ -z "$problem" ] && [ "$(cat "$out.input" 2>/dev/null)" != "$want_input" ]; then
    problem="prompts answered as <$(cat "$out.input" 2>/dev/null | tr '\n' ' ')>"
  fi
  if [ -z "$problem" ] && ! grep -q "VPN connection established" "$log"; then
    problem="script did not reach the connected state"
  fi

  if [ -n "$problem" ]; then
    failed=$((failed + 1))
    echo "FAIL $name: $problem"
    [ "${#got[@]}" -gt 0 ] && printf '     got: %s\n' "$(printf '<%s> ' "${got[@]}")"
    reset_settings
    return
  fi
  passed=$((passed + 1))
  echo "PASS $name"
  reset_settings
}

oc=/opt/homebrew/bin/openconnect
base=(--reconnect-timeout 60 --dtls-ciphers DEFAULT)
server=--server=https://vpn.example.com

run_case benign "$oc" -s /opt/homebrew/etc/vpnc/vpnc-script --protocol=anyconnect "$server" "${base[@]}"

run_case space-in-server "$oc" --protocol=anyconnect "--server=https://vpn.example.com --script=/tmp/x.sh" "${base[@]}"

run_case command-substitution "$oc" --protocol=anyconnect "$server" --servercert "[exec touch $tmp/pwned]" "${base[@]}"
if [ -e "$tmp/pwned" ]; then
  failed=$((failed + 1))
  echo "FAIL command-substitution: the bracketed command ran"
fi

run_case variable-substitution "$oc" --protocol=anyconnect "$server" '--authgroup=$env(HOME)' "${base[@]}"

run_case quoting-characters "$oc" --protocol=anyconnect "$server" '--authgroup=a{b"c\d;e' "${base[@]}"

run_case space-in-path "$tmp/with space/openconnect" --protocol=anyconnect "$server" "${base[@]}"

run_case all-options "$oc" -s /opt/homebrew/etc/vpnc/vpnc-script --protocol=gp "$server" --servercert pin-sha256:abc= --authgroup=Staff "${base[@]}"

run_case literal-expand "$oc" --protocol=anyconnect "$server" --servercert '{*}$env(HOME)' "${base[@]}"

run_case newlines "$oc" --protocol=anyconnect "$server" $'--authgroup=a\nb' $'--servercert=c\\\nd' "${base[@]}"

run_case metachar-path "$tmp/br[a]ce\$x;{y/openconnect" --protocol=anyconnect "$server" "${base[@]}"

vpn_user=-alice; vpn_pw=-secret; sudo_pw=-sudo
run_case dash-credentials "$oc" --protocol=anyconnect "$server" "${base[@]}"

sudo_pw='s [pwd] $x {'; vpn_user='a b$[x]{y}\\'; vpn_pw='p w$env(HOME)[exec id]{"'
run_case tcl-in-credentials "$oc" --protocol=anyconnect "$server" "${base[@]}"

cached=1
run_case sudo-already-authenticated "$oc" --protocol=anyconnect "$server" "${base[@]}"

echo "$passed passed, $failed failed"
[ "$failed" -eq 0 ]
