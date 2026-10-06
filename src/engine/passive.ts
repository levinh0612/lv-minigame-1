/* Khoản cộng thụ động: đền bù một lần vì bị trừ xu, và thưởng đăng nhập đầu tiên mỗi ngày: mức cố định theo cấp, thêm 10% mỗi ngày liên tiếp (tối đa +70%). */
import { lvl } from "./progress";
import { S } from "./state";
import { earn } from "./wallet";

export const COMP_COINS = 3000;
export const DAILY_BASE = 100, DAILY_PER_LV = 25, DAILY_MAX = 1500, STREAK_STEP = 0.1, STREAK_MAX = 8;   // 100 + 25 xu mỗi cấp (tối đa 1.500); chuỗi ngày thứ N được ×(1 + 10% × (N−1)), tối đa chuỗi 8 ngày
/** thưởng đăng nhập hôm nay: không phụ thuộc số xu đang tích, người mới cũng có phần thưởng ý nghĩa */
export const dailyReward = (L = lvl(), streak = S.streak) => Math.round(Math.min(DAILY_MAX, DAILY_BASE + DAILY_PER_LV * L) * (1 + STREAK_STEP * (Math.min(STREAK_MAX, Math.max(1, streak)) - 1)));
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface Claim { daily: number; comp: number }
/** nhận thưởng đang chờ. Thưởng ngày tính trên số xu trước khi cộng khoản đền bù. Người chơi mới (chưa chơi ca nào) không nhận đền bù. */
export function claimPassive(): Claim {
  const out: Claim = { daily: 0, comp: 0 };
  if (S.loginDay !== dayKey()) {
    S.loginDay = dayKey();
    const v = dailyReward(); if (v > 0) { earn("daily", v, "Thưởng đăng nhập hôm nay"); out.daily = v; }
  }
  if (!S.comp) { S.comp = 1; if (S.shifts >= 1) { earn("comp", COMP_COINS, "Đền bù vì trừ xu quá tay"); out.comp = COMP_COINS; } }
  return out;
}
