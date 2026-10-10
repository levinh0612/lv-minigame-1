/* Nâng cấp tiệm cao cấp (content/progression.ts SHOP_UPGRADES): chỗ tiêu xu cuối game, mỗi cấp cộng buff vào fx(). */
import { SHOP_UPGRADES, upgradeCost, type ShopUpgrade } from "../content/progression";
import type { FxKey } from "../content/game";
import { S, save } from "./state";
import { spend } from "./wallet";

export const upgradeLv = (id: string) => S.prog.up[id] ?? 0;
/** buff tổng của mọi nâng cấp cho một chỉ số (price/tip/pat/cust) */
export const upgradeFx = (k: FxKey) => SHOP_UPGRADES.filter(u => u.fx === k).reduce((a, u) => a + u.per * upgradeLv(u.id), 0);
/** trạng thái một nâng cấp: "max" đã đầy, "lv" chưa đủ cấp người chơi, "coin" thiếu xu, "ok" nâng được */
export const upgradeState = (u: ShopUpgrade, level: number): "max" | "lv" | "coin" | "ok" =>
  upgradeLv(u.id) >= u.max ? "max" : level < u.lv ? "lv" : S.coins < upgradeCost(u, upgradeLv(u.id)) ? "coin" : "ok";
export function buyUpgrade(id: string, level: number): ReturnType<typeof upgradeState> {
  const u = SHOP_UPGRADES.find(x => x.id === id); if (!u) return "lv";
  const st = upgradeState(u, level); if (st !== "ok") return st;
  spend("venue", upgradeCost(u, upgradeLv(id)), `Nâng cấp ${u.n}`); S.prog.up[id] = upgradeLv(id) + 1; save();
  return "ok";
}
