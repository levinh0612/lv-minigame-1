/* Gacha: vé, quay, bảo hiểm (pity), Bụi sao và lợi ích của từng loại vật phẩm.
   Vé kiếm khi chơi (vé miễn phí mỗi ngày, đạt hết mục tiêu ca, nhận quà ngày) hoặc mua bằng xu. */
import type { FxKey, Recipe } from "../content/game";
import {
  DUST_PER_TICKET, GACHA_ITEMS, MASTERY_MAX, MASTERY_STEP, PACK10_COST, PITY_RARE, PITY_ULTRA, RARITIES, RARITY, TICKET_COST, asManager, gachaItem, itemsOf, mgrFx,
  type GachaItem, type Rarity
} from "../content/gacha";
import { dayKey } from "./passive";
import { S, save } from "./state";
import { spend } from "./wallet";

export interface PullResult { item: GachaItem; isNew: boolean; dust: number; count: number }
export const countOf = (id: string) => S.gacha.owned[id] ?? 0;
export const hasItem = (id: string) => countOf(id) > 0;

/* ===== vé ===== */
export const freeTicketReady = () => S.gacha.freeDay !== dayKey();
export function claimFreeTicket(): boolean {
  if (!freeTicketReady()) return false;
  S.gacha.freeDay = dayKey(); S.gacha.tickets++; save(); return true;
}
export function addTickets(n: number) { S.gacha.tickets += n; save(); }
export const packCost = (n: number) => (n >= 10 ? Math.round(PACK10_COST * n / 10) : TICKET_COST * n);
export function buyTickets(n: number): boolean {
  const cost = packCost(n);
  if (n <= 0 || S.coins < cost) return false;
  spend("gacha", cost, `Mua ${n} vé triệu hồi`); S.gacha.tickets += n; save(); return true;
}
export function exchangeDust(): boolean {
  if (S.gacha.dust < DUST_PER_TICKET) return false;
  S.gacha.dust -= DUST_PER_TICKET; S.gacha.tickets++; save(); return true;
}

/* ===== quay ===== */
/** độ hiếm lần quay kế tiếp: có bảo hiểm thì chắc chắn tới ngưỡng */
export function rollRarity(rng: () => number = Math.random): Rarity {
  const g = S.gacha;
  if (g.sinceUltra + 1 >= PITY_ULTRA) return "ultra";
  const x = rng() * 100;
  let r: Rarity = x < RARITY.ultra.w ? "ultra" : x < RARITY.ultra.w + RARITY.rare.w ? "rare" : "common";
  if (r === "common" && g.sinceRare + 1 >= PITY_RARE) r = "rare";
  return r;
}
function obtain(item: GachaItem): PullResult {
  const had = countOf(item.id), dup = had > 0, dust = dup ? RARITY[item.rarity].dust : 0;
  S.gacha.owned[item.id] = had + 1; S.gacha.dust += dust;
  if (!dup && item.decor) { const id = item.decor.k + ":" + item.decor.v; if (!S.owned.includes(id)) S.owned.push(id); }
  if (!dup && item.mascot) autoPlace("mascot", item.id);        // linh vật/quản lý mới tự đứng vào tầng còn trống đầu tiên
  if (!dup && item.mgr) autoPlace("mgr", item.id);
  return { item, isNew: !dup, dust, count: had + 1 };
}
export function pullOnce(rng: () => number = Math.random): PullResult {
  const g = S.gacha, r = rollRarity(rng), pool = itemsOf(r);
  g.pulls++;
  if (r === "common") g.sinceRare++; else g.sinceRare = 0;
  if (r === "ultra") g.sinceUltra = 0; else g.sinceUltra++;
  return obtain(pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!);
}
/** quay n lần bằng vé; không đủ vé thì trả null và không làm gì */
export function pull(n: number, rng: () => number = Math.random): PullResult[] | null {
  if (n <= 0 || S.gacha.tickets < n) return null;
  S.gacha.tickets -= n;
  const out: PullResult[] = [];
  for (let i = 0; i < n; i++) out.push(pullOnce(rng));
  save(); return out;
}
/** còn mấy lần nữa chắc chắn có Hiếm / Cực hiếm */
export const untilRare = () => Math.max(1, PITY_RARE - S.gacha.sinceRare);
export const untilUltra = () => Math.max(1, PITY_ULTRA - S.gacha.sinceUltra);

/* ===== lợi ích ===== */
/** công thức đặc biệt đã có, giá bán tăng theo độ thành thạo (trùng nhiều lần) */
export const masteryOf = (id: string) => Math.min(MASTERY_MAX, Math.max(0, countOf(id) - 1));
export function specialRecipes(): Recipe[] {
  return GACHA_ITEMS.filter(i => i.recipe && hasItem(i.id)).map(i => ({
    id: i.id, n: i.n, base: i.recipe!.base, cream: i.recipe!.cream, top: i.recipe!.top, lv: 1,
    price: Math.round(i.recipe!.price * (1 + MASTERY_STEP * masteryOf(i.id)))
  }));
}
/* ===== Quản lý và linh vật theo tầng =====
   Mỗi tầng có 1 ô quản lý và 1 ô linh vật (xây thêm lầu thì có thêm ô). Chỉ số của người đứng ở các tầng đang có cộng cho cả tiệm. */
export type StaffKind = "mgr" | "mascot";
const listOf = (k: StaffKind) => (k === "mgr" ? (S.gacha.mgrs ??= []) : (S.gacha.mascots ??= []));
export const floorCount = () => S.venue.floors;
/** vật phẩm đang đứng ở tầng f (0 = tầng 1); null nếu trống hoặc chưa sở hữu */
export function staffAt(k: StaffKind, f: number): GachaItem | null {
  const it = f >= 0 && f < floorCount() ? gachaItem(listOf(k)[f] ?? "") : undefined;
  return it && (k === "mgr" ? asManager(it) : it.mascot) && hasItem(it.id) ? it : null;
}
export const staffPlaced = (k: StaffKind) => Array.from({ length: floorCount() }, (_, f) => staffAt(k, f)).filter((x): x is GachaItem => !!x);
/** tầng đang đặt vật phẩm này, -1 nếu chưa đặt */
export const floorOfStaff = (k: StaffKind, id: string) => { const f = listOf(k).indexOf(id); return f >= 0 && f < floorCount() ? f : -1; };
/** đặt vào tầng f (chuyển từ tầng khác nếu đang đứng ở đó; người cũ của ô đó bị gỡ ra) */
export function placeStaff(k: StaffKind, id: string, f: number): boolean {
  const it = gachaItem(id); if (!it || !(k === "mgr" ? asManager(it) : it.mascot) || !hasItem(id) || f < 0 || f >= floorCount()) return false;
  const l = listOf(k), old = l.indexOf(id); if (old >= 0) l[old] = "";
  while (l.length <= f) l.push("");
  l[f] = id; save(); return true;
}
export function clearStaff(k: StaffKind, f: number) { const l = listOf(k); if (f >= 0 && f < l.length) { l[f] = ""; save(); } }
function autoPlace(k: StaffKind, id: string) {
  const l = listOf(k); for (let f = 0; f < floorCount(); f++) if (!l[f]) { while (l.length <= f) l.push(""); l[f] = id; return; }
}
/** chữ ký để vẽ lại cảnh 3D khi đổi người đứng */
export const staffSig = () => JSON.stringify([S.gacha.mgrs, S.gacha.mascots, S.venue.floors]);
/* Thân thiết: mỗi ca hoàn thành cùng linh vật thì thân thiết hơn; mỗi cấp tăng 12% các chỉ số của linh vật (trừ số khách thêm) */
export const BOND_AT = [0, 3, 8, 15, 25], BOND_STEP = 0.12;
export const bondOf = (id: string) => S.gacha.bond?.[id] ?? 0;
export const bondLevel = (id: string) => BOND_AT.reduce((lv, n, i) => bondOf(id) >= n ? i : lv, 0);
export const bondMul = (id: string) => 1 + BOND_STEP * bondLevel(id);
/** hết ca: mọi linh vật đang đứng tầng thân thiết thêm một bậc; trả về cấp mới của linh vật đầu tiên vừa lên cấp (0 nếu không ai lên) */
export function addBond(): number {
  let up = 0;
  for (const m of staffPlaced("mascot")) { const before = bondLevel(m.id); (S.gacha.bond ??= {})[m.id] = bondOf(m.id) + 1; if (!up && bondLevel(m.id) > before) up = bondLevel(m.id); }
  return up;
}
/** cho linh vật ăn thưởng: cộng thẳng vào thân thiết (mỗi 3 điểm thân của đồ ăn = 1 ca) */
export function addBondTo(id: string, n: number) { (S.gacha.bond ??= {})[id] = bondOf(id) + Math.max(0, Math.round(n)); save(); }
/** tổng chỉ số của mọi quản lý và linh vật đang đứng tầng */
export const gachaFx = (k: FxKey) => {
  let sum = 0;
  for (const m of staffPlaced("mascot")) { const v = m.mascot!.fx[k] ?? 0; sum += k === "cust" ? v : v * bondMul(m.id); }
  for (const m of staffPlaced("mgr")) sum += mgrFx(m)[k] ?? 0;
  return sum;
};
/** khách quen: các nhân vật đã trúng */
export const regulars = () => GACHA_ITEMS.filter(i => i.char && hasItem(i.id));
export const ownedCount = () => GACHA_ITEMS.filter(i => hasItem(i.id)).length;
export { RARITIES };
