/* Luật game học chữ Hán: nhận dạng nét vẽ thanh điệu, chọn chữ cho bóng, thông số theo bậc, tính kết quả.
   Chỉ có số liệu và tính toán, không đụng giao diện (ui/minigames/hanzi.ts). Mọi hàm ngẫu nhiên nhận `rng` để test lặp lại được. */
import { HANZI_TITLES, HANZI_TONES, HANZI_WORDS, type Hanzi, type HanziWord, type Tone } from "../content/hanzi";
import NSTROKES from "../content/hanzi-n.json";
import { clampTier, tierOf, toNextTier, type Rng } from "./minigame";
import { S } from "./state";

export interface Pt { x: number; y: number }

/* ============ Nhận dạng thanh điệu từ nét vẽ ============ */
const TAP_LEN = 22;          // nét ngắn hơn (px) coi là chạm một cái = thanh nhẹ
const pathLen = (p: Pt[]) => p.reduce((s, q, i) => i ? s + Math.hypot(q.x - p[i - 1]!.x, q.y - p[i - 1]!.y) : 0, 0);

/** Đọc nét vẽ (toạ độ màn hình, y hướng xuống) thành thanh điệu; null nếu không giống thanh nào.
 *  1 gạch ngang (trái hoặc phải), 2 gạch lên phải, 4 gạch xuống phải, 3 xuống rồi lên, 0 chạm. */
export function recognizeTone(p: Pt[]): Tone | null {
  if (p.length < 2) return p.length === 1 ? 0 : null;
  const L = pathLen(p);
  if (L < TAP_LEN) return 0;
  const a = p[0]!, b = p[p.length - 1]!;
  /* thanh 3: có điểm thấp nhất nằm giữa nét, cả hai đầu đều cao hơn rõ rệt */
  let lo = 0; p.forEach((q, i) => { if (q.y > p[lo]!.y) lo = i; });
  const mid = lo / (p.length - 1), dip = p[lo]!.y;
  if (mid > 0.15 && mid < 0.85 && dip - a.y > 0.18 * L && dip - b.y > 0.12 * L) return 3;
  /* ba thanh còn lại là nét gần thẳng: đầu-cuối phải bằng phần lớn độ dài nét */
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  if (chord < 0.72 * L) return null;
  const deg = Math.atan2(-(b.y - a.y), b.x - a.x) * 180 / Math.PI;   // 0 = sang phải, 90 = lên, -90 = xuống
  if (Math.abs(deg) <= 25 || Math.abs(deg) >= 155) return 1;
  if (deg > 25 && deg <= 110) return 2;
  if (deg < -25 && deg >= -110) return 4;
  return null;
}

/* ============ Pinyin có dấu ============ */
const MARK: Record<string, string[]> = { a: ["ā", "á", "ǎ", "à"], e: ["ē", "é", "ě", "è"], i: ["ī", "í", "ǐ", "ì"], o: ["ō", "ó", "ǒ", "ò"], u: ["ū", "ú", "ǔ", "ù"], ü: ["ǖ", "ǘ", "ǚ", "ǜ"] };
/** gắn dấu vào âm tiết: a và e luôn nhận dấu, "ou" thì o, còn lại nguyên âm cuối cùng */
export function withTone(syl: string, tone: Tone): string {
  if (tone === 0) return syl;
  let at = syl.search(/[ae]/);
  if (at < 0) at = syl.includes("ou") ? syl.indexOf("o") : Math.max(...[..."iouü"].map(v => syl.lastIndexOf(v)));
  const c = syl[at]!;
  return syl.slice(0, at) + (MARK[c]?.[tone - 1] ?? c) + syl.slice(at + 1);
}

/* ============ Thông số theo bậc ============ */
export interface HanziParams {
  total: number;      // số bóng trong một ván
  fall: number;       // giây để bóng rơi từ đỉnh xuống đáy
  gap: number;        // giây giữa hai bóng
  tones: Tone[];      // các thanh có thể xuất hiện
  legend: boolean;    // hiện bảng gợi ý nét của từng thanh
  boss: boolean;      // cuối ván có boss từ ghép hai chữ
  bossFall: number;   // giây để boss rơi hết đường (chậm hơn bóng thường)
  lives: number;
}
const L = <T>(a: T[], t: number) => a[clampTier(t)]!;
export const hanziParams = (tier: number): HanziParams => ({
  total: L([8, 10, 12, 14, 16, 18, 20], tier),
  fall: L([12, 11, 10, 9, 8, 7, 6.5], tier), gap: L([3.2, 2.8, 2.5, 2.2, 1.9, 1.7, 1.5], tier),
  tones: tier < 1 ? [1, 2, 3, 4] : [0, 1, 2, 3, 4],
  legend: tier < 3, boss: tier >= 1, bossFall: L([20, 19, 18, 16, 15, 14, 12], tier), lives: 3
});

/* ============ Chọn chữ cho bóng ============ */
/** chữ hay sai được chọn nhiều hơn (trọng số 1 → 7), chữ vừa ra liền trước thì bỏ qua */
export function pickHanzi(tones: readonly Tone[], wrong: Record<string, number>, rng: Rng, avoid = ""): Hanzi {
  const pool = HANZI_TONES.filter(z => tones.includes(z.tone) && z.h !== avoid);
  const w = pool.map(z => 1 + 2 * Math.min(3, wrong[z.h] ?? 0));
  let r = rng() * w.reduce((s, x) => s + x, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]!; if (r < 0) return pool[i]!; }
  return pool[pool.length - 1]!;
}

/* ============ Kết quả ván ============ */
export const BOSS_COST = 2;   // boss chạm đất mất 2 mạng
export type BossOutcome = "none" | "won" | "lost";
export interface HanziResult { ok: boolean; popped: number; fell: number; total: number; lives: number; xp: number; boss: BossOutcome; word?: HanziWord }
/** `fell` = số mạng đã mất (bóng thường mất 1, boss mất BOSS_COST). Thắng khi còn mạng; thêm 1 điểm danh hiệu nếu trúng ít nhất 70% bóng,
 *  thêm 1 nếu không mất mạng nào, thêm 1 nếu hạ được boss */
export function hanziResult(p: HanziParams, popped: number, fell: number, boss: BossOutcome = "none", word?: HanziWord): HanziResult {
  const lives = Math.max(0, p.lives - fell), ok = lives > 0, good = ok && popped >= Math.ceil(p.total * 0.7);
  return { ok, popped, fell, total: p.total, lives, boss, word, xp: good ? 1 + (fell === 0 ? 1 : 0) + (boss === "won" ? 1 : 0) : 0 };
}

/* ============ Boss từ ghép ============ */
export const wordTones = (w: HanziWord): [Tone, Tone] => [w.ta, w.tb];
export const wordPinyin = (w: HanziWord) => `${withTone(w.a, w.ta)} ${withTone(w.b, w.tb)}`;
/** chọn từ cho boss; từ hay sai (khoá bằng chính từ) được ưu tiên */
export function pickWord(wrong: Record<string, number>, rng: Rng): HanziWord {
  const w = HANZI_WORDS.map(x => 1 + 2 * Math.min(3, wrong[x.w] ?? 0));
  let r = rng() * w.reduce((s, x) => s + x, 0);
  for (let i = 0; i < HANZI_WORDS.length; i++) { r -= w[i]!; if (r < 0) return HANZI_WORDS[i]!; }
  return HANZI_WORDS[HANZI_WORDS.length - 1]!;
}

/* ============ Luyện viết chữ ============ */
export const strokeCount = (h: string) => (NSTROKES as Record<string, number>)[h] ?? 0;
export interface WriteParams {
  count: number;        // số chữ trong một ván
  maxStrokes: number;   // chữ nhiều nét hơn mức này chưa xuất hiện
  outline: boolean;     // hiện mờ khung chữ để tô theo
  demo: boolean;        // tự chạy mẫu thứ tự nét trước khi viết
  leniency: number;     // càng cao càng dễ tính khi chấm nét
  hintAfter: number;    // sai bao nhiêu lần thì gợi ý nét kế
}
export const writeParams = (tier: number): WriteParams => ({
  count: L([4, 5, 5, 6, 6, 7, 8], tier), maxStrokes: L([4, 5, 6, 7, 8, 10, 12], tier),
  outline: tier < 2, demo: tier < 2, leniency: L([1.6, 1.4, 1.3, 1.2, 1.1, 1, 1], tier), hintAfter: L([1, 2, 2, 3, 3, 4, 4], tier)
});
/** chọn `count` chữ khác nhau đủ nét dễ cho bậc này, chữ hay sai được ưu tiên */
export function pickWriteSet(tier: number, wrong: Record<string, number>, rng: Rng): Hanzi[] {
  const P = writeParams(tier), pool = HANZI_TONES.filter(z => strokeCount(z.h) > 0 && strokeCount(z.h) <= P.maxStrokes), out: Hanzi[] = [];
  while (out.length < Math.min(P.count, pool.length)) {
    const w = pool.map(z => out.includes(z) ? 0 : 1 + 2 * Math.min(3, wrong[z.h] ?? 0));
    let r = rng() * w.reduce((s, x) => s + x, 0), i = 0;
    for (; i < pool.length - 1; i++) { r -= w[i]!; if (r < 0) break; }
    if (out.includes(pool[i]!)) i = pool.findIndex(z => !out.includes(z));
    out.push(pool[i]!);
  }
  return out;
}
export interface WriteResult { chars: { h: string; mistakes: number }[]; perfect: number; total: number; xp: number }
export const starsOf = (mistakes: number) => mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
/** viết xong cả ván: được điểm danh hiệu khi ít nhất nửa số chữ viết không sai nét, thêm 1 nếu tất cả không sai */
export function writeResult(chars: { h: string; mistakes: number }[]): WriteResult {
  const perfect = chars.filter(c => c.mistakes === 0).length;
  return { chars, perfect, total: chars.length, xp: perfect >= Math.ceil(chars.length / 2) ? 1 + (perfect === chars.length ? 1 : 0) : 0 };
}

/* ============ Tiến độ đã lưu và danh hiệu ============ */
export const zhState = () => (S.zh ??= { xp: 0, best: 0, wrong: {}, voice: true });
export const hanziTier = () => clampTier(tierOf(zhState().xp));
export const hanziTitle = () => HANZI_TITLES[hanziTier()]!;
export const hanziToNext = () => toNextTier(zhState().xp);
/** các chữ đang sai nhiều nhất, để hiện ở màn Học chữ */
export const weakHanzi = (n = 6) => HANZI_TONES.filter(z => (zhState().wrong[z.h] ?? 0) > 0).sort((a, b) => zhState().wrong[b.h]! - zhState().wrong[a.h]!).slice(0, n);
