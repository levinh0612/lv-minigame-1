/* Nhạc nền + hiệu ứng tự tổng hợp bằng Web Audio: không cần file mp3, nhẹ và chạy offline. */
import { S, save } from "../engine/state";

type Track = "home" | "shift";
type Lead = "box" | "pluck" | "chip" | "mallet" | "keys";
interface TrackDef { name: string; desc: string; bpm: number; vol: number; chords: number[][]; mel: (number | null)[]; lead: Lead; bass: number[]; pad: number[]; hat: number[]; kick?: number[]; snare?: number[]; hatVol?: number; bassLen?: number }

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const note = (s: string): number | null => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(s); if (!m) return null;
  return ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (+m[3] + 1) * 12;
};
const mel = (str: string) => str.trim().split(/\s+/).map(x => (x === "." ? null : note(x)));

// Danh sách bài: "auto" = ở tiệm nghe "Sáng ở tiệm", vào ca nghe "Giờ cao điểm"; chọn bài khác thì nghe bài đó mọi lúc
export const SONGS: Record<string, TrackDef> = {
  home: {
    name: "Sáng ở tiệm", desc: "Hộp nhạc, nhẹ nhàng",
    bpm: 84, vol: 0.55, lead: "box", bass: [0, 4], pad: [2, 6], hat: [],
    chords: [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55], [53, 57, 60], [45, 48, 52], [46, 50, 53], [48, 52, 55]],
    mel: mel(`A5 . C6 . A5 G5 F5 .  D5 . F5 . A5 . G5 .  F5 . D5 . F5 G5 A5 .  G5 . . E5 C5 . . .
              A5 . C6 . D6 C6 A5 .  C6 . A5 . E5 . G5 .  F5 G5 A5 . D5 . F5 .  E5 . G5 . F5 . . .`)
  },
  shift: {
    name: "Giờ cao điểm", desc: "Vui, nhanh tay",
    bpm: 112, vol: 0.5, lead: "pluck", bass: [0, 3, 4, 6], pad: [2, 6], hat: [1, 3, 5, 7],
    chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50], [48, 52, 55], [40, 43, 47], [41, 45, 48], [43, 47, 50]],
    mel: mel(`E5 G5 . C6 . G5 E5 .  A5 . C6 . A5 G5 E5 .  F5 A5 . C6 . A5 F5 .  G5 . B5 . D6 . B5 .
              C6 . G5 . E5 G5 C6 .  B5 . G5 . E5 . G5 .  A5 G5 F5 . A5 . C6 .  D6 . B5 . G5 . . .`)
  },
  lofi: {
    name: "Mưa ngoài hiên", desc: "Lofi chill, trống nhẹ",
    bpm: 76, vol: 0.55, lead: "keys", bass: [0, 3], pad: [0, 4], hat: [0, 2, 4, 6], kick: [0, 5], snare: [4], hatVol: 0.02, bassLen: 0.8,
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59], [53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
    mel: mel(`A5 . . G5 E5 . . .  G5 . . . . . D5 .  F5 . E5 . D5 . C5 .  E5 . . . . . . .
              A5 . C6 . B5 . G5 .  G5 . E5 . . D5 E5 .  F5 . A5 . G5 . E5 .  C5 . . . . . . .`)
  },
  chip: {
    name: "Xe đạp 8-bit", desc: "Nhạc game điện tử, sôi động",
    bpm: 138, vol: 0.5, lead: "chip", bass: [0, 2, 4, 6], pad: [], hat: [1, 3, 5, 7], kick: [0], snare: [4], bassLen: 0.18,
    chords: [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]],
    mel: mel(`C5 E5 G5 C6 . G5 E5 G5  B4 D5 G5 B5 . G5 D5 .  A4 C5 E5 A5 . E5 C5 E5  F5 . E5 . D5 . C5 .
              E5 . G5 . C6 . B5 A5  G5 . D5 . G5 . B5 .  C6 B5 A5 . E5 . A5 .  F5 A5 G5 F5 E5 D5 C5 .`)
  },
  bossa: {
    name: "Bossa matcha", desc: "Mộc cầm, lắc lư quán cà phê",
    bpm: 104, vol: 0.55, lead: "mallet", bass: [0, 3, 4, 7], pad: [2, 5], hat: [0, 1, 2, 3, 4, 5, 6, 7], hatVol: 0.015, bassLen: 0.4,
    chords: [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 49, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53], [52, 55, 59, 62], [45, 49, 52, 55]],
    mel: mel(`F5 . A5 . . G5 F5 .  F5 . . D5 . B4 . .  E5 . G5 . B5 . A5 G5  E5 . C#5 . . . . .
              A5 . . F5 . D5 . .  B5 . A5 G5 . F5 . .  G5 . E5 . B4 . D5 E5  C#5 . . E5 . A5 . .`)
  },
  date: {
    name: "Hẹn hò", desc: "Pop dễ thương, chuông leng keng",
    bpm: 120, vol: 0.5, lead: "box", bass: [0, 3, 4], pad: [2, 6], hat: [1, 3, 5, 7], kick: [0, 3, 4], snare: [2, 6], bassLen: 0.3,
    chords: [[43, 47, 50], [38, 42, 45], [40, 43, 47], [36, 40, 43], [43, 47, 50], [38, 42, 45], [36, 40, 43], [38, 42, 45]],
    mel: mel(`B5 . A5 G5 . D5 . .  A5 . G5 F#5 . D5 . .  G5 . F#5 E5 . B4 . E5  G5 . . A5 . . . .
              B5 . D6 . B5 . A5 G5  A5 . F#5 . D5 . . .  E5 G5 C6 . B5 A5 G5 .  F#5 . A5 . D6 . . .`)
  },
  lullaby: {
    name: "Ru ngủ", desc: "Chậm, êm, hợp buổi tối",
    bpm: 66, vol: 0.55, lead: "box", bass: [0], pad: [0, 4], hat: [], bassLen: 1.6,
    chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50], [48, 52, 55], [40, 43, 47], [41, 45, 48], [48, 52, 55]],
    mel: mel(`E5 . . . G5 . . .  E5 . . . C5 . . .  F5 . . . A5 . G5 .  F5 . E5 . D5 . . .
              E5 . . . G5 . C6 .  B5 . . . G5 . . .  A5 . G5 . F5 . D5 .  C5 . . . . . . .`)
  }
};
export const songName = () => (S.song && SONGS[S.song] ? SONGS[S.song].name : "Tự đổi theo lúc");
export const songOf = (ctx: Track) => (S.song && S.song !== "auto" && SONGS[S.song] ? S.song : ctx);

let ctx: AudioContext | null = null, master: GainNode, musicBus: GainNode, sfxBus: GainNode, noiseBuf: AudioBuffer;
let timer = 0, track: string | null = null, want: Track | null = null, step = 0, nextT = 0;

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
const chip = (m: number, t: number, v: number) => { const f = hz(m); tone(musicBus, "square", f, t, 0.2, 0.05 * v, 0.003); tone(musicBus, "triangle", f, t, 0.2, 0.06 * v, 0.003); };
const mallet = (m: number, t: number, v: number) => { const f = hz(m); tone(musicBus, "sine", f, t, 0.5, 0.18 * v, 0.002); tone(musicBus, "sine", f * 4, t, 0.08, 0.04 * v, 0.002); };
const keys = (m: number, t: number, v: number) => { const f = hz(m); tone(musicBus, "sine", f, t, 1.0, 0.13 * v, 0.01); tone(musicBus, "sine", f * 2.003, t, 0.4, 0.03 * v); tone(musicBus, "triangle", f, t, 0.25, 0.03 * v); };
const LEAD: Record<Lead, typeof pluck> = { box: musicBox, pluck, chip, mallet, keys };

function schedule() {
  if (!ctx || !track) return;
  const T = SONGS[track], dt = 60 / T.bpm / 2;
  while (nextT < ctx.currentTime + 0.15) {
    const bar = Math.floor(step / 8) % 8, pos = step % 8, ch = T.chords[bar], v = T.vol;
    const m = T.mel[(bar * 8 + pos) % T.mel.length];
    if (m) LEAD[T.lead](m, nextT, v);
    let b = ch[0] - 12; while (b < 36) b += 12;
    if (T.bass.includes(pos)) tone(musicBus, T.lead === "chip" ? "triangle" : "sine", hz(b), nextT, T.bassLen ?? (T.lead === "box" ? 0.9 : 0.3), 0.2 * v, 0.01);
    if (T.pad.includes(pos)) ch.forEach((n, i) => tone(musicBus, "triangle", hz(n + 12), nextT + i * 0.02, 0.7, 0.035 * v, 0.03));
    if (T.hat.includes(pos)) noise(musicBus, nextT, 0.04, (T.hatVol ?? 0.035) * v, "highpass", 7000);
    if (T.kick?.includes(pos)) tone(musicBus, "sine", 150, nextT, 0.25, 0.45 * v, 0.003, 45);
    if (T.snare?.includes(pos)) noise(musicBus, nextT, 0.12, 0.1 * v, "bandpass", 1800);
    step++; nextT += dt;
  }
}
function startTimer() { clearInterval(timer); timer = window.setInterval(schedule, 30); schedule(); }

function play(name: Track) {
  want = name;
  const id = songOf(name);
  if (!S.music || !ctx || document.hidden || track === id) return;
  const now = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(musicBus.gain.value, now);
  musicBus.gain.linearRampToValueAtTime(0, now + 0.35);
  setTimeout(() => {
    if (!S.music || want !== name || songOf(name) !== id || !ctx) return;
    track = id; step = 0; nextT = ctx.currentTime + 0.05;
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
  setMusic(on: boolean) { S.music = on; save(); if (on) { unlock(); play(want || "home"); } else stop(); },
  /* chọn bài: bật nhạc nếu đang tắt, đổi bài ngay */
  setSong(id: string) { S.song = id; S.music = true; save(); unlock(); play(want || "home"); }
};
