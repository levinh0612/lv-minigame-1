/* Màn Chơi và màn Kết quả: phần hiển thị. Luật chơi nằm ở engine/shift.ts.
   Các hàm *HTML là hàm thuần (chỉ đọc trạng thái, trả về chuỗi) để Storybook dùng lại. */
import { Sound, sfx } from "../../audio/sound";
import type { PetId } from "../../content/couple";
import { CATS, KEYS, LABELS, PETS, RECIPES, STAFF, STOCK_KEYS, type PartKey, type StockKey } from "../../content/game";
import { daysTogether } from "../../engine/dates";
import { REFILL, fame, quickBuy, quickPrice, refill, refillCost, stockOf } from "../../engine/economy";
import { giftReady, lvl, xpFor } from "../../engine/progress";
import {
  beginShift, emptyBuild, finishShift, goalDone, isComplete, isOver, ledger, mineIdx, needOf, peek, remaining, serve, summary, take, tick,
  type Customer, type ServeResult, type Shift
} from "../../engine/shift";
import { S, petName, save } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { cakeSVG, charSVG, critterSVG, ingSVG } from "../art";
import { $, bump, coinPill, esc, floatText, haptic, toast } from "../dom";
import { himNote } from "../modals";
import { cloudSave } from "../../net/cloud";
import { navigate } from "../router";

export let SH: Shift | null = null;
let raf = 0, lastT = 0, leftShown = -1, drop: PartKey | null = null;
type Result = { sh: Shift; lv: number; led: ReturnType<typeof ledger> };
let result: Result | null = null;

// phần tử DOM của từng khách trong hàng, cache để vòng lặp không phải tìm lại mỗi khung hình
interface SlotView { el: HTMLElement; bar: HTMLElement; art: HTMLElement; cls: string }
const views: (SlotView | null)[] = [];

/* ---------- Giữ màn hình sáng trong ca (nếu trình duyệt cho phép) ---------- */
let wake: { release(): Promise<void> } | null = null;
async function keepAwake(on: boolean) {
  try {
    if (on && !wake) wake = await (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock?.request("screen") ?? null;
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { wake = null; }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && SH) { wake = null; void keepAwake(true); } });

export function startShift() {
  const { sh, pay } = beginShift(); SH = sh; result = null;
  navigate("/choi", true);
  if (pay.hungry.length) setTimeout(() => toast(`${pay.hungry.map(petName).join(", ")} đói nên nghỉ ca này. Nhớ mua đồ ăn nha!`), 400);
  sfx("open"); Sound.play("shift"); void keepAwake(true);
}
export const hasResult = () => !!result;
export function resume() { if (SH) { SH.paused = false; lastT = performance.now(); } }
export function pause() { if (SH) SH.paused = true; }

function loop(now: number) {
  if (!SH) return;
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (!SH.paused) {
    const ev = tick(SH, dt);
    if (ev.spawned >= 0) { renderSlot(ev.spawned, true); sfx("bell"); }
    ev.left.forEach(onLeave);
    ev.claimed.forEach(b => renderSlot(b.seat));
    ev.baked.forEach(x => showServed(x.res, x.baker.id));
    ev.restock.forEach(r => toast(`${petName(r.id)} nhập nhanh ${r.what}`));
    if (ev.assigned >= 0) { sheetOpen = true; renderTicket(); sfx("click"); }
    if (ev.claimed.length || ev.restock.length || ev.baked.length) { renderCrew(); refreshCoins(false); }
    SH.seats.forEach((c, i) => { if (c && !c.gone) updatePatience(c, i); });
    updateBaking();
    const left = remaining(SH);
    if (leftShown !== left) { leftShown = left; const e = $("#shLeft"); if (e) e.textContent = `Ca ${S.shifts + 1} · còn ${left} khách`; }
    if (isOver(SH)) return endShift();
  }
  raf = requestAnimationFrame(loop);
}

function updatePatience(c: Customer, i: number) {
  const v = views[i]; if (!v) return;
  const f = Math.max(0, c.pat / c.max), cls = f < 0.3 ? "low" : f < 0.6 ? "mid" : "";
  v.bar.style.transform = `scaleX(${f.toFixed(3)})`;
  if (v.cls === cls) return;
  v.cls = cls; v.bar.style.background = cls === "low" ? "#FF6F91" : cls === "mid" ? "#FFD66B" : "#8FD9B6";
  v.el.classList.toggle("low", cls === "low");
  const mood = cls === "low" ? "impatient" : "happy";
  if (c.mood !== mood && !(mood === "happy" && !c.mood)) { c.mood = mood; v.art.innerHTML = charSVG(c.look, mood, faceSize(SH!)); }
}
/* tiến độ các bé thợ bánh: dưới mặt khách và ở quầy */
function updateBaking() {
  SH!.bakers.forEach(b => {
    const pct = Math.min(100, Math.round(b.done / b.need * 100));
    document.querySelectorAll<HTMLElement>(`[data-bake="${b.id}"]`).forEach(el => {
      const i = el.querySelector("i"), t = el.querySelector("span");
      if (i) i.style.width = pct + "%";
      if (t) t.textContent = pct + "%";
    });
  });
}

/* ================= HTML thuần ================= */
const faceSize = (sh: Shift) => ({ 3: 70, 4: 60, 5: 52, 6: 46 } as Record<number, number>)[sh.seats.length] ?? 46;
const cakeOf = (c: Customer, size: number) => cakeSVG({ base: c.r.base, cream: c.r.cream, top: c.r.top, sweet: c.sweet }, { size, still: true });
const LV_BADGE = `<svg width="44" height="44" viewBox="0 0 46 46" aria-hidden="true"><path d="M23 1 L28 5.5 L34.5 4 L36.5 10.5 L42.5 13 L41 19.5 L45 25 L40 29.5 L40.5 36 L34 37 L30.5 43 L24.5 40.5 L18 43 L15 37 L8.5 36 L9 29.5 L4 25 L8 19.5 L6.5 13 L12.5 10.5 L14.5 4 L21 5.5 Z" fill="#FF7FA1" stroke="#E0567A" stroke-width="2" stroke-linejoin="round"/><circle cx="23" cy="23" r="13.5" fill="#FFF3F6"/></svg>`;
const BOX = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A3438" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 8 L12 3.5 L21 8 V17 L12 21.5 L3 17 Z" fill="#F6D59A"/><path d="M3 8 L12 12.5 L21 8 M12 12.5 V21.5"/><path d="M7.5 5.8 L16.5 10.3" stroke-width="1.8"/></svg>`;
const CHEV = (up: boolean) => `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="${up ? "M3 9 L7 5 L11 9" : "M3 5 L7 9 L11 5"}" stroke="#C07A8C" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const TICK = `<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5 L5 9 L10 3" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const lowCount = () => STOCK_KEYS.reduce((a, k) => a + CATS[k].filter((_, i) => stockOf(k, i) <= 2).length, 0);

/* một khách trong hàng đợi: hình bánh đã gọi (không ghi nguyên liệu), mặt, kiên nhẫn, ai đang làm */
export function slotHTML(sh: Shift, i: number, state: "" | "low" | "ok" = "") {
  const c = sh.seats[i]; if (!c) return "";
  const f = c.pat / c.max, S2 = faceSize(sh), mine = mineIdx(sh) === i;
  const b = c.by ? sh.bakers.find(x => x.id === c.by) : null, pct = b ? Math.round(b.done / b.need * 100) : 0;
  const bub = state === "ok" ? `<div class="bub ok">+${c.r.price}<small>xu</small></div>` : `<div class="bub">${cakeOf(c, S2 * 0.72)}</div>`;
  const who = c.by ? `<div class="who by" data-bake="${c.by}">${critterSVG({ ...PETS[c.by], ledge: false, paws: false }, 20)}<span>${pct}%</span><i style="width:${pct}%"></i></div>`
    : mine ? `<div class="who me">Bạn</div>` : `<div class="who"></div>`;
  return `${bub}<div class="face"><span class="fc">${charSVG(c.look, state === "ok" ? "love" : state === "low" ? "impatient" : c.mood || "happy", S2)}</span><div class="burst"></div></div>
    <div class="pat"><i style="transform:scaleX(${f.toFixed(3)});background:${f < 0.3 ? "#FF6F91" : f < 0.6 ? "#FFD66B" : "#8FD9B6"}"></i></div>
    <div class="nm">${c.him ? `<span class="hrt">♥︎</span>` : ""}${esc(c.who)}</div>${who}`;
}
const slotClass = (sh: Shift, i: number, extra = "") => { const c = sh.seats[i]; return "slot" + (c ? "" : " empty") + (c && mineIdx(sh) === i ? " mine" : "") + (c?.by ? " taken" : "") + (extra ? " " + extra : ""); };
const slotLabel = (sh: Shift, i: number) => { const c = sh.seats[i]; return !c ? "Bàn trống" : c.by ? `${petName(c.by)} đang làm cho ${c.who}` : `Nhận đơn của ${c.who}`; };
const slotBtn = (sh: Shift, i: number, st: "" | "low" | "ok" = "") =>
  `<button class="${slotClass(sh, i, st === "low" ? "low" : "")}" id="seat${i}" data-seat="${i}" aria-label="${esc(slotLabel(sh, i))}">${slotHTML(sh, i, st)}</button>`;

/* dải thợ bánh ở quầy: mỗi bé đang làm cho ai, bao nhiêu phần trăm, hoặc thiếu gì */
export function crewHTML(sh: Shift) {
  const ids = STAFF.map(d => d.id).filter(id => sh.working.includes(id));
  if (!ids.length) return `<div class="crew none">Hôm nay các bé nghỉ, mình tự làm hết nha</div>`;
  return `<div class="crew" style="--n:${ids.length}">${ids.map(id => {
    const b = sh.bakers.find(x => x.id === id), c = b ? sh.seats[b.seat] : null, pct = b ? Math.round(b.done / b.need * 100) : 0;
    const sub = b && c ? `<small>→ ${esc(c.who)}</small><div class="pb" data-bake="${id}"><i style="width:${pct}%"></i></div>`
      : sh.lack[id] ? `<small class="bad">Thiếu ${esc(sh.lack[id]!)}</small>` : `<small>Đang nghỉ</small>`;
    return `<div class="cm" data-crew="${id}">${critterSVG({ ...PETS[id], mood: b ? "happy" : sh.lack[id] ? "impatient" : "open", ledge: false, paws: false }, 30)}<div class="ct"><b>${esc(petName(id))}</b>${sub}</div></div>`;
  }).join("")}</div>`;
}

const toggleHTML = () => `<button class="toggle ${S.autoTake ? "on" : ""}" data-act="auto" role="switch" aria-checked="${S.autoTake}"><span>Tự nhận đơn</span><i></i></button>`;
function idleHTML(sh: Shift) {
  const busy = sh.seats.some(x => x && !x.gone && !x.by), any = sh.seats.some(x => x && !x.gone);
  return `<div class="plate0"></div><b>Đang rảnh tay</b>
    <small class="${busy ? "hint" : ""}">${busy ? "↑ Chạm vào khách ở hàng đợi để nhận đơn" : any ? "Các bé đang lo hết đơn rồi" : "Chờ khách vào tiệm…"}</small>${toggleHTML()}`;
}

/* nút nguyên liệu: icon + tên + số trong kho; đúng/sai chỉ hiện khi đã xem công thức */
function ingState(sh: Shift, k: PartKey, i: number) {
  const b = sh.build, m = mineIdx(sh), c = m >= 0 ? sh.seats[m] : null, n = c && sh.peek ? needOf(c) : null;
  const on = b[k] === i, st = !on ? "" : !n ? "on" : n[k] === i ? "ok" : "bad";
  const q = k === "sweet" ? -1 : stockOf(k as StockKey, i), out = q === 0 && !on;
  return { cls: "ing" + (st ? " " + st : "") + (out ? " out" : ""), q, out, low: q >= 0 && q <= 2 };
}
const ingHTML = (sh: Shift, k: PartKey, i: number) => {
  const s = ingState(sh, k, i);
  return `<button class="${s.cls}" data-ing="${k}:${i}">${ingSVG(k, i, 24, s.out)}<span class="cn">${CATS[k][i][0]}</span>${
    s.out ? `<em class="tag">+${quickPrice(k as StockKey, i)} xu</em>` : s.q > 0 ? `<b class="q ${s.low ? "low" : ""}">${s.q}</b>` : ""}${s.cls.includes(" ok") ? `<em class="ck">${TICK}</em>` : ""}</button>`;
};
export const rowsHTML = (sh: Shift) => KEYS.map(k => `<div class="irow"><span>${LABELS[k]}</span><div class="g3">${CATS[k].map((_, i) => ingHTML(sh, k, i)).join("")}</div></div>`).join("");

/* phần đầu phiếu: Đơn của ai, tên bánh, Xem công thức hoặc các nguyên liệu */
function oinfoHTML(sh: Shift) {
  const m = mineIdx(sh), c = m >= 0 ? sh.seats[m] : null; if (!c) return "";
  const n = needOf(c), b = sh.build;
  const chips = KEYS.map(k => `<span class="${b[k] === n[k] ? "ok" : ""}">${ingSVG(k, n[k], 18)}${CATS[k][n[k]][0]}</span>`).join("");
  return `<div class="or1"><small>Đơn của ${esc(c.who)}</small>${toggleHTML()}<button class="x" data-act="sheet" aria-label="Thu phiếu xuống">${CHEV(false)}</button></div>
    <b class="rn">${esc(c.r.n)}</b>
    ${sh.peek ? `<div class="chips">${chips}</div>` : `<div class="peekrow"><button class="peek" data-act="peek">Xem công thức</button><span class="bonus">Tự nhớ<br>+50% thưởng</span></div>`}`;
}
const picked = (sh: Shift) => KEYS.filter(k => sh.build[k] != null).length;
const giveLabel = (sh: Shift) => isComplete(sh.build) ? (sh.peek ? "Giao bánh" : "Giao bánh · +50%") : `Chọn đủ 4 món (${picked(sh)}/4)`;
function miniHTML(sh: Shift) {
  const m = mineIdx(sh), c = m >= 0 ? sh.seats[m] : null; if (!c) return "";
  return `<span class="mc">${cakeSVG(sh.build, { size: 46, still: true })}</span><span class="mt"><b>Đang làm cho ${esc(c.who)}</b><small>${picked(sh)}/4 món · chạm để mở</small></span>${CHEV(true)}`;
}

/* kho giữa ca: chọn món để nhập đầy, món sắp hết được chọn sẵn */
let ticks = new Set<string>();
const autoTicks = () => new Set(STOCK_KEYS.flatMap(k => CATS[k].map((_, i) => k + ":" + i).filter((_, i) => stockOf(k, i) <= 2)));
export function stockHTML() {
  let cost = 0, n = 0;
  const groups = STOCK_KEYS.map(k => `<div class="sg"><small>${LABELS[k]}</small><div class="g3">${CATS[k].map((x, i) => {
    const id = k + ":" + i, v = stockOf(k, i), on = ticks.has(id), low = v <= 2;
    if (on) { cost += refillCost(k, i); n++; }
    return `<button class="sk ${on ? "on" : ""}" data-tick="${id}" aria-pressed="${on}"><span class="box">${on ? TICK : ""}</span>${ingSVG(k, i, 34)}<span class="sn">${x[0]}</span>
      <span class="bar"><i style="width:${Math.min(100, v / REFILL * 100)}%;background:${v === 0 ? "#FF6F91" : low ? "#FFC94D" : "#8FD9B6"}"></i></span><span class="cnt ${v === 0 ? "out" : low ? "low" : ""}">${v === 0 ? "Hết hàng" : `${v}/${REFILL}`}</span></button>`;
  }).join("")}</div></div>`).join("");
  const all = STOCK_KEYS.every(k => CATS[k].every((_, i) => ticks.has(k + ":" + i)));
  return `<div class="grab"></div><div class="shd"><div><b>Kho nguyên liệu</b><small>Đã chọn sẵn món sắp hết (còn 2 trở xuống)</small></div><button class="x" data-act="stock" aria-label="Đóng kho">✕</button></div>
    <div class="sgs">${groups}</div>
    <div class="sft"><button class="b3 w" data-act="tickall">${all ? "Bỏ chọn" : "Chọn hết"}</button><button class="b3" data-act="refill" ${n && cost <= S.coins ? "" : "disabled"}>${!n ? "Chưa chọn món nào" : cost > S.coins ? `Thiếu xu · ${cost} xu` : `Nhập hàng · ${cost} xu`}</button></div>`;
}

export function playHTML(sh: Shift, opts: { done?: boolean; states?: ("" | "low" | "ok")[]; sheet?: boolean; stock?: boolean } = {}) {
  const L = lvl(), cur = S.xp - xpFor(L), need = xpFor(L + 1) - xpFor(L), f = fame(), m = mineIdx(sh), open = m >= 0 && (opts.sheet ?? sheetOpen);
  if (opts.stock) ticks = autoTicks();
  const low = lowCount();
  return `<div class="scr play ${m >= 0 ? "has" : "free"} ${open ? "up" : ""}" id="play">
    <div class="ptop">
      <div class="lvbadge">${LV_BADGE}<b>Lv${L}</b></div>
      <div class="pbar"><small id="shLeft">Ca ${S.shifts + 1} · còn ${remaining(sh)} khách</small><div class="track"><i id="xpBar" style="width:${Math.min(100, cur / need * 100)}%"></i></div></div>
      ${coinPill(true, "shCoins")}
      <button class="rbtn box" data-act="stock" aria-label="Kho nguyên liệu">${BOX}<span class="dot" id="lowDot" ${low ? "" : "hidden"}>${low}</span></button>
      <button class="rbtn" data-act="pause" aria-label="Tạm dừng">❚❚</button>
    </div>
    <div class="qhead"><b>Hàng đợi</b><span>✦ ${f.n} · ${sh.seats.length} bàn</span></div>
    <div class="queue" style="--n:${sh.seats.length}">${sh.seats.map((_, i) => slotBtn(sh, i, opts.states?.[i] ?? "")).join("")}</div>
    <div class="band"><div id="crewBox">${crewHTML(sh)}</div><div class="idle" id="idle">${idleHTML(sh)}</div></div>
    <div class="osheet" id="osheet">
      <div class="oh" id="ohead"><div class="grab"></div><div class="ohr"><div class="ocake" id="cake">${cakeSVG(sh.build, { size: 82, done: opts.done })}</div><div class="oinfo" id="oinfo">${oinfoHTML(sh)}</div></div></div>
      <div class="rows" id="rows">${rowsHTML(sh)}</div>
      <button class="b3 give ${isComplete(sh.build) ? "" : "off"}" id="give" data-act="serve">${giveLabel(sh)}</button>
    </div>
    <button class="mini" id="mini" data-act="sheet">${miniHTML(sh)}</button>
    <button class="scrim ${opts.stock ? "on" : ""}" id="scrim" data-act="stock" aria-label="Đóng kho" tabindex="-1"></button>
    <div class="ssheet ${opts.stock ? "on" : ""}" id="ssheet">${opts.stock ? stockHTML() : ""}</div>
  </div>`;
}

/* ================= Cập nhật DOM trong ca ================= */
let sheetOpen = true;
export function renderPlay() {
  if (!SH) return;
  leftShown = -1; views.length = 0;
  $("#app")!.innerHTML = playHTML(SH);
  SH.seats.forEach((_, i) => renderSlot(i));
  bindSheetDrag(); fitSheet();
  lastT = performance.now();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function renderSlot(i: number, enter = false) {
  const el = $("#seat" + i); if (!el || !SH) return;
  const c = SH.seats[i];
  el.className = slotClass(SH, i, enter ? "enter" : "");
  el.innerHTML = slotHTML(SH, i);
  el.setAttribute("aria-label", slotLabel(SH, i));
  views[i] = c ? { el, bar: el.querySelector<HTMLElement>(".pat i")!, art: el.querySelector<HTMLElement>(".fc")!, cls: "" } : null;
}
const renderCrew = () => { const b = $("#crewBox"); if (b && SH) b.innerHTML = crewHTML(SH); };
/* phiếu order + đánh dấu khách của mình + nút nguyên liệu */
export function renderTicket() {
  const root = $("#play"); if (!SH || !root) return;
  const m = mineIdx(SH);
  root.classList.toggle("has", m >= 0); root.classList.toggle("free", m < 0); root.classList.toggle("up", m >= 0 && sheetOpen);
  $("#oinfo")!.innerHTML = oinfoHTML(SH);
  $("#idle")!.innerHTML = idleHTML(SH);
  $("#mini")!.innerHTML = miniHTML(SH);
  $("#rows")!.innerHTML = rowsHTML(SH);
  const g = $("#give")!; g.textContent = giveLabel(SH); g.classList.toggle("off", !isComplete(SH.build));
  SH.seats.forEach((c, i) => {
    const el = $("#seat" + i); if (!el || !c || c.gone) return;
    const was = el.classList.contains("mine"), now = m === i;
    if (was !== now) { el.classList.toggle("mine", now); const w = el.querySelector(".who"); if (w && !c.by) w.outerHTML = now ? `<div class="who me">Bạn</div>` : `<div class="who"></div>`; }
    el.classList.toggle("taken", !!c.by);
  });
}
function renderBuild(done = false) {
  if (!SH) return;
  $("#cake")!.innerHTML = cakeSVG(SH.build, { size: 82, done, drop });
  drop = null;
  renderTicket();
}
const refreshCoins = (pulse = true) => {
  const cp = $("#shCoins"); if (cp) { cp.querySelector("span:last-child")!.textContent = fmtN(S.coins); if (pulse) bump(cp, "pulse"); }
  const d = $("#lowDot"), n = lowCount(); if (d) { d.textContent = String(n); d.hidden = !n; }
};
export function setSheet(open: boolean) { sheetOpen = open; renderTicket(); sfx(open ? "tap" : "untap"); }
export const toggleSheet = () => setSheet(!sheetOpen);
/* phiếu order không được che hàng đợi */
function fitSheet() {
  const p = $("#play"), q = document.querySelector(".queue"); if (!p || !q) return;
  p.style.setProperty("--qb", Math.round(q.getBoundingClientRect().bottom - p.getBoundingClientRect().top + 8) + "px");
}
window.addEventListener("resize", () => { if (SH) fitSheet(); });
/* kéo phiếu xuống để thu gọn */
function bindSheetDrag() {
  const h = $("#ohead"), sh = $("#osheet"); if (!h || !sh) return;
  let y0: number | null = null, dy = 0;
  h.addEventListener("pointerdown", e => { if ((e.target as HTMLElement).closest("button")) return; y0 = e.clientY; dy = 0; h.setPointerCapture(e.pointerId); sh.style.transition = "none"; });
  h.addEventListener("pointermove", e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = `translateY(${dy}px)`; });
  const end = () => { if (y0 == null) return; y0 = null; sh.style.transition = ""; sh.style.transform = ""; if (dy > 80) setSheet(false); };
  h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end);
}

/* kho giữa ca */
export function openStock(on: boolean) {
  const ss = $("#ssheet"), sc = $("#scrim"); if (!ss || !sc) return;
  if (on) { ticks = autoTicks(); ss.innerHTML = stockHTML(); if (SH) SH.paused = true; }
  else if (SH) { SH.paused = false; lastT = performance.now(); }
  ss.classList.toggle("on", on); sc.classList.toggle("on", on); sfx(on ? "tap" : "untap");
}
export function tickStock(id: string) { ticks.has(id) ? ticks.delete(id) : ticks.add(id); $("#ssheet")!.innerHTML = stockHTML(); sfx("tap"); }
export function tickAll() {
  const all = STOCK_KEYS.flatMap(k => CATS[k].map((_, i) => k + ":" + i));
  ticks = all.every(id => ticks.has(id)) ? new Set() : new Set(all);
  $("#ssheet")!.innerHTML = stockHTML(); sfx("tap");
}
export function doRefill() {
  const items = [...ticks].map(id => { const [k, i] = id.split(":"); return { k: k as StockKey, i: +i }; });
  const cost = refill(items); if (!cost) return;
  if (SH) { SH.quickCost += cost; SH.lack = {}; }
  sfx("coin"); toast(`Đã nhập hàng · ${cost} xu`); refreshCoins(); renderTicket(); renderCrew(); openStock(false);
}

export function pickIngredient(k: PartKey, i: number) {
  if (!SH) return;
  if (mineIdx(SH) < 0) { sfx("untap"); return toast("Chạm vào một khách để nhận đơn trước nha"); }
  const add = SH.build[k] !== i;
  if (add && k !== "sweet" && stockOf(k, i) <= 0) {
    const p = quickPrice(k, i);
    if (!quickBuy(k, i)) { sfx("wrong"); haptic(40); return toast(`Hết ${CATS[k][i][0]} và không đủ ${p} xu để nhập nhanh`); }
    SH.quickCost += p; refreshCoins(); toast(`Nhập nhanh 1 ${CATS[k][i][0]} · ${p} xu`);
  }
  SH.build[k] = add ? i : null; drop = add && k !== "sweet" ? k : null;
  renderBuild(); sfx(add ? "tap" : "untap"); haptic(8);
}
/* chạm vào khách: nhận đơn đó (đơn các bé đã nhận thì không được) */
export function selectSeat(i: number) {
  if (!SH) return;
  const c = SH.seats[i];
  if (c?.by) { sfx("untap"); return toast(`${petName(c.by)} đang làm đơn này rồi`); }
  if (mineIdx(SH) === i) return setSheet(true);
  if (take(SH, i)) { SH.build = emptyBuild(); sheetOpen = true; renderBuild(); sfx("click"); }
}
export function doPeek() { if (!SH || mineIdx(SH) < 0) return; peek(SH); renderTicket(); sfx("tap"); }
export function toggleAuto() {
  S.autoTake = !S.autoTake; save();
  if (SH) renderTicket();
  toast(S.autoTake ? "Tự nhận đơn: bật. Làm xong sẽ được gán đơn mới" : "Rảnh tay: các bé nhận hết, chạm vào khách để tự làm");
}

export function doServe() {
  if (!SH) return;
  if (!isComplete(SH.build)) { sfx("untap"); return toast(`Chọn đủ Đế, Kem, Topping và Độ ngọt nha (${picked(SH)}/4)`); }
  const res = serve(SH);
  if (!res.ok) { sfx("wrong"); haptic([60, 40, 60]); renderTicket(); bump($("#cake"), "shake"); return toast(res.msg); }
  showServed(res);
  renderBuild(true);
  if (res.bonus) toast(`Nhớ công thức giỏi quá! +${res.bonus} xu thưởng`);
  const sh = SH;
  setTimeout(() => { if (SH !== sh) return; sh.build = emptyBuild(); if (mineIdx(sh) >= 0) sheetOpen = true; renderBuild(); }, 900);
}

/* hiệu ứng giao bánh (chủ tiệm hoặc bé thợ bánh): bong bóng thành xu, khách thả tim, bắn tim */
function showServed(res: Extract<ServeResult, { ok: true }>, by?: PetId) {
  const { idx, c, price, tip, bonus } = res, v = views[idx];
  if (!v || !SH) return;
  v.el.querySelector(".bub")!.outerHTML = `<div class="bub ok">+${price + tip + bonus}<small>${by ? esc(petName(by)) : "xu"}</small></div>`;
  v.art.innerHTML = charSVG(c.look, "love", faceSize(SH));
  v.el.classList.remove("low", "taken", "mine");
  v.el.querySelector(".burst")!.innerHTML = Array.from({ length: 14 }, (_, i) => {
    const a = i / 14 * Math.PI * 2, d = 45 + (i % 3) * 18;
    return `<i style="font-size:${13 + (i % 3) * 6}px;color:${["#FF8FAB", "#FFC94D", "#8FD9B6"][i % 3]};--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d).toFixed(1)}px">${i % 2 ? "♥︎" : "✦"}</i>`;
  }).join("");
  const r = v.el.getBoundingClientRect(); floatText(r.left + r.width / 2, r.top + 40, "+" + (price + tip + bonus));
  sfx("coin"); haptic(by ? 10 : 25); refreshCoins();
  if (by) { renderCrew(); bump($(`[data-crew="${by}"]`), "squish"); }
  const L = lvl(); $("#xpBar")!.style.width = Math.min(100, (S.xp - xpFor(L)) / (xpFor(L + 1) - xpFor(L)) * 100) + "%";
  renderTicket();
  const sh = SH;
  setTimeout(() => {
    if (SH !== sh) return; v.el.classList.add("bye");
    setTimeout(() => { if (SH !== sh) return; sh.seats[idx] = null; renderSlot(idx); }, 450);
  }, 1200);
  if (c.him && !by) setTimeout(() => { if (SH === sh) { pause(); himNote(c); } }, 700);
}

function onLeave(i: number) {
  const c = SH!.seats[i]!, v = views[i];
  if (v) { v.art.innerHTML = charSVG(c.look, "impatient", faceSize(SH!)); v.el.classList.add("bye"); }
  sfx("leave"); haptic(30); renderCrew(); renderTicket();
  const sh = SH; setTimeout(() => { if (SH !== sh) return; sh!.seats[i] = null; renderSlot(i); }, 500);
}

export function endShift() {
  if (!SH) return;
  cancelAnimationFrame(raf); void keepAwake(false);
  const sh = SH, led = finishShift(sh);
  result = { sh, lv: lvl(), led }; SH = null;
  navigate("/ket-qua", true);
  sfx(result.lv > sh.lv0 ? "level" : "end");
  void cloudSave();
  Sound.play("home");
}

/* ================= Màn Kết quả: tấm bảng giơ lên ================= */
const STAR = (on: boolean, w: number, y: number, r: number, d: number) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 40 40" style="transform:translateY(${y}px) rotate(${r}deg);animation-delay:${d}s" aria-hidden="true"><path d="M20 3.5 L24.6 13.4 L35.5 14.7 L27.4 22.1 L29.6 32.9 L20 27.5 L10.4 32.9 L12.6 22.1 L4.5 14.7 L15.4 13.4 Z" fill="${on ? "#FFC53D" : "#FFFFFF"}" stroke="${on ? "#E08A1E" : "#3E3A4A"}" stroke-width="2.6" stroke-linejoin="round"/>${on ? `<path d="M20 9 L22.6 14.8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>` : ""}</svg>`;
const FACE = (happy: boolean) => `<svg class="sface" width="74" height="74" viewBox="0 0 74 74" aria-hidden="true"><circle cx="37" cy="37" r="33" fill="${happy ? "#FFD84D" : "#F25C5C"}" stroke="#3E3A4A" stroke-width="3"/><path d="M18 24 Q24 20 30 25" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".6"/>${happy
  ? `<path d="M22 34 Q27 27 32 34 M42 34 Q47 27 52 34" stroke="#3E3A4A" stroke-width="3.2" stroke-linecap="round" fill="none"/><path d="M19 42 Q37 44 55 42 Q53 60 37 60 Q21 60 19 42 Z" fill="#fff" stroke="#3E3A4A" stroke-width="3" stroke-linejoin="round"/><path d="M24 52 Q37 56 50 52" stroke="#FF8FAB" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="16" cy="44" rx="4.5" ry="3" fill="#FF9FB6" opacity=".8"/><ellipse cx="58" cy="44" rx="4.5" ry="3" fill="#FF9FB6" opacity=".8"/>`
  : `<circle cx="27" cy="33" r="3.8" fill="#3E3A4A"/><circle cx="47" cy="33" r="3.8" fill="#3E3A4A"/><path d="M21 24 L31 27 M53 24 L43 27" stroke="#3E3A4A" stroke-width="3" stroke-linecap="round"/><path d="M26 54 Q37 44 48 54" stroke="#3E3A4A" stroke-width="3.2" stroke-linecap="round" fill="none"/><path d="M52 40 C49 45 49 49 52 49 C55 49 55 45 52 40 Z" fill="#9FD8F5" stroke="#3E3A4A" stroke-width="2"/>`}</svg>`;
const SIGN = [
  null,
  { bg: "#F58E8E", sh: "#D96A6A", r: 4, page: "#F2E9EC", t: "Cố lên nha!" },
  { bg: "#9FE0C0", sh: "#62BD93", r: -3, page: "#E3F6EC", t: "Giỏi lắm!" },
  { bg: "#8FCFF2", sh: "#5FAED8", r: -4, page: "#CFEAF2", t: "Tuyệt vời!" }
];
export function resultHTML(r: Result | null = result) {
  if (!r) return "";
  const { sh, lv, led } = r, { total, stars } = summary(sh), sg = SIGN[stars]!, good = stars >= 2;
  const newR = RECIPES.filter(x => x.lv > sh.lv0 && x.lv <= lv);
  const conf = good ? `<div class="conf" aria-hidden="true">${Array.from({ length: 34 }, (_, i) => {
    const d = 3.5 + Math.random() * 3;
    return `<i style="left:${Math.random() * 100}%;width:${7 + Math.random() * 6}px;height:${10 + Math.random() * 8}px;background:${["#FF8FAB", "#8FD9B6", "#FFD66B", "#FFFFFF", "#C9B8F0"][i % 5]};border-radius:${Math.random() > 0.6 ? "50%" : "3px"};animation-duration:${d}s;animation-delay:${-Math.random() * d}s"></i>`;
  }).join("")}</div>` : "";
  const sparks = [[-18, 20, 14, 1.8], [258, 34, 18, 2.3], [-8, 150, 12, 2.1], [262, 150, 14, 1.6], [228, -10, 12, 2.6]]
    .map(([x, y, s2, d]) => `<svg class="spk" width="${s2}" height="${s2}" viewBox="0 0 20 20" style="left:${x}px;top:${y}px;animation-duration:${d}s" aria-hidden="true"><path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z" fill="#fff"/></svg>`).join("");
  const done = sh.goals.filter(g => goalDone(sh, g)).length;
  const row = (n: string, v: number, plus: boolean) => v ? `<div class="lg"><span>${n}</span><b class="${plus ? "p" : "m"}">${plus ? "+" : "−"}${fmtN(v)}</b></div>` : "";
  const mood = good ? "love" : "open";
  const note = giftReady() ? unlockCard()
    : lv > sh.lv0 ? `<div class="rnote"><span class="env"></span><div>Lên Lv ${lv}!${newR.length ? " Mở khoá: " + newR.map(x => esc(x.n)).join(", ") : ""}${STAFF.filter(d => d.unlock > sh.lv0 && d.unlock <= lv).map(d => ` · ${esc(petName(d.id))} xin vào làm`).join("")}</div></div>`
    : !good ? `<div class="rnote soft"><span class="env"></span><div>Mai thử bấm "Xem công thức" trước khi giao nhé, Milo tin em mà!</div></div>`
    : unlockCard() || `<div class="rnote"><span class="env"></span><div>Ngày ${fmtN(daysTogether())} bên nhau · tiệm vẫn đông khách nè</div></div>`;
  return `<div class="scr res" style="--page:${sg.page}">
    ${conf}
    <div class="sign-wrap"><small>Kết thúc ca ${S.shifts}</small>
      <div class="sign" style="transform:rotate(${sg.r}deg)"><div class="stick"></div>
        <div class="board" style="background:${sg.bg};box-shadow:0 6px 0 ${sg.sh}">
          <div class="stars">${[0, 1, 2].map(i => STAR(i < stars, i === 1 ? 54 : 44, i === 1 ? -6 : 0, (i - 1) * 10, 0.25 + i * 0.15)).join("")}</div>
          ${FACE(good)}<b>${sg.t}</b></div>${sparks}</div></div>
    <div class="rcard">
      <div class="pets">${(["dog", "gold", "white"] as PetId[]).map((id, i) => critterSVG({ ...PETS[id], mood, ledge: false }, i === 1 ? 80 : 70)).join("")}</div>
      <div class="kp"><div class="k1"><b>${sh.served}/${total}</b><small>Khách vui</small></div><div class="k2"><b>${sh.memo}</b><small>Tự nhớ công thức</small></div><div class="k3"><b>${sh.helped}</b><small>Bé làm hộ</small></div></div>
      <div class="ledger"><h4>Sổ lãi hôm nay</h4>
        ${row("Tiền bánh", sh.coins, true)}${row("Tip", sh.tips, true)}${row("Thưởng tự nhớ (+50%)", sh.bonus, true)}${row(`Mục tiêu ca (${done}/${sh.goals.length})`, sh.goalCoins, true)}
        ${row("Nhập nguyên liệu", led.ingUsed + led.quick, false)}${row("Lương các bé", led.wages, false)}
        <div class="lg tot ${led.profit >= 0 ? "" : "neg"}"><span>Lãi</span><b>${led.profit >= 0 ? "+" : "−"}${fmtN(Math.abs(led.profit))} xu</b></div>
      </div>
      ${note}
    </div>
    <div class="rbtns"><button class="b3 w" style="flex:1" data-go="/">Về tiệm</button><button class="b3" style="flex:1.6" data-go="/chuan-bi" data-replace>${good ? "Ca tiếp theo" : "Chơi lại ca"}</button></div>
  </div>`;
}
export const unlockCard = () => giftReady()
  ? `<button class="unlock" data-act="claim"><div class="env"></div><div><b>Mở khoá thư tình mới</b><small>Chạm để nhận quà hôm nay</small></div></button>`
  : S.daily.claimed ? `<div class="unlock"><div class="env"></div><div><b>Đã mở thư tình hôm nay</b><small>Đọc lại ở mục Quà tặng</small></div></div>` : "";

/* cho Storybook: đặt kết quả mẫu */
export const _setResult = (r: Result | null) => { result = r; };
export const _setShift = (sh: Shift | null) => { SH = sh; };
