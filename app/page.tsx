'use client';

import {
  Activity,
  AudioLines,
  Circle,
  Copy,
  Download,
  Drum,
  SlidersHorizontal,
  FolderOpen,
  Guitar,
  Keyboard,
  Maximize2,
  Mic,
  Minimize2,
  Pause,
  Play,
  Plus,
  Radio,
  Redo2,
  Repeat2,
  RotateCcw,
  Save,
  Scissors,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Volume2,
  Waves,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  ChangeEvent,
  DragEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type EffectType =
  | 'eq'
  | 'compressor'
  | 'reverb'
  | 'delay'
  | 'chorus'
  | 'saturator';
type Effect = {
  id: string;
  type: EffectType;
  enabled: boolean;
  amount: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
};
type Note = {
  id: string;
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
};
type Clip = {
  id: string;
  type: 'audio' | 'midi';
  name: string;
  start: number;
  duration: number;
  offset: number;
  buffer?: AudioBuffer;
  peaks: number[];
  notes: Note[];
};
type Track = {
  id: string;
  kind: 'audio' | 'synth' | 'drum';
  name: string;
  color: string;
  clips: Clip[];
  effects: Effect[];
  gain: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  waveform: OscillatorType;
  synth: SynthPatch;
  drumMap: string[];
};

type SynthPatch = {
  preset: string;
  osc1: OscillatorType;
  osc2: OscillatorType;
  osc2Tune: number;
  mix: number;
  unison: number;
  detune: number;
  sub: number;
  noise: number;
  filterType: BiquadFilterType;
  cutoff: number;
  resonance: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  lfoRate: number;
  lfoDepth: number;
  drive: number;
  width: number;
  delay: number;
  reverb: number;
};

type DrumSound = {
  id: string;
  name: string;
  kit: '808' | '909' | '505';
  url: string;
};

const COLORS = [
  '#f4a261',
  '#36c9a5',
  '#9d8cff',
  '#56b4f2',
  '#ef6f91',
  '#e9c46a',
];
const PX = 64;
const ROW_H = 94;
const EFFECT_INFO: Record<
  EffectType,
  { name: string; icon: typeof SlidersHorizontal; color: string }
> = {
  eq: { name: 'EQ Three', icon: SlidersHorizontal, color: '#68b8f5' },
  compressor: { name: 'Compressor', icon: Activity, color: '#e5b95c' },
  reverb: { name: 'Reverb', icon: Sparkles, color: '#a995ff' },
  delay: { name: 'Delay', icon: Radio, color: '#66d2b3' },
  chorus: { name: 'Chorus', icon: Waves, color: '#f08aaa' },
  saturator: { name: 'Saturator', icon: Zap, color: '#f28b54' },
};
const EFFECT_CONTROLS: Record<
  EffectType,
  {
    mixLabel: string;
    labels: [string, string, string, string];
    defaults: [number, number, number, number, number];
  }
> = {
  eq: {
    mixLabel: 'OUTPUT',
    labels: ['LOW', 'MID', 'HIGH', 'MID FREQ'],
    defaults: [0.78, 0.5, 0.5, 0.5, 0.42],
  },
  compressor: {
    mixLabel: 'DRY / WET',
    labels: ['THRESHOLD', 'RATIO', 'ATTACK', 'RELEASE'],
    defaults: [1, 0.55, 0.35, 0.18, 0.38],
  },
  reverb: {
    mixLabel: 'DRY / WET',
    labels: ['SIZE', 'DECAY', 'PRE-DELAY', 'TONE'],
    defaults: [0.32, 0.58, 0.55, 0.12, 0.64],
  },
  delay: {
    mixLabel: 'DRY / WET',
    labels: ['TIME', 'FEEDBACK', 'FILTER', 'WIDTH'],
    defaults: [0.34, 0.32, 0.38, 0.68, 0.55],
  },
  chorus: {
    mixLabel: 'DRY / WET',
    labels: ['RATE', 'DEPTH', 'DELAY', 'FEEDBACK'],
    defaults: [0.42, 0.25, 0.62, 0.35, 0.18],
  },
  saturator: {
    mixLabel: 'DRY / WET',
    labels: ['DRIVE', 'TONE', 'OUTPUT', 'BIAS'],
    defaults: [0.7, 0.48, 0.62, 0.46, 0.5],
  },
};
const PITCHES = Array.from({ length: 128 }, (_, i) => 127 - i);
const NOTE_NAMES = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
];
const INIT_SYNTH: SynthPatch = {
  preset: 'Init Patch',
  osc1: 'sawtooth',
  osc2: 'square',
  osc2Tune: 0,
  mix: 0.35,
  unison: 1,
  detune: 8,
  sub: 0.12,
  noise: 0,
  filterType: 'lowpass',
  cutoff: 9000,
  resonance: 1,
  attack: 0.01,
  decay: 0.18,
  sustain: 0.75,
  release: 0.22,
  lfoRate: 2,
  lfoDepth: 0,
  drive: 0.05,
  width: 0.5,
  delay: 0,
  reverb: 0.08,
};
const SYNTH_PRESETS: Array<SynthPatch & { category: string }> = [
  { ...INIT_SYNTH, category: 'Init' },
  {
    ...INIT_SYNTH,
    preset: 'Neon Superstack',
    category: 'Lead',
    osc1: 'sawtooth',
    osc2: 'sawtooth',
    mix: 0.5,
    unison: 5,
    detune: 24,
    cutoff: 7600,
    resonance: 2.5,
    attack: 0.015,
    decay: 0.3,
    sustain: 0.72,
    release: 0.38,
    drive: 0.2,
    width: 0.95,
    delay: 0.24,
    reverb: 0.18,
  },
  {
    ...INIT_SYNTH,
    preset: 'Moonlit Glass',
    category: 'Keys',
    osc1: 'sine',
    osc2: 'triangle',
    osc2Tune: 12,
    mix: 0.3,
    unison: 3,
    detune: 9,
    cutoff: 5800,
    resonance: 6,
    attack: 0.008,
    decay: 0.75,
    sustain: 0.28,
    release: 1.5,
    lfoRate: 0.35,
    lfoDepth: 0.12,
    width: 0.8,
    delay: 0.28,
    reverb: 0.48,
  },
  {
    ...INIT_SYNTH,
    preset: 'Gravity Bass',
    category: 'Bass',
    osc1: 'sawtooth',
    osc2: 'square',
    osc2Tune: -12,
    mix: 0.28,
    unison: 2,
    detune: 5,
    sub: 0.55,
    cutoff: 720,
    resonance: 8,
    attack: 0.005,
    decay: 0.22,
    sustain: 0.64,
    release: 0.16,
    drive: 0.52,
    width: 0.2,
  },
  {
    ...INIT_SYNTH,
    preset: 'Aurora Cathedral',
    category: 'Pad',
    osc1: 'sawtooth',
    osc2: 'triangle',
    osc2Tune: 12,
    mix: 0.42,
    unison: 5,
    detune: 18,
    sub: 0.18,
    noise: 0.035,
    cutoff: 3400,
    resonance: 3,
    attack: 1.35,
    decay: 1.8,
    sustain: 0.76,
    release: 3.8,
    lfoRate: 0.14,
    lfoDepth: 0.2,
    width: 1,
    delay: 0.18,
    reverb: 0.68,
  },
  {
    ...INIT_SYNTH,
    preset: 'Chrome Pluck',
    category: 'Pluck',
    osc1: 'square',
    osc2: 'sine',
    osc2Tune: 12,
    mix: 0.22,
    unison: 3,
    detune: 12,
    cutoff: 2800,
    resonance: 10,
    attack: 0.003,
    decay: 0.22,
    sustain: 0.06,
    release: 0.32,
    drive: 0.15,
    width: 0.72,
  },
  {
    ...INIT_SYNTH,
    preset: 'Solar Brass',
    category: 'Brass',
    osc1: 'sawtooth',
    osc2: 'square',
    osc2Tune: -12,
    mix: 0.22,
    unison: 4,
    detune: 15,
    cutoff: 2100,
    resonance: 4.5,
    attack: 0.12,
    decay: 0.55,
    sustain: 0.7,
    release: 0.7,
    lfoRate: 5.2,
    lfoDepth: 0.04,
    drive: 0.24,
    width: 0.65,
  },
  {
    ...INIT_SYNTH,
    preset: 'Orbit Arp',
    category: 'Sequence',
    osc1: 'triangle',
    osc2: 'square',
    osc2Tune: 12,
    mix: 0.32,
    unison: 2,
    detune: 7,
    cutoff: 4500,
    resonance: 9,
    attack: 0.002,
    decay: 0.14,
    sustain: 0.16,
    release: 0.2,
    lfoRate: 6,
    lfoDepth: 0.18,
    width: 0.75,
  },
  {
    ...INIT_SYNTH,
    preset: 'Dust Choir',
    category: 'Texture',
    osc1: 'triangle',
    osc2: 'sawtooth',
    osc2Tune: 7,
    mix: 0.48,
    unison: 5,
    detune: 28,
    sub: 0.08,
    noise: 0.09,
    cutoff: 2600,
    resonance: 5,
    attack: 0.65,
    decay: 1.2,
    sustain: 0.58,
    release: 2.7,
    lfoRate: 0.22,
    lfoDepth: 0.25,
    drive: 0.12,
    width: 1,
  },
  {
    ...INIT_SYNTH,
    preset: 'Laser Monolith',
    category: 'Lead',
    osc1: 'square',
    osc2: 'sawtooth',
    osc2Tune: -12,
    mix: 0.42,
    unison: 3,
    detune: 16,
    sub: 0.25,
    cutoff: 1250,
    resonance: 13,
    attack: 0.006,
    decay: 0.4,
    sustain: 0.5,
    release: 0.55,
    lfoRate: 3.6,
    lfoDepth: 0.32,
    drive: 0.38,
    width: 0.55,
  },
];
const DRUM_SOUNDS: DrumSound[] = [
  {
    id: '808-kick',
    name: 'Kick',
    kit: '808',
    url: '/samples/drums/808/01.BD.808.wav',
  },
  {
    id: '808-snare',
    name: 'Snare',
    kit: '808',
    url: '/samples/drums/808/01.SD5.808.wav',
  },
  {
    id: '808-clap',
    name: 'Clap',
    kit: '808',
    url: '/samples/drums/808/01.CP.808.wav',
  },
  {
    id: '808-hat',
    name: 'Closed Hat',
    kit: '808',
    url: '/samples/drums/808/01.CH.808.wav',
  },
  {
    id: '808-open',
    name: 'Open Hat',
    kit: '808',
    url: '/samples/drums/808/01.OH.808.wav',
  },
  {
    id: '808-rim',
    name: 'Rim',
    kit: '808',
    url: '/samples/drums/808/01.RS.808.wav',
  },
  {
    id: '808-cowbell',
    name: 'Cowbell',
    kit: '808',
    url: '/samples/drums/808/01.CB.808.wav',
  },
  {
    id: '808-cymbal',
    name: 'Cymbal',
    kit: '808',
    url: '/samples/drums/808/01.CY.808.wav',
  },
  {
    id: '909-kick',
    name: 'Kick',
    kit: '909',
    url: '/samples/drums/909/kick.wav',
  },
  {
    id: '909-snare',
    name: 'Snare',
    kit: '909',
    url: '/samples/drums/909/snare.wav',
  },
  {
    id: '909-clap',
    name: 'Clap',
    kit: '909',
    url: '/samples/drums/909/clap1.wav',
  },
  {
    id: '909-hat',
    name: 'Closed Hat',
    kit: '909',
    url: '/samples/drums/909/hihat-closed-1.wav',
  },
  {
    id: '909-open',
    name: 'Open Hat',
    kit: '909',
    url: '/samples/drums/909/hihat-open-1.wav',
  },
  { id: '909-rim', name: 'Rim', kit: '909', url: '/samples/drums/909/rim.wav' },
  {
    id: '909-ride',
    name: 'Ride',
    kit: '909',
    url: '/samples/drums/909/ride.wav',
  },
  {
    id: '909-tom',
    name: 'Mid Tom',
    kit: '909',
    url: '/samples/drums/909/tom-m.wav',
  },
  {
    id: '505-kick',
    name: 'Kick',
    kit: '505',
    url: '/samples/drums/505/tr505-kick.wav',
  },
  {
    id: '505-snare',
    name: 'Snare',
    kit: '505',
    url: '/samples/drums/505/tr505-snare.wav',
  },
  {
    id: '505-clap',
    name: 'Clap',
    kit: '505',
    url: '/samples/drums/505/tr505-clap.wav',
  },
  {
    id: '505-hat',
    name: 'Closed Hat',
    kit: '505',
    url: '/samples/drums/505/tr505-hihat-closed.wav',
  },
  {
    id: '505-open',
    name: 'Open Hat',
    kit: '505',
    url: '/samples/drums/505/tr505-hihat-open.wav',
  },
  {
    id: '505-rim',
    name: 'Rim',
    kit: '505',
    url: '/samples/drums/505/tr505-rim.wav',
  },
  {
    id: '505-crash',
    name: 'Crash',
    kit: '505',
    url: '/samples/drums/505/tr505-crash.wav',
  },
  {
    id: '505-tom',
    name: 'Mid Tom',
    kit: '505',
    url: '/samples/drums/505/tr505-tom-m.wav',
  },
];
const DEFAULT_DRUM_MAP = [
  '808-kick',
  '808-snare',
  '808-clap',
  '808-hat',
  '808-open',
  '808-rim',
  '808-cowbell',
  '808-cymbal',
  '909-kick',
  '909-snare',
  '909-clap',
  '909-hat',
  '909-open',
  '909-rim',
  '909-ride',
  '909-tom',
];

function makeTrack(index: number, kind: Track['kind'] = 'audio'): Track {
  return {
    id: crypto.randomUUID(),
    kind,
    name:
      kind === 'synth'
        ? `Synth ${index + 1}`
        : kind === 'drum'
          ? `Drum Rack ${index + 1}`
          : `Track ${index + 1}`,
    color: COLORS[index % COLORS.length],
    clips: [],
    effects: [],
    gain: 0.82,
    pan: 0,
    muted: false,
    solo: false,
    armed: index === 0,
    waveform: 'sawtooth',
    synth: { ...INIT_SYNTH },
    drumMap: [...DEFAULT_DRUM_MAP],
  };
}
function defaultDrumClip(start: number, bpm: number): Clip {
  const step = 60 / bpm / 4;
  const notes: Note[] = [];
  [0, 4, 8, 12].forEach((index) =>
    notes.push({
      id: crypto.randomUUID(),
      pitch: 36,
      start: index * step,
      duration: step * 0.8,
      velocity: 1,
    }),
  );
  [4, 12].forEach((index) =>
    notes.push({
      id: crypto.randomUUID(),
      pitch: 37,
      start: index * step,
      duration: step * 0.8,
      velocity: 0.9,
    }),
  );
  Array.from({ length: 8 }, (_, index) => index * 2).forEach((index) =>
    notes.push({
      id: crypto.randomUUID(),
      pitch: 39,
      start: index * step,
      duration: step * 0.6,
      velocity: index % 4 ? 0.65 : 0.82,
    }),
  );
  return {
    id: crypto.randomUUID(),
    type: 'midi',
    name: 'Starter beat',
    start,
    duration: step * 16,
    offset: 0,
    peaks: [],
    notes,
  };
}
function midiPreviewTop(notes: Note[], pitch: number, isDrum: boolean) {
  if (isDrum) return 8 + ((51 - pitch) / 15) * 78;
  const pitches = notes.map((note) => note.pitch);
  const high = Math.max(...pitches, pitch);
  const low = Math.min(...pitches, pitch);
  const range = Math.max(12, high - low);
  return 10 + ((high - pitch) / range) * 74;
}
function defaultMidiClip(start: number, bpm: number): Clip {
  const root = 60;
  const beat = 60 / bpm;
  return {
    id: crypto.randomUUID(),
    type: 'midi',
    name: 'New MIDI clip',
    start,
    duration: 16 * beat,
    offset: 0,
    peaks: [],
    notes: [0, 4, 8, 12].map((step, i) => ({
      id: crypto.randomUUID(),
      pitch: root + [0, 4, 7, 11][i],
      start: step * beat,
      duration: 1.5 * beat,
      velocity: 0.75,
    })),
  };
}
function getPeaks(buffer: AudioBuffer, count = 180) {
  const data = buffer.getChannelData(0),
    step = Math.max(1, Math.floor(data.length / count));
  return Array.from({ length: count }, (_, n) => {
    let peak = 0;
    for (let i = n * step; i < Math.min(data.length, (n + 1) * step); i++)
      peak = Math.max(peak, Math.abs(data[i]));
    return Math.max(0.04, peak);
  });
}
function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}.${Math.floor((seconds % 1) * 100)
    .toString()
    .padStart(2, '0')}`;
}
function noteName(pitch: number) {
  return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}
function makeWav(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels,
    length = buffer.length * channels * 2 + 44,
    out = new ArrayBuffer(length),
    view = new DataView(out);
  const write = (offset: number, value: string) =>
    [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, length - 8, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, length - 44, true);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++)
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }
  return new Blob([out], { type: 'audio/wav' });
}

function connectEffects(
  ctx: BaseAudioContext,
  input: AudioNode,
  effects: Effect[],
  destination: AudioNode,
) {
  let current = input;
  effects
    .filter((e) => e.enabled)
    .forEach((effect) => {
      const defaults = EFFECT_CONTROLS[effect.type].defaults;
      const amount = effect.amount ?? defaults[0];
      const p1 = effect.param1 ?? defaults[1];
      const p2 = effect.param2 ?? defaults[2];
      const p3 = effect.param3 ?? defaults[3];
      const p4 = effect.param4 ?? defaults[4];
      if (effect.type === 'eq') {
        const low = ctx.createBiquadFilter(),
          mid = ctx.createBiquadFilter(),
          high = ctx.createBiquadFilter(),
          output = ctx.createGain();
        low.type = 'lowshelf';
        low.frequency.value = 180;
        low.gain.value = (p1 - 0.5) * 30;
        mid.type = 'peaking';
        mid.frequency.value = 250 * Math.pow(16, p4);
        mid.Q.value = 0.5 + p4 * 3.5;
        mid.gain.value = (p2 - 0.5) * 30;
        high.type = 'highshelf';
        high.frequency.value = 6500;
        high.gain.value = (p3 - 0.5) * 30;
        output.gain.value = Math.pow(10, ((amount - 0.5) * 18) / 20);
        current.connect(low).connect(mid).connect(high).connect(output);
        current = output;
      }
      if (effect.type === 'compressor') {
        const sum = ctx.createGain(),
          dry = ctx.createGain(),
          wet = ctx.createGain(),
          node = ctx.createDynamicsCompressor();
        node.threshold.value = -4 - p1 * 56;
        node.ratio.value = 1 + p2 * 19;
        node.attack.value = 0.001 + p3 * 0.2;
        node.release.value = 0.04 + p4 * 0.96;
        dry.gain.value = 1 - amount;
        wet.gain.value = amount;
        current.connect(dry).connect(sum);
        current.connect(node).connect(wet).connect(sum);
        current = sum;
      }
      if (effect.type === 'saturator') {
        const sum = ctx.createGain(),
          dry = ctx.createGain(),
          wet = ctx.createGain(),
          tone = ctx.createBiquadFilter(),
          output = ctx.createGain(),
          node = ctx.createWaveShaper(),
          curve = new Float32Array(1024),
          drive = 1 + p1 * 24;
        for (let i = 0; i < curve.length; i++) {
          const x = (i * 2) / curve.length - 1 + (p4 - 0.5) * 0.22;
          curve[i] = Math.tanh(x * drive);
        }
        node.curve = curve;
        node.oversample = '4x';
        tone.type = 'lowpass';
        tone.frequency.value = 1200 * Math.pow(14, p2);
        output.gain.value = 0.35 + p3 * 1.3;
        dry.gain.value = 1 - amount;
        wet.gain.value = amount;
        current.connect(dry).connect(sum);
        current
          .connect(node)
          .connect(tone)
          .connect(output)
          .connect(wet)
          .connect(sum);
        current = sum;
      }
      if (effect.type === 'delay') {
        const sum = ctx.createGain(),
          dry = ctx.createGain(),
          wet = ctx.createGain(),
          delay = ctx.createDelay(2),
          feedback = ctx.createGain(),
          filter = ctx.createBiquadFilter(),
          pan = ctx.createStereoPanner();
        dry.gain.value = 1 - amount * 0.35;
        wet.gain.value = amount;
        delay.delayTime.value = 0.04 + p1 * 0.96;
        feedback.gain.value = Math.min(0.88, p2 * 0.9);
        filter.type = 'lowpass';
        filter.frequency.value = 700 * Math.pow(20, p3);
        pan.pan.value = (p4 - 0.5) * 1.7;
        current.connect(dry).connect(sum);
        current
          .connect(delay)
          .connect(filter)
          .connect(pan)
          .connect(wet)
          .connect(sum);
        filter.connect(feedback).connect(delay);
        current = sum;
      }
      if (effect.type === 'reverb') {
        const sum = ctx.createGain(),
          dry = ctx.createGain(),
          wet = ctx.createGain(),
          preDelay = ctx.createDelay(0.25),
          tone = ctx.createBiquadFilter(),
          convolver = ctx.createConvolver(),
          length = Math.floor(ctx.sampleRate * (0.35 + p1 * 4.65)),
          impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const data = impulse.getChannelData(c);
          for (let i = 0; i < length; i++)
            data[i] =
              (Math.random() * 2 - 1) *
              Math.pow(1 - i / length, 1 + (1 - p2) * 6);
        }
        convolver.buffer = impulse;
        preDelay.delayTime.value = p3 * 0.18;
        tone.type = 'lowpass';
        tone.frequency.value = 900 * Math.pow(18, p4);
        dry.gain.value = 1 - amount * 0.28;
        wet.gain.value = amount;
        current.connect(dry).connect(sum);
        current
          .connect(preDelay)
          .connect(convolver)
          .connect(tone)
          .connect(wet)
          .connect(sum);
        current = sum;
      }
      if (effect.type === 'chorus') {
        const sum = ctx.createGain(),
          dry = ctx.createGain(),
          wet = ctx.createGain(),
          delay = ctx.createDelay(0.1),
          lfo = ctx.createOscillator(),
          depth = ctx.createGain(),
          feedback = ctx.createGain();
        dry.gain.value = 1 - amount * 0.25;
        wet.gain.value = amount;
        delay.delayTime.value = 0.004 + p3 * 0.026;
        lfo.frequency.value = 0.05 + p1 * 5.95;
        depth.gain.value = 0.0005 + p2 * 0.012;
        feedback.gain.value = p4 * 0.35;
        lfo.connect(depth).connect(delay.delayTime);
        lfo.start();
        current.connect(dry).connect(sum);
        current.connect(delay).connect(wet).connect(sum);
        delay.connect(feedback).connect(delay);
        current = sum;
      }
    });
  current.connect(destination);
}

export default function Home() {
  const [tracks, setTracks] = useState<Track[]>(() => [
    makeTrack(0),
    makeTrack(1),
    makeTrack(2),
  ]);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [selectedClipId, setSelectedClipId] = useState('');
  const [position, setPosition] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [tempoDraft, setTempoDraft] = useState('120');
  const [metronome, setMetronome] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [master, setMaster] = useState(0.85);
  const [status, setStatus] = useState(
    'Drop audio anywhere or add a synth track',
  );
  const [draggingFile, setDraggingFile] = useState(false);
  const [bottomMode, setBottomMode] = useState<'devices' | 'piano' | 'drums'>(
    'devices',
  );
  const [bottomHeight, setBottomHeight] = useState(280);
  const [editorMaximized, setEditorMaximized] = useState(false);
  const [noteSnap, setNoteSnap] = useState(0.5);
  const [keyRoot, setKeyRoot] = useState(0);
  const [keyScale, setKeyScale] = useState<'major' | 'minor'>('major');
  const [chordSequence, setChordSequence] = useState<number[]>([0, 3, 4, 5]);
  const [chordBeats, setChordBeats] = useState(4);
  const [chordInversion, setChordInversion] = useState(0);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedDrumPad, setSelectedDrumPad] = useState(0);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [projectName, setProjectName] = useState('Untitled session');
  const contextRef = useRef<AudioContext | null>(null),
    drumBuffers = useRef<Map<string, AudioBuffer>>(new Map()),
    sources = useRef<AudioScheduledSourceNode[]>([]),
    startedAt = useRef(0),
    raf = useRef(0),
    recorder = useRef<MediaRecorder | null>(null),
    chunks = useRef<Blob[]>([]),
    fileInput = useRef<HTMLInputElement>(null);
  const pianoEditor = useRef<HTMLDivElement>(null);
  const bpmRef = useRef(120);
  const tempoDrag = useRef<{
    pointerId: number;
    startY: number;
    bpm: number;
  } | null>(null);
  const tapTimes = useRef<number[]>([]);
  useEffect(() => {
    bpmRef.current = bpm;
    setTempoDraft(String(bpm));
  }, [bpm]);
  const gesture = useRef<{
    clipId: string;
    trackId: string;
    startX: number;
    startY: number;
    originalStart: number;
    originalDuration: number;
    originalOffset: number;
    originalNotes: Note[];
    mode: 'move' | 'left' | 'right';
  } | null>(null);
  const noteGesture = useRef<{
    notes: Array<Pick<Note, 'id' | 'start' | 'duration' | 'pitch'>>;
    startX: number;
    startY: number;
    mode: 'move' | 'resize';
  } | null>(null);
  const loopGesture = useRef<{
    startX: number;
    originalStart: number;
    originalEnd: number;
    mode: 'move' | 'left' | 'right';
  } | null>(null);
  const history = useRef<{
    undo: Array<{
      tracks: Track[];
      bpm: number;
      loopEnabled: boolean;
      loopStart: number;
      loopEnd: number;
    }>;
    redo: Array<{
      tracks: Track[];
      bpm: number;
      loopEnabled: boolean;
      loopStart: number;
      loopEnd: number;
    }>;
  }>({ undo: [], redo: [] });
  const resizeStart = useRef<{ y: number; height: number } | null>(null);
  const duration = useMemo(
    () =>
      Math.max(
        60,
        loopEnd + 4,
        ...tracks.flatMap((t) => t.clips.map((c) => c.start + c.duration + 4)),
      ),
    [tracks, loopEnd],
  );
  const selectedTrack =
    tracks.find((t) => t.id === selectedTrackId) ?? tracks[0];
  const selectedClip = tracks
    .flatMap((t) => t.clips)
    .find((c) => c.id === selectedClipId);
  useEffect(() => setSelectedNoteIds([]), [selectedClipId]);
  const drumStepSeconds = 60 / bpm / 4;
  const drumStepCount =
    selectedClip?.type === 'midi'
      ? Math.max(1, Math.ceil(selectedClip.duration / drumStepSeconds))
      : 16;
  const pixelsPerSecond = PX * timelineZoom;
  const snapshot = useCallback(
    () => ({ tracks, bpm, loopEnabled, loopStart, loopEnd }),
    [tracks, bpm, loopEnabled, loopStart, loopEnd],
  );
  const checkpoint = useCallback(() => {
    history.current.undo.push(snapshot());
    if (history.current.undo.length > 80) history.current.undo.shift();
    history.current.redo = [];
  }, [snapshot]);
  const restore = (value: ReturnType<typeof snapshot>) => {
    stop();
    setTracks(value.tracks);
    setBpm(value.bpm);
    setLoopEnabled(value.loopEnabled);
    setLoopStart(value.loopStart);
    setLoopEnd(value.loopEnd);
  };
  const undo = useCallback(() => {
    const previous = history.current.undo.pop();
    if (!previous) return;
    history.current.redo.push(snapshot());
    restore(previous);
    setStatus('Undo');
  }, [snapshot]);
  const redo = useCallback(() => {
    const next = history.current.redo.pop();
    if (!next) return;
    history.current.undo.push(snapshot());
    restore(next);
    setStatus('Redo');
  }, [snapshot]);
  const audioContext = useCallback(
    () => contextRef.current ?? (contextRef.current = new AudioContext()),
    [],
  );
  const loadDrumSound = useCallback(
    async (soundId: string) => {
      const cached = drumBuffers.current.get(soundId);
      if (cached) return cached;
      const sound = DRUM_SOUNDS.find((item) => item.id === soundId);
      if (!sound) return;
      const response = await fetch(sound.url);
      const buffer = await audioContext().decodeAudioData(
        await response.arrayBuffer(),
      );
      drumBuffers.current.set(soundId, buffer);
      return buffer;
    },
    [audioContext],
  );
  const auditionDrum = useCallback(
    async (soundId: string, velocity = 1) => {
      const ctx = audioContext();
      await ctx.resume();
      const buffer = await loadDrumSound(soundId);
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = velocity * 0.9;
      source.connect(gain).connect(ctx.destination);
      source.start();
    },
    [audioContext, loadDrumSound],
  );
  const updateTrack = (id: string, patch: Partial<Track>) =>
    setTracks((old) => old.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const updateSynth = (id: string, patch: Partial<SynthPatch>) =>
    setTracks((old) =>
      old.map((track) =>
        track.id === id
          ? {
              ...track,
              synth: {
                ...(track.synth ?? INIT_SYNTH),
                ...patch,
                preset: patch.preset ?? 'Custom',
              },
            }
          : track,
      ),
    );
  const applySynthPreset = (trackId: string, presetName: string) => {
    const preset = SYNTH_PRESETS.find((item) => item.preset === presetName);
    if (!preset) return;
    checkpoint();
    const { category: _category, ...patch } = preset;
    updateTrack(trackId, { synth: { ...patch }, waveform: patch.osc1 });
    setStatus(`${preset.preset} loaded`);
  };
  const updateClip = useCallback(
    (clipId: string, patch: Partial<Clip>) =>
      setTracks((old) =>
        old.map((t) => ({
          ...t,
          clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
        })),
      ),
    [],
  );
  const scaleNotes =
    keyScale === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  const snapSeconds = noteSnap * (60 / bpm);
  const inKey = useCallback(
    (pitch: number) => scaleNotes.includes((pitch - keyRoot + 120) % 12),
    [keyRoot, scaleNotes],
  );

  const stop = useCallback((reset = false) => {
    sources.current.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    sources.current = [];
    cancelAnimationFrame(raf.current);
    setPlaying(false);
    if (reset) setPosition(0);
  }, []);
  const changeTempo = (nextValue: number, saveHistory = true) => {
    const next = Math.max(40, Math.min(240, Math.round(nextValue)));
    const currentBpm = bpmRef.current;
    if (!Number.isFinite(next) || next === currentBpm) return;
    if (saveHistory) checkpoint();
    const currentBeat = 60 / currentBpm;
    const nextBeat = 60 / next;
    setTracks((old) =>
      old.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.type !== 'midi') return clip;
          const toQuarterBeat = (seconds: number) =>
            Math.round((seconds / currentBeat) * 4) / 4;
          const lengthBeats = Math.max(0.25, toQuarterBeat(clip.duration));
          return {
            ...clip,
            start: toQuarterBeat(clip.start) * nextBeat,
            duration: lengthBeats * nextBeat,
            notes: clip.notes.map((note) => {
              const startBeats = Math.min(
                Math.max(0, toQuarterBeat(note.start)),
                lengthBeats - 0.25,
              );
              const durationBeats = Math.max(
                0.25,
                toQuarterBeat(note.duration),
              );
              return {
                ...note,
                start: startBeats * nextBeat,
                duration:
                  Math.min(durationBeats, lengthBeats - startBeats) * nextBeat,
              };
            }),
          };
        }),
      })),
    );
    bpmRef.current = next;
    setBpm(next);
    setTempoDraft(String(next));
    setStatus(
      `Tempo changed to ${next} BPM — MIDI stays locked to the beat grid`,
    );
    if (playing) setTimeout(() => void playAtRef.current(position), 0);
  };
  const commitTempoDraft = () => {
    const value = Number(tempoDraft);
    if (Number.isFinite(value)) changeTempo(value);
    else setTempoDraft(String(bpm));
  };
  const tapTempo = () => {
    const now = performance.now();
    const recent = [...tapTimes.current, now]
      .filter((time) => now - time < 3000)
      .slice(-5);
    tapTimes.current = recent;
    if (recent.length < 2) {
      setStatus('Tap again to set tempo');
      return;
    }
    const intervals = recent
      .slice(1)
      .map((time, index) => time - recent[index]);
    changeTempo(
      60000 /
        (intervals.reduce((sum, value) => sum + value, 0) / intervals.length),
    );
  };
  const seekFromPointer = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    stop();
    setPosition(
      Math.max(
        0,
        Math.min(duration, (event.clientX - rect.left) / pixelsPerSecond),
      ),
    );
  };
  const startLoopGesture = (
    event: ReactPointerEvent,
    mode: 'move' | 'left' | 'right',
  ) => {
    event.stopPropagation();
    event.preventDefault();
    checkpoint();
    loopGesture.current = {
      startX: event.clientX,
      originalStart: loopStart,
      originalEnd: loopEnd,
      mode,
    };
  };
  const buildGraph = useCallback(
    (
      ctx: AudioContext | OfflineAudioContext,
      startPosition: number,
      destination: AudioNode,
    ) => {
      const hasSolo = tracks.some((t) => t.solo);
      tracks.forEach((track) => {
        if (track.muted || (hasSolo && !track.solo)) return;
        const bus = ctx.createGain(),
          gain = ctx.createGain(),
          pan = ctx.createStereoPanner();
        gain.gain.value = track.gain;
        pan.pan.value = track.pan;
        connectEffects(ctx, bus, track.effects, gain);
        gain.connect(pan).connect(destination);
        track.clips.forEach((clip) => {
          const clipEnd = clip.start + clip.duration;
          if (clipEnd <= startPosition) return;
          if (clip.type === 'audio' && clip.buffer) {
            const source = ctx.createBufferSource(),
              elapsed = Math.max(0, startPosition - clip.start),
              startAt =
                ctx.currentTime + Math.max(0, clip.start - startPosition);
            source.buffer = clip.buffer;
            source.connect(bus);
            source.start(
              startAt,
              clip.offset + elapsed,
              Math.max(0.01, clip.duration - elapsed),
            );
            if (ctx instanceof AudioContext) sources.current.push(source);
          }
          if (clip.type === 'midi' && track.kind === 'drum')
            clip.notes.forEach((note) => {
              const noteStart = clip.start + note.start;
              if (noteStart >= clipEnd || noteStart < startPosition) return;
              const soundId = track.drumMap[note.pitch - 36];
              const buffer = drumBuffers.current.get(soundId);
              if (!buffer) return;
              const source = ctx.createBufferSource();
              const amp = ctx.createGain();
              source.buffer = buffer;
              amp.gain.value = note.velocity;
              source.connect(amp).connect(bus);
              source.start(ctx.currentTime + noteStart - startPosition);
              if (ctx instanceof AudioContext) sources.current.push(source);
            });
          if (clip.type === 'midi' && track.kind !== 'drum')
            clip.notes.forEach((note) => {
              const noteStart = clip.start + note.start,
                noteEnd = Math.min(clipEnd, noteStart + note.duration);
              if (noteEnd <= startPosition) return;
              const patch = track.synth ?? INIT_SYNTH,
                amp = ctx.createGain(),
                filter = ctx.createBiquadFilter(),
                shaper = ctx.createWaveShaper(),
                startAt =
                  ctx.currentTime + Math.max(0, noteStart - startPosition),
                endAt =
                  ctx.currentTime + Math.max(0.04, noteEnd - startPosition),
                releaseEnd = endAt + patch.release,
                baseFrequency = 440 * Math.pow(2, (note.pitch - 69) / 12),
                peak = Math.max(0.02, note.velocity * 0.17),
                sustain = Math.max(0.0001, peak * patch.sustain);
              filter.type = patch.filterType;
              filter.frequency.value = patch.cutoff;
              filter.Q.value = patch.resonance;
              const curve = new Float32Array(512);
              for (let i = 0; i < curve.length; i++) {
                const x = (i * 2) / (curve.length - 1) - 1;
                curve[i] = Math.tanh(x * (1 + patch.drive * 8));
              }
              shaper.curve = curve;
              shaper.oversample = '2x';
              filter.connect(shaper).connect(amp);
              amp.connect(bus);
              if (patch.delay > 0) {
                const delay = ctx.createDelay(0.8);
                const feedback = ctx.createGain();
                const wet = ctx.createGain();
                delay.delayTime.value = 0.22;
                feedback.gain.value = 0.24 + patch.delay * 0.38;
                wet.gain.value = patch.delay * 0.55;
                amp.connect(delay);
                delay.connect(feedback).connect(delay);
                delay.connect(wet).connect(bus);
              }
              if (patch.reverb > 0) {
                const ambienceA = ctx.createDelay(0.15);
                const ambienceB = ctx.createDelay(0.15);
                const wetA = ctx.createGain();
                const wetB = ctx.createGain();
                ambienceA.delayTime.value = 0.043;
                ambienceB.delayTime.value = 0.071;
                wetA.gain.value = patch.reverb * 0.34;
                wetB.gain.value = patch.reverb * 0.24;
                amp.connect(ambienceA).connect(wetA).connect(bus);
                amp.connect(ambienceB).connect(wetB).connect(bus);
              }
              amp.gain.setValueAtTime(0.0001, startAt);
              const attackEnd = Math.min(endAt, startAt + patch.attack);
              const decayEnd = Math.min(endAt, attackEnd + patch.decay);
              amp.gain.linearRampToValueAtTime(peak, attackEnd);
              amp.gain.exponentialRampToValueAtTime(sustain, decayEnd);
              amp.gain.setValueAtTime(sustain, endAt);
              amp.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

              const voiceCount = Math.max(1, Math.round(patch.unison));
              const addOscillator = (
                type: OscillatorType,
                frequency: number,
                level: number,
                tune = 0,
              ) => {
                for (let voice = 0; voice < voiceCount; voice++) {
                  const osc = ctx.createOscillator();
                  const voiceGain = ctx.createGain();
                  const voicePan = ctx.createStereoPanner();
                  const spread =
                    voiceCount === 1 ? 0 : voice / (voiceCount - 1) - 0.5;
                  osc.type = type;
                  osc.frequency.value = frequency * Math.pow(2, tune / 12);
                  osc.detune.value = spread * patch.detune * 2;
                  voiceGain.gain.value = level / voiceCount;
                  voicePan.pan.value = spread * patch.width * 1.8;
                  osc.connect(voiceGain).connect(voicePan).connect(filter);
                  osc.start(startAt);
                  osc.stop(releaseEnd + 0.03);
                  if (ctx instanceof AudioContext) sources.current.push(osc);
                }
              };
              addOscillator(patch.osc1, baseFrequency, 1 - patch.mix * 0.55);
              addOscillator(
                patch.osc2,
                baseFrequency,
                patch.mix,
                patch.osc2Tune,
              );
              if (patch.sub > 0) {
                const sub = ctx.createOscillator();
                const subGain = ctx.createGain();
                sub.type = 'sine';
                sub.frequency.value = baseFrequency / 2;
                subGain.gain.value = patch.sub;
                sub.connect(subGain).connect(filter);
                sub.start(startAt);
                sub.stop(releaseEnd + 0.03);
                if (ctx instanceof AudioContext) sources.current.push(sub);
              }
              if (patch.noise > 0) {
                const noise = ctx.createBufferSource();
                const noiseGain = ctx.createGain();
                const frames = Math.max(
                  1,
                  Math.ceil((releaseEnd - startAt) * ctx.sampleRate),
                );
                const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < frames; i++)
                  data[i] = Math.random() * 2 - 1;
                noise.buffer = buffer;
                noiseGain.gain.value = patch.noise;
                noise.connect(noiseGain).connect(filter);
                noise.start(startAt);
                if (ctx instanceof AudioContext) sources.current.push(noise);
              }
              if (patch.lfoDepth > 0) {
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                lfo.type = 'sine';
                lfo.frequency.value = patch.lfoRate;
                lfoGain.gain.value = patch.cutoff * patch.lfoDepth * 0.72;
                lfo.connect(lfoGain).connect(filter.frequency);
                lfo.start(startAt);
                lfo.stop(releaseEnd + 0.03);
                if (ctx instanceof AudioContext) sources.current.push(lfo);
              }
            });
        });
      });
    },
    [tracks],
  );
  const playAtRef = useRef<(at: number) => Promise<void>>(async () => {});
  const playAt = useCallback(
    async (at: number) => {
      const ctx = audioContext();
      await ctx.resume();
      stop();
      const masterNode = ctx.createGain();
      masterNode.gain.value = master;
      masterNode.connect(ctx.destination);
      buildGraph(ctx, at, masterNode);
      if (metronome) {
        const beat = 60 / bpm;
        for (
          let time = Math.ceil(at / beat) * beat;
          time < duration;
          time += beat
        ) {
          const osc = ctx.createOscillator(),
            click = ctx.createGain(),
            starts = ctx.currentTime + time - at;
          osc.frequency.value = Math.round(time / beat) % 4 === 0 ? 1320 : 920;
          click.gain.setValueAtTime(0.0001, starts);
          click.gain.exponentialRampToValueAtTime(0.16, starts + 0.002);
          click.gain.exponentialRampToValueAtTime(0.0001, starts + 0.045);
          osc.connect(click).connect(masterNode);
          osc.start(starts);
          osc.stop(starts + 0.05);
          sources.current.push(osc);
        }
      }
      startedAt.current = ctx.currentTime - at;
      setPosition(at);
      setPlaying(true);
      const tick = () => {
        const next = ctx.currentTime - startedAt.current;
        if (loopEnabled && next >= loopEnd) {
          void playAtRef.current(loopStart);
        } else if (next >= duration) stop(true);
        else {
          setPosition(next);
          raf.current = requestAnimationFrame(tick);
        }
      };
      raf.current = requestAnimationFrame(tick);
    },
    [
      audioContext,
      bpm,
      buildGraph,
      duration,
      loopEnabled,
      loopEnd,
      loopStart,
      master,
      metronome,
      stop,
    ],
  );
  playAtRef.current = playAt;
  const play = useCallback(() => playAt(position), [playAt, position]);

  const seekPianoRuler = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!selectedClip || selectedClip.type !== 'midi') return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width),
      );
      const nextPosition = selectedClip.start + ratio * selectedClip.duration;
      if (playing) void playAtRef.current(nextPosition);
      else setPosition(nextPosition);
    },
    [playing, selectedClip],
  );

  const importFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list).filter(
        (f) =>
          f.type.startsWith('audio/') ||
          /\.(wav|mp3|m4a|ogg|flac)$/i.test(f.name),
      );
      if (!files.length)
        return setStatus('That file is not a supported audio format');
      try {
        const ctx = audioContext(),
          decoded = await Promise.all(
            files.map(async (file) => ({
              file,
              buffer: await ctx.decodeAudioData(await file.arrayBuffer()),
            })),
          );
        checkpoint();
        setTracks((current) => {
          const next = current.map((t) => ({ ...t, clips: [...t.clips] }));
          decoded.forEach(({ file, buffer }, n) => {
            let target =
              n === 0
                ? next.find(
                    (t) => t.id === selectedTrackId && t.kind === 'audio',
                  )
                : undefined;
            if (!target || target.clips.length) {
              target = makeTrack(next.length, 'audio');
              next.push(target);
            }
            const clip: Clip = {
              id: crypto.randomUUID(),
              type: 'audio',
              name: file.name.replace(/\.[^.]+$/, ''),
              start: n === 0 ? position : 0,
              duration: buffer.duration,
              offset: 0,
              buffer,
              peaks: getPeaks(buffer),
              notes: [],
            };
            target.clips.push(clip);
            if (!n) {
              setSelectedTrackId(target.id);
              setSelectedClipId(clip.id);
            }
          });
          return next;
        });
        setStatus(
          `${decoded.length} audio file${decoded.length > 1 ? 's' : ''} added — drag a clip or its edges to edit`,
        );
      } catch {
        setStatus('This browser could not decode that audio file');
      }
    },
    [audioContext, checkpoint, position, selectedTrackId],
  );

  const addSynth = (requestedTrackId?: string) => {
    checkpoint();
    const clip = defaultMidiClip(position, bpm),
      requestedTrack = tracks.find(
        (track) => track.id === requestedTrackId && track.kind === 'synth',
      ),
      targetId =
        requestedTrack?.id ??
        (selectedTrack?.kind === 'synth' ? selectedTrack.id : undefined);
    if (targetId) {
      setTracks((old) =>
        old.map((t) =>
          t.id === targetId
            ? { ...t, kind: 'synth', clips: [...t.clips, clip] }
            : t,
        ),
      );
      setSelectedTrackId(targetId);
    } else {
      const track = makeTrack(tracks.length, 'synth');
      track.clips = [clip];
      setTracks((old) => [...old, track]);
      setSelectedTrackId(track.id);
    }
    setSelectedClipId(clip.id);
    setBottomMode('piano');
    setStatus(
      'Simple Synth added to the selected track — click the piano roll to edit notes',
    );
  };
  const addDrumRack = async () => {
    checkpoint();
    const track = makeTrack(tracks.length, 'drum');
    const clip = defaultDrumClip(position, bpm);
    track.clips = [clip];
    setTracks((old) => [...old, track]);
    setSelectedTrackId(track.id);
    setSelectedClipId(clip.id);
    setBottomMode('drums');
    setBottomHeight((height) => Math.max(height, 360));
    setStatus('Loading the open drum library…');
    await Promise.all([...new Set(track.drumMap)].map(loadDrumSound));
    setStatus(
      'Drum Rack ready — hit pads, choose sounds, and program the 16-step pattern',
    );
  };
  const addDrumClip = (trackId: string) => {
    checkpoint();
    const clip = defaultDrumClip(position, bpm);
    setTracks((old) =>
      old.map((track) =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, clip] }
          : track,
      ),
    );
    setSelectedTrackId(trackId);
    setSelectedClipId(clip.id);
    setBottomMode('drums');
    setStatus('New drum clip added');
  };
  const addAudioTrack = () => {
    checkpoint();
    const track = makeTrack(tracks.length, 'audio');
    track.armed = false;
    setTracks((old) => [...old, track]);
    setSelectedTrackId(track.id);
    setStatus('Audio track added');
  };
  const duplicateTrack = (trackId: string) => {
    const source = tracks.find((track) => track.id === trackId);
    if (!source) return;
    checkpoint();
    const clone: Track = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} copy`,
      armed: false,
      effects: source.effects.map((effect) => ({
        ...effect,
        id: crypto.randomUUID(),
      })),
      clips: source.clips.map((clip) => ({
        ...clip,
        id: crypto.randomUUID(),
        notes: clip.notes.map((note) => ({
          ...note,
          id: crypto.randomUUID(),
        })),
      })),
      drumMap: [...source.drumMap],
    };
    setTracks((old) => {
      const index = old.findIndex((track) => track.id === trackId);
      const next = [...old];
      next.splice(index + 1, 0, clone);
      return next;
    });
    setSelectedTrackId(clone.id);
    setSelectedClipId(clone.clips[0]?.id ?? '');
    setStatus('Track duplicated');
  };
  const deleteTrack = (trackId: string) => {
    if (tracks.length <= 1)
      return setStatus('A session needs at least one track');
    checkpoint();
    const index = tracks.findIndex((track) => track.id === trackId);
    const nextSelection = tracks[index - 1] ?? tracks[index + 1];
    setTracks((old) => old.filter((track) => track.id !== trackId));
    setSelectedTrackId(nextSelection?.id ?? '');
    setSelectedClipId('');
    setStatus('Track deleted');
  };
  const setDrumSound = async (pad: number, soundId: string) => {
    if (!selectedTrack || selectedTrack.kind !== 'drum') return;
    checkpoint();
    updateTrack(selectedTrack.id, {
      drumMap: selectedTrack.drumMap.map((value, index) =>
        index === pad ? soundId : value,
      ),
    });
    await loadDrumSound(soundId);
    void auditionDrum(soundId);
  };
  const setDrumKit = (pad: number, kit: DrumSound['kit']) => {
    if (!selectedTrack || selectedTrack.kind !== 'drum') return;
    const current = DRUM_SOUNDS.find(
      (sound) => sound.id === selectedTrack.drumMap[pad],
    );
    const replacement =
      DRUM_SOUNDS.find(
        (sound) => sound.kit === kit && sound.name === current?.name,
      ) ?? DRUM_SOUNDS.find((sound) => sound.kit === kit);
    if (replacement) void setDrumSound(pad, replacement.id);
  };
  const toggleDrumStep = (pad: number, stepIndex: number) => {
    if (
      !selectedTrack ||
      selectedTrack.kind !== 'drum' ||
      selectedClip?.type !== 'midi'
    )
      return;
    checkpoint();
    const pitch = 36 + pad;
    const step = drumStepSeconds;
    const noteStart = Math.min(
      stepIndex * step,
      selectedClip.duration - step / 4,
    );
    const found = selectedClip.notes.find(
      (note) =>
        note.pitch === pitch && Math.abs(note.start - noteStart) < step / 3,
    );
    updateClip(selectedClip.id, {
      notes: found
        ? selectedClip.notes.filter((note) => note.id !== found.id)
        : [
            ...selectedClip.notes,
            {
              id: crypto.randomUUID(),
              pitch,
              start: noteStart,
              duration: step * 0.78,
              velocity: 0.9,
            },
          ],
    });
    if (!found) void auditionDrum(selectedTrack.drumMap[pad], 0.9);
  };
  const toggleRecord = useCallback(async () => {
    if (recording && recorder.current) return recorder.current.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const media = new MediaRecorder(stream);
      recorder.current = media;
      media.ondataavailable = (e) => chunks.current.push(e.data);
      media.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const buffer = await audioContext().decodeAudioData(
            await new Blob(chunks.current, {
              type: media.mimeType,
            }).arrayBuffer(),
          ),
          clip: Clip = {
            id: crypto.randomUUID(),
            type: 'audio',
            name: 'Voice recording',
            start: position,
            duration: buffer.duration,
            offset: 0,
            buffer,
            peaks: getPeaks(buffer),
            notes: [],
          };
        checkpoint();
        setTracks((current) => {
          let target = current.find((t) => t.armed && t.kind === 'audio');
          if (!target) target = current.find((t) => t.kind === 'audio');
          const withTarget = target
            ? current
            : [...current, (target = makeTrack(current.length, 'audio'))];
          const targetId = target.id;
          setTimeout(() => setSelectedTrackId(targetId), 0);
          return withTarget.map((t) =>
            t.id === target?.id ? { ...t, clips: [...t.clips, clip] } : t,
          );
        });
        setSelectedClipId(clip.id);
        setStatus(
          'Recording added — drag to move, drag edges to trim, or use Split/Delete below',
        );
      };
      media.start();
      setRecording(true);
      setStatus('Recording… click record again to stop');
    } catch {
      setStatus('Microphone permission is needed to record');
    }
  }, [audioContext, checkpoint, position, recording]);

  const splitClip = useCallback(() => {
    if (!selectedClip) return;
    const cut = position - selectedClip.start;
    if (cut <= 0.05 || cut >= selectedClip.duration - 0.05)
      return setStatus('Place the playhead inside the selected clip to split');
    checkpoint();
    setTracks((old) =>
      old.map((t) => ({
        ...t,
        clips: t.clips.flatMap((c) => {
          if (c.id !== selectedClip.id) return [c];
          if (c.type === 'midi') {
            const leftNotes = c.notes
              .filter((note) => note.start < cut)
              .map((note) => ({
                ...note,
                duration: Math.min(note.duration, cut - note.start),
              }));
            const rightNotes = c.notes
              .filter((note) => note.start + note.duration > cut)
              .map((note) => ({
                ...note,
                id: crypto.randomUUID(),
                start: Math.max(0, note.start - cut),
                duration:
                  note.start < cut
                    ? note.start + note.duration - cut
                    : note.duration,
              }));
            return [
              { ...c, duration: cut, notes: leftNotes },
              {
                ...c,
                id: crypto.randomUUID(),
                name: `${c.name} (2)`,
                start: position,
                duration: c.duration - cut,
                notes: rightNotes,
              },
            ];
          }
          return [
            { ...c, duration: cut },
            {
              ...c,
              id: crypto.randomUUID(),
              name: `${c.name} (2)`,
              start: position,
              offset: c.offset + cut,
              duration: c.duration - cut,
            },
          ];
        }),
      })),
    );
    setStatus(`Split clip at ${clock(position)}`);
  }, [checkpoint, position, selectedClip]);
  const deleteClip = useCallback(() => {
    if (!selectedClipId) return;
    checkpoint();
    setTracks((old) =>
      old.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== selectedClipId),
      })),
    );
    setSelectedClipId('');
    setStatus('Clip deleted');
  }, [checkpoint, selectedClipId]);
  const duplicateClip = () => {
    if (!selectedClip) return;
    checkpoint();
    const clone = {
      ...selectedClip,
      id: crypto.randomUUID(),
      name: `${selectedClip.name} copy`,
      start: selectedClip.start + selectedClip.duration,
    };
    setTracks((old) =>
      old.map((t) =>
        t.clips.some((c) => c.id === selectedClip.id)
          ? { ...t, clips: [...t.clips, clone] }
          : t,
      ),
    );
    setSelectedClipId(clone.id);
  };

  const startGesture = (
    event: ReactPointerEvent,
    trackId: string,
    clip: Clip,
    mode: 'move' | 'left' | 'right',
  ) => {
    event.stopPropagation();
    event.preventDefault();
    setSelectedTrackId(trackId);
    setSelectedClipId(clip.id);
    if (clip.type === 'midi')
      setBottomMode(
        tracks.find((track) => track.id === trackId)?.kind === 'drum'
          ? 'drums'
          : 'piano',
      );
    checkpoint();
    gesture.current = {
      clipId: clip.id,
      trackId,
      startX: event.clientX,
      startY: event.clientY,
      originalStart: clip.start,
      originalDuration: clip.duration,
      originalOffset: clip.offset,
      originalNotes: clip.notes.map((note) => ({ ...note })),
      mode,
    };
  };
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      const dx = (event.clientX - g.startX) / pixelsPerSecond,
        snap = (value: number) => Math.max(0, Math.round(value * 8) / 8);
      if (g.mode === 'move') {
        const start = snap(g.originalStart + dx),
          originIndex = tracks.findIndex((t) => t.id === g.trackId),
          sourceTrack = tracks.find((t) =>
            t.clips.some((c) => c.id === g.clipId),
          ),
          sourceClip = sourceTrack?.clips.find((c) => c.id === g.clipId),
          targetIndex = Math.max(
            0,
            Math.min(
              tracks.length - 1,
              originIndex + Math.round((event.clientY - g.startY) / ROW_H),
            ),
          ),
          target = tracks[targetIndex];
        if (sourceTrack && sourceClip && target.kind === sourceTrack.kind)
          setTracks((old) =>
            old.map((t) =>
              t.id === sourceTrack.id
                ? {
                    ...t,
                    clips:
                      t.id === target.id
                        ? t.clips.map((c) =>
                            c.id === g.clipId ? { ...c, start } : c,
                          )
                        : t.clips.filter((c) => c.id !== g.clipId),
                  }
                : t.id === target.id
                  ? { ...t, clips: [...t.clips, { ...sourceClip, start }] }
                  : t,
            ),
          );
        else updateClip(g.clipId, { start });
      }
      if (g.mode === 'right') {
        const clip = tracks
            .flatMap((t) => t.clips)
            .find((c) => c.id === g.clipId),
          maximum = clip?.buffer ? clip.buffer.duration - g.originalOffset : 64,
          nextDuration = Math.max(
            0.125,
            Math.min(maximum, Math.round((g.originalDuration + dx) * 8) / 8),
          );
        updateClip(g.clipId, {
          duration: nextDuration,
          ...(clip?.type === 'midi'
            ? {
                notes: g.originalNotes
                  .filter((note) => note.start < nextDuration)
                  .map((note) => ({
                    ...note,
                    duration: Math.min(
                      note.duration,
                      nextDuration - note.start,
                    ),
                  })),
              }
            : {}),
        });
      }
      if (g.mode === 'left') {
        const delta = Math.max(
          -g.originalStart,
          -g.originalOffset,
          Math.min(g.originalDuration - 0.125, Math.round(dx * 8) / 8),
        );
        updateClip(g.clipId, {
          start: g.originalStart + delta,
          offset: g.originalOffset + delta,
          duration: g.originalDuration - delta,
          notes: g.originalNotes
            .filter((note) => note.start + note.duration > delta)
            .map((note) => ({
              ...note,
              start: Math.max(0, note.start - delta),
              duration:
                note.start < delta
                  ? note.start + note.duration - delta
                  : note.duration,
            })),
        });
      }
    };
    const up = () => {
      if (gesture.current) setStatus('Clip edit applied');
      gesture.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [pixelsPerSecond, tracks, updateClip]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const g = noteGesture.current;
      if (!g || !selectedClip || selectedClip.type !== 'midi') return;
      const editor = document.querySelector(
          '.piano-grid',
        ) as HTMLElement | null,
        pixelsPerBeat = editor
          ? editor.clientWidth / selectedClip.duration
          : 90,
        delta = (event.clientX - g.startX) / pixelsPerBeat,
        snapped = Math.round(delta / snapSeconds) * snapSeconds,
        rowDelta = Math.round((event.clientY - g.startY) / 22),
        movedPitches = g.notes.map((note) =>
          Math.max(0, Math.min(127, note.pitch - rowDelta)),
        ),
        pitchMoveAllowed = movedPitches.every(inKey),
        originals = new Map(g.notes.map((note) => [note.id, note]));
      const notes = selectedClip.notes.map((note) => {
        const original = originals.get(note.id);
        if (!original) return note;
        if (g.mode === 'resize')
          return {
            ...note,
            duration: Math.max(
              snapSeconds,
              Math.min(
                selectedClip.duration - original.start,
                original.duration + snapped,
              ),
            ),
          };
        return {
          ...note,
          pitch: pitchMoveAllowed
            ? Math.max(0, Math.min(127, original.pitch - rowDelta))
            : original.pitch,
          start: Math.max(
            0,
            Math.min(
              selectedClip.duration - original.duration,
              original.start + snapped,
            ),
          ),
        };
      });
      updateClip(selectedClip.id, { notes });
    };
    const up = () => {
      noteGesture.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [inKey, selectedClip, snapSeconds, updateClip]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const g = loopGesture.current;
      if (!g) return;
      const beat = 60 / bpm,
        delta =
          Math.round((event.clientX - g.startX) / pixelsPerSecond / beat) *
          beat,
        length = g.originalEnd - g.originalStart;
      if (g.mode === 'move') {
        const start = Math.max(0, g.originalStart + delta);
        setLoopStart(start);
        setLoopEnd(start + length);
      } else if (g.mode === 'left') {
        setLoopStart(
          Math.max(0, Math.min(g.originalEnd - beat, g.originalStart + delta)),
        );
      } else {
        setLoopEnd(Math.max(g.originalStart + beat, g.originalEnd + delta));
      }
    };
    const up = () => {
      loopGesture.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [bpm, pixelsPerSecond]);

  useEffect(() => {
    if (bottomMode !== 'piano' || !selectedClipId) return;
    requestAnimationFrame(() => {
      if (pianoEditor.current)
        pianoEditor.current.scrollTop =
          67 * 22 - pianoEditor.current.clientHeight / 2;
    });
  }, [bottomMode, selectedClipId]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!resizeStart.current) return;
      const next =
        resizeStart.current.height + resizeStart.current.y - event.clientY;
      setBottomHeight(Math.max(180, Math.min(window.innerHeight - 190, next)));
      setEditorMaximized(false);
    };
    const up = () => {
      resizeStart.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const addEffect = (trackId: string, type: EffectType) => {
    checkpoint();
    const [amount, param1, param2, param3, param4] =
      EFFECT_CONTROLS[type].defaults;
    setTracks((old) =>
      old.map((t) =>
        t.id === trackId
          ? {
              ...t,
              effects: [
                ...t.effects,
                {
                  id: crypto.randomUUID(),
                  type,
                  enabled: true,
                  amount,
                  param1,
                  param2,
                  param3,
                  param4,
                },
              ],
            }
          : t,
      ),
    );
    setSelectedTrackId(trackId);
    setBottomMode('devices');
    setStatus(`${EFFECT_INFO[type].name} added to track`);
  };
  const dropEffect = (event: DragEvent, trackId: string) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('openwave/effect') as EffectType;
    if (EFFECT_INFO[type]) addEffect(trackId, type);
  };
  const updateEffect = (
    trackId: string,
    effectId: string,
    patch: Partial<Effect>,
  ) =>
    setTracks((old) =>
      old.map((t) =>
        t.id === trackId
          ? {
              ...t,
              effects: t.effects.map((e) =>
                e.id === effectId ? { ...e, ...patch } : e,
              ),
            }
          : t,
      ),
    );
  const exportMix = useCallback(async () => {
    if (!tracks.some((t) => t.clips.length))
      return setStatus('Add audio or a synth clip before exporting');
    setStatus('Rendering your mix…');
    await Promise.all(
      tracks
        .filter((track) => track.kind === 'drum')
        .flatMap((track) => [...new Set(track.drumMap)])
        .map(loadDrumSound),
    );
    const seconds = Math.max(
        1,
        ...tracks.flatMap((t) => t.clips.map((c) => c.start + c.duration)),
      ),
      offline = new OfflineAudioContext(2, Math.ceil(seconds * 44100), 44100),
      masterNode = offline.createGain();
    masterNode.gain.value = master;
    masterNode.connect(offline.destination);
    buildGraph(offline, 0, masterNode);
    const rendered = await offline.startRendering(),
      url = URL.createObjectURL(makeWav(rendered)),
      a = document.createElement('a');
    a.href = url;
    const safeName =
      projectName.trim().replace(/[^a-z0-9-_]+/gi, '-') || 'openwave-mix';
    a.download = `${safeName}.wav`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Mix exported as ${safeName}.wav`);
  }, [buildGraph, loadDrumSound, master, projectName, tracks]);

  const startNoteGesture = (
    event: ReactPointerEvent,
    note: Note,
    mode: 'move' | 'resize',
  ) => {
    event.stopPropagation();
    if (!selectedClip || selectedClip.type !== 'midi') return;
    if (event.shiftKey) {
      setSelectedNoteIds((current) =>
        current.includes(note.id)
          ? current.filter((id) => id !== note.id)
          : [...current, note.id],
      );
      return;
    }
    checkpoint();
    const activeIds = selectedNoteIds.includes(note.id)
      ? selectedNoteIds
      : [note.id];
    let activeNotes = selectedClip.notes.filter((item) =>
      activeIds.includes(item.id),
    );
    if (!selectedNoteIds.includes(note.id)) setSelectedNoteIds([note.id]);
    if (event.altKey && mode === 'move') {
      const copies = activeNotes.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      }));
      updateClip(selectedClip.id, {
        notes: [...selectedClip.notes, ...copies],
      });
      activeNotes = copies;
      setSelectedNoteIds(copies.map((item) => item.id));
      setStatus(`${copies.length} note${copies.length > 1 ? 's' : ''} copied`);
    }
    noteGesture.current = {
      notes: activeNotes.map(({ id, start, duration, pitch }) => ({
        id,
        start,
        duration,
        pitch,
      })),
      startX: event.clientX,
      startY: event.clientY,
      mode,
    };
  };

  const insertChordSequence = () => {
    if (!selectedClip || selectedClip.type !== 'midi' || !chordSequence.length)
      return;
    checkpoint();
    const beat = 60 / bpm;
    const chordDuration = chordBeats * beat;
    const localPlayhead = Math.max(0, position - selectedClip.start);
    const insertAt = Math.round(localPlayhead / beat) * beat;
    const scale =
      keyScale === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
    const created: Note[] = [];
    chordSequence.forEach((degree, chordIndex) => {
      const tones = [0, 2, 4].map((step) => {
        const scaleIndex = degree + step;
        return (
          48 + keyRoot + scale[scaleIndex % 7] + 12 * Math.floor(scaleIndex / 7)
        );
      });
      for (let inversion = 0; inversion < chordInversion; inversion++)
        tones[inversion % tones.length] += 12;
      tones
        .sort((a, b) => a - b)
        .forEach((pitch) =>
          created.push({
            id: crypto.randomUUID(),
            pitch,
            start: insertAt + chordIndex * chordDuration,
            duration: Math.max(snapSeconds, chordDuration * 0.92),
            velocity: 0.78,
          }),
        );
    });
    const requiredDuration = insertAt + chordSequence.length * chordDuration;
    updateClip(selectedClip.id, {
      duration: Math.max(selectedClip.duration, requiredDuration),
      notes: [...selectedClip.notes, ...created],
    });
    setSelectedNoteIds(created.map((note) => note.id));
    setStatus(
      `${chordSequence.length}-chord progression added in ${NOTE_NAMES[keyRoot]} ${keyScale}`,
    );
  };

  const toggleNote = (pitch: number, noteStart: number) => {
    if (!selectedClip || selectedClip.type !== 'midi' || !inKey(pitch)) return;
    checkpoint();
    const snappedStart = Math.floor(noteStart / snapSeconds) * snapSeconds,
      existing = selectedClip.notes.find(
        (n) =>
          n.pitch === pitch &&
          snappedStart >= n.start &&
          snappedStart < n.start + n.duration,
      ),
      notes = existing
        ? selectedClip.notes.filter((n) => n.id !== existing.id)
        : [
            ...selectedClip.notes,
            {
              id: crypto.randomUUID(),
              pitch,
              start: snappedStart,
              duration: snapSeconds,
              velocity: 0.75,
            },
          ];
    updateClip(selectedClip.id, { notes });
  };
  const deleteSelectedNotes = useCallback(() => {
    if (
      !selectedClip ||
      selectedClip.type !== 'midi' ||
      !selectedNoteIds.length
    )
      return;
    checkpoint();
    updateClip(selectedClip.id, {
      notes: selectedClip.notes.filter(
        (note) => !selectedNoteIds.includes(note.id),
      ),
    });
    setStatus(
      `${selectedNoteIds.length} MIDI note${selectedNoteIds.length > 1 ? 's' : ''} deleted`,
    );
    setSelectedNoteIds([]);
  }, [checkpoint, selectedClip, selectedNoteIds, updateClip]);
  const duplicateSelectedNotes = useCallback(() => {
    if (
      !selectedClip ||
      selectedClip.type !== 'midi' ||
      !selectedNoteIds.length
    )
      return;
    checkpoint();
    const copies = selectedClip.notes
      .filter((note) => selectedNoteIds.includes(note.id))
      .map((note) => ({
        ...note,
        id: crypto.randomUUID(),
        start: Math.min(
          selectedClip.duration - note.duration,
          note.start + snapSeconds,
        ),
      }));
    updateClip(selectedClip.id, {
      notes: [...selectedClip.notes, ...copies],
    });
    setSelectedNoteIds(copies.map((note) => note.id));
    setStatus(
      `${copies.length} MIDI note${copies.length > 1 ? 's' : ''} duplicated`,
    );
  }, [checkpoint, selectedClip, selectedNoteIds, snapSeconds, updateClip]);
  const transposeSelectedNotes = useCallback(
    (semitones: number) => {
      if (
        !selectedClip ||
        selectedClip.type !== 'midi' ||
        !selectedNoteIds.length
      )
        return;
      const selected = selectedClip.notes.filter((note) =>
        selectedNoteIds.includes(note.id),
      );
      if (
        selected.some(
          (note) => note.pitch + semitones < 0 || note.pitch + semitones > 127,
        )
      ) {
        setStatus('Selection cannot move beyond the MIDI note range');
        return;
      }
      checkpoint();
      updateClip(selectedClip.id, {
        notes: selectedClip.notes.map((note) =>
          selectedNoteIds.includes(note.id)
            ? { ...note, pitch: note.pitch + semitones }
            : note,
        ),
      });
      setStatus(
        `${selected.length} MIDI note${selected.length > 1 ? 's' : ''} moved ${semitones > 0 ? 'up' : 'down'} one octave`,
      );
    },
    [checkpoint, selectedClip, selectedNoteIds, updateClip],
  );
  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (bottomMode === 'piano' && selectedNoteIds.length)
          duplicateSelectedNotes();
        else duplicateClip();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'a' &&
        bottomMode === 'piano' &&
        selectedClip?.type === 'midi'
      ) {
        e.preventDefault();
        setSelectedNoteIds(selectedClip.notes.map((note) => note.id));
        return;
      }
      if (
        e.shiftKey &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        bottomMode === 'piano' &&
        selectedNoteIds.length &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        transposeSelectedNotes(e.key === 'ArrowUp' ? 12 : -12);
        return;
      }
      if (
        e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        playing ? stop() : void play();
      }
      const editingText =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);
      if ((e.key === 'Delete' || e.key === 'Backspace') && !editingText) {
        if (bottomMode === 'piano' && selectedNoteIds.length)
          deleteSelectedNotes();
        else deleteClip();
      }
      if (e.key === 'Home' && !editingText) {
        e.preventDefault();
        stop(true);
      }
      if (e.key === 'Escape') stop();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [
    bottomMode,
    deleteClip,
    deleteSelectedNotes,
    duplicateClip,
    duplicateSelectedNotes,
    play,
    playing,
    redo,
    selectedClip,
    selectedNoteIds.length,
    stop,
    transposeSelectedNotes,
    undo,
  ]);
  const bars = Array.from({ length: Math.ceil(duration / 2) }, (_, n) => n + 1);

  return (
    <main
      className="studio"
      style={{
        gridTemplateRows: editorMaximized
          ? '48px 58px 0px calc(100vh - 134px) 28px'
          : `48px 58px minmax(150px, 1fr) ${bottomHeight}px 28px`,
      }}
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDraggingFile(true);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDraggingFile(false);
      }}
      onDrop={(e: DragEvent) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          setDraggingFile(false);
          void importFiles(e.dataTransfer.files);
        }
      }}
    >
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Waves size={17} />
          </span>
          <strong>Openwave</strong>
          <span className="prototype">prototype</span>
        </div>
        <div className="project-name">
          <span className="saved-dot" />
          <input
            aria-label="Project name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
        </div>
        <div className="top-actions">
          <button
            className="ghost-button"
            onClick={() => fileInput.current?.click()}
          >
            <FolderOpen size={15} /> Import
          </button>
          <button className="export-button" onClick={() => void exportMix()}>
            <Download size={15} /> Export WAV
          </button>
        </div>
      </header>
      <section className="transport">
        <div className="transport-left">
          <button className="icon-button" title="Undo (Ctrl+Z)" onClick={undo}>
            <Undo2 size={15} />
          </button>
          <button
            className="icon-button"
            title="Redo (Ctrl+Shift+Z)"
            onClick={redo}
          >
            <Redo2 size={15} />
          </button>
          <button
            className="icon-button"
            title="Return to start"
            onClick={() => stop(true)}
          >
            <RotateCcw size={16} />
          </button>
          <button
            className="play-button"
            title="Play / pause (Space)"
            onClick={() => (playing ? stop() : void play())}
          >
            {playing ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>
          <button
            className={`record-button ${recording ? 'active' : ''}`}
            title="Record microphone"
            onClick={() => void toggleRecord()}
          >
            <Circle size={15} fill="currentColor" />
          </button>
          <button
            className={`icon-button transport-toggle ${loopEnabled ? 'active' : ''}`}
            title="Toggle arrangement loop"
            onClick={() => {
              checkpoint();
              setLoopEnabled((value) => !value);
              if (playing)
                setTimeout(() => void playAtRef.current(position), 0);
            }}
          >
            <Repeat2 size={16} />
          </button>
          <button
            className={`icon-button transport-toggle ${metronome ? 'active' : ''}`}
            title="Toggle metronome"
            onClick={() => {
              setMetronome((value) => !value);
              if (playing)
                setTimeout(() => void playAtRef.current(position), 0);
            }}
          >
            <span className="metronome-icon">♩</span>
          </button>
          <output className="time-readout">{clock(position)}</output>
        </div>
        <div className="tempo-control" title="Drag the BPM value up or down">
          <span className="tempo-label">TEMPO</span>
          <button
            className="tempo-step"
            aria-label="Decrease tempo"
            onClick={() => changeTempo(bpmRef.current - 1)}
          >
            −
          </button>
          <label
            className="tempo-value"
            onPointerDown={(event) => {
              if (event.target instanceof HTMLInputElement) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              tempoDrag.current = {
                pointerId: event.pointerId,
                startY: event.clientY,
                bpm: bpmRef.current,
              };
              checkpoint();
            }}
            onPointerMove={(event) => {
              const drag = tempoDrag.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              changeTempo(drag.bpm + (drag.startY - event.clientY) / 2, false);
            }}
            onPointerUp={() => {
              tempoDrag.current = null;
            }}
          >
            <input
              aria-label="Tempo in BPM"
              inputMode="numeric"
              value={tempoDraft}
              onChange={(event) => setTempoDraft(event.target.value)}
              onBlur={commitTempoDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                  setTempoDraft(String(bpm));
                  event.currentTarget.blur();
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  changeTempo(bpmRef.current + (event.shiftKey ? 10 : 1));
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  changeTempo(bpmRef.current - (event.shiftKey ? 10 : 1));
                }
              }}
            />
            <b>BPM</b>
          </label>
          <button
            className="tempo-step"
            aria-label="Increase tempo"
            onClick={() => changeTempo(bpmRef.current + 1)}
          >
            +
          </button>
          <button
            className="tap-tempo"
            onClick={tapTempo}
            title="Tap repeatedly to detect tempo"
          >
            TAP
          </button>
        </div>
        <div className="master-control">
          <Volume2 size={15} />
          <span>MASTER</span>
          <input
            aria-label="Master volume"
            type="range"
            min="0"
            max="1"
            step=".01"
            value={master}
            onChange={(e) => setMaster(Number(e.target.value))}
          />
        </div>
        <div className="zoom-control">
          <ZoomOut size={13} />
          <input
            aria-label="Timeline zoom"
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={timelineZoom}
            onChange={(event) => setTimelineZoom(Number(event.target.value))}
          />
          <ZoomIn size={13} />
          <b>{Math.round(timelineZoom * 100)}%</b>
        </div>
      </section>
      <div className="workspace">
        <aside className="browser-panel">
          <div className="panel-heading">
            <span>Library</span>
            <AudioLines size={14} />
          </div>
          <button
            className="import-card"
            onClick={() => fileInput.current?.click()}
          >
            <span>
              <Plus size={18} />
            </span>
            <strong>Add audio</strong>
            <small>WAV, MP3, M4A, OGG</small>
          </button>
          <button className="synth-card" onClick={() => addSynth()}>
            <span>
              <Keyboard size={18} />
            </span>
            <strong>Simple Synth</strong>
            <small>Add track + MIDI clip</small>
          </button>
          <button className="drum-card" onClick={() => void addDrumRack()}>
            <span>
              <Drum size={18} />
            </span>
            <strong>Drum Rack</strong>
            <small>24 open sounds + sequencer</small>
          </button>
          <div className="library-section">
            <p>INSTRUMENTS</p>
            <button onClick={() => addSynth()}>
              <Keyboard size={14} /> Simple Synth <Plus size={12} />
            </button>
            <button onClick={() => void addDrumRack()}>
              <Drum size={14} /> Drum Rack <Plus size={12} />
            </button>
            <button disabled>
              <Guitar size={14} /> Sampler <small>soon</small>
            </button>
          </div>
          <div className="privacy-note">
            <Save size={14} />
            <span>
              <b>Local by design</b>Your audio never leaves this device.
            </span>
          </div>
        </aside>
        <section className="arrangement">
          <div className="ruler-row">
            <div className="track-header-label">
              <button onClick={addAudioTrack}>
                <Plus size={13} /> Audio
              </button>
              <button onClick={() => addSynth()}>
                <Keyboard size={13} /> Synth
              </button>
              <button onClick={() => void addDrumRack()}>
                <Drum size={13} /> Drums
              </button>
            </div>
            <div
              className="ruler"
              style={
                {
                  width: duration * pixelsPerSecond,
                  '--timeline-second': `${pixelsPerSecond}px`,
                } as React.CSSProperties
              }
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                seekFromPointer(e);
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  seekFromPointer(e);
              }}
            >
              {bars.map((bar) => (
                <span
                  key={bar}
                  style={{ left: (bar - 1) * pixelsPerSecond * 2 }}
                >
                  {bar}
                </span>
              ))}
              <div
                className={`loop-brace ${loopEnabled ? 'enabled' : ''}`}
                style={{
                  left: loopStart * pixelsPerSecond,
                  width: Math.max(24, (loopEnd - loopStart) * pixelsPerSecond),
                }}
                onPointerDown={(e) => startLoopGesture(e, 'move')}
                title="Drag to move the loop"
              >
                <button
                  className="loop-handle left"
                  aria-label="Resize loop start"
                  onPointerDown={(e) => startLoopGesture(e, 'left')}
                />
                <span>LOOP</span>
                <button
                  className="loop-handle right"
                  aria-label="Resize loop end"
                  onPointerDown={(e) => startLoopGesture(e, 'right')}
                />
              </div>
              <div
                className="ruler-playhead"
                style={{ left: position * pixelsPerSecond }}
              />
            </div>
          </div>
          <div className="tracks-scroll">
            {tracks.map((track, index) => (
              <div
                className={`track-row ${selectedTrack?.id === track.id ? 'selected' : ''}`}
                key={track.id}
                onClick={() => {
                  setSelectedTrackId(track.id);
                  setSelectedClipId(track.clips[0]?.id ?? '');
                  setBottomMode(
                    track.kind === 'drum'
                      ? 'drums'
                      : track.kind === 'synth'
                        ? 'piano'
                        : 'devices',
                  );
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => dropEffect(e, track.id)}
              >
                <div className="track-controls">
                  <span
                    className="track-number"
                    style={{ background: track.color }}
                  >
                    {track.kind === 'synth' ? (
                      <Keyboard size={12} />
                    ) : track.kind === 'drum' ? (
                      <Drum size={12} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="track-identity">
                    <input
                      aria-label="Track name"
                      value={track.name}
                      onChange={(e) =>
                        updateTrack(track.id, { name: e.target.value })
                      }
                    />
                    <small>
                      {track.kind === 'synth'
                        ? `${track.waveform} synth`
                        : track.kind === 'drum'
                          ? '16-pad sample rack'
                          : `${track.clips.length} audio clip${track.clips.length === 1 ? '' : 's'}`}
                    </small>
                  </div>
                  <div className="track-footer">
                    <div className="track-switches">
                      <button
                        className={track.armed ? 'armed' : ''}
                        disabled={track.kind !== 'audio'}
                        title="Arm track for recording"
                        onClick={(e) => {
                          e.stopPropagation();
                          checkpoint();
                          setTracks((old) =>
                            old.map((item) => ({
                              ...item,
                              armed:
                                item.id === track.id
                                  ? !track.armed
                                  : item.kind === 'audio'
                                    ? false
                                    : item.armed,
                            })),
                          );
                        }}
                      >
                        R
                      </button>
                      <button
                        className={track.solo ? 'solo' : ''}
                        title="Solo track"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTrack(track.id, { solo: !track.solo });
                        }}
                      >
                        S
                      </button>
                      <button
                        className={track.muted ? 'muted' : ''}
                        title="Mute track"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTrack(track.id, { muted: !track.muted });
                        }}
                      >
                        M
                      </button>
                      <button
                        title="Duplicate track"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateTrack(track.id);
                        }}
                      >
                        <Copy size={11} />
                      </button>
                      <button
                        className="remove-track"
                        title="Delete track"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTrack(track.id);
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="mini-mixer">
                      <label>
                        <span>VOL</span>
                        <input
                          aria-label={`${track.name} volume`}
                          type="range"
                          min="0"
                          max="1.3"
                          step=".01"
                          value={track.gain}
                          onChange={(e) =>
                            updateTrack(track.id, {
                              gain: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>PAN</span>
                        <input
                          aria-label={`${track.name} pan`}
                          type="range"
                          min="-1"
                          max="1"
                          step=".01"
                          value={track.pan}
                          onChange={(e) =>
                            updateTrack(track.id, {
                              pan: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div
                  className="track-lane"
                  style={
                    {
                      width: duration * pixelsPerSecond,
                      '--timeline-second': `${pixelsPerSecond}px`,
                    } as React.CSSProperties
                  }
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    seekFromPointer(e);
                  }}
                  onPointerMove={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId))
                      seekFromPointer(e);
                  }}
                >
                  {track.clips.map((clip) => (
                    <div
                      key={clip.id}
                      className={`clip ${clip.type} ${selectedClipId === clip.id ? 'clip-selected' : ''}`}
                      style={
                        {
                          left: clip.start * pixelsPerSecond,
                          width: Math.max(22, clip.duration * pixelsPerSecond),
                          '--track-color': track.color,
                        } as React.CSSProperties
                      }
                      onPointerDown={(e) =>
                        startGesture(e, track.id, clip, 'move')
                      }
                      onDoubleClick={() => {
                        setSelectedClipId(clip.id);
                        setSelectedTrackId(track.id);
                        setBottomMode(
                          clip.type === 'midi'
                            ? track.kind === 'drum'
                              ? 'drums'
                              : 'piano'
                            : 'devices',
                        );
                      }}
                    >
                      <button
                        className="trim-handle left"
                        aria-label="Trim clip start"
                        onPointerDown={(e) =>
                          startGesture(e, track.id, clip, 'left')
                        }
                      />
                      <div className="clip-title">
                        {clip.type === 'midi' ? (
                          <Keyboard size={11} />
                        ) : (
                          <Waves size={11} />
                        )}{' '}
                        {clip.name}
                      </div>
                      {clip.type === 'audio' ? (
                        <div className="waveform">
                          {clip.peaks.map((peak, n) => (
                            <i
                              key={n}
                              style={{ height: `${Math.max(8, peak * 82)}%` }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="midi-preview">
                          {clip.notes.map((note) => (
                            <i
                              key={note.id}
                              style={{
                                left: `${(note.start / clip.duration) * 100}%`,
                                width: `${(note.duration / clip.duration) * 100}%`,
                                top: `${midiPreviewTop(clip.notes, note.pitch, track.kind === 'drum')}%`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <button
                        className="trim-handle right"
                        aria-label="Trim clip end"
                        onPointerDown={(e) =>
                          startGesture(e, track.id, clip, 'right')
                        }
                      />
                    </div>
                  ))}
                  {!track.clips.length && (
                    <button
                      className="empty-lane"
                      onClick={(e) => {
                        e.stopPropagation();
                        track.kind === 'synth'
                          ? addSynth(track.id)
                          : track.kind === 'drum'
                            ? addDrumClip(track.id)
                            : fileInput.current?.click();
                      }}
                    >
                      <Plus size={14} />{' '}
                      {track.kind === 'synth'
                        ? 'Add MIDI clip'
                        : track.kind === 'drum'
                          ? 'Add drum pattern'
                          : 'Drop or add audio'}
                    </button>
                  )}
                  <div
                    className="playhead"
                    style={{ left: position * pixelsPerSecond }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="bottom-panel">
        <button
          className="panel-resizer"
          aria-label="Resize lower editor"
          onPointerDown={(e) => {
            e.preventDefault();
            resizeStart.current = { y: e.clientY, height: bottomHeight };
          }}
        >
          <span />
        </button>
        <aside className="effects-browser">
          <div className="bottom-title">
            <span>AUDIO EFFECTS</span>
            <small>Drag onto any track</small>
          </div>
          <div className="effect-list">
            {(Object.keys(EFFECT_INFO) as EffectType[]).map((type) => {
              const info = EFFECT_INFO[type],
                Icon = info.icon;
              return (
                <button
                  key={type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('openwave/effect', type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() =>
                    selectedTrack && addEffect(selectedTrack.id, type)
                  }
                >
                  <span style={{ color: info.color }}>
                    <Icon size={14} />
                  </span>
                  {info.name}
                  <Plus size={11} />
                </button>
              );
            })}
          </div>
        </aside>
        <div
          className="device-area"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => selectedTrack && dropEffect(e, selectedTrack.id)}
        >
          <div className="device-tabs">
            <button
              className={bottomMode === 'devices' ? 'active' : ''}
              onClick={() => setBottomMode('devices')}
            >
              Devices <span>{selectedTrack?.effects.length ?? 0}</span>
            </button>
            <button
              className={bottomMode === 'piano' ? 'active' : ''}
              disabled={
                selectedClip?.type !== 'midi' || selectedTrack?.kind === 'drum'
              }
              onClick={() => setBottomMode('piano')}
            >
              Piano Roll
            </button>
            <button
              className={bottomMode === 'drums' ? 'active' : ''}
              disabled={
                selectedClip?.type !== 'midi' || selectedTrack?.kind !== 'drum'
              }
              onClick={() => setBottomMode('drums')}
            >
              Drum Editor
            </button>
            {bottomMode === 'piano' && selectedClip?.type === 'midi' && (
              <div className="piano-options">
                <label>
                  KEY
                  <select
                    value={keyRoot}
                    onChange={(e) => setKeyRoot(Number(e.target.value))}
                  >
                    {NOTE_NAMES.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={keyScale}
                    onChange={(e) =>
                      setKeyScale(e.target.value as 'major' | 'minor')
                    }
                  >
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                  </select>
                </label>
                <label>
                  SNAP
                  <select
                    value={noteSnap}
                    onChange={(e) => setNoteSnap(Number(e.target.value))}
                  >
                    <option value=".25">1/16</option>
                    <option value=".5">1/8</option>
                    <option value="1">1/4</option>
                    <option value="2">1/2</option>
                  </select>
                </label>
              </div>
            )}
            {bottomMode === 'piano' && selectedClip?.type === 'midi' && (
              <div className="chord-generator">
                <span>CHORDS</span>
                {(keyScale === 'major'
                  ? ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
                  : ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']
                ).map((label, degree) => (
                  <button
                    className={chordSequence.includes(degree) ? 'active' : ''}
                    key={label}
                    title={`${NOTE_NAMES[(keyRoot + scaleNotes[degree]) % 12]} ${label}`}
                    onClick={() =>
                      setChordSequence((current) =>
                        current.includes(degree)
                          ? current.filter((item) => item !== degree)
                          : [...current, degree],
                      )
                    }
                  >
                    {label}
                  </button>
                ))}
                <select
                  aria-label="Chord length"
                  value={chordBeats}
                  onChange={(event) =>
                    setChordBeats(Number(event.target.value))
                  }
                >
                  <option value="1">1 beat</option>
                  <option value="2">2 beats</option>
                  <option value="4">1 bar</option>
                  <option value="8">2 bars</option>
                </select>
                <select
                  aria-label="Chord inversion"
                  value={chordInversion}
                  onChange={(event) =>
                    setChordInversion(Number(event.target.value))
                  }
                >
                  <option value="0">Root</option>
                  <option value="1">1st inv.</option>
                  <option value="2">2nd inv.</option>
                </select>
                <button
                  className="generate-chords"
                  disabled={!chordSequence.length}
                  onClick={insertChordSequence}
                >
                  <Sparkles size={11} /> INSERT
                </button>
              </div>
            )}
            <div className="clip-actions">
              <button disabled={!selectedClip} onClick={duplicateClip}>
                <Copy size={13} /> Duplicate
              </button>
              <button disabled={!selectedClip} onClick={splitClip}>
                <Scissors size={13} /> Split
              </button>
              <button disabled={!selectedClip} onClick={deleteClip}>
                <Trash2 size={13} /> Delete
              </button>
              <button
                className="maximize-editor"
                title={editorMaximized ? 'Restore editor' : 'Maximize editor'}
                onClick={() => setEditorMaximized((value) => !value)}
              >
                {editorMaximized ? (
                  <Minimize2 size={13} />
                ) : (
                  <Maximize2 size={13} />
                )}
              </button>
            </div>
          </div>
          {bottomMode === 'devices' ? (
            <div className="devices-scroll">
              {selectedTrack?.kind === 'synth' && (
                <div className="device synth-device">
                  <div className="device-head">
                    <span>
                      <Zap size={14} /> NOVAWAVE
                    </span>
                    <b>POLYPHONIC DUAL-OSC SYNTH</b>
                  </div>
                  <div className="synth-preset-row">
                    <label>
                      PRESET
                      <select
                        value={selectedTrack.synth?.preset ?? 'Init Patch'}
                        onChange={(e) =>
                          applySynthPreset(selectedTrack.id, e.target.value)
                        }
                      >
                        {(selectedTrack.synth?.preset === 'Custom'
                          ? [
                              {
                                ...INIT_SYNTH,
                                preset: 'Custom',
                                category: 'User',
                              },
                            ]
                          : []
                        )
                          .concat(SYNTH_PRESETS)
                          .map((preset) => (
                            <option key={preset.preset} value={preset.preset}>
                              {preset.category} · {preset.preset}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className={`synth-scope ${selectedTrack.synth.osc1}`}>
                      {Array.from({ length: 28 }, (_, index) => (
                        <i key={index} />
                      ))}
                    </div>
                  </div>
                  <div className="synth-sections">
                    <section>
                      <h4>OSCILLATORS</h4>
                      <div className="synth-selects">
                        <label>
                          OSC A
                          <select
                            value={selectedTrack.synth.osc1}
                            onChange={(e) =>
                              updateSynth(selectedTrack.id, {
                                osc1: e.target.value as OscillatorType,
                              })
                            }
                          >
                            <option value="sawtooth">Saw</option>
                            <option value="square">Square</option>
                            <option value="triangle">Triangle</option>
                            <option value="sine">Sine</option>
                          </select>
                        </label>
                        <label>
                          OSC B
                          <select
                            value={selectedTrack.synth.osc2}
                            onChange={(e) =>
                              updateSynth(selectedTrack.id, {
                                osc2: e.target.value as OscillatorType,
                              })
                            }
                          >
                            <option value="sawtooth">Saw</option>
                            <option value="square">Square</option>
                            <option value="triangle">Triangle</option>
                            <option value="sine">Sine</option>
                          </select>
                        </label>
                      </div>
                      <label className="synth-param">
                        MIX <b>{Math.round(selectedTrack.synth.mix * 100)}%</b>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step=".01"
                          value={selectedTrack.synth.mix}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              mix: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="synth-param">
                        B TUNE{' '}
                        <b>
                          {selectedTrack.synth.osc2Tune > 0 ? '+' : ''}
                          {selectedTrack.synth.osc2Tune} st
                        </b>
                        <input
                          type="range"
                          min="-24"
                          max="24"
                          step="1"
                          value={selectedTrack.synth.osc2Tune}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              osc2Tune: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </section>
                    <section>
                      <h4>UNISON / COLOR</h4>
                      <label className="synth-param">
                        VOICES <b>{selectedTrack.synth.unison}</b>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={selectedTrack.synth.unison}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              unison: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="synth-param">
                        DETUNE <b>{selectedTrack.synth.detune} ct</b>
                        <input
                          type="range"
                          min="0"
                          max="35"
                          step="1"
                          value={selectedTrack.synth.detune}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              detune: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="synth-param">
                        WIDTH{' '}
                        <b>{Math.round(selectedTrack.synth.width * 100)}%</b>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step=".01"
                          value={selectedTrack.synth.width}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              width: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="synth-param">
                        SUB <b>{Math.round(selectedTrack.synth.sub * 100)}%</b>
                        <input
                          type="range"
                          min="0"
                          max=".8"
                          step=".01"
                          value={selectedTrack.synth.sub}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              sub: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </section>
                    <section>
                      <h4>FILTER</h4>
                      <label className="synth-filter-type">
                        MODE
                        <select
                          value={selectedTrack.synth.filterType}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              filterType: e.target.value as BiquadFilterType,
                            })
                          }
                        >
                          <option value="lowpass">Low-pass</option>
                          <option value="highpass">High-pass</option>
                          <option value="bandpass">Band-pass</option>
                          <option value="notch">Notch</option>
                        </select>
                      </label>
                      <label className="synth-param">
                        CUTOFF{' '}
                        <b>
                          {selectedTrack.synth.cutoff >= 1000
                            ? `${(selectedTrack.synth.cutoff / 1000).toFixed(1)}k`
                            : selectedTrack.synth.cutoff}{' '}
                          Hz
                        </b>
                        <input
                          type="range"
                          min="80"
                          max="16000"
                          step="20"
                          value={selectedTrack.synth.cutoff}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              cutoff: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="synth-param">
                        RESONANCE{' '}
                        <b>{selectedTrack.synth.resonance.toFixed(1)}</b>
                        <input
                          type="range"
                          min="0"
                          max="18"
                          step=".1"
                          value={selectedTrack.synth.resonance}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              resonance: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="synth-param">
                        DRIVE{' '}
                        <b>{Math.round(selectedTrack.synth.drive * 100)}%</b>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step=".01"
                          value={selectedTrack.synth.drive}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              drive: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </section>
                    <section>
                      <h4>AMP ENVELOPE</h4>
                      <div className="env-grid">
                        <label className="synth-param">
                          ATTACK <b>{selectedTrack.synth.attack.toFixed(2)}s</b>
                          <input
                            type="range"
                            min=".002"
                            max="3"
                            step=".01"
                            value={selectedTrack.synth.attack}
                            onChange={(e) =>
                              updateSynth(selectedTrack.id, {
                                attack: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="synth-param">
                          DECAY <b>{selectedTrack.synth.decay.toFixed(2)}s</b>
                          <input
                            type="range"
                            min=".01"
                            max="3"
                            step=".01"
                            value={selectedTrack.synth.decay}
                            onChange={(e) =>
                              updateSynth(selectedTrack.id, {
                                decay: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="synth-param">
                          SUSTAIN{' '}
                          <b>
                            {Math.round(selectedTrack.synth.sustain * 100)}%
                          </b>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step=".01"
                            value={selectedTrack.synth.sustain}
                            onChange={(e) =>
                              updateSynth(selectedTrack.id, {
                                sustain: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="synth-param">
                          RELEASE{' '}
                          <b>{selectedTrack.synth.release.toFixed(2)}s</b>
                          <input
                            type="range"
                            min=".01"
                            max="5"
                            step=".01"
                            value={selectedTrack.synth.release}
                            onChange={(e) =>
                              updateSynth(selectedTrack.id, {
                                release: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                    </section>
                    <section>
                      <h4>MOTION</h4>
                      <label className="synth-param">
                        LFO RATE{' '}
                        <b>{selectedTrack.synth.lfoRate.toFixed(1)} Hz</b>
                        <input
                          type="range"
                          min=".05"
                          max="12"
                          step=".05"
                          value={selectedTrack.synth.lfoRate}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              lfoRate: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="synth-param">
                        FILTER LFO{' '}
                        <b>{Math.round(selectedTrack.synth.lfoDepth * 100)}%</b>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step=".01"
                          value={selectedTrack.synth.lfoDepth}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              lfoDepth: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="synth-param">
                        NOISE{' '}
                        <b>{Math.round(selectedTrack.synth.noise * 100)}%</b>
                        <input
                          type="range"
                          min="0"
                          max=".3"
                          step=".005"
                          value={selectedTrack.synth.noise}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              noise: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="synth-param">
                        DELAY{' '}
                        <b>{Math.round(selectedTrack.synth.delay * 100)}%</b>
                        <input
                          type="range"
                          min="0"
                          max=".7"
                          step=".01"
                          value={selectedTrack.synth.delay}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              delay: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="synth-param">
                        SPACE{' '}
                        <b>{Math.round(selectedTrack.synth.reverb * 100)}%</b>
                        <input
                          type="range"
                          min="0"
                          max=".8"
                          step=".01"
                          value={selectedTrack.synth.reverb}
                          onChange={(e) =>
                            updateSynth(selectedTrack.id, {
                              reverb: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </section>
                  </div>
                </div>
              )}
              {selectedTrack?.effects.map((effect) => {
                const info = EFFECT_INFO[effect.type],
                  Icon = info.icon,
                  controls = EFFECT_CONTROLS[effect.type],
                  values = [
                    effect.param1 ?? controls.defaults[1],
                    effect.param2 ?? controls.defaults[2],
                    effect.param3 ?? controls.defaults[3],
                    effect.param4 ?? controls.defaults[4],
                  ];
                return (
                  <div
                    className={`device ${effect.enabled ? '' : 'disabled'}`}
                    key={effect.id}
                    style={
                      { '--device-color': info.color } as React.CSSProperties
                    }
                  >
                    <div className="device-head">
                      <span style={{ color: info.color }}>
                        <Icon size={14} /> {info.name.toUpperCase()}
                      </span>
                      <button
                        onClick={() =>
                          updateEffect(selectedTrack.id, effect.id, {
                            enabled: !effect.enabled,
                          })
                        }
                      >
                        {effect.enabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="effect-body">
                      <label className="effect-macro">
                        <span
                          className="knob"
                          style={
                            {
                              '--amount': `${effect.amount * 270 - 135}deg`,
                              '--fill': `${effect.amount * 75}%`,
                            } as React.CSSProperties
                          }
                        >
                          <i />
                          <input
                            aria-label={`${info.name} ${controls.mixLabel}`}
                            type="range"
                            min="0"
                            max="1"
                            step=".01"
                            value={effect.amount}
                            onChange={(e) =>
                              updateEffect(selectedTrack.id, effect.id, {
                                amount: Number(e.target.value),
                              })
                            }
                          />
                        </span>
                        <span>{controls.mixLabel}</span>
                        <b>{Math.round(effect.amount * 100)}%</b>
                      </label>
                      <div className="effect-parameters">
                        {controls.labels.map((label, index) => (
                          <label key={label}>
                            <span>{label}</span>
                            <b>{Math.round(values[index] * 100)}%</b>
                            <input
                              aria-label={`${info.name} ${label}`}
                              type="range"
                              min="0"
                              max="1"
                              step=".01"
                              value={values[index]}
                              onChange={(e) =>
                                updateEffect(selectedTrack.id, effect.id, {
                                  [`param${index + 1}`]: Number(e.target.value),
                                } as Partial<Effect>)
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                    <button
                      className="delete-device"
                      onClick={() =>
                        updateTrack(selectedTrack.id, {
                          effects: selectedTrack.effects.filter(
                            (e) => e.id !== effect.id,
                          ),
                        })
                      }
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
              {selectedTrack &&
                !selectedTrack.effects.length &&
                selectedTrack.kind !== 'synth' && (
                  <div className="rack-empty">
                    <AudioLines size={20} />
                    <span>Drop an effect here or click one in the browser</span>
                  </div>
                )}
            </div>
          ) : bottomMode === 'drums' &&
            selectedTrack?.kind === 'drum' &&
            selectedClip?.type === 'midi' ? (
            <div className="drum-midi-editor">
              <div className="drum-midi-toolbar">
                <div>
                  <Drum size={14} />
                  <span>
                    <small>SELECTED PAD</small>
                    <strong>
                      {
                        DRUM_SOUNDS.find(
                          (sound) =>
                            sound.id === selectedTrack.drumMap[selectedDrumPad],
                        )?.name
                      }{' '}
                      <i>
                        {
                          DRUM_SOUNDS.find(
                            (sound) =>
                              sound.id ===
                              selectedTrack.drumMap[selectedDrumPad],
                          )?.kit
                        }
                      </i>
                    </strong>
                  </span>
                </div>
                <label>
                  KIT
                  <select
                    value={
                      DRUM_SOUNDS.find(
                        (sound) =>
                          sound.id === selectedTrack.drumMap[selectedDrumPad],
                      )?.kit
                    }
                    onChange={(event) =>
                      setDrumKit(
                        selectedDrumPad,
                        event.target.value as DrumSound['kit'],
                      )
                    }
                  >
                    <option value="808">808</option>
                    <option value="909">909</option>
                    <option value="505">505</option>
                  </select>
                </label>
                <label>
                  SOUND
                  <select
                    value={selectedTrack.drumMap[selectedDrumPad]}
                    onChange={(event) =>
                      void setDrumSound(selectedDrumPad, event.target.value)
                    }
                  >
                    {DRUM_SOUNDS.filter(
                      (sound) =>
                        sound.kit ===
                        DRUM_SOUNDS.find(
                          (item) =>
                            item.id === selectedTrack.drumMap[selectedDrumPad],
                        )?.kit,
                    ).map((sound) => (
                      <option key={sound.id} value={sound.id}>
                        {sound.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="drum-hint">
                  1/16 grid · {drumStepCount} steps follow this clip’s length
                </span>
              </div>
              <div className="drum-roll-label-head">DRUM RACK</div>
              <div
                className="drum-step-ruler"
                style={
                  {
                    '--drum-columns': drumStepCount,
                  } as React.CSSProperties
                }
              >
                {Array.from({ length: drumStepCount }, (_, step) => (
                  <span className={step % 4 === 0 ? 'beat' : ''} key={step}>
                    {step % 4 === 0
                      ? `${Math.floor(step / 16) + 1}.${(step % 16) / 4 + 1}`
                      : step + 1}
                  </span>
                ))}
              </div>
              <div className="drum-lane-labels">
                {selectedTrack.drumMap
                  .map((soundId, pad) => ({ soundId, pad }))
                  .reverse()
                  .map(({ soundId, pad }) => {
                    const sound = DRUM_SOUNDS.find(
                      (item) => item.id === soundId,
                    )!;
                    return (
                      <button
                        className={selectedDrumPad === pad ? 'selected' : ''}
                        key={pad}
                        onClick={() => {
                          setSelectedDrumPad(pad);
                          void auditionDrum(soundId);
                        }}
                      >
                        <span>{36 + pad}</span>
                        <b>{sound.name}</b>
                        <small>{sound.kit}</small>
                      </button>
                    );
                  })}
              </div>
              <div
                className="drum-roll-grid"
                style={
                  {
                    '--drum-columns': drumStepCount,
                  } as React.CSSProperties
                }
              >
                {selectedTrack.drumMap
                  .map((_, pad) => pad)
                  .reverse()
                  .map((pad) => (
                    <div
                      className={`drum-roll-row ${selectedDrumPad === pad ? 'selected' : ''}`}
                      key={pad}
                      style={
                        {
                          '--drum-grid-size': `${(drumStepSeconds / selectedClip.duration) * 100}%`,
                          '--drum-beat-size': `${((drumStepSeconds * 4) / selectedClip.duration) * 100}%`,
                        } as React.CSSProperties
                      }
                      onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        const rect =
                          event.currentTarget.getBoundingClientRect();
                        const time =
                          ((event.clientX - rect.left) / rect.width) *
                          selectedClip.duration;
                        const stepIndex = Math.min(
                          drumStepCount - 1,
                          Math.max(0, Math.floor(time / drumStepSeconds)),
                        );
                        setSelectedDrumPad(pad);
                        toggleDrumStep(pad, stepIndex);
                      }}
                    >
                      {selectedClip.notes
                        .filter((note) => note.pitch === 36 + pad)
                        .map((note) => (
                          <i
                            className="drum-hit"
                            key={note.id}
                            style={{
                              left: `${(note.start / selectedClip.duration) * 100}%`,
                              width: `${Math.max(0.5, (note.duration / selectedClip.duration) * 100)}%`,
                              opacity: note.velocity,
                            }}
                          />
                        ))}
                    </div>
                  ))}
                {position >= selectedClip.start &&
                  position <= selectedClip.start + selectedClip.duration && (
                    <div
                      className="drum-roll-playhead"
                      style={{
                        left: `${((position - selectedClip.start) / selectedClip.duration) * 100}%`,
                      }}
                    />
                  )}
              </div>
            </div>
          ) : selectedClip?.type === 'midi' ? (
            <div className="piano-editor" ref={pianoEditor}>
              <div className="piano-ruler-corner">CLIP</div>
              <div
                className="piano-ruler"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  seekPianoRuler(event);
                }}
                onPointerMove={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId))
                    seekPianoRuler(event);
                }}
              >
                {Array.from({
                  length: Math.max(
                    1,
                    Math.ceil(selectedClip.duration / (60 / bpm)),
                  ),
                }).map((_, beat) => (
                  <span
                    className={beat % 4 === 0 ? 'bar' : ''}
                    key={beat}
                    style={{
                      left: `${((beat * (60 / bpm)) / selectedClip.duration) * 100}%`,
                    }}
                  >
                    {Math.floor(beat / 4) + 1}.{(beat % 4) + 1}
                  </span>
                ))}
                {position >= selectedClip.start &&
                  position <= selectedClip.start + selectedClip.duration && (
                    <i
                      className="piano-ruler-playhead"
                      style={{
                        left: `${((position - selectedClip.start) / selectedClip.duration) * 100}%`,
                      }}
                    />
                  )}
              </div>
              <div className="piano-keys">
                {PITCHES.map((pitch) => (
                  <span
                    className={`${NOTE_NAMES[pitch % 12].includes('♯') ? 'black' : ''} ${!inKey(pitch) ? 'out-of-key' : ''}`}
                    key={pitch}
                  >
                    {noteName(pitch)}
                  </span>
                ))}
              </div>
              <div className="piano-grid">
                {PITCHES.map((pitch) => (
                  <div
                    className={`piano-row ${!inKey(pitch) ? 'out-of-key' : ''}`}
                    key={pitch}
                    style={
                      {
                        '--snap-size': `${(snapSeconds / selectedClip.duration) * 100}%`,
                      } as React.CSSProperties
                    }
                    onPointerDown={(e) => {
                      if (e.target !== e.currentTarget || !inKey(pitch)) return;
                      setSelectedNoteIds([]);
                      const rect = e.currentTarget.getBoundingClientRect();
                      toggleNote(
                        pitch,
                        ((e.clientX - rect.left) / rect.width) *
                          selectedClip.duration,
                      );
                    }}
                  >
                    {selectedClip.notes
                      .filter((note) => note.pitch === pitch)
                      .map((note) => (
                        <button
                          className={`midi-note ${!inKey(note.pitch) ? 'invalid-note' : ''} ${selectedNoteIds.includes(note.id) ? 'selected' : ''}`}
                          key={note.id}
                          style={{
                            left: `${(note.start / selectedClip.duration) * 100}%`,
                            width: `${(note.duration / selectedClip.duration) * 100}%`,
                          }}
                          onPointerDown={(e) =>
                            startNoteGesture(e, note, 'move')
                          }
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            checkpoint();
                            updateClip(selectedClip.id, {
                              notes: selectedClip.notes.filter(
                                (n) =>
                                  !(
                                    selectedNoteIds.includes(note.id)
                                      ? selectedNoteIds
                                      : [note.id]
                                  ).includes(n.id),
                              ),
                            });
                            setSelectedNoteIds([]);
                          }}
                        >
                          <span>{noteName(note.pitch)}</span>
                          <i
                            onPointerDown={(e) =>
                              startNoteGesture(e, note, 'resize')
                            }
                          />
                        </button>
                      ))}
                  </div>
                ))}
                {position >= selectedClip.start &&
                  position <= selectedClip.start + selectedClip.duration && (
                    <div
                      className="piano-playhead"
                      style={{
                        left: `${((position - selectedClip.start) / selectedClip.duration) * 100}%`,
                      }}
                    />
                  )}
              </div>
              <div className="piano-help">
                Click to add · Shift-click multi-select · drag selection ·
                Alt-drag to copy · Ctrl+A selects all
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <footer className="statusbar">
        <span className={recording ? 'recording-status' : ''}>
          {recording ? (
            <Circle size={8} fill="currentColor" />
          ) : (
            <Square size={8} fill="currentColor" />
          )}
          {status}
        </span>
        <span>
          {tracks.reduce((n, t) => n + t.clips.length, 0)} clips ·{' '}
          {tracks.length} tracks · 44.1 kHz
        </span>
      </footer>
      {draggingFile && (
        <div className="drop-overlay">
          <div>
            <Download size={30} />
            <strong>Drop audio to add it</strong>
            <span>Each file becomes an editable clip</span>
          </div>
        </div>
      )}
      <input
        ref={fileInput}
        className="hidden-input"
        type="file"
        accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
        multiple
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) void importFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </main>
  );
}
