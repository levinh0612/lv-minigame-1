/* Luật của một ca bán: khách vào, chờ, giao bánh, tính thưởng. Không đụng DOM để test được. */
import { CFG, type PetId } from "../content/couple";
const STAFF_IDS: PetId[] = ["dog", "gold", "white"];
import {
  ACCENT, CATS, CRITTERS, GUEST_LINES, HAIR, HIM, KEYS, LABELS, PETS, PET_LINES, RECIPES, SKIN, STOCK_KEYS,
  type Build, type Look, type Mood, type PartKey, type Recipe
} from "../content/game";
import { BAKE_TIME } from "../content/game";
import { dutyLv, expectedCustomers, fame, payCrew, quickPrice, stockOf, unitCost } from "./economy";
import { coinMult } from "./dates";
import { featured, fx, lvl, unlocked } from "./progress";
import { S, petName, save } from "./state";
import { nameList, pick, rnd } from "./util";

export interface Customer {
  who: string; look: Look; r: Recipe; sweet: number; max: number; pat: number;
  him?: boolean; pet?: PetId; gone?: boolean; mood?: Mood; note?: string;
  by?: PetId;          // thú cưng đang làm đơn này (người chơi không chọn được)
}
/* một bé thợ bánh trong ca: đang làm cho ghế nào, được bao nhiêu */
export interface Baker { id: PetId; seat: number; done: number; need: number }
export interface Shift {
  total: number; spawned: number; served: number; left: number; coins: number; tips: number; stars: number[];
  seats: (Customer | null)[]; build: Build; t: number; next: number; paused: boolean;
  boyDone: boolean; petsDone: PetId[]; lv0: number;
  mine: number;        // ghế của đơn chủ tiệm đang làm (-1 = rảnh tay)
  peek: boolean;       // đã xem công thức đơn này chưa (chưa xem mà giao đúng thì được thưởng)
  bonus: number; lack: Partial<Record<PetId, string>>;
  ingUsed: number; quickCost: number; wages: number; bakers: Baker[]; working: PetId[];
}

export const emptyBuild = (): Build => ({ base: null, cream: null, top: null, sweet: null });
export const needOf = (c: Customer): Record<PartKey, number> => ({ base: c.r.base, cream: c.r.cream, top: c.r.top, sweet: c.sweet });
export const matches = (c: Customer | null | undefined, b: Build) => !!c && !c.gone && !c.by && KEYS.every(k => needOf(c)[k] === b[k]);
export const isComplete = (b: Build) => KEYS.every(k => b[k] != null);

export function createShift(): Shift {
  const L = lvl();
  return {
    total: expectedCustomers(), spawned: 0, served: 0, left: 0, coins: 0, tips: 0, stars: [],
    seats: Array(fame().seats).fill(null), build: emptyBuild(), t: 0, next: 1, paused: false,
    boyDone: !!S.daily.boy, petsDone: [], lv0: L, mine: -1, peek: false, bonus: 0, lack: {},
    ingUsed: 0, quickCost: 0, wages: 0, bakers: [], working: []
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
export type StaffDone = { baker: Baker; res: Extract<ServeResult, { ok: true }> };
export interface TickOut { spawned: number; left: number[]; claimed: Baker[]; baked: StaffDone[]; assigned: number; restock: { id: PetId; what: string }[] }
export function tick(sh: Shift, dt: number): TickOut {
  const out: TickOut = { spawned: -1, left: [], claimed: [], baked: [], assigned: -1, restock: [] };
  if (sh.paused) return out;
  sh.t += dt;
  const free = sh.seats.findIndex(s => !s);
  if (sh.spawned < sh.total && sh.t >= sh.next && free >= 0) {
    sh.seats[free] = makeCustomer(sh); sh.spawned++; out.spawned = free;
    sh.next = sh.t + (rnd(2.5, 5.5) - Math.min(1.5, lvl() * 0.12)) * [1, 0.85, 0.72, 0.62][fame().lv];
  }
  sh.seats.forEach((c, i) => {
    if (!c || c.gone) return;
    c.pat -= c.by ? dt / 2 : dt;          // có bé nhận đơn thì khách bớt sốt ruột
    if (c.pat <= 0) { leaveCustomer(sh, i); out.left.push(i); }
  });
  // Tự nhận đơn: đang rảnh tay thì chủ tiệm được gán đơn chờ lâu nhất
  if (S.autoTake && mineIdx(sh) < 0) { const u = urgentIdx(sh); if (u >= 0) { take(sh, u); out.assigned = u; } }
  bake(sh, dt, out);
  return out;
}

/* Thợ bánh: bé rảnh nhận đơn chưa ai làm (trừ đơn chủ tiệm đang làm, và phải đủ nguyên liệu); làm xong tự giao */
function bake(sh: Shift, dt: number, out: TickOut) {
  sh.bakers = sh.bakers.filter(b => { const c = sh.seats[b.seat]; if (c && !c.gone && c.by === b.id) return true; if (c?.by === b.id) c.by = undefined; return false; });
  sh.bakers.forEach(b => {
    b.done += dt;
    if (b.done < b.need) return;
    const c = sh.seats[b.seat]!;
    c.by = undefined;
    const res = deliver(sh, b.seat, true);
    out.baked.push({ baker: b, res });
  });
  sh.bakers = sh.bakers.filter(b => b.done < b.need);
  STAFF_IDS.forEach(id => {
    const lv = dutyLv(id);
    if (!lv || sh.bakers.some(b => b.id === id) || !sh.working.includes(id)) return;
    const mine = mineIdx(sh);
    // khách chờ lâu nhất trước; thiếu nguyên liệu thì bé tự nhập nhanh, hết xu thì bỏ qua và báo thiếu gì
    const order = sh.seats.map((_, i) => i).filter(i => { const c = sh.seats[i]; return c && !c.gone && !c.by && i !== mine; })
      .sort((a, b) => sh.seats[a]!.pat / sh.seats[a]!.max - sh.seats[b]!.pat / sh.seats[b]!.max);
    let seat = -1, lack = "";
    for (const i of order) {
      const r = sh.seats[i]!.r, miss = STOCK_KEYS.filter(k => stockOf(k, r[k]) <= 0);
      const cost = miss.reduce((a, k) => a + quickPrice(k, r[k]), 0);
      if (miss.length && cost > S.coins) { lack ||= miss.map(k => CATS[k][r[k]][0]).join(", "); continue; }
      if (miss.length) {
        S.coins -= cost; sh.quickCost += cost;
        miss.forEach(k => { S.stock[k][r[k]] = stockOf(k, r[k]) + 1; });
        out.restock.push({ id, what: miss.map(k => CATS[k][r[k]][0]).join(", ") });
      }
      seat = i; break;
    }
    if (seat < 0) { if (lack) sh.lack[id] = lack; else delete sh.lack[id]; return; }
    delete sh.lack[id];
    const c = sh.seats[seat]!;
    c.by = id;
    STOCK_KEYS.forEach(k => { S.stock[k][c.r[k]]--; sh.ingUsed += unitCost(k, c.r[k]); });
    const b: Baker = { id, seat, done: 0, need: BAKE_TIME[lv - 1] };
    sh.bakers.push(b); out.claimed.push(b);
  });
}
export const isOver = (sh: Shift) => sh.spawned >= sh.total && sh.seats.every(s => !s);
export const remaining = (sh: Shift) => sh.total - sh.served - sh.left;

/* ===== Đơn của chủ tiệm ===== */
const free = (c: Customer | null | undefined): c is Customer => !!c && !c.gone && !c.by;
/* ghế đơn chủ tiệm đang làm, -1 nếu đang rảnh tay */
export const mineIdx = (sh: Shift) => (sh.mine >= 0 && free(sh.seats[sh.mine]) ? sh.mine : -1);
/* khách chưa ai nhận, chờ lâu nhất */
export function urgentIdx(sh: Shift): number {
  let best = -1;
  sh.seats.forEach((c, i) => { if (free(c) && (best < 0 || c.pat / c.max < sh.seats[best]!.pat / sh.seats[best]!.max)) best = i; });
  return best;
}
/* đơn để so khi giao bánh: đơn của mình, không có thì khách chờ lâu nhất */
export const targetIdx = (sh: Shift) => { const m = mineIdx(sh); return m >= 0 ? m : urgentIdx(sh); };
/* chủ tiệm nhận một đơn (chạm vào khách). Đổi đơn thì phải nhớ công thức lại từ đầu */
export function take(sh: Shift, i: number): boolean {
  if (!free(sh.seats[i])) return false;
  if (sh.mine !== i) { sh.mine = i; sh.peek = false; }
  return true;
}
export function release(sh: Shift) { sh.mine = -1; sh.peek = false; }
export function peek(sh: Shift) { sh.peek = true; }

export type ServeResult =
  | { ok: true; idx: number; c: Customer; stars: number; price: number; tip: number; quick: number; byStaff: boolean; bonus: number }
  | { ok: false; msg: string };

export function serve(sh: Shift): ServeResult {
  const b = sh.build;
  if (!isComplete(b)) return { ok: false, msg: "Chọn đủ Đế, Kem, Topping và Độ ngọt nha" };
  const ti = targetIdx(sh);
  let idx = matches(sh.seats[ti], b) ? ti : -1;
  if (idx < 0) sh.seats.forEach((c, i) => { if (matches(c, b) && (idx < 0 || c!.pat / c!.max < sh.seats[idx]!.pat / sh.seats[idx]!.max)) idx = i; });
  if (idx < 0) {
    if (ti < 0) return { ok: false, msg: "Chưa có khách nào gọi món" };
    const c = sh.seats[ti]!, n = needOf(c), bad = KEYS.find(k => b[k] !== n[k])!;
    sh.peek = true;                      // đã được mách nguyên liệu: mất thưởng nhớ bài
    return { ok: false, msg: `Sai ${LABELS[bad].toLowerCase()} rồi: ${c.who} gọi ${CATS[bad][n[bad]][0]}, không phải ${CATS[bad][b[bad]!][0]}` };
  }
  // lấy nguyên liệu trong kho; thiếu thì nhập nhanh (đắt hơn)
  const missing = STOCK_KEYS.filter(k => stockOf(k, b[k]!) <= 0);
  const quick = missing.reduce((a, k) => a + quickPrice(k, b[k]!), 0);
  if (quick > S.coins) return { ok: false, msg: `Hết nguyên liệu và không đủ ${quick} xu để nhập nhanh` };
  S.coins -= quick; sh.quickCost += quick;
  STOCK_KEYS.forEach(k => { if (missing.includes(k)) return; S.stock[k][b[k]!]--; sh.ingUsed += unitCost(k, b[k]!); });
  return { ...deliver(sh, idx, false), quick };
}

/* Giao bánh cho khách ở ghế idx (người chơi hoặc bé thợ bánh), tính thưởng */
function deliver(sh: Shift, idx: number, byStaff: boolean): Extract<ServeResult, { ok: true }> {
  const quick = 0;
  const c = sh.seats[idx]!; c.gone = true;
  const f = c.pat / c.max, stars = f > 0.55 ? 3 : f > 0.3 ? 2 : 1, mult = coinMult();
  const price = Math.round(c.r.price * (1 + fx("price"))) * mult;
  const tip = Math.round(c.r.price * f * 0.6 * (1 + fx("tip"))) * mult;
  // Thưởng nhớ bài: chủ tiệm giao đúng mà không xem công thức
  const bonus = !byStaff && !sh.peek ? Math.round(price * 0.5) : 0;
  S.coins += price + tip + bonus; S.xp += 4 + stars * 2 + (bonus ? 2 : 0); S.served++;
  sh.coins += price; sh.tips += tip; sh.bonus += bonus; sh.served++; sh.stars.push(stars);
  if (!byStaff) release(sh);
  S.daily.served++; S.daily.earned += price + tip; if (c.r.id === S.daily.featId) S.daily.feat++;
  if (c.pet) S.pets[c.pet].aff += 2;
  addReview(c, stars); save();
  return { ok: true, idx, c, stars, price, tip, quick, byStaff, bonus };
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

/* Mở ca: các bé đi làm ăn lương (đồ ăn) trước, giá trị đồ ăn tính vào chi phí ca */
export function beginShift() {
  const pay = payCrew(), sh = createShift();
  sh.wages = pay.cost; sh.working = pay.fed.map(x => x.id);
  return { sh, pay };
}
/* Hết ca: tính lãi */
export function finishShift(sh: Shift) {
  S.shifts++; save();
  return ledger(sh);
}
export const ledger = (sh: Shift) => {
  const revenue = sh.coins + sh.tips + sh.bonus;
  return { revenue, ingUsed: sh.ingUsed, quick: sh.quickCost, wages: sh.wages, profit: revenue - sh.ingUsed - sh.quickCost - sh.wages };
};

export function summary(sh: Shift) {
  const total = sh.served + sh.left, happy = total ? sh.served / total : 0;
  return { total, stars: happy >= 0.9 ? 3 : happy >= 0.6 ? 2 : 1 };
}
