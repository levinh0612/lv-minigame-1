/* Kinh tế tiệm: mua nguyên liệu, nhập nhanh, nhân viên và lương. */
import type { PetId } from "../content/couple";
import { CATS, FAME, FOODS, PACKS, QUICK_MULT, RECIPES, STAFF, STOCK_KEYS, UNIT_COST, WELCOME, type Food, type FoodId, type StockKey } from "../content/game";
import { decorCount, featured, fx, lvl, unlocked } from "./progress";
import { roomItem, type RoomKey } from "../content/room";
import { S, petName, save } from "./state";
import { earn, note, spend } from "./wallet";

export const unitCost = (k: StockKey, i: number) => UNIT_COST[k][i];
export const packPrice = (k: StockKey, i: number, n: number) => Math.ceil(unitCost(k, i) * n * (1 - (PACKS.find(p => p.n === n)?.disc ?? 0)));
export const quickPrice = (k: StockKey, i: number) => Math.ceil(unitCost(k, i) * QUICK_MULT);
export const stockOf = (k: StockKey, i: number) => S.stock[k][i] ?? 0;
export const expectedCustomers = () => Math.min(20, 6 + lvl() + fx("cust") + fameLevel() * 2);

export function buy(k: StockKey, i: number, n: number, price = packPrice(k, i, n), cat: "stock" | "quick" = "stock", log = true): boolean {
  if (S.coins < price) return false;
  spend(cat, price, log ? `Nhập ${n} ${CATS[k][i][0]}` : undefined); S.stock[k][i] = stockOf(k, i) + n; save();
  return true;
}
export const quickBuy = (k: StockKey, i: number) => buy(k, i, 1, quickPrice(k, i), "quick", false);
/* Kho giữa ca: nhập đầy lên REFILL món, giá nhập nhanh */
export const REFILL = 10;
export const refillCost = (k: StockKey, i: number) => Math.ceil(unitCost(k, i) * Math.max(0, REFILL - stockOf(k, i)) * QUICK_MULT);
export function refill(items: { k: StockKey; i: number }[]): number {
  const cost = items.reduce((a, x) => a + refillCost(x.k, x.i), 0);
  if (!cost || cost > S.coins) return 0;
  spend("quick", cost); items.forEach(x => { S.stock[x.k][x.i] = Math.max(REFILL, stockOf(x.k, x.i)); }); save();
  return cost;
}

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
  for (const x of suggestion()) if (buy(x.k, x.i, x.n, x.cost, "stock", false)) spent += x.cost;
  note("Nhập hàng theo gợi ý", -spent);
  return spent;
}
/* Nguyên liệu mà công thức đã mở cần nhưng đang hết */
export const outOfStock = () => {
  const need = new Set<string>();
  unlocked().forEach(r => STOCK_KEYS.forEach(k => { if (stockOf(k, r[k]) <= 0) need.add(k + ":" + r[k]); }));
  return [...need].map(s => { const [k, i] = s.split(":"); return { k: k as StockKey, i: +i }; });
};

/* ===== Đồ ăn thú cưng ===== */
export const foodDef = (id: FoodId) => FOODS.find(f => f.id === id)!;
export const foodOf = (id: FoodId) => S.food[id] ?? 0;
export function buyFood(id: FoodId, n: number): boolean {
  const price = foodDef(id).cost * n;
  if (S.coins < price) return false;
  spend("food", price, `Mua ${n} ${foodDef(id).n}`); S.food[id] = foodOf(id) + n; save(); return true;
}
/* Thưởng mỗi ngày một lần: món càng ngon càng thân */
export function snack(pet: PetId, id: FoodId): boolean {
  const st = S.pets[pet];
  if (st.fedDay === S.daily.day || foodOf(id) <= 0) return false;
  S.food[id]--; st.fedDay = S.daily.day; st.aff += foodDef(id).aff; save(); return true;
}

/* Thưởng nhanh: tủ hết món đó thì mua 1 phần rồi cho ăn luôn */
export function treat(pet: PetId, id: FoodId): boolean {
  if (S.pets[pet].fedDay === S.daily.day) return false;
  if (foodOf(id) <= 0 && !buyFood(id, 1)) return false;
  return snack(pet, id);
}

/* Quà khai trương: vốn làm ăn, nhận một lần */
export function claimWelcome(): boolean {
  if (S.welcome) return false;
  S.welcome = true; earn("welcome", WELCOME.coins, "Quà khai trương");
  (Object.entries(WELCOME.food) as [FoodId, number][]).forEach(([id, n]) => { S.food[id] = foodOf(id) + n; });
  save(); return true;
}

/* ===== Thú cưng làm nhân viên ===== */
export const staffDef = (id: PetId) => STAFF.find(s => s.id === id)!;
export const canHire = (id: PetId) => lvl() >= staffDef(id).unlock;
export const onDuty = (id: PetId) => S.staff[id].hired && S.staff[id].onDuty;
export const dutyLv = (id: PetId) => (onDuty(id) ? S.staff[id].lv : 0);
/* lương mỗi ca = 1 phần ăn. Món mặc định theo bậc, người chơi chọn được món thấp hơn;
   hết món đã chọn thì ăn món kém hơn kế tiếp (làm chậm hơn), hết nữa mới lấy món ngon hơn */
const tierIdx = (id: PetId) => (S.staff[id].hired ? S.staff[id].lv : 1) - 1;
export const mealChoices = (id: PetId): Food[] => FOODS.slice(0, tierIdx(id) + 1);
export const mealOf = (id: PetId): FoodId => {
  const pick = S.staff[id].food, top = tierIdx(id);
  return FOODS[Math.min(top, Math.max(0, pick ? FOODS.findIndex(f => f.id === pick) : top))].id;
};
export const setMeal = (id: PetId, food: FoodId) => { S.staff[id].food = food; save(); };
export const mealFor = (id: PetId): FoodId | null => {
  const want = FOODS.findIndex(f => f.id === mealOf(id));
  const order = [...FOODS.slice(0, want + 1).reverse(), ...FOODS.slice(want + 1)];
  return order.find(f => foodOf(f.id) > 0)?.id ?? null;
};
/* ăn món kém hơn bậc của mình thì làm chậm thêm 25% mỗi bậc */
export const mealSlow = (id: PetId, meal: FoodId) => 1 + 0.25 * Math.max(0, tierIdx(id) - FOODS.findIndex(f => f.id === meal));
export const crewPlan = () => STAFF.filter(d => onDuty(d.id)).map(d => ({ id: d.id, meal: mealFor(d.id) }));
export const trainCost = (id: PetId) => (S.staff[id].lv < 3 ? staffDef(id).train[S.staff[id].lv - 1] : 0);

export function hire(id: PetId) { if (!canHire(id)) return false; S.staff[id] = { ...S.staff[id], hired: true, onDuty: true }; save(); return true; }
export function toggleDuty(id: PetId) { if (!S.staff[id].hired) return; S.staff[id].onDuty = !S.staff[id].onDuty; save(); }
export function train(id: PetId) {
  const c = trainCost(id);
  if (!S.staff[id].hired || !c || S.coins < c) return false;
  spend("train", c, `Huấn luyện ${petName(id)} lên bậc ${S.staff[id].lv + 1}`); S.staff[id].lv++; delete S.staff[id].food; save(); return true;
}
/* Đầu ca: các bé đi làm ăn lương trước. Bé nào không còn đồ ăn thì nghỉ ca này.
   Trả về giá trị đồ ăn đã dùng (để tính lãi) và các bé phải nghỉ vì đói */
export function payCrew(): { cost: number; fed: { id: PetId; meal: FoodId }[]; hungry: PetId[] } {
  const out = { cost: 0, fed: [] as { id: PetId; meal: FoodId }[], hungry: [] as PetId[] };
  crewPlan().forEach(({ id }) => {
    const meal = mealFor(id);                 // tính lại lúc ăn: bé trước đã lấy phần thì bé sau xét kho còn lại
    if (!meal) { S.staff[id].onDuty = false; out.hungry.push(id); return; }
    S.food[meal]--; out.cost += foodDef(meal).cost; out.fed.push({ id, meal });
  });
  save(); return out;
}

/* Độ nổi tiếng: sao trung bình 20 đánh giá gần nhất (0..3) + đồ trang trí + cấp tiệm */
export function fameScore() {
  const r = S.reviews.slice(0, 20), avg = r.length ? r.reduce((a, x) => a + x.s, 0) / r.length : 2;
  return avg + decorCount() * 0.4 + (lvl() - 1) * 0.3;
}
export const fameLevel = () => { const x = fameScore(); return x < 3 ? 0 : x < 4.5 ? 1 : x < 6 ? 2 : 3; };
export const fame = () => ({ ...FAME[fameLevel()], lv: fameLevel(), score: fameScore() });

/* ===== Tài sản (bảng xếp hạng): xu + đồ trang trí đã mua + nguyên liệu trong kho + đồ ăn trong tủ ===== */
export function netWorth() {
  const decor = S.owned.reduce((a, id) => { const [k, v] = id.split(":"); return a + (roomItem(k as RoomKey, v).cost || 0); }, 0);
  const stock = STOCK_KEYS.reduce((a, k) => a + S.stock[k].reduce((b, n, i) => b + n * unitCost(k, i), 0), 0);
  const food = FOODS.reduce((a, f) => a + foodOf(f.id) * f.cost, 0);
  return { coins: S.coins, goods: decor + stock + food, total: S.coins + decor + stock + food };
}
