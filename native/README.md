# Openwave native engine

This directory is the beginning of Openwave's C++20 realtime audio engine. The React/Electron application remains the control surface while audio responsibilities move behind the stable C ABI in `include/openwave/c_api.h`.

The engine is required to support Windows, macOS, and Linux as equal production targets. Platform audio and MIDI backends belong behind shared interfaces; session behavior and project data must not depend on an operating system.

## Build

```bash
cmake -S native -B native/build -DCMAKE_BUILD_TYPE=Release
cmake --build native/build --config Release
ctest --test-dir native/build -C Release --output-on-failure
```

## Migration order

1. Transport clock and device callback
2. Track mixer and routing graph
3. Audio-clip streaming and recording
4. MIDI scheduler and synthesizer voices
5. Built-in DSP effects
6. CLAP/VST3 plugin hosting and isolation
7. Offline rendering

The audio callback must not allocate memory, lock a mutex, perform file I/O, or call into JavaScript. UI commands will cross a lock-free command queue; meters and transport state will return through a separate snapshot queue.

JUCE is not included yet. The current repository is MIT licensed, while current JUCE releases are dual-licensed under AGPLv3 or a commercial JUCE licence. That licensing decision must be made explicitly before linking JUCE into distributed builds.
