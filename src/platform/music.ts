// Trilha com som de Game Boy (MUS-01 a MUS-03): toca os MIDI que o usuário pôs em musicas/ (fora do
// git) com ondas de pulso, onda triangular no baixo e ruído na bateria, em loop, pelo Web Audio.

/** Arquivos da pasta musicas/: menu.mid e ep1.mid a ep5.mid. Sem a pasta, o jogo fica em silêncio. */
const FILES = import.meta.glob('/musicas/*.mid', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

export type TrackId = 'menu' | `ep${1 | 2 | 3 | 4 | 5}`;

const STORAGE_KEY = 'mf.music';
const MASTER = 0.16;
const LOOKAHEAD_S = 0.5;
const TICK_MS = 60;

interface Note {
  t: number; // início, em segundos
  dur: number;
  pitch: number;
  vel: number; // 0 a 1
  ch: number;
}

interface Song {
  notes: Note[];
  lengthS: number;
  roles: Map<number, Role>;
}

type Role = 'lead' | 'harmonia' | 'baixo' | 'bateria';

// ---------- Leitura do MIDI (formatos 0 e 1) ----------

function parseMidi(buf: ArrayBuffer): Note[] {
  const d = new DataView(buf);
  let p = 0;
  const str = (n: number) => String.fromCharCode(...new Uint8Array(buf, p, n));
  if (str(4) !== 'MThd') return [];
  const ntrks = d.getUint16(p + 10);
  const division = d.getUint16(p + 12);
  if (division & 0x8000) return []; // tempo SMPTE: raro, fica em silêncio
  p += 8 + d.getUint32(p + 4);

  type Raw = { tick: number; kind: 'on' | 'off' | 'tempo'; ch: number; pitch: number; vel: number; us: number };
  const raws: Raw[] = [];
  for (let tr = 0; tr < ntrks && p + 8 <= buf.byteLength; tr++) {
    const isTrack = str(4) === 'MTrk';
    const len = d.getUint32(p + 4);
    const end = Math.min(p + 8 + len, buf.byteLength);
    p += 8;
    if (!isTrack) {
      p = end;
      continue;
    }
    let tick = 0;
    let status = 0;
    const varlen = () => {
      let v = 0;
      for (let i = 0; i < 4 && p < end; i++) {
        const b = d.getUint8(p++);
        v = (v << 7) | (b & 0x7f);
        if (!(b & 0x80)) break;
      }
      return v;
    };
    while (p < end) {
      tick += varlen();
      let b = d.getUint8(p);
      if (b & 0x80) {
        status = b;
        p++;
      } else b = status; // running status
      const type = status & 0xf0;
      const ch = status & 0x0f;
      if (status === 0xff) {
        const meta = d.getUint8(p++);
        const l = varlen();
        if (meta === 0x51 && l === 3) raws.push({ tick, kind: 'tempo', ch: 0, pitch: 0, vel: 0, us: (d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2) });
        p += l;
        if (meta === 0x2f) break;
      } else if (status === 0xf0 || status === 0xf7) {
        p += varlen();
      } else if (type === 0x90 || type === 0x80) {
        const pitch = d.getUint8(p++);
        const vel = d.getUint8(p++);
        raws.push({ tick, kind: type === 0x90 && vel > 0 ? 'on' : 'off', ch, pitch, vel: vel / 127, us: 0 });
      } else if (type === 0xc0 || type === 0xd0) p += 1;
      else p += 2;
    }
    p = end;
  }

  // Ticks para segundos, com as mudanças de andamento.
  raws.sort((a, b) => a.tick - b.tick || (a.kind === 'tempo' ? -1 : 0));
  let us = 500000;
  let lastTick = 0;
  let sec = 0;
  const open = new Map<string, { t: number; vel: number }>();
  const notes: Note[] = [];
  for (const r of raws) {
    sec += ((r.tick - lastTick) * us) / division / 1e6;
    lastTick = r.tick;
    if (r.kind === 'tempo') us = r.us;
    else if (r.kind === 'on') open.set(`${r.ch}:${r.pitch}`, { t: sec, vel: r.vel });
    else {
      const key = `${r.ch}:${r.pitch}`;
      const on = open.get(key);
      if (!on) continue;
      open.delete(key);
      notes.push({ t: on.t, dur: Math.max(0.03, sec - on.t), pitch: r.pitch, vel: on.vel, ch: r.ch });
    }
  }
  return notes.sort((a, b) => a.t - b.t);
}

/** Bateria no canal 10; o canal mais grave é o baixo; o mais agudo com bastante nota, a melodia. */
function rolesOf(notes: Note[]): Map<number, Role> {
  const stats = new Map<number, { sum: number; n: number }>();
  for (const n of notes) {
    if (n.ch === 9) continue;
    const s = stats.get(n.ch) ?? { sum: 0, n: 0 };
    s.sum += n.pitch;
    s.n++;
    stats.set(n.ch, s);
  }
  const chans = [...stats.entries()].map(([ch, s]) => ({ ch, avg: s.sum / s.n, n: s.n }));
  const roles = new Map<number, Role>([[9, 'bateria']]);
  const busy = chans.filter((c) => c.n >= notes.length * 0.05);
  const lead = (busy.length ? busy : chans).reduce<(typeof chans)[number] | null>((a, c) => (!a || c.avg > a.avg ? c : a), null);
  const bass = chans.reduce<(typeof chans)[number] | null>((a, c) => (!a || c.avg < a.avg ? c : a), null);
  for (const c of chans) roles.set(c.ch, 'harmonia');
  if (bass && bass.avg < 55) roles.set(bass.ch, 'baixo');
  if (lead) roles.set(lead.ch, 'lead');
  return roles;
}

// ---------- Síntese ----------

/** Onda de pulso com o ciclo dado (12,5%, 25%, 50%), como os dois canais de pulso do Game Boy. */
function pulseWave(ctx: AudioContext, duty: number): PeriodicWave {
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI);
    imag[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (k * Math.PI);
  }
  return ctx.createPeriodicWave(real, imag);
}

export interface MusicPlayer {
  play(id: TrackId): void;
  setPaused(paused: boolean): void;
  isEnabled(): boolean;
  setEnabled(on: boolean): void;
  /** Diagnóstico para os testes no celular: estado do som e da música pedida. */
  status(): string;
}

const SILENT: MusicPlayer = { play() {}, setPaused() {}, isEnabled: () => false, setEnabled() {}, status: () => 'sem Web Audio' };

export function createMusic(): MusicPlayer {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return SILENT;
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let waves: Record<'lead' | 'harmonia', PeriodicWave> | null = null;
  let noise: AudioBuffer | null = null;
  let enabled = readEnabled();
  let paused = false;
  let wanted: TrackId | null = null;
  let current: { id: TrackId; song: Song; startAt: number; cursor: number } | null = null;
  let timer: number | undefined;
  let lastError = '';
  const live = new Set<AudioScheduledSourceNode>();
  const cache = new Map<TrackId, Promise<Song | null>>();

  function readEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  }

  function audio(): AudioContext {
    if (ctx) return ctx;
    // No iPhone, a chave do silencioso corta o som do Web Audio; pedindo a sessão de reprodução (como um
    // tocador de música), a trilha toca mesmo com ela ligada (Safari 16.4+; nos outros não existe).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);
    waves = { lead: pulseWave(ctx, 0.25), harmonia: pulseWave(ctx, 0.5) };
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function load(id: TrackId): Promise<Song | null> {
    const url = FILES[`/musicas/${id}.mid`];
    if (!url) return Promise.resolve(null);
    if (!cache.has(id)) {
      cache.set(
        id,
        fetch(url)
          .then((r) => r.arrayBuffer())
          .then((buf) => {
            const notes = parseMidi(buf);
            if (notes.length === 0) return null;
            // MIDI de karaokê pode ter um minuto calado antes da primeira nota: o silêncio do começo sai.
            const lead = Math.max(0, notes[0].t - 0.2);
            for (const n of notes) n.t -= lead;
            const lengthS = Math.max(...notes.map((n) => n.t + n.dur)) + 0.5;
            return { notes, lengthS, roles: rolesOf(notes) };
          })
          .catch((e) => {
            lastError = String(e);
            return null;
          }),
      );
    }
    return cache.get(id)!;
  }

  function voice(n: Note, at: number, role: Role) {
    const c = ctx!;
    const g = c.createGain();
    g.connect(master!);
    if (role === 'bateria') {
      const src = c.createBufferSource();
      src.buffer = noise;
      const kick = n.pitch === 35 || n.pitch === 36;
      const hat = n.pitch === 42 || n.pitch === 44 || n.pitch === 46;
      const len = kick ? 0.12 : hat ? 0.04 : 0.1;
      const f = c.createBiquadFilter();
      f.type = kick ? 'lowpass' : 'highpass';
      f.frequency.value = kick ? 220 : hat ? 7000 : 1800;
      src.connect(f).connect(g);
      g.gain.setValueAtTime(n.vel * (kick ? 1.1 : 0.45), at);
      g.gain.exponentialRampToValueAtTime(0.001, at + len);
      src.start(at, Math.random() * 0.5);
      src.stop(at + len + 0.02);
      track(src);
      return;
    }
    const osc = c.createOscillator();
    if (role === 'baixo') osc.type = 'triangle'; // o canal de onda do Game Boy
    else osc.setPeriodicWave(waves![role === 'lead' ? 'lead' : 'harmonia']);
    osc.frequency.value = 440 * 2 ** ((n.pitch - 69) / 12);
    osc.connect(g);
    const peak = n.vel * (role === 'lead' ? 0.55 : role === 'baixo' ? 0.7 : 0.22);
    const dur = Math.min(n.dur, 4);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.005);
    g.gain.linearRampToValueAtTime(peak * 0.7, at + Math.min(0.1, dur));
    g.gain.setValueAtTime(peak * 0.7, at + dur);
    g.gain.linearRampToValueAtTime(0, at + dur + 0.04);
    osc.start(at);
    osc.stop(at + dur + 0.06);
    track(osc);
  }

  function track(src: AudioScheduledSourceNode) {
    live.add(src);
    src.onended = () => live.delete(src);
  }

  function silence() {
    for (const src of live) {
      try {
        src.stop();
      } catch {
        // já parou
      }
    }
    live.clear();
  }

  function schedule() {
    if (!current || !ctx || ctx.state !== 'running') return;
    const { song } = current;
    const horizon = ctx.currentTime + LOOKAHEAD_S;
    for (;;) {
      if (current.cursor >= song.notes.length) {
        current.startAt += song.lengthS; // MUS-02: em loop
        current.cursor = 0;
      }
      const n = song.notes[current.cursor];
      const at = current.startAt + n.t;
      if (at > horizon) break;
      if (at >= ctx.currentTime - 0.05) voice(n, Math.max(at, ctx.currentTime), song.roles.get(n.ch) ?? 'harmonia');
      current.cursor++;
    }
  }

  async function start(id: TrackId) {
    const song = await load(id);
    if (wanted !== id || !enabled) return;
    silence();
    if (!song) {
      current = null;
      return;
    }
    const c = audio();
    current = { id, song, startAt: c.currentTime + 0.1, cursor: 0 };
    if (timer === undefined) timer = window.setInterval(schedule, TICK_MS);
    schedule();
  }

  // O navegador só libera o som depois de um toque. No celular, encostar o dedo (pointerdown) não conta:
  // vale soltar (pointerup, touchend) ou o clique; por isso escuta todos.
  const unlock = () => {
    if (!enabled) return;
    const c = audio();
    if (!paused && c.state !== 'running') void c.resume().then(schedule, (e) => (lastError = String(e)));
    if (wanted && !current) {
      const id = wanted;
      wanted = null;
      play(id); // a música não tinha começado (ex.: carregou antes do primeiro toque): tenta de novo
    }
  };
  // Na captura: nenhum botão do jogo consegue esconder o toque do destravamento.
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(type, unlock, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (!paused && enabled) void ctx.resume();
  });

  function play(id: TrackId) {
    if (wanted === id && current?.id === id) return;
    wanted = id;
    void start(id);
  }

  return {
    play,
    setPaused(p) {
      paused = p;
      if (!ctx) return;
      if (p) void ctx.suspend();
      else if (enabled && !document.hidden) void ctx.resume();
    },
    isEnabled: () => enabled,
    status: () =>
      `som: ${ctx?.state ?? 'não criado'} · música: ${current?.id ?? wanted ?? 'nenhuma'}${current ? ' tocando' : ''}` +
      `${enabled ? '' : ' · desligada'}${lastError ? ` · erro: ${lastError}` : ''}`,
    setEnabled(on) {
      enabled = on;
      try {
        localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
      } catch {
        // sem armazenamento: vale só nesta sessão
      }
      if (!on) {
        silence();
        current = null;
        void ctx?.suspend();
      } else {
        const id = wanted;
        wanted = null;
        if (id) play(id);
        unlock();
      }
    },
  };
}
