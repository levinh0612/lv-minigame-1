/* Luật của một ca bán: khách vào, chờ, giao bánh, tính thưởng. Không đụng DOM để test được. */
import { CFG, type PetId } from "../content/couple";
import {
  ACCENT, CATS, CRITTERS, GUEST_LINES, HAIR, HIM, KEYS, LABELS, PETS, PET_LINES, RECIPES, SKIN, STOCK_KEYS,
  type Build, type Look, type Mood, type PartKey, type Recipe, type StockKey
} from "../content/game";
import { payCrew, prepParts, quickPrice, rescueBonus, stockOf, tipBonus, unitCost } from "./economy";
import { coinMult } from "./dates";
import { featured, fx, lvl, unlocked } from "./progress";
import { S, petName, save } from "./state";
import { nameList, pick, rnd } from "./util";

export interface Customer {
  who: string; look: Look; r: Recipe; sweet: number; max: number; pat: number;
  him?: boolean; pet?: PetId; gone?: boolean; mood?: Mood; note?: string; rescued?: boolean;
}
export interface Shift {
  total: number; spawned: number; served: number; left: number; coins: number; tips: number; stars: number[];
  seats: (Customer | null)[]; build: Build; t: number; next: number; paused: boolean;
  boyDone: boolean; petsDone: PetId[]; lv0: number; sel: number;
  ingUsed: number; quickCost: number; wages: number; prepFor: Customer | null;
}

export const emptyBuild = (): Build => ({ base: null, cream: null, top: null, sweet: null });
export const needOf = (c: Customer): Record<PartKey, number> => ({ base: c.r.base, cream: c.r.cream, top: c.r.top, sweet: c.sweet });
export const matches = (c: Customer | null | undefined, b: Build) => !!c && !c.gone && KEYS.every(k => needOf(c)[k] === b[k]);
export const isComplete = (b: Build) => KEYS.every(k => b[k] != null);

export function createShift(): Shift {
  const L = lvl();
  return {
    total: Math.min(16, 6 + L + fx("cust")), spawned: 0, served: 0, left: 0, coins: 0, tips: 0, stars: [],
    seats: [null, null, null], build: emptyBuild(), t: 0, next: 1, paused: false,
    boyDone: !!S.daily.boy, petsDone: [], lv0: L, sel: -1,
    ingUsed: 0, quickCost: 0, wages: 0, prepFor: null
  };
}

function makeGuest(): { who: string; look: Look } {
  const girl = Math.random() < 0.5;
  return {
    who: pick(nameList(girl ? S.names.girls : S.names.boys)),
    look: { gender: girl ? "girl" : "boy", hairStyle: girl ? pick(["long", "buns"] as const) : pick(["short", "cap"] as const), hair: pick(HAIR), skin: pick(SKIN), accent: pick(ACCENT), gesture: pick(["rest", "wave", "cheek"] as const) }
  };
}

/* Chọn khách mới: Anh (mỗi ngày một lần), thú cưng nhà mình, hoặc khách thường */
export function makeCustomer(sh: Shift): Customer {
  const L = lvl(), rs = unlocked();
  const petChance = 0.1 + fx("pet") + CFG.pets.reduce((a, p) => a + S.pets[p.id].aff, 0) / 1500;
  const petsLeft = CFG.pets.filter(p => !sh.petsDone.includes(p.id));
  if (!sh.boyDone && ((sh.spawned >= 2 && Math.random() < 0.35) || sh.spawned === sh.total - 1)) {
    sh.boyDone = true; S.daily.boy = true; save();
    return { who: S.names.his, look: { ...HIM }, him: true, r: RECIPES[0], sweet: 0, max: 70, pat: 70 };
  }
  if (petsLeft.length && Math.random() < petChance) {
    const p = pick(petsLeft); sh.petsDone.push(p.id);
    return { who: petName(p.id), look: { ...PETS[p.id] }, pet: p.id, r: pick(rs), sweet: 0, max: 55, pat: 55 };
  }
  const g = Math.random() < 0.6 ? makeGuest() : (k => ({ who: k.n, look: { ...k } as Look }))(pick(CRITTERS));
  const r0 = Math.random() < 0.25 ? featured() : Math.random() < 0.3 ? rs[rs.length - 1] : pick(rs);
  const x = Math.random(), max = Math.max(26, 44 - L * 1.5) * (1 + fx("pat"));
  return { ...g, r: r0.lv <= L ? r0 : pick(rs), sweet: x < 0.5 ? 0 : x < 0.8 ? 1 : 2, max, pat: max };
}

/* Chạy thời gian. Trả về ghế vừa có khách và các ghế khách vừa bỏ về. */
export function tick(sh: Shift, dt: number): { spawned: number; left: number[]; rescued: number[] } {
  const out = { spawned: -1, left: [] as number[], rescued: [] as number[] };
  if (sh.paused) return out;
  sh.t += dt;
  const free = sh.seats.findIndex(s => !s);
  if (sh.spawned < sh.total && sh.t >= sh.next && free >= 0) {
    sh.seats[free] = makeCustomer(sh); sh.spawned++; out.spawned = free;
    sh.next = sh.t + rnd(2.5, 5.5) - Math.min(1.5, lvl() * 0.12);
  }
  sh.seats.forEach((c, i) => {
    if (!c || c.gone) return;
    c.pat -= dt;
    // Cacao chạy bàn: dỗ khách sắp giận, mỗi khách một lần
    const rb = rescueBonus();
    if (rb && !c.rescued && c.pat > 0 && c.pat / c.max < 0.3) { c.rescued = true; c.pat = Math.min(c.max, c.pat + c.max * rb); out.rescued.push(i); }
    if (c.pat <= 0) { leaveCustomer(sh, i); out.left.push(i); }
  });
  return out;
}
export const isOver = (sh: Shift) => sh.spawned >= sh.total && sh.seats.every(s => !s);
export const remaining = (sh: Shift) => sh.total - sh.served - sh.left;

/* Khách đang được làm bánh cho: khách được chạm chọn, hoặc khách chờ lâu nhất */
export function targetIdx(sh: Shift): number {
  if (sh.sel >= 0 && sh.seats[sh.sel] && !sh.seats[sh.sel]!.gone) return sh.sel;
  let best = -1;
  sh.seats.forEach((c, i) => { if (c && !c.gone && (best < 0 || c.pat / c.max < sh.seats[best]!.pat / sh.seats[best]!.max)) best = i; });
  return best;
}

export type ServeResult =
  | { ok: true; idx: number; c: Customer; stars: number; price: number; tip: number; quick: number }
  | { ok: false; msg: string };

export function serve(sh: Shift): ServeResult {
  const b = sh.build;
  if (!isComplete(b)) return { ok: false, msg: "Chọn đủ Đế, Kem, Topping và Độ ngọt nha" };
  const ti = targetIdx(sh);
  const idx = matches(sh.seats[ti], b) ? ti : sh.seats.findIndex(c => matches(c, b));
  if (idx < 0) {
    if (ti < 0) return { ok: false, msg: "Chưa có khách nào gọi món" };
    const c = sh.seats[ti]!, n = needOf(c), bad = KEYS.find(k => b[k] !== n[k])!;
    return { ok: false, msg: `Sai ${LABELS[bad].toLowerCase()} rồi: ${c.who} gọi ${CATS[bad][n[bad]][0]}, không phải ${CATS[bad][b[bad]!][0]}` };
  }
  // lấy nguyên liệu trong kho; thiếu thì nhập nhanh (đắt hơn)
  const missing = STOCK_KEYS.filter(k => stockOf(k, b[k]!) <= 0);
  const quick = missing.reduce((a, k) => a + quickPrice(k, b[k]!), 0);
  if (quick > S.coins) return { ok: false, msg: `Hết nguyên liệu và không đủ ${quick} xu để nhập nhanh` };
  S.coins -= quick; sh.quickCost += quick;
  STOCK_KEYS.forEach(k => { if (missing.includes(k)) return; S.stock[k][b[k]!]--; sh.ingUsed += unitCost(k, b[k]!); });
  const c = sh.seats[idx]!; c.gone = true;
  const f = c.pat / c.max, stars = f > 0.55 ? 3 : f > 0.3 ? 2 : 1, mult = coinMult();
  const price = Math.round(c.r.price * (1 + fx("price"))) * mult;
  const tip = Math.round(c.r.price * f * 0.6 * (1 + fx("tip") + tipBonus())) * mult;
  S.coins += price + tip; S.xp += 4 + stars * 2; S.served++;
  sh.coins += price; sh.tips += tip; sh.served++; sh.stars.push(stars); sh.sel = -1;
  S.daily.served++; S.daily.earned += price + tip; if (c.r.id === S.daily.featId) S.daily.feat++;
  if (c.pet) S.pets[c.pet].aff += 2;
  addReview(c, stars); save();
  return { ok: true, idx, c, stars, price, tip, quick };
}

export function leaveCustomer(sh: Shift, i: number) {
  const c = sh.seats[i]!; c.gone = true; sh.left++; sh.stars.push(0); S.daily.angry++;
  addReview(c, 0); save();
}

/* Đóng cửa sớm: khách đang chờ tính là bỏ về */
export function closeEarly(sh: Shift) {
  sh.total = sh.spawned;
  sh.seats.forEach((c, i) => { if (c && !c.gone) { sh.seats[i] = null; sh.left++; sh.stars.push(0); S.daily.angry++; } });
  save();
}

export function addReview(c: Customer, s: number) {
  let txt: string;
  if (c.him) { txt = s > 0 ? pick(CFG.notes) : "Anh chờ Em hoài nè, nhưng không sao, Anh vẫn thương."; c.note = txt; }
  else if (c.pet) txt = pick(PET_LINES[c.pet]);
  else txt = pick(GUEST_LINES[s]);
  S.reviews.unshift({ who: c.who, look: c.look, s: c.pet || c.him ? Math.max(s, 3) : s, txt, love: !!c.him });
  S.reviews = S.reviews.slice(0, 30);
}

/* Milo phụ bếp: khi đổi sang khách mới, chọn sẵn 1/2/3 phần đầu (nếu còn trong kho và ô đang trống) */
export function autoPrep(sh: Shift): PartKey[] {
  const n = prepParts(), ti = targetIdx(sh), c = ti >= 0 ? sh.seats[ti] : null;
  if (!n || !c || sh.prepFor === c) return [];
  sh.prepFor = c;
  const need = needOf(c), done: PartKey[] = [];
  (STOCK_KEYS.slice(0, n) as StockKey[]).forEach(k => { if (sh.build[k] == null && stockOf(k, need[k]) > 0) { sh.build[k] = need[k]; done.push(k); } });
  return done;
}

/* Mở ca: các bé đi làm ăn lương (đồ ăn) trước, giá trị đồ ăn tính vào chi phí ca */
export function beginShift() {
  const pay = payCrew(), sh = createShift();
  sh.wages = pay.cost;
  return { sh, pay };
}
/* Hết ca: tính lãi */
export function finishShift(sh: Shift) {
  S.shifts++; save();
  return ledger(sh);
}
export const ledger = (sh: Shift) => {
  const revenue = sh.coins + sh.tips;
  return { revenue, ingUsed: sh.ingUsed, quick: sh.quickCost, wages: sh.wages, profit: revenue - sh.ingUsed - sh.quickCost - sh.wages };
};

export function summary(sh: Shift) {
  const total = sh.served + sh.left, happy = total ? sh.served / total : 0;
  return { total, stars: happy >= 0.9 ? 3 : happy >= 0.6 ? 2 : 1 };
}
