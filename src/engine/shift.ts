/* Luật của một ca bán: khách vào, chờ, giao bánh, tính thưởng. Không đụng DOM để test được. */
import { CFG } from "../content/couple";
import {
  BOY_SPRITES, CATS, COAT, EYES, GIRL_SPRITES, SHIRT, GUEST_LINES, HAIR, HIM, KEYS, LABELS, RECIPES, SKIN,
  type Build, type Look, type Mood, type PartKey, type Recipe
} from "../content/game";
import { BAKE_TIME, TIER_BAKE_SLOW, TIER_HAND_BONUS, partsOfRecipe, tiersOf, type FoodId, type StaffId, type StockKey } from "../content/game";
import { addBond, addTickets, regulars } from "./gacha";
import { comfortPat, comfortTip, dutyLv, staffIds, expectedCustomers, fame, mealOf, mealSlow, payCrew, quickPrice, seatLevels, seatsNow, spareSeats, stockOf, unitCost } from "./economy";
import { coinMult } from "./dates";
import { planMouse, tickMouse, type MouseEvt, type MouseOut } from "./mouse";
import { featured, fx, lvl, unlocked } from "./progress";
import { S, save } from "./state";
import { earn, note, spend } from "./wallet";
import { nameList, pick, rnd } from "./util";

export interface Customer {
  who: string; look: Look; r: Recipe; sweet: number; max: number; pat: number;
  him?: boolean; gone?: boolean; mood?: Mood; note?: string;
  by?: StaffId;          // thú cưng đang làm đơn này (người chơi không chọn được)
  reg?: string;        // khách quen từ gacha (id vật phẩm)
  perkPrice?: number; perkTip?: number;   // lợi ích riêng của khách quen: giá bánh và tip cộng thêm
  seatLv?: number;     // cấp bàn khách đang ngồi (1..3)
}
/* một bé thợ bánh trong ca: đang làm cho ghế nào, được bao nhiêu */
export interface Baker { id: StaffId; seat: number; done: number; need: number }
export interface Shift {
  total: number; spawned: number; served: number; left: number; coins: number; tips: number; stars: number[];
  seats: (Customer | null)[]; build: Build; t: number; next: number; paused: boolean;
  boyDone: boolean; lv0: number;
  mine: number;        // ghế của đơn chủ tiệm đang làm (-1 = rảnh tay)
  peek: boolean;       // đã xem công thức đơn này chưa (chưa xem mà giao đúng thì được thưởng)
  bonus: number; tierBonus: number; lack: Partial<Record<StaffId, string>>;
  ingUsed: number; quickCost: number; wages: number; bakers: Baker[]; working: StaffId[]; meals: Partial<Record<StaffId, FoodId>>;
  seatLv: number[]; rushAt: number; rushExtra: number; rushUntil: number; rushDone: boolean;   // giờ vàng: ghế dư đem thêm khách
  memo: number;        // số đơn giao đúng mà không xem công thức
  helped: number;      // số đơn các bé làm hộ
  goals: ShiftGoal[]; goalCoins: number; ticket: boolean; bondUp: number;
  combo: number; bestCombo: number; comboBank: number; comboLost: number; comboPaid: number;
  mouse: MouseEvt | null; mousePlan: number; mouseDone: boolean; fainted: StaffId[]; patMul: number; shutdown: boolean; mouseFine: number; mouseReward: number; mouseKills: number; mousePaid: number;   // chuột vào tiệm (xem mouse.ts)   // combo: số bánh Hoàn hảo liên tiếp; comboBank: thưởng dồn chờ cuối ca (đứt chuỗi thì mất nửa)
  // bondUp: cấp thân thiết mới của linh vật nếu vừa lên cấp; ticket: đạt hết mục tiêu ca nên được 1 vé triệu hồi
}

/** tiers: số tầng của bánh đang làm (bánh thường = 1) */
export const emptyBuild = (tiers = 1): Build => ({ base: null, cream: null, top: null, sweet: null, up: Array.from({ length: tiers - 1 }, () => [null, null] as [number | null, number | null]) });
/** phiếu trống đúng số tầng của đơn mình đang giữ */
export const freshBuild = (sh: Shift): Build => { const m = mineIdx(sh); return emptyBuild(m >= 0 ? tiersOf(sh.seats[m]!.r) : 1); };
/** đế hoặc kem của tầng t (0 = dưới cùng) */
export const partAt = (b: Build, t: number, k: "base" | "cream"): number | null => t === 0 ? b[k] : b.up?.[t - 1]?.[k === "base" ? 0 : 1] ?? null;
export function setPartAt(b: Build, t: number, k: "base" | "cream", v: number | null) {
  if (t === 0) { b[k] = v; return; }
  const up = (b.up ??= []); while (up.length < t) up.push([null, null]);
  up[t - 1][k === "base" ? 0 : 1] = v;
}
export const needAt = (r: Recipe, t: number, k: "base" | "cream") => t === 0 ? r[k] : r.up![t - 1][k === "base" ? 0 : 1];
/** các phần nguyên liệu đã chọn trong phiếu (đếm trùng) */
export const partsOfBuild = (b: Build): { k: StockKey; i: number }[] => ([["base", b.base], ["cream", b.cream], ...(b.up ?? []).flatMap(u => [["base", u[0]], ["cream", u[1]]]), ["top", b.top]] as [StockKey, number | null][])
  .filter((x): x is [StockKey, number] => x[1] != null).map(([k, i]) => ({ k, i }));
export const buildTotal = (b: Build) => 4 + 2 * (b.up?.length ?? 0);
export const buildPicked = (b: Build) => partsOfBuild(b).length + (b.sweet != null ? 1 : 0);
export const needOf = (c: Customer): Record<PartKey, number> => ({ base: c.r.base, cream: c.r.cream, top: c.r.top, sweet: c.sweet });
export const matches = (c: Customer | null | undefined, b: Build) => !!c && !c.gone && !c.by && KEYS.every(k => needOf(c)[k] === b[k])
  && (c.r.up ?? []).every((u, j) => u[0] === b.up?.[j]?.[0] && u[1] === b.up?.[j]?.[1]);
export const isComplete = (b: Build) => KEYS.every(k => b[k] != null) && (b.up ?? []).every(u => u[0] != null && u[1] != null);
/** phần nguyên liệu còn thiếu trong kho cho danh sách phần (đếm trùng: hai tầng cùng đế cần 2 đế) */
export function shortage(parts: { k: StockKey; i: number }[]) {
  const need = new Map<string, { k: StockKey; i: number; n: number }>();
  parts.forEach(p => { const id = p.k + ":" + p.i, e = need.get(id) ?? { k: p.k, i: p.i, n: 0 }; e.n++; need.set(id, e); });
  return [...need.values()].map(e => ({ ...e, n: Math.max(0, e.n - stockOf(e.k, e.i)) })).filter(e => e.n > 0);
}

/** giờ vàng: có ghế dư thì giữa ca có một đợt khách đông bất ngờ, thêm 1 đến (số ghế dư) khách */
function rushPlan() {
  const spare = spareSeats(), total = expectedCustomers();
  return { rushExtra: spare > 0 ? 1 + Math.floor(Math.random() * spare) : 0, rushAt: Math.floor(total * rnd(0.35, 0.6)), rushUntil: 0, rushDone: false };
}
export function createShift(): Shift {
  const L = lvl();
  const sh: Shift = {
    total: expectedCustomers(), spawned: 0, served: 0, left: 0, coins: 0, tips: 0, stars: [],
    seats: Array(seatsNow()).fill(null), build: emptyBuild(), t: 0, next: 1, paused: false,
    boyDone: !!S.daily.boy, lv0: L, mine: -1, peek: false, bonus: 0, tierBonus: 0, lack: {},
    ingUsed: 0, quickCost: 0, wages: 0, bakers: [], working: [], meals: {}, seatLv: seatLevels(), ...rushPlan(), memo: 0, helped: 0, goals: shiftGoals(), goalCoins: 0, ticket: false, bondUp: 0, combo: 0, bestCombo: 0, comboBank: 0, comboLost: 0, comboPaid: 0, mouse: null, mousePlan: -1, mouseDone: false, fainted: [], patMul: 1, shutdown: false, mouseFine: 0, mouseReward: 0, mouseKills: 0, mousePaid: 0
  };
  sh.mousePlan = planMouse(sh.total);
  return sh;
}

function makeGuest(): { who: string; look: Look } {
  const girl = Math.random() < 0.5;
  return {
    who: pick(nameList(girl ? S.names.girls : S.names.boys)),
    look: { gender: girl ? "girl" : "boy", sprite: pick(girl ? GIRL_SPRITES : BOY_SPRITES), hair: pick(HAIR), skin: pick(SKIN), eye: pick(EYES), coat: pick(COAT), shirt: pick(SHIRT) }
  };
}

/* Chọn khách mới: Anh (mỗi ngày một lần) hoặc khách thường (nam/nữ) */
export function makeCustomer(sh: Shift): Customer {
  const L = lvl(), rs = unlocked();
  if (!sh.boyDone && ((sh.spawned >= 2 && Math.random() < 0.35) || sh.spawned === sh.total - 1)) {
    sh.boyDone = true; S.daily.boy = true; save();
    return { who: S.names.his, look: { ...HIM }, him: true, r: RECIPES[0], sweet: 0, max: 70, pat: 70 };
  }
  const g = makeGuest();
  const r0 = Math.random() < 0.25 ? featured() : Math.random() < 0.3 ? rs[rs.length - 1] : pick(rs);
  const x = Math.random(), max = Math.max(26, 44 - L * 1.5) * (1 + fx("pat"));
  const base: Customer = { ...g, r: r0.lv <= L ? r0 : pick(rs), sweet: x < 0.5 ? 0 : x < 0.8 ? 1 : 2, max, pat: max };
  /* khách quen từ gacha: nhân vật đã trúng thỉnh thoảng ghé tiệm, mang lợi ích riêng */
  const regs = regulars();
  if (regs.length && Math.random() < Math.min(0.4, 0.12 + regs.length * 0.03)) {
    const it = regs[Math.floor(Math.random() * regs.length)]!, c = it.char!, pat = max * (1 + c.pat);
    return { ...base, who: it.n + (it.rarity === "ultra" ? " 👑" : it.rarity === "rare" ? " ★" : ""), look: { gender: c.gender, sprite: c.sprite }, reg: it.id, perkPrice: c.price, perkTip: c.tip, max: pat, pat };
  }
  return base;
}

/* Chạy thời gian. Trả về ghế vừa có khách và các ghế khách vừa bỏ về. */
export type StaffDone = { baker: Baker; res: Extract<ServeResult, { ok: true }> };
export interface TickOut { rush: number; spawned: number; left: number[]; claimed: Baker[]; baked: StaffDone[]; assigned: number; restock: { id: StaffId; what: string }[]; mouse: MouseOut }
export function tick(sh: Shift, dt: number): TickOut {
  const out: TickOut = { rush: 0, spawned: -1, left: [], claimed: [], baked: [], assigned: -1, restock: [], mouse: {} };
  if (sh.paused) return out;
  sh.t += dt;
  out.mouse = tickMouse(sh, dt, closeEarly); if (out.mouse.shutdown) return out;
  if (!sh.rushDone && sh.rushExtra > 0 && sh.spawned >= sh.rushAt) { sh.rushDone = true; sh.total += sh.rushExtra; sh.rushUntil = sh.t + 25; out.rush = sh.rushExtra; }
  const free = sh.seats.findIndex(s => !s);
  if (sh.spawned < sh.total && sh.t >= sh.next && free >= 0) {
    const c = makeCustomer(sh), lv = sh.seatLv[free] ?? 1; c.seatLv = lv; c.max *= comfortPat(lv); c.pat = c.max;     // bàn cao cấp: khách kiên nhẫn hơn
    sh.seats[free] = c; sh.spawned++; out.spawned = free;
    sh.next = sh.t + (rnd(2.5, 5.5) - Math.min(1.5, lvl() * 0.12)) * [1, 0.85, 0.72, 0.62, 0.55, 0.5, 0.45][fame().lv] * (sh.t < sh.rushUntil ? 0.55 : 1);
  }
  sh.seats.forEach((c, i) => {
    if (!c || c.gone) return;
    c.pat -= (c.by ? dt / 2 : dt) * sh.patMul;          // có bé nhận đơn thì khách bớt sốt ruột
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
  staffIds().forEach(id => {
    const lv = dutyLv(id);
    if (!lv || sh.bakers.some(b => b.id === id) || !sh.working.includes(id) || sh.fainted.includes(id)) return;
    const mine = mineIdx(sh);
    // khách chờ lâu nhất trước; thiếu nguyên liệu thì bé tự nhập nhanh, hết xu thì bỏ qua và báo thiếu gì
    const order = sh.seats.map((_, i) => i).filter(i => { const c = sh.seats[i]; return c && !c.gone && !c.by && i !== mine; })
      .sort((a, b) => sh.seats[a]!.pat / sh.seats[a]!.max - sh.seats[b]!.pat / sh.seats[b]!.max);
    let seat = -1, lack = "";
    for (const i of order) {
      const r = sh.seats[i]!.r, miss = shortage(partsOfRecipe(r));
      const cost = miss.reduce((a, x) => a + quickPrice(x.k, x.i) * x.n, 0);
      if (miss.length && cost > S.coins) { lack ||= miss.map(x => CATS[x.k][x.i][0]).join(", "); continue; }
      if (miss.length) {
        spend("quick", cost); sh.quickCost += cost;
        miss.forEach(x => { S.stock[x.k][x.i] = stockOf(x.k, x.i) + x.n; });
        out.restock.push({ id, what: miss.map(x => CATS[x.k][x.i][0]).join(", ") });
      }
      seat = i; break;
    }
    if (seat < 0) { if (lack) sh.lack[id] = lack; else delete sh.lack[id]; return; }
    delete sh.lack[id];
    const c = sh.seats[seat]!;
    c.by = id;
    partsOfRecipe(c.r).forEach(p => { S.stock[p.k][p.i]--; sh.ingUsed += unitCost(p.k, p.i); });
    const b: Baker = { id, seat, done: 0, need: BAKE_TIME[lv - 1] * mealSlow(id, sh.meals[id] ?? mealOf(id)) * (1 + TIER_BAKE_SLOW * (tiersOf(c.r) - 1)) };
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
  | { ok: true; idx: number; c: Customer; stars: number; price: number; tip: number; quick: number; byStaff: boolean; bonus: number; tierBonus: number; perfect: boolean; combo: number; comboAdd: number }
  | { ok: false; msg: string; broke?: number };

const tiersOfBuild = (b: Build) => 1 + (b.up?.length ?? 0);
/** phần đầu tiên làm sai so với đơn khách gọi, để báo cho người chơi */
function firstWrong(c: Customer, b: Build) {
  const n = tiersOf(c.r), multi = n > 1, nm = (k: StockKey, i: number | null) => (i == null ? "chưa chọn" : CATS[k][i][0]);
  for (let t = 0; t < n; t++) for (const k of ["base", "cream"] as const) {
    const need = needAt(c.r, t, k), have = partAt(b, t, k);
    if (need !== have) return { label: `${LABELS[k].toLowerCase()}${multi ? ` tầng ${t + 1}` : ""}`, need: CATS[k][need][0], have: nm(k, have) };
  }
  const bad = (["top", "sweet"] as const).find(k => b[k] !== needOf(c)[k]) ?? "top";
  return { label: LABELS[bad].toLowerCase(), need: CATS[bad][needOf(c)[bad]][0], have: nm(bad as StockKey, b[bad]) };
}
export function serve(sh: Shift): ServeResult {
  const b = sh.build;
  if (!isComplete(b)) return { ok: false, msg: tiersOfBuild(b) > 1 ? "Chọn đủ Đế, Kem của từng tầng, Topping và Độ ngọt nha" : "Chọn đủ Đế, Kem, Topping và Độ ngọt nha" };
  const ti = targetIdx(sh);
  let idx = matches(sh.seats[ti], b) ? ti : -1;
  if (idx < 0) sh.seats.forEach((c, i) => { if (matches(c, b) && (idx < 0 || c!.pat / c!.max < sh.seats[idx]!.pat / sh.seats[idx]!.max)) idx = i; });
  if (idx < 0) {
    if (ti < 0) return { ok: false, msg: "Chưa có khách nào gọi món" };
    const c = sh.seats[ti]!, w = firstWrong(c, b);
    sh.peek = true;                      // đã được mách nguyên liệu: mất thưởng nhớ bài
    const broke = breakCombo(sh);
    return { ok: false, ...(broke ? { broke } : {}), msg: `Sai ${w.label} rồi: ${c.who} gọi ${w.need}, không phải ${w.have}` };
  }
  // lấy nguyên liệu trong kho; thiếu thì nhập nhanh (đắt hơn). Đếm trùng: hai tầng cùng đế cần hai đế
  const left = new Map<string, number>(), use: { k: StockKey; i: number }[] = []; let quick = 0;
  partsOfBuild(b).forEach(p => {
    const id = p.k + ":" + p.i, have = left.get(id) ?? stockOf(p.k, p.i);
    if (have > 0) { left.set(id, have - 1); use.push(p); } else quick += quickPrice(p.k, p.i);
  });
  if (quick > S.coins) return { ok: false, msg: `Hết nguyên liệu và không đủ ${quick} xu để nhập nhanh` };
  spend("quick", quick); sh.quickCost += quick;
  use.forEach(p => { S.stock[p.k][p.i]--; sh.ingUsed += unitCost(p.k, p.i); });
  return { ...deliver(sh, idx, false), quick };
}

/* Giao bánh cho khách ở ghế idx (người chơi hoặc bé thợ bánh), tính thưởng */
function deliver(sh: Shift, idx: number, byStaff: boolean): Extract<ServeResult, { ok: true }> {
  const quick = 0;
  const c = sh.seats[idx]!; c.gone = true;
  const f = c.pat / c.max, stars = f > 0.55 ? 3 : f > 0.3 ? 2 : 1, mult = coinMult();
  const price = Math.round(c.r.price * (1 + fx("price")) * (1 + (c.perkPrice ?? 0))) * mult;
  const tip = Math.round(c.r.price * f * 0.6 * (1 + fx("tip")) * comfortTip(c.seatLv ?? 1) * (1 + (c.perkTip ?? 0))) * mult;
  // Thưởng nhớ bài: chủ tiệm giao đúng mà không xem công thức
  const bonus = !byStaff && !sh.peek ? Math.round(price * 0.5) : 0;
  // Thưởng bánh nhiều tầng: chủ tiệm tự tay làm thì thêm (số tầng − 1) × 20% giá bánh; bé làm hộ thì không có
  const tierBonus = !byStaff && tiersOf(c.r) > 1 ? Math.round(c.r.price * TIER_HAND_BONUS * (tiersOf(c.r) - 1)) : 0;
  earn("sales", price); earn("tip", tip); earn("memo", bonus); earn("tier", tierBonus); S.xp += 4 + stars * 2 + (bonus ? 2 : 0) + (tierBonus ? 2 : 0); S.served++;
  sh.coins += price; sh.tips += tip; sh.bonus += bonus; sh.tierBonus += tierBonus; sh.served++; sh.stars.push(stars);
  if (bonus) sh.memo++;
  // combo (chỉ tính bánh chủ tiệm tự làm): Hoàn hảo = giao nhanh 3 sao; 1-2 sao không thêm cũng không đứt
  const perfect = !byStaff && stars === 3; let comboAdd = 0;
  if (perfect) { sh.combo++; sh.bestCombo = Math.max(sh.bestCombo, sh.combo); comboAdd = Math.round(price * COMBO_PCT * Math.min(sh.combo, COMBO_CAP)); sh.comboBank += comboAdd; }
  if (byStaff) sh.helped++;
  if (!byStaff) release(sh);
  S.daily.served++; S.daily.earned += price + tip; if (c.r.id === S.daily.featId) S.daily.feat++;
  addReview(c, stars); save();
  return { ok: true, idx, c, stars, price, tip, quick, byStaff, bonus, tierBonus, perfect, combo: sh.combo, comboAdd };
}

export function leaveCustomer(sh: Shift, i: number) {
  const c = sh.seats[i]!; c.gone = true; sh.left++; sh.stars.push(0); S.daily.angry++;
  breakCombo(sh);
  addReview(c, 0); save();
}

/* Combo: mỗi bánh Hoàn hảo liên tiếp cộng dồn thưởng (trả lúc hết ca). Khách giận bỏ về hoặc giao sai bánh thì đứt chuỗi và mất một nửa thưởng đã dồn
   (chỉ phạt phần thưởng thêm, tiền bánh và tip vẫn nguyên, để game vẫn thư giãn). Trả về số xu vừa mất. */
export const COMBO_PCT = 0.08, COMBO_CAP = 6, COMBO_LOSS = 0.5;
export function breakCombo(sh: Shift): number {
  const had = sh.combo >= 2; sh.combo = 0;
  if (!had) return 0;
  const lost = Math.floor(sh.comboBank * COMBO_LOSS); sh.comboBank -= lost; sh.comboLost += lost; return lost;
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
  else txt = pick(GUEST_LINES[s]);
  S.reviews.unshift({ who: c.who, look: c.look, s: c.him ? Math.max(s, 3) : s, txt, love: !!c.him });
  S.reviews = S.reviews.slice(0, 30);
}

/* Mở ca: các bé đi làm ăn lương (đồ ăn) trước, giá trị đồ ăn tính vào chi phí ca */
export function beginShift() {
  const pay = payCrew(), sh = createShift();
  sh.wages = pay.cost; sh.working = pay.fed.map(x => x.id); pay.fed.forEach(x => { sh.meals[x.id] = x.meal; });
  return { sh, pay };
}
/* Hết ca: tính lãi */
export function finishShift(sh: Shift) {
  sh.goalCoins = sh.goals.filter(g => goalDone(sh, g)).reduce((a, g) => a + g.reward, 0);
  earn("goal", sh.goalCoins); S.shifts++;
  if (sh.goals.every(g => goalDone(sh, g))) { sh.ticket = true; addTickets(1); }
  sh.bondUp = addBond();
  if (sh.comboBank > 0) { earn("combo", sh.comboBank); sh.comboPaid = sh.comboBank; }
  const led = ledger(sh); S.earned += led.revenue;
  note(`Ca ${S.shifts} · tiền bán bánh`, led.revenue); note(`Ca ${S.shifts} · nhập nhanh giữa ca`, -led.quick);
  save();
  return led;
}
export const ledger = (sh: Shift) => {
  const revenue = sh.coins + sh.tips + sh.bonus + sh.tierBonus + sh.goalCoins + sh.comboPaid;
  return { revenue, ingUsed: sh.ingUsed, quick: sh.quickCost, wages: sh.wages, profit: revenue - sh.ingUsed - sh.quickCost - sh.wages };
};

export function summary(sh: Shift) {
  const total = sh.served + sh.left, happy = total ? sh.served / total : 0;
  return { total, stars: happy >= 0.9 ? 3 : happy >= 0.6 ? 2 : 1 };
}

/* ===== Mục tiêu của ca: xem ở màn Chuẩn bị, thưởng xu lúc hết ca ===== */
export interface ShiftGoal { id: "serve" | "memo" | "calm"; n: number; reward: number }
export const shiftGoals = (total = expectedCustomers()): ShiftGoal[] => [
  { id: "serve", n: Math.max(3, Math.ceil(total * 0.8)), reward: 40 },
  { id: "memo", n: 3, reward: 30 },
  { id: "calm", n: 0, reward: 50 }
];
export const goalText = (g: ShiftGoal) => g.id === "serve" ? `Phục vụ ${g.n} khách` : g.id === "memo" ? `Tự nhớ ${g.n} công thức` : "Không để khách nào giận";
export const goalProgress = (sh: Shift, g: ShiftGoal) => g.id === "serve" ? sh.served : g.id === "memo" ? sh.memo : sh.left;
export const goalDone = (sh: Shift, g: ShiftGoal) => g.id === "calm" ? sh.left === 0 && sh.served > 0 : goalProgress(sh, g) >= g.n;
