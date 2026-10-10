/* Tay nghề công thức: mỗi món làm đủ số bánh thì lên sao, giá bán tăng và nhận thưởng xu một lần. */
import { CRAFT_AT, CRAFT_MAX, CRAFT_STEP, craftReward } from "../content/progression";
import { S } from "./state";
import { earn } from "./wallet";

export const madeOf = (id: string) => S.prog.made[id] ?? 0;
/** số sao (0..5) ứng với số bánh đã làm */
export const starsFor = (made: number) => CRAFT_AT.filter(n => made >= n).length;
export const craftStars = (id: string) => starsFor(madeOf(id));
/** hệ số giá bán từ tay nghề (0 nếu chưa có sao) */
export const craftBonus = (id: string) => CRAFT_STEP * craftStars(id);
/** mốc bánh của sao kế tiếp, null nếu đã đủ 5 sao */
export const nextCraft = (id: string) => CRAFT_AT[craftStars(id)] ?? null;
/** số công thức đã đạt đủ sao */
export const masteredCount = () => Object.keys(S.prog.made).filter(id => craftStars(id) >= CRAFT_MAX).length;

/** ghi nhận một bánh của món `id`; lên sao thì trả thưởng và trả về { star, reward } để hiện thông báo */
export function recordMade(id: string, price: number): { star: number; reward: number } | null {
  const before = craftStars(id);
  S.prog.made[id] = madeOf(id) + 1;
  const after = craftStars(id);
  if (after <= before) return null;
  const reward = craftReward(price, after);
  earn("goal", reward, `Tay nghề ${after} sao`);
  return { star: after, reward };
}
