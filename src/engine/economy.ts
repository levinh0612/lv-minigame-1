/* Kinh tế tiệm: mua nguyên liệu, nhập nhanh, nhân viên và lương. */
import type { PetId } from "../content/couple";
import { PACKS, QUICK_MULT, RECIPES, STAFF, STOCK_KEYS, UNIT_COST, type StockKey } from "../content/game";
import { featured, fx, lvl, unlocked } from "./progress";
import { S, save } from "./state";

export const unitCost = (k: StockKey, i: number) => UNIT_COST[k][i];
export const packPrice = (k: StockKey, i: number, n: number) => Math.ceil(unitCost(k, i) * n * (1 - (PACKS.find(p => p.n === n)?.disc ?? 0)));
export const quickPrice = (k: StockKey, i: number) => Math.ceil(unitCost(k, i) * QUICK_MULT);
export const stockOf = (k: StockKey, i: number) => S.stock[k][i] ?? 0;
export const expectedCustomers = () => Math.min(16, 6 + lvl() + fx("cust"));

export function buy(k: StockKey, i: number, n: number, price = packPrice(k, i, n)): boolean {
  if (S.coins < price) return false;
  S.coins -= price; S.stock[k][i] = stockOf(k, i) + n; save();
  return true;
}
export const quickBuy = (k: StockKey, i: number) => buy(k, i, 1, quickPrice(k, i));

/* Gợi ý nhập hàng: đủ cho số khách dự kiến, theo tỉ lệ các công thức đã mở (món nổi bật được ưu tiên) */
export function suggestion(): { k: StockKey; i: number; n: number; cost: number }[] {
  const rs = unlocked(), feat = featured(), cust = expectedCustomers();
  const want: Record<StockKey, number[]> = { base: [0, 0, 0], cream: [0, 0, 0], top: [0, 0, 0] };
  const weight = (r: (typeof RECIPES)[number]) => (r.id === feat.id ? 2 : 1);
  const total = rs.reduce((a, r) => a + weight(r), 0);
  rs.forEach(r => STOCK_KEYS.forEach(k => { want[k][r[k]] += cust * weight(r) / total; }));
  const out: { k: StockKey; i: number; n: number; cost: number }[] = [];
  STOCK_KEYS.forEach(k => want[k].forEach((w, i) => {
    const n = Math.max(0, Math.ceil(w * 1.2) - stockOf(k, i));
    if (n > 0) out.push({ k, i, n, cost: Math.ceil(unitCost(k, i) * n) });
  }));
  return out;
}
/* Mua theo gợi ý, hết xu thì dừng. Trả về số xu đã tiêu */
export function buySuggested(): number {
  let spent = 0;
  for (const x of suggestion()) if (buy(x.k, x.i, x.n, x.cost)) spent += x.cost;
  return spent;
}
/* Nguyên liệu mà công thức đã mở cần nhưng đang hết */
export const outOfStock = () => {
  const need = new Set<string>();
  unlocked().forEach(r => STOCK_KEYS.forEach(k => { if (stockOf(k, r[k]) <= 0) need.add(k + ":" + r[k]); }));
  return [...need].map(s => { const [k, i] = s.split(":"); return { k: k as StockKey, i: +i }; });
};

/* ===== Nhân viên ===== */
export const staffDef = (id: PetId) => STAFF.find(s => s.id === id)!;
export const canHire = (id: PetId) => lvl() >= staffDef(id).unlock;
export const onDuty = (id: PetId) => S.staff[id].hired && S.staff[id].onDuty;
export const dutyLv = (id: PetId) => (onDuty(id) ? S.staff[id].lv : 0);
export const wageOf = (id: PetId) => staffDef(id).wage[S.staff[id].lv - 1];
export const dutyWages = () => STAFF.reduce((a, s) => a + (onDuty(s.id) ? wageOf(s.id) : 0), 0);
export const trainCost = (id: PetId) => (S.staff[id].lv < 3 ? staffDef(id).train[S.staff[id].lv - 1] : 0);

export function hire(id: PetId) { if (!canHire(id)) return false; S.staff[id] = { ...S.staff[id], hired: true, onDuty: true }; save(); return true; }
export function toggleDuty(id: PetId) { if (!S.staff[id].hired) return; S.staff[id].onDuty = !S.staff[id].onDuty; save(); }
export function train(id: PetId) {
  const c = trainCost(id);
  if (!S.staff[id].hired || !c || S.coins < c) return false;
  S.coins -= c; S.staff[id].lv++; save(); return true;
}

/* Hiệu quả nhân viên trong ca */
export const prepParts = () => dutyLv("dog");                                   // Milo chọn sẵn 1/2/3 phần
export const tipBonus = () => [0, 0.1, 0.2, 0.3][dutyLv("gold")];               // Siro
export const rescueBonus = () => [0, 0.2, 0.35, 0.5][dutyLv("white")];          // Cacao
