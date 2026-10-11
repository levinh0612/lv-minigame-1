/* Khách đặc biệt (VIP): mỗi ca có thể có một vị khách khác thường ghé tiệm, làm ca bán không còn giống nhau.
   Mỗi loại một kiểu cược: phê bình kiên nhẫn ít nhưng thưởng lớn nếu giao 3 sao, đại gia tip nặng, bé sinh nhật kiên nhẫn và thưởng khi giao nhanh. */
import type { Recipe } from "../content/game";
import { S } from "./state";

export type VipKind = "critic" | "tycoon" | "kid";
export interface VipDef { n: string; emoji: string; hint: string; price: number; tip: number; pat: number; bonus: number; minStars: number }
/** price/tip: nhân giá bánh và tip; pat: nhân độ kiên nhẫn; bonus: thưởng thêm (tỉ lệ giá bánh) khi giao đạt minStars sao */
export const VIPS: Record<VipKind, VipDef> = {
  critic: { n: "Nhà phê bình", emoji: "🧐", hint: "Khó tính, ít kiên nhẫn. Giao nhanh 3 sao để được thưởng lớn.", price: 1.5, tip: 1, pat: 0.7, bonus: 1, minStars: 3 },
  tycoon: { n: "Đại gia", emoji: "🤑", hint: "Gọi món đắt nhất, tip rất hậu.", price: 1.2, tip: 3, pat: 0.9, bonus: 0, minStars: 3 },
  kid: { n: "Bé sinh nhật", emoji: "🎂", hint: "Rất kiên nhẫn. Giao từ 2 sao trở lên được thưởng thêm.", price: 1, tip: 1, pat: 1.5, bonus: 0.6, minStars: 2 }
};
export const VIP_KINDS = Object.keys(VIPS) as VipKind[];
export const VIP_CHANCE = 0.7, VIP_MIN_SHIFTS = 2, VIP_MIN_TOTAL = 5;

/** kế hoạch VIP của ca: ghé sau khách thứ `at` (không phải khách cuối, nhường chỗ cho Anh), hoặc null nếu ca này không có */
export function planVip(total: number, rng: () => number = Math.random): { at: number; kind: VipKind } | null {
  if (S.shifts < VIP_MIN_SHIFTS || total < VIP_MIN_TOTAL || rng() >= VIP_CHANCE) return null;
  return { at: 1 + Math.floor(rng() * (total - 2)), kind: VIP_KINDS[Math.floor(rng() * VIP_KINDS.length)]! };
}

/** món VIP gọi: phê bình thích món mới nhất, đại gia gọi món đắt nhất trong các món đã mở, bé sinh nhật thì món thường (null) */
export function vipRecipe(kind: VipKind, unlocked: Recipe[]): Recipe | null {
  if (!unlocked.length) return null;
  if (kind === "critic") return unlocked.reduce((a, r) => (r.lv >= a.lv ? r : a));
  if (kind === "tycoon") return unlocked.reduce((a, r) => (r.price > a.price ? r : a));
  return null;
}

/** thưởng thêm khi giao đạt yêu cầu sao */
export const vipBonus = (kind: VipKind, stars: number, price: number) => stars >= VIPS[kind].minStars ? Math.round(price * VIPS[kind].bonus) : 0;
