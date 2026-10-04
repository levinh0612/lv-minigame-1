/* Gacha: vé, quay, bảo hiểm (pity), Bụi sao và lợi ích của từng loại vật phẩm.
   Vé kiếm khi chơi (vé miễn phí mỗi ngày, đạt hết mục tiêu ca, nhận quà ngày) hoặc mua bằng xu. */
import type { FxKey, Recipe } from "../content/game";
import {
  DUST_PER_TICKET, GACHA_ITEMS, MASTERY_MAX, MASTERY_STEP, PACK10_COST, PITY_RARE, PITY_ULTRA, RARITIES, RARITY, TICKET_COST, gachaItem, itemsOf,
  type GachaItem, type Rarity
} from "../content/gacha";
import { dayKey } from "./passive";
import { S, save } from "./state";
import { spend } from "./wallet";

export interface PullResult { item: GachaItem; isNew: boolean; dust: number; count: number }
export const ticketsOf = () => S.gacha.tickets;
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
  if (!dup && item.mascot && !S.gacha.mascot) S.gacha.mascot = item.id;       // linh vật đầu tiên tự đồng hành
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
/** linh vật đang đồng hành cộng lợi ích */
export const mascotItem = () => { const m = gachaItem(S.gacha.mascot); return m?.mascot && hasItem(m.id) ? m : null; };
export const gachaFx = (k: FxKey) => mascotItem()?.mascot!.fx[k] ?? 0;
export function setMascot(id: string): boolean {
  const it = gachaItem(id); if (!it?.mascot || !hasItem(id)) return false;
  S.gacha.mascot = id; save(); return true;
}
/** khách quen: các nhân vật đã trúng */
export const regulars = () => GACHA_ITEMS.filter(i => i.char && hasItem(i.id));
export const ownedCount = () => GACHA_ITEMS.filter(i => hasItem(i.id)).length;
export { RARITIES };
