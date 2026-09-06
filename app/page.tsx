'use client';

import { Circle, Download, FolderOpen, Headphones, Mic, Pause, Play, Plus, Radio, RotateCcw, Save, SlidersHorizontal, Square, Volume2, Waves, X } from 'lucide-react';
import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Track = { id: string; name: string; color: string; buffer?: AudioBuffer; sourceName?: string; start: number; gain: number; pan: number; cutoff: number; muted: boolean; solo: boolean; armed: boolean; peaks: number[] };
const COLORS = ['#f4a261', '#36c9a5', '#9d8cff', '#56b4f2', '#ef6f91', '#e9c46a'];
const PX = 64;

function makeTrack(index: number): Track {
  return { id: crypto.randomUUID(), name: `Track ${index + 1}`, color: COLORS[index % COLORS.length], start: 0, gain: .82, pan: 0, cutoff: 20000, muted: false, solo: false, armed: index === 0, peaks: [] };
}
function peaks(buffer: AudioBuffer, count = 160) {
  const data = buffer.getChannelData(0), step = Math.max(1, Math.floor(data.length / count));
  return Array.from({ length: count }, (_, n) => { let peak = 0; for (let i = n * step; i < Math.min(data.length, (n + 1) * step); i++) peak = Math.max(peak, Math.abs(data[i])); return Math.max(.04, peak); });
}
function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}.${Math.floor((seconds % 1) * 100).toString().padStart(2, '0')}`;
}
function wav(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels, length = buffer.length * channels * 2 + 44, out = new ArrayBuffer(length), view = new DataView(out);
  const write = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, length - 8, true); write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true); view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, length - 44, true);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) for (let c = 0; c < channels; c++) { const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i])); view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true); offset += 2; }
  return new Blob([out], { type: 'audio/wav' });
}

export default function Home() {
  const [tracks, setTracks] = useState<Track[]>(() => [makeTrack(0), makeTrack(1), makeTrack(2)]);
  const [selectedId, setSelectedId] = useState('');
  const [position, setPosition] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [master, setMaster] = useState(.85);
  const [status, setStatus] = useState('Drop audio anywhere or arm a track to record');
  const [dragging, setDragging] = useState(false);
  const contextRef = useRef<AudioContext | null>(null), sources = useRef<AudioBufferSourceNode[]>([]), startedAt = useRef(0), raf = useRef(0), recorder = useRef<MediaRecorder | null>(null), chunks = useRef<Blob[]>([]), fileInput = useRef<HTMLInputElement>(null);
  const duration = useMemo(() => Math.max(60, ...tracks.map(t => t.start + (t.buffer?.duration ?? 0) + 4)), [tracks]);
  const selected = tracks.find(t => t.id === selectedId) ?? tracks[0];
  const context = useCallback(() => contextRef.current ?? (contextRef.current = new AudioContext()), []);
  const update = (id: string, patch: Partial<Track>) => setTracks(old => old.map(t => t.id === id ? { ...t, ...patch } : t));

  const stop = useCallback((reset = false) => {
    sources.current.forEach(s => { try { s.stop(); } catch {} }); sources.current = []; cancelAnimationFrame(raf.current); setPlaying(false); if (reset) setPosition(0);
  }, []);
  const play = useCallback(async () => {
    const ctx = context(); await ctx.resume(); stop();
    const masterNode = ctx.createGain(); masterNode.gain.value = master; masterNode.connect(ctx.destination);
    const hasSolo = tracks.some(t => t.solo);
    tracks.forEach(t => {
      if (!t.buffer || t.muted || (hasSolo && !t.solo)) return;
      const elapsed = position - t.start; if (elapsed >= t.buffer.duration) return;
      const source = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createStereoPanner(), filter = ctx.createBiquadFilter();
      source.buffer = t.buffer; gain.gain.value = t.gain; pan.pan.value = t.pan; filter.type = 'lowpass'; filter.frequency.value = t.cutoff; source.connect(filter).connect(gain).connect(pan).connect(masterNode); source.start(ctx.currentTime + Math.max(0, t.start - position), Math.max(0, elapsed)); sources.current.push(source);
    });
    startedAt.current = ctx.currentTime - position; setPlaying(true);
    const tick = () => { const next = ctx.currentTime - startedAt.current; if (next >= duration) stop(true); else { setPosition(next); raf.current = requestAnimationFrame(tick); } }; raf.current = requestAnimationFrame(tick);
  }, [context, duration, master, position, stop, tracks]);

  const importFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list).filter(f => f.type.startsWith('audio/') || /\.(wav|mp3|m4a|ogg|flac)$/i.test(f.name));
    if (!files.length) return setStatus('That file is not a supported audio format');
    try {
      const ctx = context(); const decoded = await Promise.all(files.map(async file => ({ file, buffer: await ctx.decodeAudioData(await file.arrayBuffer()) })));
      setTracks(current => { const next = [...current]; decoded.forEach(({ file, buffer }, n) => { const empty = next.findIndex(t => !t.buffer), index = empty < 0 ? next.length : empty, base = next[index] ?? makeTrack(index), loaded = { ...base, name: file.name.replace(/\.[^.]+$/, ''), sourceName: file.name, buffer, peaks: peaks(buffer), start: n === 0 ? position : 0 }; if (index === next.length) next.push(loaded); else next[index] = loaded; if (!n) setSelectedId(loaded.id); }); return next; });
      setStatus(`${decoded.length} audio file${decoded.length > 1 ? 's' : ''} added`);
    } catch { setStatus('This browser could not decode that audio file'); }
  }, [context, position]);

  const toggleRecord = useCallback(async () => {
    if (recording && recorder.current) return recorder.current.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks.current = []; const media = new MediaRecorder(stream); recorder.current = media;
      media.ondataavailable = event => chunks.current.push(event.data);
      media.onstop = async () => { stream.getTracks().forEach(t => t.stop()); setRecording(false); const buffer = await context().decodeAudioData(await new Blob(chunks.current, { type: media.mimeType }).arrayBuffer()); setTracks(current => { const armed = current.findIndex(t => t.armed), target = armed < 0 ? 0 : armed; return current.map((t, i) => i === target ? { ...t, name: t.name.startsWith('Track ') ? 'Voice recording' : t.name, buffer, peaks: peaks(buffer), sourceName: 'Microphone recording', start: position } : t); }); setStatus(`Recorded ${clock(buffer.duration)} at ${clock(position)}`); };
      media.start(); setRecording(true); setStatus('Recording… click record again to stop');
    } catch { setStatus('Microphone permission is needed to record'); }
  }, [context, position, recording]);

  const exportMix = useCallback(async () => {
    const audible = tracks.filter(t => t.buffer && !t.muted); if (!audible.length) return setStatus('Add some audio before exporting'); setStatus('Rendering your mix…');
    const seconds = Math.max(...audible.map(t => t.start + (t.buffer?.duration ?? 0))), offline = new OfflineAudioContext(2, Math.ceil(seconds * 44100), 44100), masterNode = offline.createGain(); masterNode.gain.value = master; masterNode.connect(offline.destination); const hasSolo = tracks.some(t => t.solo);
    audible.forEach(t => { if (!t.buffer || (hasSolo && !t.solo)) return; const source = offline.createBufferSource(), gain = offline.createGain(), pan = offline.createStereoPanner(), filter = offline.createBiquadFilter(); source.buffer = t.buffer; gain.gain.value = t.gain; pan.pan.value = t.pan; filter.type = 'lowpass'; filter.frequency.value = t.cutoff; source.connect(filter).connect(gain).connect(pan).connect(masterNode); source.start(t.start); });
    const rendered = await offline.startRendering(), url = URL.createObjectURL(wav(rendered)), anchor = document.createElement('a'); anchor.href = url; anchor.download = 'openwave-mix.wav'; anchor.click(); URL.revokeObjectURL(url); setStatus('Mix exported as openwave-mix.wav');
  }, [master, tracks]);

  useEffect(() => () => stop(), [stop]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); playing ? stop() : void play(); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [play, playing, stop]);
  const bars = Array.from({ length: Math.ceil(duration / 2) }, (_, n) => n + 1);

  return <main className="studio" onDragEnter={e => { e.preventDefault(); setDragging(true); }} onDragOver={e => e.preventDefault()} onDragLeave={e => { if (e.currentTarget === e.target) setDragging(false); }} onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); void importFiles(e.dataTransfer.files); }}>
    <header className="topbar"><div className="brand"><span className="brand-mark"><Waves size={17}/></span><strong>Openwave</strong><span className="prototype">prototype</span></div><div className="project-name"><span className="saved-dot"/> Untitled session</div><div className="top-actions"><button className="ghost-button" onClick={() => fileInput.current?.click()}><FolderOpen size={15}/> Import</button><button className="export-button" onClick={() => void exportMix()}><Download size={15}/> Export WAV</button></div></header>
    <section className="transport" aria-label="Transport controls"><div className="transport-left"><button className="icon-button" title="Return to start" onClick={() => stop(true)}><RotateCcw size={16}/></button><button className="play-button" title="Play / pause (Space)" onClick={() => playing ? stop() : void play()}>{playing ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button><button className={`record-button ${recording ? 'active' : ''}`} title="Record microphone" onClick={() => void toggleRecord()}><Circle size={15} fill="currentColor"/></button><output className="time-readout">{clock(position)}</output></div><div className="tempo-control"><span>TEMPO</span><input aria-label="Tempo" type="number" min="40" max="240" value={bpm} onChange={e => setBpm(Number(e.target.value))}/><b>BPM</b></div><div className="master-control"><Volume2 size={15}/><span>MASTER</span><input aria-label="Master volume" type="range" min="0" max="1" step=".01" value={master} onChange={e => setMaster(Number(e.target.value))}/></div></section>
    <div className="workspace">
      <aside className="browser-panel"><div className="panel-heading"><span>Sounds</span><SlidersHorizontal size={14}/></div><button className="import-card" onClick={() => fileInput.current?.click()}><span><Plus size={18}/></span><strong>Add audio</strong><small>WAV, MP3, M4A, OGG</small></button><div className="quick-start"><p>QUICK START</p>{[['1','Drop in a sound','or import from your device'],['2','Press space to play','mix levels as it runs'],['3','Export your mix','download a full-quality WAV']].map(item => <div key={item[0]}><span>{item[0]}</span><p><b>{item[1]}</b><small>{item[2]}</small></p></div>)}</div><div className="privacy-note"><Save size={14}/><span><b>Local by design</b>Your audio never leaves this device.</span></div></aside>
      <section className="arrangement"><div className="ruler-row"><div className="track-header-label"><button onClick={() => setTracks(old => [...old, makeTrack(old.length)])}><Plus size={14}/> Add track</button></div><div className="ruler" style={{ width: duration * PX }}>{bars.map(bar => <span key={bar} style={{ left: (bar - 1) * PX * 2 }}>{bar}</span>)}</div></div><div className="tracks-scroll">{tracks.map((track, index) => <div className={`track-row ${selected?.id === track.id ? 'selected' : ''}`} key={track.id} onClick={() => setSelectedId(track.id)}>
        <div className="track-controls"><span className="track-number" style={{ background: track.color }}>{index + 1}</span><div className="track-identity"><input aria-label="Track name" value={track.name} onChange={e => update(track.id, { name: e.target.value })}/><small>{track.sourceName ?? 'Empty audio track'}</small></div><div className="track-switches"><button className={track.armed ? 'armed' : ''} title="Arm" onClick={e => { e.stopPropagation(); update(track.id, { armed: !track.armed }); }}>R</button><button className={track.solo ? 'solo' : ''} title="Solo" onClick={e => { e.stopPropagation(); update(track.id, { solo: !track.solo }); }}>S</button><button className={track.muted ? 'muted' : ''} title="Mute" onClick={e => { e.stopPropagation(); update(track.id, { muted: !track.muted }); }}>M</button><button className="remove-track" title="Remove" onClick={e => { e.stopPropagation(); setTracks(old => old.length > 1 ? old.filter(t => t.id !== track.id) : old); }}><X size={12}/></button></div><div className="mini-mixer"><label>VOL <input type="range" min="0" max="1.3" step=".01" value={track.gain} onChange={e => update(track.id, { gain: Number(e.target.value) })}/></label><label>PAN <input type="range" min="-1" max="1" step=".01" value={track.pan} onChange={e => update(track.id, { pan: Number(e.target.value) })}/></label></div></div>
        <div className="track-lane" style={{ width: duration * PX }} onClick={e => setPosition(Math.max(0, (e.clientX - e.currentTarget.getBoundingClientRect().left) / PX))}>{track.buffer ? <div className="audio-clip" style={{ left: track.start * PX, width: Math.max(48, track.buffer.duration * PX), '--track-color': track.color } as React.CSSProperties}><div className="clip-title"><Waves size={11}/> {track.name}</div><div className="waveform">{track.peaks.map((peak, n) => <i key={n} style={{ height: `${Math.max(8, peak * 82)}%` }}/>)}</div></div> : <button className="empty-lane" onClick={e => { e.stopPropagation(); fileInput.current?.click(); }}><Plus size={14}/> Drop or add audio</button>}<div className="playhead" style={{ left: position * PX }}/></div>
      </div>)}</div></section>
      <aside className="inspector"><div className="panel-heading"><span>Channel</span><SlidersHorizontal size={14}/></div>{selected && <><div className="selected-track"><span style={{ background: selected.color }}/><div><strong>{selected.name}</strong><small>{selected.buffer ? clock(selected.buffer.duration) : 'No audio loaded'}</small></div></div><label className="parameter"><span><Volume2 size={14}/> Volume <b>{Math.round(selected.gain * 100)}%</b></span><input type="range" min="0" max="1.3" step=".01" value={selected.gain} onChange={e => update(selected.id, { gain: Number(e.target.value) })}/></label><label className="parameter"><span><Headphones size={14}/> Pan <b>{selected.pan === 0 ? 'C' : selected.pan < 0 ? `${Math.round(-selected.pan * 100)}L` : `${Math.round(selected.pan * 100)}R`}</b></span><input type="range" min="-1" max="1" step=".01" value={selected.pan} onChange={e => update(selected.id, { pan: Number(e.target.value) })}/></label><div className="effect-block"><div><span><Radio size={14}/> Low-pass filter</span><button className={selected.cutoff < 19000 ? 'effect-on' : ''} onClick={() => update(selected.id, { cutoff: selected.cutoff < 19000 ? 20000 : 4200 })}>{selected.cutoff < 19000 ? 'ON' : 'OFF'}</button></div><label>Cutoff <b>{selected.cutoff >= 19000 ? 'Open' : `${(selected.cutoff / 1000).toFixed(1)} kHz`}</b></label><input type="range" min="200" max="20000" step="100" value={selected.cutoff} onChange={e => update(selected.id, { cutoff: Number(e.target.value) })}/></div><button className={`monitor-button ${selected.armed ? 'armed' : ''}`} onClick={() => update(selected.id, { armed: !selected.armed })}><Mic size={15}/> {selected.armed ? 'Armed for recording' : 'Arm for recording'}</button></>}</aside>
    </div>
    <footer className="statusbar"><span className={recording ? 'recording-status' : ''}>{recording ? <Circle size={8} fill="currentColor"/> : <Square size={8} fill="currentColor"/>}{status}</span><span>{tracks.filter(t => t.buffer).length} clips · {tracks.length} tracks · 44.1 kHz</span></footer>
    {dragging && <div className="drop-overlay"><div><Download size={30}/><strong>Drop audio to add it</strong><span>Each file becomes a new track</span></div></div>}
    <input ref={fileInput} className="hidden-input" type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" multiple onChange={(e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) void importFiles(e.target.files); e.target.value = ''; }}/>
  </main>;
}
