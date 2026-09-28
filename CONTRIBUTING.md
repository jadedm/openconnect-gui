# Contributing

## Where things go

- **Bug:** open an [issue](https://github.com/jadedm/openconnect-gui/issues/new). Include your macOS version, Apple Silicon or Intel, OpenConnect version (`openconnect --version`), the protocol, and the relevant Logs tab lines with usernames, passwords and server names removed.
- **Security problem:** do not open an issue. Follow [SECURITY.md](SECURITY.md).
- **Idea or feature request:** start a Discussion in [Ideas](https://github.com/jadedm/openconnect-gui/discussions/categories/ideas), or upvote one that exists. Ideas become issues once there is a plan to build them.
- **Question about using the app:** ask in [Q&A](https://github.com/jadedm/openconnect-gui/discussions/categories/q-a).

Issues labelled [`good first issue`](https://github.com/jadedm/openconnect-gui/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are the easiest place to start.

## Set up

You need macOS, Node.js 22 (the exact version is in `.nvmrc`), npm, and OpenConnect (`brew install openconnect`). `expect` ships with macOS.

```bash
git clone https://github.com/jadedm/openconnect-gui.git
cd openconnect-gui
npm install        # also generates the menu bar icon
npm start          # Vite on http://localhost:5173 plus Electron
```

`npm start` hot-reloads the React side. Changes to `main.js`, `preload.js` or `vpn-connect.exp` need a restart. Main process logs print in the terminal you ran it from; open the window's developer tools with Cmd+Option+I.

## Build the DMG

```bash
npm run package                                        # this Mac's architecture, written to dist/
npm run build && npx electron-builder --mac dmg --x64  # Intel, from any Mac
```

`npm run package` builds for the architecture of the Mac it runs on. The Intel command needs `npm run build` first, because `electron-builder` on its own packages whatever is already in `dist/`.

The app icon is `build/icon.icns`, which `.gitignore` currently excludes, so a fresh clone builds without it ([#29](https://github.com/jadedm/openconnect-gui/issues/29)). The build config sets no signing identity, so the DMG is signed only if your keychain has a Developer ID certificate that `electron-builder` finds on its own.

Some behaviour differs between `npm start` and the packaged app, because packaged code loads `dist/pages/` and finds `vpn-connect.exp` under `process.resourcesPath`. Test anything touching startup, paths or the connection script in a packaged build too.

## How the app is put together

- `main.js` is the Electron main process: windows, the menu bar icon, startup checks, and every IPC handler (connect, disconnect, profiles, routes, processes, installer).
- `preload.js` is the bridge for the main window. A new IPC handler needs an entry here before the main window can call it. The splash, installer and password windows call `ipcRenderer` directly for now ([#12](https://github.com/jadedm/openconnect-gui/issues/12)).
- `src/` is the React UI. `pages/` holds four HTML entry points (main window, splash, installer helper, sudo password prompt), each mounting one component from `src/`.

### How a connection works

`main.js` builds the `openconnect` arguments from the form and asks for the sudo password in its own window (`pages/password-prompt.html`). It then runs `vpn-connect.exp`, an `expect` script that starts `sudo -S openconnect` in a pseudo-terminal and answers the sudo, username and password prompts in order.

The status badge turns Connected when OpenConnect's own output says `CONNECTED`, `Established` or `Configured as`. The script also prints `[EXPECT]` and `[EXPECT ERROR]` lines; they reach the Logs tab, but `main.js` looks for the error lines on the wrong stream, so the alert after a failure depends only on the exit code ([#9](https://github.com/jadedm/openconnect-gui/issues/9)).

Disconnect closes the script's input, sends `SIGINT`, and force-kills it after five seconds.

## Branches

The project uses gitflow. `develop` is the default branch and holds finished work. From v1.1.0 on, `main` holds only released code, and every release is built from it.

| Branch | Start from | Merge into |
|---|---|---|
| `feature/<issue>-<slug>`, `bugfix/…`, `docs/…`, `chore/…`, `refactor/…`, `ci/…` | `develop` | `develop`, squash merge |
| `release/<x.y.z>` | `develop` | `main` with a merge commit, then `main` back into `develop` |
| `hotfix/<x.y.z>` | `main` | `main` with a merge commit, then `main` back into `develop` |

For example, a fix for issue 42 goes on `bugfix/42-short-description`. If you work from a fork, branch from your fork's `develop` and open the pull request against `develop` here.

Both `main` and `develop` only accept changes through pull requests, and neither can be force-pushed or deleted.

### Releasing (maintainers)

1. Cut `release/<x.y.z>` from `develop`.
2. Set `version` in `package.json`. Until [#33](https://github.com/jadedm/openconnect-gui/issues/33) is fixed, also change the version in `src/App.jsx` and `src/Splash.jsx`.
3. Add a section for the new version at the top of `RELEASE_NOTES.md`, then open a pull request into `main`. `main` accepts only merge commits.
4. Build the DMG from a clean checkout of the merged `main`, on an Apple Silicon Mac, with automatic signing off so the build matches the unsigned instructions in the README:

   ```bash
   git fetch origin && git checkout --detach origin/main
   npm ci
   CSC_IDENTITY_AUTO_DISCOVERY=false npm run package
   ```

   Until [#29](https://github.com/jadedm/openconnect-gui/issues/29) is fixed, copy `build/icon.icns` into the checkout first, because it is not in the repository.
5. Create the tag and a full release (not a pre-release) in one step, which tags the current `main`:

   ```bash
   gh release create v<x.y.z> --target main --title "v<x.y.z>" --notes-file <notes for this version> dist/*.dmg
   ```
6. Open a pull request from `main` into `develop` and merge it with **Create a merge commit**, not squash. `develop` allows both, and a squash here leaves the release merge out of `develop`'s history, so every later release pull request shows commits that are already on `main`.

A hotfix is the same, except you cut `hotfix/<x.y.z>` from `main` in step 1. If a `release/*` branch is open at the time, also merge the hotfix into it.

## Pull requests

- One change per pull request, linked to its issue, based on `develop`.
- Run `npm run build` before pushing. There is no test suite or linter yet, so also say in the PR what you ran by hand: for anything on the connection path, a real connect and disconnect against a VPN server, and which protocol.
- New system commands go through `spawn()` with an argument array (four older ones still use `exec()`, see [SECURITY.md](SECURITY.md)). Validate anything from the UI before it reaches `sudo`.
- Never put credentials in logs, screenshots or the PR description.
- For docs: plain sentences, no emojis, and every statement about the app should be true of the code.

By contributing you agree your work is released under the project's MIT licence.
