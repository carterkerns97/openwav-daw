# Openwave product vision

Openwave is an open-source, professional digital audio workstation intended to become a credible replacement for established production software—not a browser toy or a permanently limited “lite” DAW.

## Non-negotiable requirements

### Professional capability

Openwave must be suitable for complete commercial music-production workflows: recording, editing, composition, sound design, mixing, mastering, live performance, and delivery. Features should be designed for large sessions, long working days, deterministic results, and recovery from failure.

### Cross-platform parity

Windows, macOS, and Linux are first-class targets. Core project files and editing behavior must remain portable across operating systems.

- Windows: x64 and arm64 where practical; WASAPI and ASIO
- macOS: Apple Silicon first, Intel while support remains viable; Core Audio
- Linux: x64 and arm64 where practical; PipeWire/JACK and ALSA

Platform-specific integrations are allowed behind stable abstractions. A core feature is not complete until its behavior is tested on every supported operating system, or the limitation is explicitly documented.

### Native realtime engine

The production audio engine is C++20 or newer. Realtime audio code must be deterministic, allocation-free, lock-free where required, and isolated from UI stalls. JavaScript may control the engine but must never run on the audio callback.

### Industry interoperability

The roadmap includes:

- VST3, CLAP, and Audio Unit hosting where supported
- Professional MIDI input, output, clock, MPE, and controller mapping
- Standard audio formats, sample rates, bit depths, and channel layouts
- Reliable tempo maps, automation, latency compensation, freeze, and offline rendering
- Portable project interchange and consolidated media

### Reliability and performance

No feature is considered professional merely because it works in a demo. Shipping criteria include automated tests, performance budgets, session stress tests, crash recovery, nondestructive editing, deterministic save/load, and backwards-compatible project migration.

### Accessible workflow

Power must not require unnecessary complexity. Openwave should combine a fast, approachable workflow with deep editing and routing. Keyboard operation, accessibility, discoverability, and scalable UI are product requirements.

### Open development

Openwave remains source-available under an OSI-approved open-source license. Dependencies must be reviewed for license compatibility, long-term maintenance, platform coverage, and the ability to distribute reproducible builds.

## Architectural direction

```text
React/TypeScript control surface
              ↕
versioned native command/event protocol
              ↕
C++ realtime engine and session model
              ↕
audio/MIDI devices, disk streaming, DSP, plugins
```

The current Web Audio implementation is a prototype and compatibility fallback. Production playback, recording, scheduling, mixing, DSP, and rendering will migrate into the native engine incrementally. The UI may evolve independently as long as it communicates through the versioned engine boundary.

## Decision test

When choosing an implementation, ask:

1. Can it support professional sessions predictably?
2. Can it work on Windows, macOS, and Linux without compromising project portability?
3. Is it safe for realtime audio?
4. Can it be tested, maintained, and migrated for years?
5. Does it preserve an approachable workflow?

If the answer to any question is no, the design needs revision or must be explicitly labeled transitional.
