/* Danh hiệu: chỉ số lấy từ tiến trình người chơi, bậc nhận thưởng thủ công (S.prog.ach[id] = số bậc đã nhận). */
import { ACHIEVEMENTS, type Achievement, type Reward, type StatId } from "../content/progression";
import { masteredCount } from "./craft";
import { addTickets } from "./gacha";
import { S, save } from "./state";
import { earn } from "./wallet";

/** giá trị hiện tại của một chỉ số thành tích */
export function statValue(s: StatId): number {
  switch (s) {
    case "served": return S.served;
    case "earned": return S.earned;
    case "shifts": return S.shifts;
    case "streak": return Math.max(S.prog.bestStreak, S.streak);
    case "mastered": return masteredCount();
    default: return S.prog.stat[s] ?? 0;               // perfect, tower, elite: đếm trong track.ts
  }
}
export const achClaimed = (a: Achievement) => S.prog.ach[a.id] ?? 0;
/** số bậc đã đạt (đủ mốc), kể cả chưa nhận */
export const achReached = (a: Achievement) => a.need.filter(n => statValue(a.stat) >= n).length;
export const achPending = () => ACHIEVEMENTS.reduce((t, a) => t + achReached(a) - achClaimed(a), 0);
/** nhận thưởng bậc kế tiếp đã đạt; trả về phần thưởng hoặc null */
export function claimAch(id: string): Reward | null {
  const a = ACHIEVEMENTS.find(x => x.id === id); if (!a || achReached(a) <= achClaimed(a)) return null;
  const r = a.reward[achClaimed(a)]; S.prog.ach[id] = achClaimed(a) + 1;
  if (r.coins) earn("goal", r.coins, `Danh hiệu ${a.n}`);
  if (r.tickets) addTickets(r.tickets);
  save();
  return r;
}
