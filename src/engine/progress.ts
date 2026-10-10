/* Cấp, mục tiêu ngày, hiệu ứng đồ trang trí */
import { RECIPES, SEASON_LV, customRecipe, partsOfRecipe, seasonalNow, type FxKey, type Recipe, type StockKey } from "../content/game";
import { mgrFx, type GachaItem } from "../content/gacha";
import { ROOM_CATS, isDefault, roomItem, type RoomItem } from "../content/room";
import { daysTogether } from "./dates";
import { bondMul, floorCount, gachaFx, specialRecipes, staffAt } from "./gacha";
import { S, save } from "./state";
import { recipeReady } from "./suppliers";
import { upgradeFx, upgradeLv } from "./upgrades";
import { ensureWeek } from "./weekly";
import { SHOP_UPGRADES } from "../content/progression";
import { DAY, today, ymd } from "./util";

export const MAX_LV = 100;     // cấp người chơi tối đa
export const xpFor = (L: number) => 40 * (L - 1) * (L - 1);
export const lvl = () => Math.min(MAX_LV, Math.floor(Math.sqrt(S.xp / 40)) + 1);
/* bánh tuỳ chỉnh đã lưu của người chơi (đủ nguyên liệu mới bán được) */
export const customRecipes = (): Recipe[] => S.custom.map(customRecipe);
/* món đang bán: đủ cấp (hoặc đã có công thức Gacha) VÀ đủ nguyên liệu (đã ký nhà cung cấp); bánh tuỳ chỉnh đứng trước món Gacha */
/* bánh theo mùa: chỉ món của tháng này, đủ cấp và đủ nguyên liệu */
export const seasonalRecipes = (): Recipe[] => { const r = seasonalNow(); return lvl() >= SEASON_LV && recipeReady(r) ? [r] : []; };
export const unlocked = () => [...RECIPES.filter(r => r.lv <= lvl() && recipeReady(r)), ...seasonalRecipes(), ...customRecipes().filter(recipeReady), ...specialRecipes()];
/** chỉ số nguyên liệu mà các món đang bán dùng tới (màn làm bánh và kho giữa ca chỉ hiện những món này) */
export const usedIdx = (k: StockKey) => [...new Set(unlocked().flatMap(r => partsOfRecipe(r).filter(p => p.k === k).map(p => p.i)))].sort((a, b) => a - b);
export const fx = (k: FxKey) => ROOM_CATS.reduce((a, c) => a + (roomItem(c.k, S.room[c.k]).fx?.[k] || 0), 0) + gachaFx(k) + upgradeFx(k);
/* Buff đang có đến từ đâu: quản lý và linh thú từng tầng, đồ trang trí. Cộng các dòng lại đúng bằng fx(k). */
export interface BuffRow { src: "mgr" | "mascot" | "decor" | "shop"; name: string; sub: string; fx: Partial<Record<FxKey, number>>; item?: GachaItem; decor?: RoomItem }
export function buffSources(): BuffRow[] {
  const rows: BuffRow[] = [];
  for (let f = 0; f < floorCount(); f++) {
    const m = staffAt("mgr", f), a = staffAt("mascot", f);
    if (m) rows.push({ src: "mgr", name: m.n, sub: `Quản lý · Tầng ${f + 1}`, fx: { ...mgrFx(m) }, item: m });
    if (a) rows.push({ src: "mascot", name: a.n, sub: `Linh thú · Tầng ${f + 1}`, item: a,
      fx: Object.fromEntries(Object.entries(a.mascot!.fx).map(([k, v]) => [k, k === "cust" ? v : v! * bondMul(a.id)])) });
  }
  ROOM_CATS.forEach(c => { const it = roomItem(c.k, S.room[c.k]); if (it.fx && Object.keys(it.fx).length) rows.push({ src: "decor", name: it.n, sub: c.n, fx: { ...it.fx }, decor: it }); });
  SHOP_UPGRADES.filter(u => upgradeLv(u.id) > 0).forEach(u => rows.push({ src: "shop", name: u.n, sub: `Nâng cấp tiệm · cấp ${upgradeLv(u.id)}/${u.max}`, fx: { [u.fx]: u.per * upgradeLv(u.id) } }));
  return rows;
}
/* số món trang trí đang dùng (không tính kiểu mặc định) */
export const decorCount = () => ROOM_CATS.filter(c => !isDefault(c.k, S.room[c.k])).length;

/* Sang ngày mới: reset mục tiêu, tính chuỗi ngày chơi */
export function rollDay() {
  const t = ymd(today());
  if (S.daily.day !== t) S.daily = { day: t } as typeof S.daily;
  const u = unlocked();
  S.daily = Object.assign({ served: 0, earned: 0, feat: 0, angry: 0, claimed: false, boy: false, featId: u[(daysTogether() - 1) % u.length].id }, S.daily);
  (["served", "earned", "feat", "angry"] as const).forEach(k => { if (!Number.isFinite(S.daily[k])) S.daily[k] = 0; });
  if (S.lastDay !== t) {
    const y = ymd(new Date(+today() - DAY));
    S.streak = S.lastDay === y ? S.streak + 1 : 1;
    S.lastDay = t;
  }
  ensureWeek(lvl());
  save();
}

/* món Viral được chọn từ các món đang bán (gồm bánh tự làm và công thức Gacha), nên phải tìm trong cả hai */
export const featured = (): Recipe => unlocked().find(r => r.id === S.daily.featId) ?? RECIPES.find(r => r.id === S.daily.featId) ?? RECIPES[0];
export interface Goal { t: string; cur: number; need: number; bool?: boolean; fail?: boolean }
export function goals(): Goal[] {
  const L = lvl(), d = S.daily;
  return [
    { t: `Phục vụ ${5 + L} khách`, cur: d.served, need: 5 + L },
    { t: `Làm 3 bánh ${featured().n}`, cur: d.feat, need: 3 },
    { t: "Không để khách nào giận", cur: d.served > 0 && !d.angry ? 1 : 0, need: 1, bool: true, fail: d.angry > 0 }
  ];
}
export const goalsDone = () => goals().every(g => g.cur >= g.need);
export const letterNew = () => !S.letters.some(l => l.day === S.daily.day && !l.bonus);
export const giftReady = () => goalsDone() && !S.daily.claimed;
