/* Kinh tế tiệm: mua nguyên liệu, nhập nhanh, nhân viên và lương. */
import type { PetId } from "../content/couple";
import { CATS, partsOfRecipe, FAME, FAME_AT, FOODS, PACKS, QUICK_MULT, RECIPES, MASCOT_HIRE, MASCOT_TRAIN, MAX_STAFF_LV, SHOP, STAFF, STOCK_KEYS, UNIT_COST, WELCOME, type Food, type FoodId, type StaffDef, type StaffId, type StockKey } from "../content/game";
import { GACHA_ITEMS, gachaItem } from "../content/gacha";
import { hasItem } from "./gacha";
import { decorCount, featured, fx, lvl, unlocked } from "./progress";
import { roomItem, type RoomKey } from "../content/room";
import { S, petName, save } from "./state";
import { ingAvailable } from "./suppliers";
import { earn, note, spend } from "./wallet";

export const unitCost = (k: StockKey, i: number) => UNIT_COST[k][i];
export const packPrice = (k: StockKey, i: number, n: number) => Math.ceil(unitCost(k, i) * n * (1 - (PACKS.find(p => p.n === n)?.disc ?? 0)));
export const quickPrice = (k: StockKey, i: number) => Math.ceil(unitCost(k, i) * QUICK_MULT);
export const stockOf = (k: StockKey, i: number) => S.stock[k][i] ?? 0;
export const expectedCustomers = () => Math.min(30, 6 + lvl() + fx("cust") + fameLevel() * 2);

export function buy(k: StockKey, i: number, n: number, price = packPrice(k, i, n), cat: "stock" | "quick" = "stock", log = true): boolean {
  if (S.coins < price || !ingAvailable(k, i)) return false;
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
  const want = Object.fromEntries(STOCK_KEYS.map(k => [k, CATS[k].map(() => 0)])) as Record<StockKey, number[]>;
  const weight = (r: (typeof RECIPES)[number]) => (r.id === feat.id ? 2 : 1);
  const total = rs.reduce((a, r) => a + weight(r), 0);
  rs.forEach(r => partsOfRecipe(r).forEach(p => { want[p.k][p.i] += cust * weight(r) / total; }));       // bánh nhiều tầng đếm đủ từng phần
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
/* Chuẩn bị nhanh: nhập hàng theo gợi ý + mua đồ ăn cho bé đi làm đang đói (mỗi bé 1 phần), tới đâu hết xu tới đó */
export function quickPrep(): { stock: number; food: number } {
  const stock = buySuggested();
  let food = 0;
  crewPlan().filter(x => !x.meal).forEach(({ id }) => {
    const f = foodDef(mealOf(id));
    if (buyFood(f.id, 1)) food += f.cost;
  });
  return { stock, food };
}
/* Lãi ước tính của ca: doanh thu trung bình mỗi khách (món nổi bật tính gấp đôi) trừ lương, nhập hàng và đồ ăn còn thiếu */
export function estProfit(): { revenue: number; cost: number; profit: number } {
  const rs = unlocked(), feat = featured();
  const w = rs.reduce((a, r) => a + (r.id === feat.id ? 2 : 1), 0) || 1;
  const avg = rs.reduce((a, r) => a + r.price * (r.id === feat.id ? 2 : 1), 0) / w;
  const revenue = Math.round(expectedCustomers() * avg * 0.85);
  const cost = suggestion().reduce((a, x) => a + x.cost, 0)
    + crewPlan().reduce((a, x) => a + foodDef(x.meal ?? mealOf(x.id)).cost, 0);
  return { revenue, cost, profit: revenue - cost };
}
/* Nguyên liệu mà công thức đã mở cần nhưng đang hết */
export const outOfStock = () => {
  const need = new Set<string>();
  unlocked().forEach(r => partsOfRecipe(r).forEach(p => { if (stockOf(p.k, p.i) <= 0) need.add(p.k + ":" + p.i); }));
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
  S.food[id] = foodOf(id) - 1; st.fedDay = S.daily.day; st.aff += foodDef(id).aff; save(); return true;
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
/** linh thú Gacha đã có: thuê làm nhân viên được như 3 bé thợ bánh, vẫn đứng tầng cộng chỉ số */
const ownedMascots = () => GACHA_ITEMS.filter(i => i.mascot && hasItem(i.id));
/** mọi nhân viên: 3 bé thợ bánh rồi tới linh thú đã có (tạo sẵn trạng thái cho linh thú mới) */
export const staffIds = (): StaffId[] => {
  const m = ownedMascots(); m.forEach(i => { S.staff[i.id] ??= { hired: false, lv: 1, onDuty: false }; });
  return [...STAFF.map(d => d.id), ...m.map(i => i.id)];
};
export const staffDef = (id: StaffId): StaffDef => STAFF.find(s => s.id === id) ?? { id, role: "Thợ bánh", unlock: 0, train: MASCOT_TRAIN[gachaItem(id)?.rarity ?? "common"], effect: [] };
export const canHire = (id: StaffId) => lvl() >= staffDef(id).unlock;
/** linh thú Gacha (không phải 3 bé thợ bánh): không ăn, thuê có phí */
export const isMascotStaff = (id: StaffId) => !!gachaItem(id)?.mascot;
export const hireFee = (id: StaffId) => { const it = gachaItem(id); return it?.mascot ? MASCOT_HIRE[it.rarity].fee : 0; };
/** buff của linh thú đã thuê theo bậc: giá bánh bé làm ra và tip cộng thêm (phân số) */
export function mascotBonus(id: StaffId): { price: number; tip: number } {
  const it = gachaItem(id); if (!it?.mascot) return { price: 0, tip: 0 };
  const c = MASCOT_HIRE[it.rarity], t = (Math.min(MAX_STAFF_LV, Math.max(1, S.staff[id]?.lv ?? 1)) - 1) / (MAX_STAFF_LV - 1);
  return { price: c.price[0] + (c.price[1] - c.price[0]) * t, tip: c.tip };
}
export const onDuty = (id: StaffId) => S.staff[id].hired && S.staff[id].onDuty;
export const dutyLv = (id: StaffId) => (onDuty(id) ? S.staff[id].lv : 0);
/* lương mỗi ca = 1 phần ăn. Món mặc định theo bậc, người chơi chọn được món thấp hơn;
   hết món đã chọn thì ăn món kém hơn kế tiếp (làm chậm hơn), hết nữa mới lấy món ngon hơn */
const tierIdx = (id: StaffId) => (S.staff[id].hired ? S.staff[id].lv : 1) - 1;
export const mealChoices = (id: StaffId): Food[] => FOODS.slice(0, tierIdx(id) + 1);
export const mealOf = (id: StaffId): FoodId => {
  const pick = S.staff[id].food, top = tierIdx(id);
  return FOODS[Math.min(top, Math.max(0, pick ? FOODS.findIndex(f => f.id === pick) : top))].id;
};
export const setMeal = (id: StaffId, food: FoodId) => { S.staff[id].food = food; save(); };
export const mealFor = (id: StaffId, have: (f: FoodId) => number = foodOf): FoodId | null => {
  const want = FOODS.findIndex(f => f.id === mealOf(id));
  const order = [...FOODS.slice(0, want + 1).reverse(), ...FOODS.slice(want + 1)];
  return order.find(f => have(f.id) > 0)?.id ?? null;
};
/* ăn món kém hơn bậc của mình thì làm chậm thêm 25% mỗi bậc */
export const mealSlow = (id: StaffId, meal: FoodId) => isMascotStaff(id) ? 1 : 1 + 0.25 * Math.max(0, tierIdx(id) - FOODS.findIndex(f => f.id === meal));
/** bữa ăn dự kiến của các bé đi làm: kho dùng chung nên mỗi bé lấy phần của mình trước khi tới bé sau (giống lúc mở ca) */
export function crewPlan() {
  const left = Object.fromEntries(FOODS.map(f => [f.id, foodOf(f.id)])) as Record<FoodId, number>;
  return staffIds().filter(sid => onDuty(sid) && !isMascotStaff(sid)).map(sid => ({ id: sid })).sort((a, b) => (S.staff[b.id].prio ?? 0) - (S.staff[a.id].prio ?? 0)).map(d => { const meal = mealFor(d.id, f => left[f]); if (meal) left[meal]--; return { id: d.id, meal }; });
}
/** bữa của một bé: đi làm thì theo kế hoạch chung, đang nghỉ thì chỉ xem món nào còn trong kho */
export const plannedMeal = (id: StaffId): FoodId | null => (onDuty(id) ? crewPlan().find(x => x.id === id)?.meal ?? null : mealFor(id));
export const trainCost = (id: StaffId) => (S.staff[id].lv < MAX_STAFF_LV ? staffDef(id).train[S.staff[id].lv - 1] ?? 0 : 0);

export function hire(id: StaffId) {
  if (!canHire(id) || S.staff[id].hired) return false;
  const fee = hireFee(id); if (fee > S.coins) return false;
  if (fee) spend("hire", fee, `Thuê ${petName(id)}`);
  S.staff[id] = { ...S.staff[id], hired: true, onDuty: true }; save(); return true;
}
export function toggleDuty(id: StaffId) { if (!S.staff[id].hired) return; S.staff[id].onDuty = !S.staff[id].onDuty; save(); }
export function train(id: StaffId) {
  const c = trainCost(id);
  if (!S.staff[id].hired || !c || S.coins < c) return false;
  spend("train", c, `Huấn luyện ${petName(id)} lên bậc ${S.staff[id].lv + 1}`); S.staff[id].lv++; delete S.staff[id].food; save(); return true;
}
/* Đầu ca: các bé đi làm ăn lương trước. Bé nào không còn đồ ăn thì nghỉ ca này.
   Trả về giá trị đồ ăn đã dùng (để tính lãi) và các bé phải nghỉ vì đói */
export function payCrew(): { cost: number; fed: { id: StaffId; meal: FoodId | null }[]; hungry: StaffId[] } {
  const out = { cost: 0, fed: [] as { id: StaffId; meal: FoodId | null }[], hungry: [] as StaffId[] };
  crewPlan().forEach(({ id }) => {
    const meal = mealFor(id);                 // tính lại lúc ăn: bé trước đã lấy phần thì bé sau xét kho còn lại
    if (!meal) { S.staff[id].onDuty = false; out.hungry.push(id); return; }
    S.food[meal] = foodOf(meal) - 1; out.cost += foodDef(meal).cost; out.fed.push({ id, meal });
  });
  staffIds().filter(id => isMascotStaff(id) && onDuty(id)).forEach(id => out.fed.push({ id, meal: null }));   // linh thú Gacha đi làm không cần ăn
  save(); return out;
}

/* Độ nổi tiếng: sao trung bình 20 đánh giá gần nhất (0..3) + đồ trang trí + cấp tiệm */
export function fameScore() {
  const r = S.reviews.slice(0, 20), avg = r.length ? r.reduce((a, x) => a + x.s, 0) / r.length : 2;
  return avg + decorCount() * 0.4 + (lvl() - 1) * 0.3 + venueFame();
}
/** độ viral (số khách giờ cao điểm) của một tiệm bất kỳ, dùng cho màn ghé thăm: cùng công thức với fameScore */
export function demandOf(stars: number, decor: number, lv: number, v: { tbl: number[]; floors: number; wide: number }) {
  const x = stars + decor * 0.4 + (lv - 1) * 0.3 + (v.floors - 1) * 0.8 + v.wide * 0.5 + v.tbl.reduce((a, l) => a + (l - 1) * 0.25, 0);
  return FAME[FAME_AT.filter(t => x >= t).length].seats;
}
/** đầu tư vào tiệm cộng điểm nổi tiếng: mỗi lầu thêm 0,8, mỗi lần mở rộng 0,5, mỗi cấp nâng của bàn 0,25 */
export const venueFame = () => (S.venue.floors - 1) * 0.8 + S.venue.wide * 0.5 + S.venue.tbl.reduce((a, l) => a + (l - 1) * 0.25, 0);
export const fameLevel = () => { const x = fameScore(); return FAME_AT.filter(t => x >= t).length; };
export const fame = () => ({ ...FAME[fameLevel()], lv: fameLevel(), score: fameScore() });

/* ===== Sức chứa tiệm: bàn (cấp 1..3), lầu, mở rộng ngang =====
   Độ viral = số khách giờ cao điểm (demand). Sức chứa = tổng số ghế các bàn (cấp 1 có 2 ghế, cấp 2 có 3, cấp 3 có 4).
   Thiếu chỗ thì phải nâng cấp mới mở tiệm được. */
export const demand = () => FAME[fameLevel()].seats;
/** cấp từng bàn, bàn cấp cao đứng trước. Lần đầu: đặt theo số ghế đang có (người chơi cũ được tặng đủ) */
export const tableLvs = (): number[] => {
  const v = S.venue;
  if (!v.tbl.length) {
    const seats = v.tables || Math.min(6, demand());
    v.tbl = Array(Math.max(SHOP.startTables, Math.ceil(seats / 2))).fill(1); delete v.tables; save();
  }
  return v.tbl;
};
export const capacity = () => tableLvs().reduce((a, l) => a + SHOP.seatsOf(l), 0);
export const spots = () => S.venue.floors * (SHOP.perFloor + SHOP.perWide * S.venue.wide);
export const seatsNow = () => Math.min(demand(), capacity());           // số khách ngồi cùng lúc trong ca
export const needUpgrade = () => demand() > capacity();
export const spareSeats = () => Math.max(0, capacity() - demand());      // ghế dư: chỗ cho khách giờ vàng
/** cấp bàn của từng ghế trong ca (bàn cấp cao đứng trước, khách ngồi bàn xịn trước): ngồi bàn càng cao càng kiên nhẫn, tip càng nhiều */
export const seatLevels = (): number[] => tableLvs().flatMap(l => Array(SHOP.seatsOf(l)).fill(l)).slice(0, seatsNow());
export const comfortPat = (lv: number) => 1 + 0.15 * (lv - 1);
export const comfortTip = (lv: number) => 1 + 0.25 * (lv - 1);
const lowest = () => Math.min(...tableLvs());
export const upgradeOptions = () => [
  { id: "table" as const, cost: SHOP.tableCost(tableLvs().length + 1), ok: tableLvs().length < spots() },
  { id: "up" as const, cost: SHOP.upCost(lowest()), ok: lowest() < SHOP.maxLv },
  { id: "floor" as const, cost: SHOP.floorCost(S.venue.floors - 1), ok: true },
  { id: "wide" as const, cost: SHOP.wideCost(S.venue.wide), ok: true }
];
export const canAffordUpgrade = () => upgradeOptions().some(o => o.ok && S.coins >= o.cost);
export function buyVenue(id: "table" | "up" | "floor" | "wide"): boolean {
  const o = upgradeOptions().find(x => x.id === id)!;
  if (!o.ok || S.coins < o.cost) return false;
  if (id === "table") { spend("venue", o.cost, `Mua bàn thứ ${tableLvs().length + 1}`); S.venue.tbl.push(1); }
  else if (id === "up") { const k = S.venue.tbl.indexOf(lowest()); spend("venue", o.cost, `Nâng bàn lên cấp ${lowest() + 1}`); S.venue.tbl[k]!++; }
  else if (id === "floor") { spend("venue", o.cost, `Xây lầu ${S.venue.floors + 1}`); S.venue.floors++; }
  else { spend("venue", o.cost, `Mở rộng ngang lần ${S.venue.wide + 1}`); S.venue.wide++; }
  S.venue.tbl.sort((a, b) => b - a); save(); return true;
}

/* ===== Tài sản (bảng xếp hạng): xu + đồ trang trí đã mua + nguyên liệu trong kho + đồ ăn trong tủ ===== */
export function netWorth() {
  const decor = S.owned.reduce((a, id) => { const [k, v] = id.split(":"); return a + (roomItem(k as RoomKey, v).cost || 0); }, 0);
  const stock = STOCK_KEYS.reduce((a, k) => a + S.stock[k].reduce((b, n, i) => b + n * unitCost(k, i), 0), 0);
  const food = FOODS.reduce((a, f) => a + foodOf(f.id) * f.cost, 0);
  return { coins: S.coins, goods: decor + stock + food, total: S.coins + decor + stock + food };
}
