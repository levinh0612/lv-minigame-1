/* Khoản cộng thụ động: đền bù một lần vì bị trừ xu, và thưởng đăng nhập đầu tiên mỗi ngày bằng 10% số xu đang có (tối đa 2.000 xu). */
import { S } from "./state";
import { earn } from "./wallet";

export const COMP_COINS = 3000, DAILY_PCT = 0.1, DAILY_MAX = 2000;   // thưởng đăng nhập: 10% số xu đang có, tối đa 2.000 xu mỗi ngày
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface Claim { daily: number; comp: number }
/** nhận thưởng đang chờ. Thưởng ngày tính trên số xu trước khi cộng khoản đền bù. Người chơi mới (chưa chơi ca nào) không nhận đền bù. */
export function claimPassive(): Claim {
  const out: Claim = { daily: 0, comp: 0 };
  if (S.loginDay !== dayKey()) {
    S.loginDay = dayKey();
    const v = Math.min(DAILY_MAX, Math.floor(S.coins * DAILY_PCT)); if (v > 0) { earn("daily", v, "Thưởng đăng nhập hôm nay"); out.daily = v; }
  }
  if (!S.comp) { S.comp = 1; if (S.shifts >= 1) { earn("comp", COMP_COINS, "Đền bù vì trừ xu quá tay"); out.comp = COMP_COINS; } }
  return out;
}
