/* Ghi nhận mỗi bánh giao xong cho nội dung cày: tay nghề công thức, bộ đếm thành tích, nhiệm vụ tuần. Gọi từ shift.ts (deliver, finishShift). */
import { tiersOf, type Recipe } from "../content/game";
import { recordMade } from "./craft";
import { S } from "./state";
import { bumpWeekly } from "./weekly";

export const ELITE_LV = 26;      // món từ cấp này trở lên tính là "cao cấp" (bánh tuỳ chỉnh không tính)
const bump = (k: string, n = 1) => { S.prog.stat[k] = (S.prog.stat[k] ?? 0) + n; };

/** ghi nhận một bánh; trả về thông tin lên sao (nếu có) để màn chơi báo cho người chơi */
export function trackServe(r: Recipe, paid: number, stars: number, perfect: boolean) {
  const up = recordMade(r.id, r.price);
  const tower = tiersOf(r) > 1, elite = r.lv >= ELITE_LV && !r.custom;
  if (perfect) bump("perfect");
  if (tower) bump("tower");
  if (elite) bump("elite");
  S.prog.bestStreak = Math.max(S.prog.bestStreak, S.streak);
  bumpWeekly("served"); bumpWeekly("earned", paid);
  if (perfect) bumpWeekly("perfect");
  if (tower) bumpWeekly("tower");
  if (elite) bumpWeekly("elite");
  if (stars === 3) bumpWeekly("stars3");
  return up;
}
/** hết ca: cộng nhiệm vụ "mở tiệm N ca" */
export const trackShift = () => bumpWeekly("shifts");
