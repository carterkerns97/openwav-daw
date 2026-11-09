# Collaborator handoff

## Start in five minutes

1. Accept the GitHub collaborator invitation.
2. Clone the repository and enter it.
3. Run the setup script for your operating system.
4. Give your coding agent the prompt below.
5. Create a feature branch before making changes.

```bash
git clone https://github.com/carterkerns97/openwav-daw.git
cd openwav-daw
git switch -c feature/native-bridge
```

Windows PowerShell:

```powershell
.\scripts\setup.ps1
```

macOS or Linux:

```bash
./scripts/setup.sh
```

## Agent kickoff prompt

```text
You are joining the Openwave DAW project. First read AGENTS.md, docs/PRODUCT_VISION.md, native/README.md, CONTRIBUTING.md, and the current git status. Do not edit anything until you understand the existing React/Electron prototype and the C++20 native-engine boundary. Work on a feature branch and preserve unrelated changes.

Your first objective is the smallest production-quality step toward a versioned Electron-to-native engine bridge. Propose the boundary before implementing it. The realtime callback must never allocate, lock, perform I/O, log, or call JavaScript. Keep Windows, macOS, and Linux parity. Add focused tests and run all available verification. Do not replace working UI behavior until the native path has equivalent tests and a safe fallback. Summarize architectural decisions and open a pull request rather than pushing to main.
```

## Useful commands

```bash
pnpm dev                 # Browser prototype
pnpm desktop:dev         # Electron development app
pnpm build               # Web production build
pnpm desktop:renderer    # Offline desktop renderer
pnpm native:configure    # Configure C++ engine
pnpm native:build        # Build C++ engine
pnpm native:test         # Run C++ tests
```

## Suggested first pull request

Design and implement a versioned command/event protocol between Electron and the native engine without moving the audio callback yet.

Deliverables:

- Protocol version and capability handshake
- Typed transport commands: prepare, play, stop, seek, set tempo
- Immutable transport snapshot returned to the UI
- Explicit error/result model
- Native C API tests and TypeScript contract tests
- Architecture note covering process isolation and crash behavior

Keep this PR focused. Audio-device ownership and clip playback belong in later PRs.

## Pull-request handoff checklist

- Explain what changed and why
- Identify realtime-thread impact
- List Windows/macOS/Linux behavior
- Include test evidence
- Call out project-format or protocol compatibility changes
- List remaining risks and the next smallest step
