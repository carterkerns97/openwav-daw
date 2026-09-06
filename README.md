# Openwave

Openwave is a lightweight, open-source multitrack audio workspace that runs entirely in the browser. Audio files and microphone recordings stay on the local device.

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
- Responsive desktop and tablet workspace

## Run locally

This project requires Node.js 22.13 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`, import a few audio files, and press Space to play or pause.

## Current limitations

This is still an intentionally small prototype. Sessions are not yet persisted between reloads, BPM does not yet change clip timing, and browser audio support varies by file codec. Plugin hosting requires a future native engine.

## License

MIT. Contributions are welcome.
