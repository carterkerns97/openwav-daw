# Openwave

Openwave is a lightweight, open-source multitrack audio workspace that runs entirely in the browser. Audio files and microphone recordings stay on the local device.

## What works

- Drag-and-drop or file-picker audio import
- Multitrack, synchronized playback and timeline seeking
- Microphone recording into an armed track
- Per-track volume, pan, mute, solo, and low-pass filtering
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

This is an intentionally small first prototype. A track holds one clip, sessions are not yet persisted between reloads, BPM is informational, and browser audio support varies by file codec. Plugin hosting requires a future native engine.

## License

MIT. Contributions are welcome.
