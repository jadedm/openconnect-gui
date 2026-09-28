# Security

## Reporting a vulnerability

Report it privately through [GitHub's advisory form](https://github.com/jadedm/openconnect-gui/security/advisories/new). Do not open a public issue or Discussion for something that is not already listed below.

Include the release you downloaded, your macOS version, and the steps to reproduce.

## Supported versions

Only the latest release gets fixes. There are no backports.

## What the app does with your credentials and data

The app runs `openconnect` under `sudo`, so it handles two secrets: your macOS password (for `sudo`) and your VPN password.

- **macOS password.** Asked for on every connect (in a separate window) and every process kill and route delete (in a dialog inside the main window). It is never written to disk. After some failed kills or route deletes the dialog keeps it in memory and shows it filled in the next time it opens. The Logs tab records its length, so remove that line before sharing logs.
- **VPN password.** Typed into the Connection form. If you save a profile with the password filled in, it is written in plaintext to `profiles.json` in the app's folder under `~/Library/Application Support/` (`openconnect-gui` when running from source). Leave the field empty before saving to keep it out of the file.
- **Public IP lookup.** The app sends a request to api.ipify.org when it starts and whenever the connection status changes, to show your public IP.

## Protections in place

- The main window runs with context isolation and reaches the main process only through the functions in `preload.js`.
- Connection fields reach openconnect exactly as typed, one argument each; `npm run test:expect` checks this against hostile values.
- Process IDs must be numeric, and route destinations must be `default` or four dot-separated numbers with an optional prefix length, before they reach `sudo`.
- Most system commands run through `spawn()` with argument arrays. Four use `exec()` with a shell string: the process list, the routing table, the interface list and the OpenConnect installer launcher. The installer string includes the app's install path; none of them include anything you type.

## Known weaknesses

Each is a public issue labelled [`security`](https://github.com/jadedm/openconnect-gui/issues?q=is%3Aissue+label%3Asecurity).

| Issue | Weakness | Who can exploit it |
|---|---|---|
| [#4](https://github.com/jadedm/openconnect-gui/issues/4) | While connected, the macOS password, VPN username and VPN password are passed to the connection script as command-line arguments. `ps` shows them, and the installed app displays them in its own Processes tab. | Anyone with an account on the same Mac, or anyone who sees your screen while the Processes tab is open |
| [#6](https://github.com/jadedm/openconnect-gui/issues/6) | Saved VPN passwords are plaintext in `profiles.json`. | Anything that can read your home folder |
| [#12](https://github.com/jadedm/openconnect-gui/issues/12) | The splash, installer and sudo password windows run with Node.js access and without context isolation. | Code that gets into one of those pages |
