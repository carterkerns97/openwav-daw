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
  RotateCcw,
  Save,
  Scissors,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  Waves,
  X,
  Zap,
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
  kind: 'audio' | 'synth';
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

function makeTrack(index: number, kind: Track['kind'] = 'audio'): Track {
  return {
    id: crypto.randomUUID(),
    kind,
    name: kind === 'synth' ? `Synth ${index + 1}` : `Track ${index + 1}`,
    color: COLORS[index % COLORS.length],
    clips: [],
    effects: [],
    gain: 0.82,
    pan: 0,
    muted: false,
    solo: false,
    armed: index === 0,
    waveform: 'sawtooth',
  };
}
function defaultMidiClip(start: number): Clip {
  const root = 60;
  return {
    id: crypto.randomUUID(),
    type: 'midi',
    name: 'New MIDI clip',
    start,
    duration: 8,
    offset: 0,
    peaks: [],
    notes: [0, 2, 4, 6].map((step, i) => ({
      id: crypto.randomUUID(),
      pitch: root + [0, 4, 7, 11][i],
      start: step,
      duration: 1.5,
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
      const amount = effect.amount;
      if (effect.type === 'eq') {
        const node = ctx.createBiquadFilter();
        node.type = 'peaking';
        node.frequency.value = 2200;
        node.Q.value = 1.1;
        node.gain.value = (amount - 0.5) * 18;
        current.connect(node);
        current = node;
      }
      if (effect.type === 'compressor') {
        const node = ctx.createDynamicsCompressor();
        node.threshold.value = -8 - amount * 36;
        node.ratio.value = 2 + amount * 10;
        node.attack.value = 0.01;
        node.release.value = 0.2;
        current.connect(node);
        current = node;
      }
      if (effect.type === 'saturator') {
        const node = ctx.createWaveShaper(),
          curve = new Float32Array(1024),
          drive = 1 + amount * 10;
        for (let i = 0; i < curve.length; i++) {
          const x = (i * 2) / curve.length - 1;
          curve[i] = Math.tanh(x * drive);
        }
        node.curve = curve;
        node.oversample = '2x';
        current.connect(node);
        current = node;
      }
      if (effect.type === 'delay') {
        const sum = ctx.createGain(),
          dry = ctx.createGain(),
          wet = ctx.createGain(),
          delay = ctx.createDelay(2),
          feedback = ctx.createGain();
        dry.gain.value = 1 - amount * 0.35;
        wet.gain.value = amount * 0.7;
        delay.delayTime.value = 0.22 + amount * 0.28;
        feedback.gain.value = 0.18 + amount * 0.38;
        current.connect(dry).connect(sum);
        current.connect(delay).connect(wet).connect(sum);
        delay.connect(feedback).connect(delay);
        current = sum;
      }
      if (effect.type === 'reverb') {
        const sum = ctx.createGain(),
          dry = ctx.createGain(),
          wet = ctx.createGain(),
          convolver = ctx.createConvolver(),
          length = Math.floor(ctx.sampleRate * (1 + amount * 2.5)),
          impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const data = impulse.getChannelData(c);
          for (let i = 0; i < length; i++)
            data[i] =
              (Math.random() * 2 - 1) *
              Math.pow(1 - i / length, 2 + amount * 2);
        }
        convolver.buffer = impulse;
        dry.gain.value = 1 - amount * 0.25;
        wet.gain.value = amount * 0.75;
        current.connect(dry).connect(sum);
        current.connect(convolver).connect(wet).connect(sum);
        current = sum;
      }
      if (effect.type === 'chorus') {
        const sum = ctx.createGain(),
          dry = ctx.createGain(),
          wet = ctx.createGain(),
          delay = ctx.createDelay(0.1),
          lfo = ctx.createOscillator(),
          depth = ctx.createGain();
        dry.gain.value = 0.85;
        wet.gain.value = amount * 0.8;
        delay.delayTime.value = 0.018;
        lfo.frequency.value = 0.25 + amount * 1.5;
        depth.gain.value = 0.003 + amount * 0.008;
        lfo.connect(depth).connect(delay.delayTime);
        lfo.start();
        current.connect(dry).connect(sum);
        current.connect(delay).connect(wet).connect(sum);
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
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [master, setMaster] = useState(0.85);
  const [status, setStatus] = useState(
    'Drop audio anywhere or add a synth track',
  );
  const [draggingFile, setDraggingFile] = useState(false);
  const [bottomMode, setBottomMode] = useState<'devices' | 'piano'>('devices');
  const [bottomHeight, setBottomHeight] = useState(280);
  const [editorMaximized, setEditorMaximized] = useState(false);
  const [noteSnap, setNoteSnap] = useState(0.5);
  const [keyRoot, setKeyRoot] = useState(0);
  const [keyScale, setKeyScale] = useState<'major' | 'minor'>('major');
  const contextRef = useRef<AudioContext | null>(null),
    sources = useRef<AudioScheduledSourceNode[]>([]),
    startedAt = useRef(0),
    raf = useRef(0),
    recorder = useRef<MediaRecorder | null>(null),
    chunks = useRef<Blob[]>([]),
    fileInput = useRef<HTMLInputElement>(null);
  const pianoEditor = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    clipId: string;
    trackId: string;
    startX: number;
    startY: number;
    originalStart: number;
    originalDuration: number;
    originalOffset: number;
    mode: 'move' | 'left' | 'right';
  } | null>(null);
  const noteGesture = useRef<{
    noteId: string;
    startX: number;
    originalStart: number;
    originalDuration: number;
    mode: 'move' | 'resize';
  } | null>(null);
  const resizeStart = useRef<{ y: number; height: number } | null>(null);
  const duration = useMemo(
    () =>
      Math.max(
        60,
        ...tracks.flatMap((t) => t.clips.map((c) => c.start + c.duration + 4)),
      ),
    [tracks],
  );
  const selectedTrack =
    tracks.find((t) => t.id === selectedTrackId) ?? tracks[0];
  const selectedClip = tracks
    .flatMap((t) => t.clips)
    .find((c) => c.id === selectedClipId);
  const audioContext = useCallback(
    () => contextRef.current ?? (contextRef.current = new AudioContext()),
    [],
  );
  const updateTrack = (id: string, patch: Partial<Track>) =>
    setTracks((old) => old.map((t) => (t.id === id ? { ...t, ...patch } : t)));
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
  const seekFromPointer = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    stop();
    setPosition(
      Math.max(0, Math.min(duration, (event.clientX - rect.left) / PX)),
    );
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
          if (clip.type === 'midi')
            clip.notes.forEach((note) => {
              const noteStart = clip.start + note.start,
                noteEnd = Math.min(clipEnd, noteStart + note.duration);
              if (noteEnd <= startPosition) return;
              const osc = ctx.createOscillator(),
                amp = ctx.createGain(),
                startAt =
                  ctx.currentTime + Math.max(0, noteStart - startPosition),
                endAt =
                  ctx.currentTime + Math.max(0.04, noteEnd - startPosition);
              osc.type = track.waveform;
              osc.frequency.value = 440 * Math.pow(2, (note.pitch - 69) / 12);
              amp.gain.setValueAtTime(0.0001, startAt);
              amp.gain.exponentialRampToValueAtTime(
                Math.max(0.02, note.velocity * 0.18),
                startAt + 0.015,
              );
              amp.gain.setValueAtTime(
                Math.max(0.02, note.velocity * 0.16),
                Math.max(startAt + 0.02, endAt - 0.08),
              );
              amp.gain.exponentialRampToValueAtTime(0.0001, endAt);
              osc.connect(amp).connect(bus);
              osc.start(startAt);
              osc.stop(endAt + 0.02);
              if (ctx instanceof AudioContext) sources.current.push(osc);
            });
        });
      });
    },
    [tracks],
  );
  const play = useCallback(async () => {
    const ctx = audioContext();
    await ctx.resume();
    stop();
    const masterNode = ctx.createGain();
    masterNode.gain.value = master;
    masterNode.connect(ctx.destination);
    buildGraph(ctx, position, masterNode);
    startedAt.current = ctx.currentTime - position;
    setPlaying(true);
    const tick = () => {
      const next = ctx.currentTime - startedAt.current;
      if (next >= duration) stop(true);
      else {
        setPosition(next);
        raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [audioContext, buildGraph, duration, master, position, stop]);

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
    [audioContext, position, selectedTrackId],
  );

  const addSynth = () => {
    const clip = defaultMidiClip(position),
      targetId = selectedTrack?.id;
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
        setTracks((current) => {
          let target = current.find((t) => t.armed && t.kind === 'audio');
          if (!target) target = current.find((t) => t.kind === 'audio');
          return current.map((t) =>
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
  }, [audioContext, position, recording]);

  const splitClip = useCallback(() => {
    if (!selectedClip) return;
    const cut = position - selectedClip.start;
    if (cut <= 0.05 || cut >= selectedClip.duration - 0.05)
      return setStatus('Place the playhead inside the selected clip to split');
    setTracks((old) =>
      old.map((t) => ({
        ...t,
        clips: t.clips.flatMap((c) =>
          c.id !== selectedClip.id
            ? [c]
            : [
                { ...c, duration: cut },
                {
                  ...c,
                  id: crypto.randomUUID(),
                  name: `${c.name} (2)`,
                  start: position,
                  offset: c.offset + cut,
                  duration: c.duration - cut,
                },
              ],
        ),
      })),
    );
    setStatus(`Split clip at ${clock(position)}`);
  }, [position, selectedClip]);
  const deleteClip = useCallback(() => {
    if (!selectedClipId) return;
    setTracks((old) =>
      old.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== selectedClipId),
      })),
    );
    setSelectedClipId('');
    setStatus('Clip deleted');
  }, [selectedClipId]);
  const duplicateClip = () => {
    if (!selectedClip) return;
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
    gesture.current = {
      clipId: clip.id,
      trackId,
      startX: event.clientX,
      startY: event.clientY,
      originalStart: clip.start,
      originalDuration: clip.duration,
      originalOffset: clip.offset,
      mode,
    };
  };
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      const dx = (event.clientX - g.startX) / PX,
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
        if (
          sourceTrack &&
          sourceClip &&
          target.kind === (sourceClip.type === 'midi' ? 'synth' : 'audio')
        )
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
          maximum = clip?.buffer ? clip.buffer.duration - g.originalOffset : 64;
        updateClip(g.clipId, {
          duration: Math.max(
            0.125,
            Math.min(maximum, Math.round((g.originalDuration + dx) * 8) / 8),
          ),
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
  }, [tracks, updateClip]);

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
        snapped = Math.round(delta / noteSnap) * noteSnap;
      const notes = selectedClip.notes.map((note) =>
        note.id !== g.noteId
          ? note
          : g.mode === 'resize'
            ? {
                ...note,
                duration: Math.max(
                  noteSnap,
                  Math.min(
                    selectedClip.duration - note.start,
                    g.originalDuration + snapped,
                  ),
                ),
              }
            : {
                ...note,
                start: Math.max(
                  0,
                  Math.min(
                    selectedClip.duration - note.duration,
                    g.originalStart + snapped,
                  ),
                ),
              },
      );
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
  }, [noteSnap, selectedClip, updateClip]);

  useEffect(() => {
    if (bottomMode !== 'piano' || !selectedClipId) return;
    requestAnimationFrame(() => {
      if (pianoEditor.current) pianoEditor.current.scrollTop = 67 * 22 - pianoEditor.current.clientHeight / 2;
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
    setTracks((old) =>
      old.map((t) =>
        t.id === trackId
          ? {
              ...t,
              effects: [
                ...t.effects,
                { id: crypto.randomUUID(), type, enabled: true, amount: 0.5 },
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
    a.download = 'openwave-mix.wav';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Mix exported as openwave-mix.wav');
  }, [buildGraph, master, tracks]);

  const toggleNote = (pitch: number, noteStart: number) => {
    if (!selectedClip || selectedClip.type !== 'midi' || !inKey(pitch)) return;
    const snappedStart = Math.floor(noteStart / noteSnap) * noteSnap,
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
              duration: noteSnap,
              velocity: 0.75,
            },
          ];
    updateClip(selectedClip.id, { notes });
  };
  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        playing ? stop() : void play();
      }
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        !(e.target instanceof HTMLInputElement)
      )
        deleteClip();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [deleteClip, play, playing, stop]);
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
          <span className="saved-dot" /> Untitled session
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
          <output className="time-readout">{clock(position)}</output>
        </div>
        <div className="tempo-control">
          <span>TEMPO</span>
          <input
            aria-label="Tempo"
            type="number"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <b>BPM</b>
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
          <button className="synth-card" onClick={addSynth}>
            <span>
              <Keyboard size={18} />
            </span>
            <strong>Simple Synth</strong>
            <small>Add track + MIDI clip</small>
          </button>
          <div className="library-section">
            <p>INSTRUMENTS</p>
            <button onClick={addSynth}>
              <Keyboard size={14} /> Simple Synth <Plus size={12} />
            </button>
            <button disabled>
              <Drum size={14} /> Drum Rack <small>soon</small>
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
              <button
                onClick={() =>
                  setTracks((old) => [...old, makeTrack(old.length)])
                }
              >
                <Plus size={13} /> Audio
              </button>
              <button onClick={addSynth}>
                <Keyboard size={13} /> Synth
              </button>
            </div>
            <div
              className="ruler"
              style={{ width: duration * PX }}
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
                <span key={bar} style={{ left: (bar - 1) * PX * 2 }}>
                  {bar}
                </span>
              ))}
              <div className="ruler-playhead" style={{ left: position * PX }} />
            </div>
          </div>
          <div className="tracks-scroll">
            {tracks.map((track, index) => (
              <div
                className={`track-row ${selectedTrack?.id === track.id ? 'selected' : ''}`}
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
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
                        : `${track.clips.length} audio clip${track.clips.length === 1 ? '' : 's'}`}
                    </small>
                  </div>
                  <div className="track-switches">
                    <button
                      className={track.armed ? 'armed' : ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTrack(track.id, { armed: !track.armed });
                      }}
                    >
                      R
                    </button>
                    <button
                      className={track.solo ? 'solo' : ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTrack(track.id, { solo: !track.solo });
                      }}
                    >
                      S
                    </button>
                    <button
                      className={track.muted ? 'muted' : ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTrack(track.id, { muted: !track.muted });
                      }}
                    >
                      M
                    </button>
                    <button
                      className="remove-track"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTracks((old) =>
                          old.length > 1
                            ? old.filter((t) => t.id !== track.id)
                            : old,
                        );
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="mini-mixer">
                    <label>
                      VOL{' '}
                      <input
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
                      PAN{' '}
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step=".01"
                        value={track.pan}
                        onChange={(e) =>
                          updateTrack(track.id, { pan: Number(e.target.value) })
                        }
                      />
                    </label>
                  </div>
                </div>
                <div
                  className="track-lane"
                  style={{ width: duration * PX }}
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
                          left: clip.start * PX,
                          width: Math.max(22, clip.duration * PX),
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
                          clip.type === 'midi' ? 'piano' : 'devices',
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
                                top: `${((71 - note.pitch) / 24) * 100}%`,
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
                          ? addSynth()
                          : fileInput.current?.click();
                      }}
                    >
                      <Plus size={14} />{' '}
                      {track.kind === 'synth'
                        ? 'Add MIDI clip'
                        : 'Drop or add audio'}
                    </button>
                  )}
                  <div className="playhead" style={{ left: position * PX }} />
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
              disabled={selectedClip?.type !== 'midi'}
              onClick={() => setBottomMode('piano')}
            >
              Piano Roll
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
                      <Keyboard size={14} /> SIMPLE SYNTH
                    </span>
                    <i />
                  </div>
                  <div className="synth-visual">
                    <div className="osc-wave">∿</div>
                    <label>
                      WAVEFORM
                      <select
                        value={selectedTrack.waveform}
                        onChange={(e) =>
                          updateTrack(selectedTrack.id, {
                            waveform: e.target.value as OscillatorType,
                          })
                        }
                      >
                        <option value="sawtooth">Saw</option>
                        <option value="square">Square</option>
                        <option value="sine">Sine</option>
                        <option value="triangle">Triangle</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}
              {selectedTrack?.effects.map((effect) => {
                const info = EFFECT_INFO[effect.type],
                  Icon = info.icon;
                return (
                  <div
                    className={`device ${effect.enabled ? '' : 'disabled'}`}
                    key={effect.id}
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
                    <div
                      className="knob"
                      style={
                        {
                          '--amount': `${effect.amount * 270 - 135}deg`,
                          '--device-color': info.color,
                        } as React.CSSProperties
                      }
                    >
                      <i />
                    </div>
                    <label>
                      {effect.type === 'compressor' ? 'AMOUNT' : 'DRY / WET'}
                      <input
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
                      <b>{Math.round(effect.amount * 100)}%</b>
                    </label>
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
          ) : selectedClip?.type === 'midi' ? (
            <div className="piano-editor" ref={pianoEditor}>
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
                        '--snap-size': `${(noteSnap / selectedClip.duration) * 100}%`,
                      } as React.CSSProperties
                    }
                    onPointerDown={(e) => {
                      if (e.target !== e.currentTarget || !inKey(pitch)) return;
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
                          className={`midi-note ${!inKey(note.pitch) ? 'invalid-note' : ''}`}
                          key={note.id}
                          style={{
                            left: `${(note.start / selectedClip.duration) * 100}%`,
                            width: `${(note.duration / selectedClip.duration) * 100}%`,
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            noteGesture.current = {
                              noteId: note.id,
                              startX: e.clientX,
                              originalStart: note.start,
                              originalDuration: note.duration,
                              mode: 'move',
                            };
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            updateClip(selectedClip.id, {
                              notes: selectedClip.notes.filter(
                                (n) => n.id !== note.id,
                              ),
                            });
                          }}
                        >
                          <span>{noteName(note.pitch)}</span>
                          <i
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              noteGesture.current = {
                                noteId: note.id,
                                startX: e.clientX,
                                originalStart: note.start,
                                originalDuration: note.duration,
                                mode: 'resize',
                              };
                            }}
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
                Click to add · drag notes to move · drag right edge to resize ·
                double-click to delete
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
