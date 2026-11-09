# Contributing to Openwave

Thanks for helping build Openwave. Keep changes focused, reversible, and easy to review.

## Development

1. Install Node.js 22.13 or newer and pnpm.
2. Run `pnpm install`.
3. Create a branch: `git switch -c feature/short-description`.
4. Run the web app with `pnpm dev` or the desktop shell with `pnpm desktop:dev`.
5. Before opening a pull request, run `pnpm format`, `pnpm build`, and `pnpm desktop:renderer`.

## Pull requests

- Explain the user-facing outcome.
- Keep unrelated refactors out of feature PRs.
- Include reproduction steps for bug fixes.
- Call out audio-engine, timing, or project-format compatibility changes.
- Do not commit generated builds, dependencies, secrets, or personal audio files.

## Architecture

- `app/` contains the shared React DAW interface and browser audio engine.
- `desktop/` contains the Electron main process, preload bridge, and desktop renderer entry.
- `public/` contains browser-safe static assets and bundled open-source drum samples.
- The `sites` Git remote publishes the web demo; `origin` is the collaboration repository.
