/* Nhạc nền + hiệu ứng tự tổng hợp bằng Web Audio: không cần file mp3, nhẹ và chạy offline. */
import { S, save } from "../engine/state";

type Track = "home" | "shift";
interface TrackDef { bpm: number; vol: number; chords: number[][]; mel: (number | null)[]; lead: "box" | "pluck"; bass: number[]; pad: number[]; hat: number[] }

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const note = (s: string): number | null => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(s); if (!m) return null;
  return ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (+m[3] + 1) * 12;
};
const mel = (str: string) => str.trim().split(/\s+/).map(x => (x === "." ? null : note(x)));

// Hai bài: "Sáng ở tiệm" (hộp nhạc, chậm) và "Giờ cao điểm" (vui, nhanh)
const TRACKS: Record<Track, TrackDef> = {
  home: {
    bpm: 84, vol: 0.55, lead: "box", bass: [0, 4], pad: [2, 6], hat: [],
    chords: [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55], [53, 57, 60], [45, 48, 52], [46, 50, 53], [48, 52, 55]],
    mel: mel(`A5 . C6 . A5 G5 F5 .  D5 . F5 . A5 . G5 .  F5 . D5 . F5 G5 A5 .  G5 . . E5 C5 . . .
              A5 . C6 . D6 C6 A5 .  C6 . A5 . E5 . G5 .  F5 G5 A5 . D5 . F5 .  E5 . G5 . F5 . . .`)
  },
  shift: {
    bpm: 112, vol: 0.5, lead: "pluck", bass: [0, 3, 4, 6], pad: [2, 6], hat: [1, 3, 5, 7],
    chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50], [48, 52, 55], [40, 43, 47], [41, 45, 48], [43, 47, 50]],
    mel: mel(`E5 G5 . C6 . G5 E5 .  A5 . C6 . A5 G5 E5 .  F5 A5 . C6 . A5 F5 .  G5 . B5 . D6 . B5 .
              C6 . G5 . E5 G5 C6 .  B5 . G5 . E5 . G5 .  A5 G5 F5 . A5 . C6 .  D6 . B5 . G5 . . .`)
  }
};

let ctx: AudioContext | null = null, master: GainNode, musicBus: GainNode, sfxBus: GainNode, noiseBuf: AudioBuffer;
let timer = 0, track: Track | null = null, want: Track | null = null, step = 0, nextT = 0;

function init(): boolean {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain(); master.gain.value = 0.9;
    musicBus = ctx.createGain(); musicBus.gain.value = 0;
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4200;
    musicBus.connect(lp).connect(master); sfxBus.connect(master); master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  } catch { ctx = null; return false; }
}

/* ---- nhạc cụ ---- */
function tone(bus: AudioNode, type: OscillatorType, f: number, t: number, dur: number, vol: number, att = 0.006, f2?: number) {
  const o = ctx!.createOscillator(), g = ctx!.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.6);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function noise(bus: AudioNode, t: number, dur: number, vol: number, filter: BiquadFilterType, f: number, f2?: number) {
  const s = ctx!.createBufferSource(), fl = ctx!.createBiquadFilter(), g = ctx!.createGain();
  s.buffer = noiseBuf; fl.type = filter; fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(fl).connect(g).connect(bus); s.start(t); s.stop(t + dur + 0.03);
}
const musicBox = (m: number, t: number, v: number) => { const f = hz(m); tone(musicBus, "sine", f, t, 1.3, 0.16 * v); tone(musicBus, "sine", f * 2, t, 0.5, 0.05 * v); tone(musicBus, "triangle", f * 3, t, 0.15, 0.015 * v); };
const pluck = (m: number, t: number, v: number) => { const f = hz(m); tone(musicBus, "triangle", f, t, 0.35, 0.14 * v); tone(musicBus, "sine", f * 2, t, 0.18, 0.04 * v); };

function schedule() {
  if (!ctx || !track) return;
  const T = TRACKS[track], dt = 60 / T.bpm / 2;
  while (nextT < ctx.currentTime + 0.15) {
    const bar = Math.floor(step / 8) % 8, pos = step % 8, ch = T.chords[bar], v = T.vol;
    const m = T.mel[(bar * 8 + pos) % T.mel.length];
    if (m) (T.lead === "box" ? musicBox : pluck)(m, nextT, v);
    if (T.bass.includes(pos)) tone(musicBus, "sine", hz(ch[0] - 12), nextT, T.lead === "box" ? 0.9 : 0.3, 0.2 * v, 0.01);
    if (T.pad.includes(pos)) ch.forEach((n, i) => tone(musicBus, "triangle", hz(n + 12), nextT + i * 0.02, 0.7, 0.035 * v, 0.03));
    if (T.hat.includes(pos)) noise(musicBus, nextT, 0.04, 0.035 * v, "highpass", 7000);
    step++; nextT += dt;
  }
}
function startTimer() { clearInterval(timer); timer = window.setInterval(schedule, 30); schedule(); }

function play(name: Track) {
  want = name;
  if (!S.music || !ctx || document.hidden || track === name) return;
  const now = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(musicBus.gain.value, now);
  musicBus.gain.linearRampToValueAtTime(0, now + 0.35);
  setTimeout(() => {
    if (!S.music || want !== name || !ctx) return;
    track = name; step = 0; nextT = ctx.currentTime + 0.05;
    const t = ctx.currentTime; musicBus.gain.setValueAtTime(0, t); musicBus.gain.linearRampToValueAtTime(1, t + 1.2);
    startTimer();
  }, track ? 380 : 0);
}
function stop() {
  clearInterval(timer); timer = 0; track = null;
  if (ctx) { const t = ctx.currentTime; musicBus.gain.cancelScheduledValues(t); musicBus.gain.setValueAtTime(musicBus.gain.value, t); musicBus.gain.linearRampToValueAtTime(0, t + 0.3); }
}

/* ---- hiệu ứng ---- */
const SFX: Record<string, (t: number) => void> = {
  tap: t => tone(sfxBus, "sine", 620, t, 0.09, 0.18, 0.004, 930),
  untap: t => tone(sfxBus, "sine", 520, t, 0.09, 0.14, 0.004, 340),
  click: t => tone(sfxBus, "triangle", 1400, t, 0.04, 0.06),
  bell: t => { tone(sfxBus, "sine", hz(84), t, 0.7, 0.16); tone(sfxBus, "sine", hz(79), t + 0.16, 0.9, 0.16); },
  coin: t => { tone(sfxBus, "triangle", hz(88), t, 0.18, 0.16); tone(sfxBus, "triangle", hz(93), t + 0.07, 0.35, 0.16); tone(sfxBus, "sine", hz(100), t + 0.12, 0.3, 0.05); },
  wrong: t => { tone(sfxBus, "square", hz(52), t, 0.14, 0.05); tone(sfxBus, "square", hz(49), t + 0.12, 0.22, 0.05); },
  leave: t => tone(sfxBus, "sine", 440, t, 0.45, 0.14, 0.01, 190),
  boop: t => { tone(sfxBus, "sine", 660, t, 0.12, 0.14, 0.005, 1100); tone(sfxBus, "sine", hz(88), t + 0.08, 0.18, 0.05); },
  trash: t => noise(sfxBus, t, 0.22, 0.12, "bandpass", 2500, 400),
  open: t => [72, 76, 79, 84].forEach((m, i) => tone(sfxBus, "triangle", hz(m), t + i * 0.08, 0.4, 0.12)),
  level: t => [72, 76, 79, 84, 88, 91].forEach((m, i) => tone(sfxBus, "triangle", hz(m), t + i * 0.07, 0.5, 0.12)),
  letter: t => [65, 69, 72, 77, 81, 84, 89].forEach((m, i) => tone(sfxBus, "sine", hz(m), t + i * 0.06, 1.1, 0.08)),
  end: t => [79, 76, 72, 74, 72].forEach((m, i) => tone(sfxBus, "triangle", hz(m), t + i * 0.12, 0.5, 0.1))
};
export type Sfx = keyof typeof SFX;
export function sfx(name: string) {
  if (!S.sound || !ctx || ctx.state !== "running") return;
  try { SFX[name]?.(ctx.currentTime + 0.005); } catch { /* bỏ qua */ }
}

// Trình duyệt chỉ cho phát tiếng sau khi người chơi chạm lần đầu
function unlock() {
  if (!init()) return;
  if (ctx!.state === "suspended") void ctx!.resume();
  if (want) play(want);
}
document.addEventListener("pointerdown", unlock, { passive: true });
document.addEventListener("keydown", unlock);
document.addEventListener("visibilitychange", () => {
  if (!ctx) return;
  if (document.hidden) { clearInterval(timer); timer = 0; void ctx.suspend(); }
  else void ctx.resume().then(() => { if (track && S.music) { nextT = ctx!.currentTime + 0.05; startTimer(); } else if (want) play(want); });
});

export const Sound = {
  play,
  stop,
  setMusic(on: boolean) { S.music = on; save(); if (on) { unlock(); play(want || "home"); } else stop(); }
};
