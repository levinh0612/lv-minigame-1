/* Thử thách ngày: mỗi ngày một thể lệ (xoay vòng theo ngày). Bật trước khi bắt đầu ca; đạt mục tiêu lần đầu trong ngày thì nhận thưởng. */
import { CHALLENGES, challengeOf, type Challenge } from "../content/collection";
import { addTickets } from "./gacha";
import { ex, giveSticker, randomSticker } from "./collection";
import { shiftRevenue } from "./incident";
import { lvl } from "./progress";
import { save } from "./state";
import { dayKey } from "./passive";
import { earn } from "./wallet";

const DAY_MS = 86400000;
/** thử thách của một ngày: chỉ số theo số ngày kể từ mốc, ổn định cho mọi máy */
export function challengeOn(day = dayKey()): Challenge {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return CHALLENGES[Math.floor(Date.UTC(y, m - 1, d) / DAY_MS) % CHALLENGES.length]!;
}
export const challengeActive = (day = dayKey()) => ex().ch.on === day && ex().ch.done !== day;
export const challengeDone = (day = dayKey()) => ex().ch.done === day;
export function setChallenge(on: boolean, day = dayKey()) { const c = ex().ch; if (on && c.done !== day) c.on = day; else if (!on && c.on === day) c.on = ""; save(); }

/** hệ số của ca đang chơi (kiên nhẫn, giá); không bật thì 1/1 */
export const challengeMods = (day = dayKey()) => challengeActive(day) ? { id: challengeOn(day).id, pat: challengeOn(day).pat, price: challengeOn(day).price } : { id: "", pat: 1, price: 1 };

export interface ChOut { c: Challenge; ok: boolean; notes: string[] }
/** hết ca: chấm mục tiêu; trả null nếu ca này không bật thử thách */
export function judgeChallenge(r: { served: number; total: number; left: number; bestCombo: number }, id: string, day = dayKey()): ChOut | null {
  const c = challengeOf(id), e = ex(); if (!c || !id) return null;
  const g = c.goal, ok = g.kind === "served" ? r.total > 0 && r.served >= Math.ceil(r.total * g.share) : g.kind === "calm" ? r.left === 0 && r.served > 0 : r.bestCombo >= g.n;
  e.ch.on = "";
  if (!ok) { save(); return { c, ok, notes: [`${c.e} Thử thách "${c.n}" chưa đạt (${c.goalText}). Mai thử lại nhé`] }; }
  e.ch.done = day; e.ch.wins++;
  e.ch.streak = e.ch.last === prevDay(day) ? e.ch.streak + 1 : 1; e.ch.last = day;
  const coins = Math.round(shiftRevenue(lvl()) * 0.3); earn("memo", coins); addTickets(1);
  const notes = [`${c.e} Đạt thử thách "${c.n}"! +${coins} xu, +1 vé triệu hồi (chuỗi ${e.ch.streak} ngày)`];
  const sid = randomSticker(Math.random, ["guest", "cake", "shop"]); if (sid) notes.push(...(giveSticker(sid)?.notes ?? []));
  save(); return { c, ok, notes };
}
function prevDay(day: string) { const [y, m, d] = day.split("-").map(Number) as [number, number, number]; const t = new Date(y, m - 1, d - 1); return dayKey(t); }
