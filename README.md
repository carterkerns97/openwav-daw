# Openwave

Openwave is an open-source multitrack audio workstation for the desktop and web. The Electron desktop application is now the primary development target; the private web deployment remains a convenient prototype and demo.

Openwave is migrating to a C++20 realtime engine. The React/Electron layer remains the interface while transport, mixing, DSP, audio I/O, recording, and plugin hosting move into `native/`. See [native/README.md](native/README.md) for the engine boundary and migration sequence.

## What works

- Drag-and-drop or file-picker audio import
- Multitrack, synchronized playback and timeline seeking
- Movable clips with edge trimming, splitting, duplication, and deletion
- Microphone recording into an armed track
- Simple oscillator synth with an editable 24-key piano roll
- Resizable/maximizable piano-roll editor with draggable note lengths
- Optional 1/16, 1/8, 1/4, and 1/2-note snapping
- Major/minor key constraints with out-of-key lanes disabled
- Horizontal and vertical MIDI dragging, plus Alt-drag duplication
- Undo/redo history with standard Ctrl/Cmd keyboard shortcuts
- Beat-snapped arrangement loop brace and looping playback
- Tempo-aware MIDI timing and a toggleable accented metronome
- Drag-and-drop effects rack with EQ, compression, reverb, delay, chorus, and saturation
- Per-track volume, pan, mute, and solo controls
- Master volume and offline WAV export
- Portable `.openwave` project files with embedded audio
- Native Open, Save, and Save As commands with autosave and crash recovery
- Responsive desktop and tablet workspace

## Run locally

This project requires Node.js 22.13 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`, import a few audio files, and press Space to play or pause.

## Run the desktop app

```bash
pnpm install
pnpm desktop:dev
```

Build the offline desktop renderer with `pnpm desktop:renderer`, create an unpacked application with `pnpm desktop:pack`, or generate a platform installer with `pnpm desktop:dist`.

The desktop shell uses context isolation and a narrow preload bridge. Use Ctrl/Cmd+O to open a project, Ctrl/Cmd+S to save, or Ctrl/Cmd+Shift+S for Save As. Imported and recorded audio is embedded in the project file so sessions remain portable.

## Current limitations

This is still an early prototype. Audio-device settings, low-latency native audio, MIDI hardware, plugin hosting, and optimized external media storage remain roadmap work.

## License

MIT. Contributions are welcome.
