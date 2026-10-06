/* Màn Chơi và màn Kết quả: phần hiển thị. Luật chơi nằm ở engine/shift.ts.
   Các hàm *HTML là hàm thuần (chỉ đọc trạng thái, trả về chuỗi) để Storybook dùng lại. */
import { gachaFx, staffPlaced } from "../../engine/gacha";
import { gachaArt } from "../gachafx";
import { T_FINE, T_PERFECT, T_WARN, catchMouse, mouseFine, mousePay, mouseRank, mouseStage, payMouse } from "../../engine/mouse";
import { Sound, sfx } from "../../audio/sound";
import type { PetId } from "../../content/couple";
import { staffAvatar } from "../staffav";
import { CATS, KEYS, LABELS, PETS, RECIPES, STAFF, STOCK_KEYS, tiersOf, type PartKey, type StockKey } from "../../content/game";
import { daysTogether } from "../../engine/dates";
import { usedIdx } from "../../engine/progress";
import { REFILL, staffIds, fame, quickBuy, quickPrice, refill, refillCost, stockOf } from "../../engine/economy";
import { giftReady, lvl, xpFor } from "../../engine/progress";
import {
  makeCustomer,
  beginShift, buildPicked, buildTotal, finishShift, freshBuild, goalDone, goalProgress, goalText, isComplete, isOver, ledger, matches, mineIdx, needAt, needOf, partAt, partsOfBuild, peek, release, remaining, serve, setPartAt, summary, take, tick,
  COMBO_CAP, COMBO_LOSS, type Customer, type ServeResult, type Shift
} from "../../engine/shift";
import { S, petName, save } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { cakeAnySVG, charSVG, petSVG, ingSVG } from "../art";
import { $, bump, coinPill, dropModal, esc, floatText, haptic, hasModal, modal, toast } from "../dom";
import { himNote } from "../modals";
import { cloudSave } from "../../net/cloud";
import { navigate } from "../router";

export let SH: Shift | null = null;
let raf = 0, lastT = 0, leftShown = -1, drop: PartKey | null = null, stageDrop: PartKey | null = null, stageFree = 0, lastComboLost = 0;
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

/* ===== Chuột vào tiệm (luật ở engine/mouse.ts) ===== */
interface Rat { el: HTMLElement; x: number; y: number; a: number; turn: number }
let rat: Rat | null = null, mouseUiAt = 0;
function removeRat() { rat?.el.remove(); rat = null; if ($("#ratArena")) dropModal(); const b = $("#mouseBox"); if (b) b.innerHTML = ""; }
/* chuột chạy trong khung của hộp thoại; nhanh lúc mới vào rồi chậm dần theo thời gian */
function moveRat(dt: number) {
  if (!SH?.mouse) { if (rat) removeRat(); return; }
  const arena = $("#ratArena"); if (!arena) { rat = null; return; }
  const box = arena.getBoundingClientRect(), SZ = 64;
  if (!rat || !rat.el.isConnected) {
    const el = document.createElement("button"); el.id = "rat"; el.className = "rat"; el.setAttribute("aria-label", "Bắt chuột"); el.textContent = "🐭"; arena.appendChild(el);
    el.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); doCatchMouse(); });
    rat = { el, x: -SZ + 1, y: box.height * (.2 + Math.random() * .5), a: -.2 + Math.random() * .4, turn: 0 };
  }
  const k = box.width / 390, age = SH.mouse.age, speed = Math.max(55, 420 - age * 12) * k;
  rat.turn -= dt; if (rat.turn <= 0) { rat.a += (Math.random() - .5) * 2.2; rat.turn = .35 + Math.random() * .8; }
  rat.x += Math.cos(rat.a) * speed * dt; rat.y += Math.sin(rat.a) * speed * dt;
  const W = box.width - SZ, H = box.height - SZ;
  if (rat.x < 0 && rat.x > -SZ + 2) { rat.x = 0; rat.a = Math.PI - rat.a; } else if (rat.x > W) { rat.x = W; rat.a = Math.PI - rat.a; }
  if (rat.y < 0) { rat.y = 0; rat.a = -rat.a; } else if (rat.y > H) { rat.y = H; rat.a = -rat.a; }
  rat.el.style.transform = `translate(${rat.x.toFixed(1)}px,${rat.y.toFixed(1)}px) scaleX(${Math.cos(rat.a) < 0 ? -1 : 1})`;
}
function mouseInfo(sh: Shift) {
  const m = sh.mouse; if (!m) return "";
  const st = mouseStage(m), r = mouseRank(), pay = mousePay(), fine = mouseFine();
  const btn = m.age >= T_PERFECT ? `<button class="b3 mpay" data-act="mousepay" ${S.coins >= pay ? "" : "disabled"}>Xử lý nhanh · ${fmtN(pay)} xu</button>` : "";
  const left = (t: number) => Math.max(0, Math.ceil(t - m.age));
  const text = st === "fast" ? `Chạm vào chuột trong ${left(T_PERFECT)}s để ${r.name ? "lên hạng" : "được hạng Vua diệt chuột"}!`
    : st === "ok" ? `Chuột còn chạy quanh. Bắt nó hoặc trả tiền xử lý nhanh`
    : st === "faint" ? `${m.fainted ? `😵 ${esc(petName(m.fainted))} ngất xỉu, nghỉ hết ca.` : "😟 Khách sốt ruột hơn."} Còn ${left(T_WARN)}s tới cảnh báo`
    : `⚠ Khách bắt đầu nghi ngờ! Còn ${left(T_FINE)}s là bị báo sở y tế, đóng ca và phạt ${fmtN(fine)} xu`;
  return `<div class="mhud s-${st}"><div class="mt">${text}</div><div class="mb"><i style="width:${Math.min(100, m.age / T_FINE * 100)}%"></i></div>${btn}</div>`;
}
/* thanh nhỏ trên màn ca để mở lại hộp thoại nếu lỡ đóng */
const mouseChip = (sh: Shift) => sh.mouse ? `<button class="mhud chip s-${mouseStage(sh.mouse)}" data-act="mouseopen">🐭 Chuột đang chạy trong tiệm · chạm để bắt (${Math.max(0, Math.ceil(T_FINE - sh.mouse.age))}s)</button>` : "";
export function openMouseDlg() {
  if (!SH?.mouse) return;
  modal(`<h2>🐭 Chuột vào tiệm!</h2><div id="mouseInfo">${mouseInfo(SH)}</div><div class="arena" id="ratArena"></div>`);
}
function renderMouse() {
  if (!SH) return;
  const i = $("#mouseInfo"); if (i) i.innerHTML = mouseInfo(SH);
  const b = $("#mouseBox"); if (b) b.innerHTML = mouseChip(SH);
}
function doCatchMouse() {
  if (!SH?.mouse) return;
  const r = rat?.el.getBoundingClientRect(), res = catchMouse(SH); removeRat(); if (!res) return;
  if (res.kind === "perfect") {
    sfx("level"); haptic([30, 30, 60]); if (r) floatText(r.left, r.top - 6, `+${res.reward}`);
    toast(`Bắt kịp chuột! Vua diệt chuột hạng ${res.rank}${res.rankUp ? " (vừa lên hạng!)" : ""} · +${res.reward} xu`); refreshCoins();
  } else { sfx("coin"); toast("Bắt được chuột rồi, may mà chưa ai thấy"); }
}
export function doMousePay() {
  if (!SH?.mouse) return; const c = payMouse(SH);
  if (c == null) return toast(SH.mouse.age < T_PERFECT ? "Cố bắt chuột trước đã nha" : "Không đủ xu để xử lý nhanh");
  removeRat(); sfx("coin"); refreshCoins(); toast(`Đã gọi người xử lý chuột nhanh: −${fmtN(c)} xu`);
}

function loop(now: number) {
  if (!SH) return;
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (!SH.paused) {
    const ev = tick(SH, dt);
    if (ev.rush) { sfx("level"); toast(`Giờ vàng! Khách đông bất ngờ, thêm ${ev.rush} khách`); }
    if (ev.mouse.appeared) { sfx("bell"); haptic([40, 30, 40]); if (!hasModal()) openMouseDlg(); }
    if (ev.mouse.fainted) { renderCrew(); sfx("wrong"); }
    if (ev.mouse.warn) { sfx("wrong"); haptic([60, 40, 60]); toast("⚠ Khách bắt đầu nghi ngờ có chuột!"); }
    if (ev.mouse.shutdown) { removeRat(); sfx("wrong"); haptic([80, 50, 80]); toast(`Sở y tế đóng cửa tiệm vì có chuột. Phạt ${fmtN(SH.mouseFine)} xu`); }
    moveRat(dt);
    if (SH.mouse && now - mouseUiAt > 250) { mouseUiAt = now; renderMouse(); }
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
const bakeStep: Record<string, number> = {};
function updateBaking() {
  let redraw = false;
  SH!.bakers.forEach(b => {
    const pct = Math.min(100, Math.round(b.done / b.need * 100)), st = Math.floor(pct / 25);
    if (bakeStep[b.id] !== st) { bakeStep[b.id] = st; redraw = true; }
    document.querySelectorAll<HTMLElement>(`[data-bake="${b.id}"]`).forEach(el => {
      const i = el.querySelector("i"), t = el.querySelector("span");
      if (i) i.style.width = pct + "%";
      if (t) t.textContent = pct + "%";
    });
  });
  if (redraw) renderCrew();
}

/* ================= HTML thuần ================= */
const faceSize = (sh: Shift) => ({ 3: 70, 4: 60, 5: 52, 6: 46 } as Record<number, number>)[Math.min(6, sh.seats.length)] ?? 46;
const cakeOf = (c: Customer, size: number) => cakeAnySVG({ base: c.r.base, cream: c.r.cream, top: c.r.top, up: c.r.up, sweet: c.sweet }, { size, still: true });
/* tầng đang chọn nguyên liệu (chỉ khác 0 với bánh nhiều tầng) */
let curTier = 0;
const LV_BADGE = `<svg width="44" height="44" viewBox="0 0 46 46" aria-hidden="true"><path d="M23 1 L28 5.5 L34.5 4 L36.5 10.5 L42.5 13 L41 19.5 L45 25 L40 29.5 L40.5 36 L34 37 L30.5 43 L24.5 40.5 L18 43 L15 37 L8.5 36 L9 29.5 L4 25 L8 19.5 L6.5 13 L12.5 10.5 L14.5 4 L21 5.5 Z" fill="#FF7FA1" stroke="#E0567A" stroke-width="2" stroke-linejoin="round"/><circle cx="23" cy="23" r="13.5" fill="#FFF3F6"/></svg>`;
const BOX = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A3438" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 8 L12 3.5 L21 8 V17 L12 21.5 L3 17 Z" fill="#F6D59A"/><path d="M3 8 L12 12.5 L21 8 M12 12.5 V21.5"/><path d="M7.5 5.8 L16.5 10.3" stroke-width="1.8"/></svg>`;
const CHEV = (up: boolean) => `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="${up ? "M3 9 L7 5 L11 9" : "M3 5 L7 9 L11 5"}" stroke="#C07A8C" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const TICK = `<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5 L5 9 L10 3" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const lowCount = () => STOCK_KEYS.reduce((a, k) => a + usedIdx(k).filter(i => stockOf(k, i) <= 2).length, 0);

/* một khách trong hàng đợi: hình bánh đã gọi (không ghi nguyên liệu), mặt, kiên nhẫn, ai đang làm */
export function slotHTML(sh: Shift, i: number, state: "" | "low" | "ok" = "") {
  const c = sh.seats[i]; if (!c) return "";
  const f = c.pat / c.max, S2 = faceSize(sh), mine = mineIdx(sh) === i;
  const b = c.by ? sh.bakers.find(x => x.id === c.by) : null, pct = b ? Math.round(b.done / b.need * 100) : 0;
  const bub = state === "ok" ? `<div class="bub ok">+${c.r.price}<small>xu</small></div>` : `<div class="bub">${cakeOf(c, S2 * 0.72)}<span class="sw" title="${CATS.sweet[c.sweet][0]}">${ingSVG("sweet", c.sweet, 19)}</span></div>`;
  const who = c.by ? `<div class="who by" data-bake="${c.by}">${staffAvatar(c.by, 20)}<span>${pct}%</span><i style="width:${pct}%"></i></div>`
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
/* ô linh vật gacha đang đồng hành: hiện chỉ số đang cộng (đã nhân thân thiết) để thấy gacha có ích ngay lúc chơi */
function staffChip() {
  const mg = staffPlaced("mgr"), ms = staffPlaced("mascot"), lead = mg[0] ?? ms[0]; if (!lead) return "";
  const pc = (k: "price" | "tip" | "pat") => Math.round(gachaFx(k) * 100), cu = gachaFx("cust");
  const bits = [pc("price") && `giá +${pc("price")}%`, pc("tip") && `tip +${pc("tip")}%`, pc("pat") && `chờ +${pc("pat")}%`, cu && `+${cu} khách`].filter(Boolean).slice(0, 2).join(" · ");
  return `<div class="cm mas">${gachaArt(lead, 34)}<div class="ct"><b>${mg.length} quản lý · ${ms.length} linh vật</b><small>${bits || "chưa có chỉ số"}</small></div></div>`;
}
export function crewHTML(sh: Shift) {
  const ids = staffIds().filter(id => sh.working.includes(id));
  if (!ids.length) return `<div class="crew none">Hôm nay các bé nghỉ, mình tự làm hết nha</div>${staffChip() ? `<div class="crew" style="--n:1">${staffChip()}</div>` : ""}`;
  return `<div class="crew" style="--n:${ids.length + (staffChip() ? 1 : 0)}">${ids.map(id => {
    const b = sh.bakers.find(x => x.id === id), c = b ? sh.seats[b.seat] : null, pct = b ? Math.round(b.done / b.need * 100) : 0;
    const sub = b && c ? `<small>→ ${esc(c.who)}</small><div class="pb" data-bake="${id}"><i style="width:${pct}%"></i></div>`
      : sh.fainted.includes(id) ? `<small class="bad">Ngất xỉu 😵</small>` : sh.lack[id] ? `<small class="bad">Thiếu ${esc(sh.lack[id]!)}</small>` : `<small>Đang nghỉ</small>`;
    const cake = b && c ? `<span class="cmk">${cakeAnySVG(bakerBuild(c, pct), { size: 30, still: true })}</span>` : "";
    return `<button class="cm" data-crew="${id}" data-watch="${id}" aria-label="Xem ${esc(petName(id))} làm bánh">${staffAvatar(id, 38, b ? "happy" : sh.lack[id] ? "impatient" : "open")}<div class="ct"><b>${esc(petName(id))}</b>${sub}</div>${cake}</button>`;
  }).join("")}${staffChip()}</div>`;
}
/* bánh bé đang làm tới đâu: lần lượt đế, kem của từng tầng, topping, độ ngọt theo phần trăm */
const bakerBuild = (c: Customer, pct: number) => {
  const n = tiersOf(c.r), N = 2 * n + 2, step = Math.min(N, Math.floor(pct / (100 / N)) + (pct >= 100 ? 0 : 1));
  const seq = [c.r.base, c.r.cream, ...(c.r.up ?? []).flat(), c.r.top, c.sweet], get = (j: number) => (step > j ? seq[j] : null);
  return { base: get(0), cream: get(1), up: (c.r.up ?? []).map((_, t) => [get(2 + 2 * t), get(3 + 2 * t)] as [number | null, number | null]), top: get(2 + 2 * (n - 1)), sweet: get(N - 1) };
};
/* các bước bé làm bánh, theo thứ tự (để hiện trong cửa sổ xem bé làm) */
const bakeSteps = (c: Customer) => {
  const n = tiersOf(c.r), multi = n > 1, st: { k: PartKey; i: number; label: string }[] = [];
  for (let t = 0; t < n; t++) { st.push({ k: "base", i: needAt(c.r, t, "base"), label: multi ? `Đế ${t + 1}` : LABELS.base }, { k: "cream", i: needAt(c.r, t, "cream"), label: multi ? `Kem ${t + 1}` : LABELS.cream }); }
  st.push({ k: "top", i: c.r.top, label: LABELS.top }, { k: "sweet", i: c.sweet, label: LABELS.sweet });
  return st;
};
/* chạm vào thẻ thợ bánh: xem quá trình bé làm bánh (cập nhật trực tiếp) */
let watchT = 0;
export function watchBaker(id: string) {
  if (!SH) return;
  const draw = () => {
    const sh = SH, box = $("#watch"); if (!sh || !box) { clearInterval(watchT); return; }
    const b = sh.bakers.find(x => x.id === id), c = b ? sh.seats[b.seat] : null;
    if (!b || !c) { box.innerHTML = `<div class="wch">${staffAvatar(id, 90, sh.lack[id] ? "impatient" : "open", true)}</div><p class="sub">${sh.lack[id] ? `${esc(petName(id))} đang chờ vì thiếu ${esc(sh.lack[id]!)}. Nhập thêm ở nút hộp trên cùng nha.` : `${esc(petName(id))} đang nghỉ, có khách là bé nhận đơn ngay.`}</p>`; return; }
    const pct = Math.min(100, Math.round(b.done / b.need * 100)), steps = bakeSteps(c), step = Math.min(steps.length, Math.floor(pct / (100 / steps.length)));
    box.innerHTML = `<div class="wch">${staffAvatar(id, 70, "happy")}<div class="wcake">${cakeAnySVG(bakerBuild(c, pct), { size: 130 })}</div></div>
      <p class="sub">Đang làm <b>${esc(c.r.n)}</b> · ${CATS.sweet[c.sweet][0]} cho <b>${esc(c.who)}</b></p>
      <div class="wbar"><i style="width:${pct}%"></i><span>${pct}%</span></div>
      <div class="wsteps ${steps.length > 4 ? "many" : ""}" style="--n:${steps.length}">${steps.map((x, i) => `<div class="${i < step ? "ok" : i === step ? "now" : ""}">${ingSVG(x.k, x.i, 26)}<small>${x.label}</small><b>${CATS[x.k][x.i][0]}</b><em>${i < step ? "✓" : i === step ? "…" : ""}</em></div>`).join("")}</div>`;
  };
  modal(`<h2>${esc(petName(id))} làm bánh</h2><div id="watch"></div><div class="mbtns"><button class="b3" data-close>Xong</button></div>`, () => clearInterval(watchT));
  draw(); clearInterval(watchT); watchT = window.setInterval(draw, 250);
}

const toggleHTML = () => `<button class="toggle ${S.autoTake ? "on" : ""}" data-act="auto" role="switch" aria-checked="${S.autoTake}"><span>Tự nhận đơn</span><i></i></button>`;
function idleHTML(sh: Shift) {
  const busy = sh.seats.some(x => x && !x.gone && !x.by), any = sh.seats.some(x => x && !x.gone);
  const earned = sh.coins + sh.tips + sh.bonus;
  const goals = sh.goals.map(g => {
    const done = goalDone(sh, g), calm = g.id === "calm", cur = goalProgress(sh, g);
    const pct = calm ? (sh.left ? 0 : 100) : Math.min(100, Math.round(cur / g.n * 100));
    const right = calm ? (sh.left ? `${sh.left} khách giận` : "✓ chưa ai giận") : `${Math.min(cur, g.n)}/${g.n}`;
    return `<div class="ig ${done ? "done" : calm && sh.left ? "fail" : ""}"><div class="it"><span>${done ? "✓ " : ""}${goalText(g)}</span><em>${right}</em><b>+${g.reward}</b></div><i><u style="width:${pct}%"></u></i></div>`;
  }).join("");
  return `<div class="ihead"><div><b>Đang rảnh tay</b><small class="${busy ? "hint" : ""}">${busy ? "↑ Chạm vào khách để nhận đơn" : any ? "Các bé đang lo hết đơn rồi" : "Chờ khách vào tiệm…"}</small></div>${toggleHTML()}</div>
    <div class="istats"><div><b>${sh.served}</b><small>khách vui</small></div><div><b>+${fmtN(earned)}</b><small>xu ca này</small></div><div><b>${sh.left}</b><small>khách giận</small></div></div>
    <div class="igoals"><h4>Mục tiêu ca này</h4>${goals}</div>
    <p class="itip">💡 Không bấm "Xem công thức" mà giao đúng được thưởng +50%</p>`;
}

/* nút nguyên liệu: icon + tên + số trong kho; đúng/sai chỉ hiện khi đã xem công thức */
function ingState(sh: Shift, k: PartKey, i: number) {
  const b = sh.build, m = mineIdx(sh), c = m >= 0 ? sh.seats[m] : null, tp = k === "base" || k === "cream";
  const have = tp ? partAt(b, curTier, k) : b[k], need = c && sh.peek ? (tp ? needAt(c.r, Math.min(curTier, tiersOf(c.r) - 1), k) : needOf(c)[k]) : null;
  const on = have === i, st = !on ? "" : need == null ? "on" : need === i ? "ok" : "bad";
  const q = k === "sweet" ? -1 : stockOf(k as StockKey, i), out = q === 0 && !on;
  return { cls: "ing" + (st ? " " + st : "") + (out ? " out" : ""), q, out, low: q >= 0 && q <= 2 };
}
const ingHTML = (sh: Shift, k: PartKey, i: number) => {
  const s = ingState(sh, k, i);
  return `<button class="${s.cls}" data-ing="${k}:${i}">${ingSVG(k, i, 24, s.out)}<span class="cn">${CATS[k][i][0]}</span>${
    s.out ? `<em class="tag">+${quickPrice(k as StockKey, i)} xu</em>` : s.q > 0 ? `<b class="q ${s.low ? "low" : ""}">${s.q}</b>` : ""}${s.cls.includes(" ok") ? `<em class="ck">${TICK}</em>` : ""}</button>`;
};
/* thanh chọn tầng (chỉ hiện khi đơn là bánh nhiều tầng): mỗi tầng chọn Đế và Kem, tầng nào đủ thì có dấu ✓ */
const tiersHTML = (sh: Shift) => {
  const n = 1 + (sh.build.up?.length ?? 0); if (n < 2) return "";
  return `<div class="tiers5" role="tablist">${Array.from({ length: n }, (_, t) => { const done = partAt(sh.build, t, "base") != null && partAt(sh.build, t, "cream") != null;
    return `<button class="${t === curTier ? "on" : ""} ${done ? "done" : ""}" data-tier="${t}" role="tab" aria-selected="${t === curTier}">Tầng ${t + 1}${done ? " ✓" : ""}</button>`; }).join("")}</div>`;
};
export const rowsHTML = (sh: Shift) => tiersHTML(sh) + KEYS.map(k => {
  const list = k === "sweet" ? [0, 1, 2] : usedIdx(k);        // chỉ hiện nguyên liệu mà các món đang bán dùng; hơn 3 món thì xếp gọn thành 4-5 cột
  return `<div class="irow"><span>${LABELS[k]}</span><div class="g3${list.length > 3 ? " many" : ""}" style="--n:${list.length}">${list.map(i => ingHTML(sh, k, i)).join("")}</div></div>`;
}).join("");

/* phần đầu phiếu: Đơn của ai, tên bánh, Xem công thức hoặc các nguyên liệu */
function oinfoHTML(sh: Shift) {
  const m = mineIdx(sh), c = m >= 0 ? sh.seats[m] : null; if (!c) return "";
  const n = needOf(c), b = sh.build, nt = tiersOf(c.r);
  // bánh nhiều tầng có nhiều món nên chỉ hiện biểu tượng cho gọn (tên nằm ở nút chọn bên dưới)
  const chip = (k: PartKey, need: number, have: number | null) => `<span class="${have === need ? "ok" : ""}" title="${CATS[k][need][0]}">${ingSVG(k, need, 18)}${nt > 1 ? "" : CATS[k][need][0]}</span>`;
  const tierChips = Array.from({ length: nt }, (_, t) => `${nt > 1 ? `<em class="tl">T${t + 1}</em>` : ""}${chip("base", needAt(c.r, t, "base"), partAt(b, t, "base"))}${chip("cream", needAt(c.r, t, "cream"), partAt(b, t, "cream"))}`).join("");
  const chips = `${tierChips}${chip("top", n.top, b.top)}${chip("sweet", n.sweet, b.sweet)}`;
  return `<div class="or1"><small>Đơn của ${esc(c.who)}</small>${toggleHTML()}<button class="x" data-act="sheet" aria-label="Thu phiếu xuống">${CHEV(false)}</button></div>
    <b class="rn">${esc(c.r.n)}</b>
    <span class="swl">${ingSVG("sweet", c.sweet, 18)}${CATS.sweet[c.sweet][0]}</span>
    ${sh.peek ? `<div class="chips">${chips}</div>` : `<div class="peekrow"><button class="peek" data-act="peek">Xem công thức</button><span class="bonus">Tự nhớ<br>+50% thưởng</span></div>`}`;
}
const picked = (sh: Shift) => buildPicked(sh.build);
const giveLabel = (sh: Shift) => isComplete(sh.build) ? (sh.peek ? "Giao bánh" : "Giao bánh · +50%") : `Chọn đủ ${buildTotal(sh.build)} món (${picked(sh)}/${buildTotal(sh.build)})`;
function miniHTML(sh: Shift) {
  const m = mineIdx(sh), c = m >= 0 ? sh.seats[m] : null; if (!c) return "";
  return `<span class="mc">${cakeAnySVG(sh.build, { size: 46, still: true })}</span><span class="mt"><b>Đang làm cho ${esc(c.who)}</b><small>${picked(sh)}/${buildTotal(sh.build)} món · chạm để mở</small></span>${CHEV(true)}`;
}

/* thanh combo: số bánh Hoàn hảo liên tiếp và thưởng đã dồn (trả lúc hết ca) */
function comboHTML(sh: Shift) {
  if (sh.combo < 1 && sh.comboBank < 1) return "";
  const hot = Math.min(sh.combo, COMBO_CAP);
  return `<div class="combo c${hot}"><b>${sh.combo ? `🔥 Combo ×${sh.combo}` : "Combo đã đứt"}</b><span>${sh.comboBank ? `+${fmtN(sh.comboBank)} xu dồn · trả cuối ca` : ""}</span><small>${sh.combo >= COMBO_CAP ? "Tối đa! " : ""}Khách giận hoặc giao sai thì mất ${Math.round(COMBO_LOSS * 100)}% thưởng dồn</small></div>`;
}
const renderCombo = () => { const b = $("#comboBox"); if (b && SH) b.innerHTML = comboHTML(SH); };

/* khi phiếu mở: bàn làm bánh lớn lấp phần trống giữa hàng bé và phiếu (không lộ đơn khách để giữ thưởng Tự nhớ) */
function stageBig(sh: Shift) {
  const size = Math.max(64, Math.min(150, stageFree - 26));
  return `<div class="plate big">${cakeAnySVG(sh.build, { size, drop: stageDrop })}<small>${picked(sh) === buildTotal(sh.build) ? "Đủ rồi, giao bánh nào!" : `Bánh đang làm · ${picked(sh)}/${buildTotal(sh.build)} món`}</small></div>`;
}
function fitStage() {
  const root = $("#play"), st = $("#stage"), sheet = $("#osheet"), crew = $("#crewBox"); if (!root || !st || !sheet || !crew || !SH) return;
  if (!root.classList.contains("up") || mineIdx(SH) < 0) { st.classList.remove("big"); return; }
  const free = Math.floor(sheet.getBoundingClientRect().top - crew.getBoundingClientRect().bottom - 14);
  stageFree = Math.max(0, free);
  if (free < 90) { st.classList.remove("big"); return; }
  st.classList.add("big"); st.style.setProperty("--free", free + "px"); st.innerHTML = stageBig(SH);
}

/* thu gọn phiếu: quầy hiện bánh đang ghép cạnh đơn khách gọi (không để trống) */
function stageHTML(sh: Shift) {
  const m = mineIdx(sh), c = m >= 0 ? sh.seats[m] : null; if (!c) return "";
  return `<div class="plate">${cakeAnySVG(sh.build, { size: 140 })}<small>Bánh đang làm · ${picked(sh)}/${buildTotal(sh.build)} món</small></div>
    <div class="want"><small>${esc(c.who)} gọi</small>${cakeOf(c, 78)}<span class="swl">${ingSVG("sweet", c.sweet, 18)}${CATS.sweet[c.sweet][0]}</span></div>
    <button class="b3 w" data-act="sheet">Chọn nguyên liệu</button>`;
}

/* kho giữa ca: chọn món để nhập đầy, món sắp hết được chọn sẵn */
let ticks = new Set<string>();
const autoTicks = () => new Set(STOCK_KEYS.flatMap(k => usedIdx(k).filter(i => stockOf(k, i) <= 2).map(i => k + ":" + i)));
export function stockHTML() {
  let cost = 0, n = 0;
  const groups = STOCK_KEYS.map(k => `<div class="sg"><small>${LABELS[k]}</small><div class="g3">${usedIdx(k).map(i => {
    const x = CATS[k][i], id = k + ":" + i, v = stockOf(k, i), on = ticks.has(id), low = v <= 2;
    if (on) { cost += refillCost(k, i); n++; }
    return `<button class="sk ${on ? "on" : ""}" data-tick="${id}" aria-pressed="${on}"><span class="box">${on ? TICK : ""}</span>${ingSVG(k, i, 34)}<span class="sn">${x[0]}</span>
      <span class="bar"><i style="width:${Math.min(100, v / REFILL * 100)}%;background:${v === 0 ? "#FF6F91" : low ? "#FFC94D" : "#8FD9B6"}"></i></span><span class="cnt ${v === 0 ? "out" : low ? "low" : ""}">${v === 0 ? "Hết hàng" : `${v}/${REFILL}`}</span></button>`;
  }).join("")}</div></div>`).join("");
  const all = STOCK_KEYS.every(k => usedIdx(k).every(i => ticks.has(k + ":" + i)));
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
    <div id="comboBox">${comboHTML(sh)}</div>
    <div id="mouseBox">${mouseChip(sh)}</div>
    <div class="queue" style="--c:${Math.max(1, Math.min(5, sh.seats.length))}">${sh.seats.map((_, i) => slotBtn(sh, i, opts.states?.[i] ?? "")).join("")}</div>
    <div class="band"><div id="crewBox">${crewHTML(sh)}</div><div class="idle" id="idle">${idleHTML(sh)}</div><div class="stage" id="stage">${stageHTML(sh)}</div></div>
    <div class="osheet" id="osheet">
      <div class="oh" id="ohead"><div class="grab"></div><div class="ohr"><div class="ocake" id="cake">${cakeAnySVG(sh.build, { size: 82, done: opts.done })}</div><div class="oinfo" id="oinfo">${oinfoHTML(sh)}</div></div></div>
      <div class="rows" id="rows">${rowsHTML(sh)}</div>
      <button class="b3 give ${isComplete(sh.build) ? "" : "off"}" id="give" data-act="serve">${giveLabel(sh)}</button>
    </div>
    <button class="omini" id="mini" data-act="sheet">${miniHTML(sh)}</button>
    <button class="scrim ${opts.stock ? "on" : ""}" id="scrim" data-act="stock" aria-label="Đóng kho" tabindex="-1"></button>
    <div class="ssheet ${opts.stock ? "on" : ""}" id="ssheet">${opts.stock ? stockHTML() : ""}</div>
  </div>`;
}

/* ================= Cập nhật DOM trong ca ================= */
let sheetOpen = true;
export function renderPlay() {
  if (!SH) return;
  leftShown = -1; views.length = 0; lastComboLost = SH.comboLost;
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
  syncBuild();
  const m = mineIdx(SH);
  root.classList.toggle("has", m >= 0); root.classList.toggle("free", m < 0); root.classList.toggle("up", m >= 0 && sheetOpen);
  /* chỉ vẽ lại khi nội dung đổi: thay DOM giữa lúc ngón tay đang chạm làm mất cú bấm */
  setHTML($("#oinfo")!, oinfoHTML(SH)); setHTML($("#idle")!, idleHTML(SH)); setHTML($("#mini")!, miniHTML(SH));
  $("#stage")!.innerHTML = stageHTML(SH);
  setHTML($("#rows")!, rowsHTML(SH));
  renderCombo(); fitStage(); fitSheet();
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
  $("#cake")!.innerHTML = cakeAnySVG(SH.build, { size: 82, done, drop });
  stageDrop = drop; drop = null;
  renderTicket(); stageDrop = null;
}
const refreshCoins = (pulse = true) => {
  const cp = $("#shCoins"); if (cp) { cp.querySelector("span:last-child")!.textContent = fmtN(S.coins); if (pulse) bump(cp, "pulse"); }
  const d = $("#lowDot"), n = lowCount(); if (d) { d.textContent = String(n); d.hidden = !n; }
};
export function setSheet(open: boolean) { sheetOpen = open; renderTicket(); sfx(open ? "tap" : "untap"); }
export const toggleSheet = () => setSheet(!sheetOpen);
/* phiếu order không được che hàng đợi */
const setHTML = (el: HTMLElement, html: string) => { if (el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; } };
/* phiếu cao vừa đủ cho cả 4 hàng (Đế, Kem, Topping, Độ ngọt) và nút giao; chỉ chừa lại đầu hàng khách ở trên */
function fitSheet() {
  const p = $("#play"), q = document.querySelector<HTMLElement>(".queue"); if (!p || !q) return;
  const pr = p.getBoundingClientRect(), qr = q.getBoundingClientRect();
  const head = $("#ohead"), rows = $("#rows"), give = $("#give");
  const want = qr.bottom - pr.top + 8;
  let qb = want;
  if (head && rows && give) {
    const natural = head.offsetHeight + rows.scrollHeight + give.offsetHeight + 40 + 14;
    qb = Math.min(want, Math.max(qr.top - pr.top + 70, pr.height - natural));
  }
  p.style.setProperty("--qb", Math.round(qb) + "px");
}
window.addEventListener("resize", () => { if (SH) { fitSheet(); fitStage(); } });
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
  const all = STOCK_KEYS.flatMap(k => usedIdx(k).map(i => k + ":" + i));
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
  syncBuild();
  const tp = k === "base" || k === "cream", cur = tp ? partAt(SH.build, curTier, k) : SH.build[k], add = cur !== i;
  // hết hàng thì nhập nhanh; bánh nhiều tầng có thể dùng cùng một nguyên liệu nhiều lần nên trừ phần đã chọn
  const used = k === "sweet" ? 0 : partsOfBuild(SH.build).filter(p => p.k === k && p.i === i).length;
  if (add && k !== "sweet" && stockOf(k, i) - used <= 0) {
    const p = quickPrice(k, i);
    if (!quickBuy(k, i)) { sfx("wrong"); haptic(40); return toast(`Hết ${CATS[k][i][0]} và không đủ ${p} xu để nhập nhanh`); }
    SH.quickCost += p; refreshCoins(); toast(`Nhập nhanh 1 ${CATS[k][i][0]} · ${p} xu`);
  }
  if (tp) setPartAt(SH.build, curTier, k, add ? i : null); else SH.build[k] = add ? i : null;
  drop = add && k !== "sweet" ? k : null;
  // chọn đủ Đế và Kem của tầng này mà còn tầng sau chưa đủ thì tự sang tầng kế
  const nt = 1 + (SH.build.up?.length ?? 0);
  if (add && tp && curTier < nt - 1 && partAt(SH.build, curTier, "base") != null && partAt(SH.build, curTier, "cream") != null) curTier++;
  renderBuild(); sfx(add ? "tap" : "untap"); haptic(8);
  // chọn đúng đủ các món thì tự giao, khỏi bấm nút
  const m = mineIdx(SH);
  if (m >= 0 && matches(SH.seats[m], SH.build)) { const sh = SH; setTimeout(() => { if (SH === sh && mineIdx(sh) === m && matches(sh.seats[m], sh.build)) doServe(); }, 350); }
}
/* đổi tầng đang chọn nguyên liệu */
export function setTier(t: number) { if (!SH) return; syncBuild(); curTier = Math.max(0, Math.min(t, (SH.build.up?.length ?? 0))); renderTicket(); sfx("tap"); }
/* phiếu luôn có đúng số tầng của đơn đang giữ (đơn mới được tự gán giữa chừng có thể khác số tầng) */
function syncBuild() {
  if (!SH) return;
  const m = mineIdx(SH); if (m < 0) return;
  const want = tiersOf(SH.seats[m]!.r) - 1, up = (SH.build.up ??= []);
  while (up.length < want) up.push([null, null]);
  if (up.length > want) up.length = want;
  curTier = Math.min(curTier, want);
}
const resetBuild = () => { if (!SH) return; SH.build = freshBuild(SH); curTier = 0; };
/* chạm vào khách: nhận đơn đó (đơn các bé đã nhận thì không được) */
export function selectSeat(i: number) {
  if (!SH) return;
  const c = SH.seats[i];
  if (c?.by) { sfx("untap"); return toast(`${petName(c.by)} đang làm đơn này rồi`); }
  if (mineIdx(SH) === i) return setSheet(true);
  if (take(SH, i)) { resetBuild(); sheetOpen = true; renderBuild(); sfx("click"); }
}
export function doPeek() { if (!SH || mineIdx(SH) < 0) return; peek(SH); renderTicket(); sfx("tap"); }
export function toggleAuto() {
  S.autoTake = !S.autoTake; save();
  // tắt tự nhận đơn: trả đơn đang giữ để các bé làm luôn
  if (SH && !S.autoTake && mineIdx(SH) >= 0) { release(SH); resetBuild(); renderBuild(); }
  if (SH) renderTicket();
  toast(S.autoTake ? "Tự nhận đơn: bật. Làm xong sẽ được gán đơn mới" : "Rảnh tay: các bé nhận hết, chạm vào khách để tự làm");
}

export function doServe() {
  if (!SH) return;
  if (!isComplete(SH.build)) { sfx("untap"); return toast(`Chọn đủ ${buildTotal(SH.build)} món nha (${picked(SH)}/${buildTotal(SH.build)})`); }
  const res = serve(SH);
  if (!res.ok) { sfx("wrong"); haptic([60, 40, 60]); renderTicket(); bump($("#cake"), "shake"); return toast(res.broke !== undefined ? `${res.msg} · đứt combo, mất ${fmtN(res.broke)} xu thưởng dồn` : res.msg); }
  showServed(res);
  if (res.perfect) { const c = $("#cake")?.getBoundingClientRect(); if (c) floatText(c.left + c.width / 2, c.top - 6, res.combo > 1 ? `Hoàn hảo! ×${res.combo}` : "Hoàn hảo!"); if (res.combo >= 3) sfx("level"); }
  renderCombo();
  renderBuild(true);
  if (res.bonus) toast(`Nhớ công thức giỏi quá! +${res.bonus} xu thưởng`);
  if (res.tierBonus) toast(`Bánh ${tiersOf(res.c.r)} tầng tự tay làm! +${res.tierBonus} xu thưởng`);
  const sh = SH;
  setTimeout(() => { if (SH !== sh) return; resetBuild(); if (mineIdx(sh) >= 0) sheetOpen = true; renderBuild(); }, 900);
}

/* hiệu ứng giao bánh (chủ tiệm hoặc bé thợ bánh): bong bóng thành xu, khách thả tim, bắn tim */
function showServed(res: Extract<ServeResult, { ok: true }>, by?: string) {
  const { idx, c, price, tip, bonus, tierBonus } = res, v = views[idx];
  if (!v || !SH) return;
  v.el.querySelector(".bub")!.outerHTML = `<div class="bub ok">+${price + tip + bonus + tierBonus}<small>${by ? esc(petName(by)) : "xu"}</small></div>`;
  v.art.innerHTML = charSVG(c.look, "love", faceSize(SH));
  v.el.classList.remove("low", "taken", "mine");
  v.el.querySelector(".burst")!.innerHTML = Array.from({ length: 14 }, (_, i) => {
    const a = i / 14 * Math.PI * 2, d = 45 + (i % 3) * 18;
    return `<i style="font-size:${13 + (i % 3) * 6}px;color:${["#FF8FAB", "#FFC94D", "#8FD9B6"][i % 3]};--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d).toFixed(1)}px">${i % 2 ? "♥︎" : "✦"}</i>`;
  }).join("");
  const r = v.el.getBoundingClientRect(); floatText(r.left + r.width / 2, r.top + 40, "+" + (price + tip + bonus + tierBonus));
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
  if (SH!.comboLost && SH!.combo === 0 && lastComboLost !== SH!.comboLost) { toast(`Khách giận bỏ về, đứt combo. Mất ${fmtN(SH!.comboLost - lastComboLost)} xu thưởng dồn`); lastComboLost = SH!.comboLost; }
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
      <div class="pets">${(["dog", "gold", "white"] as PetId[]).map((id, i) => petSVG({ ...PETS[id], mood, ledge: false }, i === 1 ? 80 : 70)).join("")}</div>
      <div class="rbanner"><span>Lãi ca này</span><b class="${led.profit >= 0 ? "p" : "m"}">${led.profit >= 0 ? "+" : "−"}${fmtN(Math.abs(led.profit))} xu</b><small>${done}/${sh.goals.length} mục tiêu${sh.goalCoins ? ` · +${fmtN(sh.goalCoins)} xu thưởng` : ""}${sh.ticket ? " · 🎟 +1 vé" : ""}${sh.bestCombo >= 3 ? ` · 🔥 ×${sh.bestCombo}` : ""}</small></div>
      <div class="kp"><div class="k1"><b>${sh.served}/${total}</b><small>Khách vui</small></div><div class="k2"><b>${sh.memo}</b><small>Tự nhớ công thức</small></div><div class="k3"><b>${sh.helped}</b><small>Bé làm hộ</small></div></div>
      <div class="ledger"><h4>Sổ lãi hôm nay</h4>
        ${row("Tiền bánh", sh.coins, true)}${row("Tip", sh.tips, true)}${row("Thưởng tự nhớ (+50%)", sh.bonus, true)}${sh.tierBonus ? row("Thưởng bánh nhiều tầng", sh.tierBonus, true) : ""}${row(`Mục tiêu ca (${done}/${sh.goals.length})`, sh.goalCoins, true)}
        ${row("Nhập nguyên liệu", led.ingUsed + led.quick, false)}${row("Lương các bé", led.wages, false)}
        <div class="lg tot ${led.profit >= 0 ? "" : "neg"}"><span>Lãi</span><b>${led.profit >= 0 ? "+" : "−"}${fmtN(Math.abs(led.profit))} xu</b></div>
      </div>
      ${sh.ticket ? `<p class="rticket">🎟 Đạt hết mục tiêu ca: +1 vé triệu hồi</p>` : ""}${sh.shutdown ? `<p class="rticket bad">🚨 Sở y tế đóng cửa tiệm vì có chuột: phạt ${fmtN(sh.mouseFine)} xu. Lần sau nhớ bắt chuột sớm nha</p>` : ""}${sh.mouseKills ? `<p class="rticket">🐭 Vua diệt chuột hạng ${mouseRank().name}: +${sh.mouseReward} xu${mouseRank().next ? ` · cần ${mouseRank().next} lần để lên hạng` : ""}</p>` : ""}${sh.mousePaid ? `<p class="rticket">Đã chi ${fmtN(sh.mousePaid)} xu xử lý chuột nhanh</p>` : ""}${sh.comboPaid ? `<p class="rticket">🔥 Combo dài nhất ×${sh.bestCombo}: +${fmtN(sh.comboPaid)} xu thưởng${sh.comboLost ? ` (mất ${fmtN(sh.comboLost)} xu vì đứt chuỗi)` : ""}</p>` : sh.comboLost ? `<p class="rticket">Đứt combo: mất ${fmtN(sh.comboLost)} xu thưởng dồn, ca sau giữ chuỗi nha</p>` : ""}${sh.bondUp ? `<p class="rticket">💞 Linh vật thân thiết cấp ${sh.bondUp}: chỉ số linh vật tăng thêm 12%</p>` : ""}${note}
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

/* chỉ khi chạy dev: móc để kiểm tra giao diện trong ca bằng tay */
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__play = { sh: () => SH, renderPlay, renderTicket, renderCombo, makeCustomer, take, fitStage, setSheet };
