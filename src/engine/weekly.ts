/* Nhiệm vụ tuần: đầu tuần (thứ Hai) chọn ngẫu nhiên nhưng cố định theo tuần, tiến độ cộng dồn từ mỗi bánh giao (engine/track.ts). */
import { WEEKLY_CHEST, WEEKLY_COUNT, WEEKLY_DEFS, WEEKLY_TICKETS, weeklyScale, type WeeklyDef, type WeeklyKey } from "../content/progression";
import { addTickets } from "./gacha";
import { S, save } from "./state";
import { DAY, today, ymd } from "./util";
import { earn } from "./wallet";

/** mã tuần = ngày thứ Hai của tuần này (YYYY-MM-DD) */
export function weekId(d = today()): string {
  const back = (d.getDay() + 6) % 7;                    // 0 = Chủ nhật → lùi 6 ngày về thứ Hai
  return ymd(new Date(+d - back * DAY));
}
/** bộ sinh số ngẫu nhiên cố định theo chuỗi (mulberry32), để cùng tuần luôn ra cùng nhiệm vụ */
function seeded(seed: string) {
  let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
/** làm tròn mục tiêu cho đẹp: tới 5, 10 hoặc 100 tuỳ độ lớn */
const niceRound = (n: number) => { const step = n >= 1000 ? 100 : n >= 100 ? 10 : 5; return Math.max(step, Math.round(n / step) * step); };
export const weeklyDef = (key: string) => WEEKLY_DEFS.find(d => d.key === key) as WeeklyDef;

/** sang tuần mới thì chọn lại nhiệm vụ theo cấp hiện tại */
export function ensureWeek(level: number) {
  const w = S.prog.weekly, id = weekId();
  if (w.week === id && w.missions.length) return w;
  const rnd = seeded(id), pool = WEEKLY_DEFS.filter(d => (d.minLv ?? 0) <= level);
  const picked: WeeklyDef[] = [];
  while (picked.length < Math.min(WEEKLY_COUNT, pool.length)) { const d = pool[Math.floor(rnd() * pool.length)]; if (!picked.includes(d)) picked.push(d); }
  const k = weeklyScale(level);
  S.prog.weekly = {
    week: id, prog: {}, claimed: [], chest: false,
    missions: picked.map(d => ({ key: d.key, n: niceRound(d.base * k), coins: Math.round(d.coins * k / 50) * 50 }))
  };
  save();
  return S.prog.weekly;
}
export const weeklyProg = (key: string) => S.prog.weekly.prog[key] ?? 0;
export const weeklyDone = (key: string) => { const m = S.prog.weekly.missions.find(x => x.key === key); return !!m && weeklyProg(key) >= m.n; };
export const weeklyAllClaimed = () => S.prog.weekly.missions.length > 0 && S.prog.weekly.missions.every(m => S.prog.weekly.claimed.includes(m.key));
/** cộng tiến độ cho các nhiệm vụ cùng loại (đã có trong tuần) */
export function bumpWeekly(key: WeeklyKey, n = 1) {
  const w = S.prog.weekly;
  if (w.missions.some(m => m.key === key)) w.prog[key] = (w.prog[key] ?? 0) + n;
}
/** nhận thưởng một nhiệm vụ đã xong */
export function claimWeekly(key: string): boolean {
  const w = S.prog.weekly, m = w.missions.find(x => x.key === key);
  if (!m || w.claimed.includes(key) || !weeklyDone(key)) return false;
  w.claimed.push(key); earn("goal", m.coins, "Nhiệm vụ tuần"); addTickets(WEEKLY_TICKETS); save();
  return true;
}
/** nhận rương hoàn thành cả tuần */
export function claimChest(): boolean {
  const w = S.prog.weekly;
  if (w.chest || !weeklyAllClaimed()) return false;
  w.chest = true; earn("goal", WEEKLY_CHEST.coins ?? 0, "Rương nhiệm vụ tuần"); addTickets(WEEKLY_CHEST.tickets ?? 0); save();
  return true;
}
/** số mục chờ nhận (chấm đỏ) */
export const weeklyPending = () => S.prog.weekly.missions.filter(m => weeklyDone(m.key) && !S.prog.weekly.claimed.includes(m.key)).length + (weeklyAllClaimed() && !S.prog.weekly.chest ? 1 : 0);
