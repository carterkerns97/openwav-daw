# Openwave agent guide

Read this file, `docs/PRODUCT_VISION.md`, `native/README.md`, and `CONTRIBUTING.md` before changing code.

## Mission

Openwave is becoming an open-source, professional DAW for Windows, macOS, and Linux. The current React/Web Audio application is a functional prototype. The production architecture uses the React/TypeScript interface as a control surface over a C++20 realtime engine.

## Repository map

- `app/page.tsx`: current prototype DAW and Web Audio implementation
- `app/globals.css`: current UI styling
- `desktop/`: Electron host, preload bridge, and offline renderer
- `native/`: C++20 realtime engine, stable C ABI, and native tests
- `docs/PRODUCT_VISION.md`: non-negotiable product requirements
- `.github/workflows/ci.yml`: web and native builds on all supported operating systems

## Architectural rules

1. Do not add new production audio responsibilities to React or the Web Audio graph. Existing Web Audio code is transitional and may remain as a browser fallback.
2. Realtime audio code must not allocate, lock, perform file I/O, log, or call JavaScript from the audio callback.
3. Keep platform-specific audio, MIDI, and filesystem code behind interfaces. Windows, macOS, and Linux are equal targets.
4. Preserve `.openwave` project compatibility. Add explicit versioned migrations when the schema changes.
5. Keep engine/UI communication versioned and asynchronous. Commands flow toward the engine; immutable snapshots and meters flow toward the UI.
6. Prefer nondestructive editing and deterministic results.
7. Add tests with every engine behavior change. A native change is incomplete until Windows, macOS, and Linux CI pass.
8. Do not add dependencies without checking license compatibility with the repository license and distribution goals.

## Working agreement

- Create a feature branch; do not work directly on `main`.
- Keep pull requests focused and explain realtime-safety implications.
- Run the relevant verification commands before requesting review.
- Never commit generated builds, installers, credentials, recordings, or `.openwave` user projects.
- Preserve unrelated changes in a dirty worktree.

## Verification

```bash
pnpm install
pnpm build
pnpm desktop:renderer

cmake -S native -B native/build -DCMAKE_BUILD_TYPE=Release
cmake --build native/build --config Release
ctest --test-dir native/build -C Release --output-on-failure
```

If the native toolchain is unavailable locally, push the feature branch and use the cross-platform CI result, but say explicitly that local native verification was unavailable.

## Current priority

Build the versioned desktop-to-native engine bridge, then move transport and mixer authority from Web Audio into C++. Do not attempt a full rewrite in one pull request.
