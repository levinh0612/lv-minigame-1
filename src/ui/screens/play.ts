/* Màn Chơi và màn Kết quả: phần hiển thị. Luật chơi nằm ở engine/shift.ts.
   Các hàm *HTML là hàm thuần (chỉ đọc trạng thái, trả về chuỗi) để Storybook dùng lại. */
import { gachaFx, staffPlaced } from "../../engine/gacha";
import { gachaArt } from "../gachafx";
import { gachaItem } from "../../content/gacha";
import { entityAvatar, entityInfo } from "../components/entity";
import { levelMedal, rarityIcon } from "../badges";
import { Sound, sfx } from "../../audio/sound";
import { staffAvatar } from "../staffav";
import { CATS, KEYS, LABELS, STOCK_KEYS, tiersOf, type PartKey, type StockKey } from "../../content/game";
import { usedIdx } from "../../engine/progress";
import { REFILL, staffIds, fame, quickBuy, quickPrice, refill, refillCost, stockOf } from "../../engine/economy";
import { lvl, xpFor } from "../../engine/progress";
import {
  makeCustomer,
  beginShift, buildPicked, buildTotal, finishShift, freshBuild, goalDone, goalProgress, goalText, isComplete, isOver, matches, mineIdx, needAt, needOf, partAt, partsOfBuild, peek, release, remaining, serve, setPartAt, take, tick,
  COMBO_CAP, COMBO_LOSS, type Customer, type ServeResult, type Shift, applyService, autoService
} from "../../engine/shift";
import { S, petName, save } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { cakeAnySVG, charSVG, ingSVG } from "../art";
import { $, bump, coinPill, esc, floatText, haptic, hasModal, modal, toast } from "../dom";
import { himNote } from "../modals";
import { ic } from "../icons";
import { cloudSave } from "../../net/cloud";
import { navigate } from "../router";
import { applyQueue, queueHTML } from "./queue-fit";
import { doCatchMouse, doMousePay as payMouseFor, mouseChip, moveRat, openMouseDlg as openMouseDlgFor, removeRat, renderMouse } from "./play-mouse";
import { setResult } from "./result";
import { advanceSkills, SKILL_NAME } from "../../engine/skills";
import { runService, svcLabel } from "../minigames/session";

export let SH: Shift | null = null;
let raf = 0, lastT = 0, leftShown = -1, drop: PartKey | null = null, stageDrop: PartKey | null = null, stageFree = 0, lastComboLost = 0;

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
  const { sh, pay } = beginShift(); SH = sh; setResult(null);
  navigate("/choi", true);
  if (pay.hungry.length) setTimeout(() => toast(`${pay.hungry.map(petName).join(", ")} đói nên nghỉ ca này. Nhớ mua đồ ăn nha!`), 400);
  sfx("open"); Sound.play("shift"); void keepAwake(true);
}
export function resume() { if (SH) { SH.paused = false; lastT = performance.now(); } }
export function pause() { if (SH) SH.paused = true; }

/* Chuột vào tiệm: phần vẽ nằm ở play-mouse.ts, ở đây chỉ nối với ca đang chạy (SH) */
let mouseUiAt = 0;
export const openMouseDlg = () => openMouseDlgFor(SH);
export const doMousePay = () => payMouseFor(SH, refreshCoins);
const catchRat = () => doCatchMouse(SH, refreshCoins);

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
    moveRat(SH, dt, catchRat);
    if (SH.mouse && now - mouseUiAt > 250) { mouseUiAt = now; renderMouse(SH); }
    if (ev.spawned >= 0) { renderSlot(ev.spawned, true); sfx("bell"); }
    ev.left.forEach(onLeave);
    ev.claimed.forEach(b => renderSlot(b.seat));
    ev.baked.forEach(x => {
      showServed(x.res, x.baker.id);
      const a = autoService(SH!, x.res.c, x.res.price, x.baker.id);
      if (a) { refreshCoins(); toast(`${petName(x.baker.id)} ${a.msg}`); }
      else if (x.res.c.svc) offerService(x.res.c, x.res.price);
    });
    ev.restock.forEach(r => toast(`${petName(r.id)} nhập nhanh ${r.what}`));
    if (ev.assigned >= 0) { sheetOpen = true; renderTicket(); sfx("click"); }
    if (ev.claimed.length || ev.restock.length || ev.baked.length) { renderCrew(); refreshCoins(false); }
    SH.seats.forEach((c, i) => { if (c && !c.gone) updatePatience(c, i); });
    updateBaking();
    const left = remaining(SH);
    if (leftShown !== left) { leftShown = left; const e = $("#shLeft"); if (e) e.textContent = `Hàng đợi: còn ${left} khách`; const pb = $("#shBar"); if (pb && SH) pb.style.transform = `scaleX(${shiftPct(SH).toFixed(3)})`; }
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
      const i = el.querySelector("i"), t = el.querySelector(".pc");
      if (i) i.style.width = pct + "%";
      if (t) t.textContent = pct + "%";
    });
  });
  if (redraw) renderCrew();
}

/* ================= HTML thuần ================= */
/** cỡ mặt khách cố định: hàng đợi tự co cả ô bằng transform (queue-fit.ts) nên không cần đổi cỡ theo số bàn */
const faceSize = (_sh: Shift) => 62;
const cakeOf = (c: Customer, size: number) => cakeAnySVG({ base: c.r.base, cream: c.r.cream, top: c.r.top, up: c.r.up, sweet: c.sweet }, { size, still: true });
/** tiến độ ca: phần khách đã phục vụ hoặc đã đi trên tổng số khách dự kiến */
const shiftPct = (sh: Shift) => Math.min(1, (sh.served + sh.left) / Math.max(1, sh.total));
/* tầng đang chọn nguyên liệu (chỉ khác 0 với bánh nhiều tầng) */
let curTier = 0;
const BOX = ic.box(24, 2.1);
const CHEV = (up: boolean) => (up ? ic.chevU : ic.chevD)(16, 2.8, "none", "rose");
const TICK = ic.check(13, 3.2, "none", "");
const lowCount = () => STOCK_KEYS.reduce((a, k) => a + usedIdx(k).filter(i => stockOf(k, i) <= 2).length, 0);

/* một khách trong hàng đợi: hình bánh đã gọi (không ghi nguyên liệu), mặt, kiên nhẫn, ai đang làm */
export function slotHTML(sh: Shift, i: number, state: "" | "low" | "ok" = "") {
  const c = sh.seats[i]; if (!c) return "";
  const f = c.pat / c.max, S2 = faceSize(sh), mine = mineIdx(sh) === i;
  const b = c.by ? sh.bakers.find(x => x.id === c.by) : null, pct = b ? Math.round(b.done / b.need * 100) : 0;
  
  const bub = state === "ok" ? `<div class="bub ok">+${c.r.price}<small>xu</small></div>` : `<div class="bub">${cakeOf(c, S2 * 0.72)}<span class="sw" title="${CATS.sweet[c.sweet][0]}">${ingSVG("sweet", c.sweet, 19)}</span></div>`;
  
  const whoTag = c.by 
    ? `<div class="who by" data-bake="${c.by}">${staffAvatar(c.by, 20)}<span class="pc">${pct}%</span><i style="width:${pct}%"></i></div>`
    : mine ? `<div class="who me">Bạn</div>` : `<div class="who"></div>`;
    
  const rg = c.reg ? gachaItem(c.reg) : null, perk = [c.perkPrice ? `giá +${Math.round(c.perkPrice * 100)}%` : "", c.perkTip ? `tip +${Math.round(c.perkTip * 100)}%` : ""].filter(Boolean).join(" · ");
  const svc = c.svc ? `<i class="stag" title="Khách xin ${svcLabel(c.svc).toLowerCase()}">${c.svc === "ship" ? ic.right(11, 2.8) : ic.gift(11, 2.4)}${svcLabel(c.svc)}</i>` : "";
  const vip = rg ? `<i class="vtag vt-${rg.rarity}" title="Khách quen${perk ? ": " + perk : ""}">${rarityIcon(rg.rarity, 11)}Quen</i>` : "";
  
  return `${vip}${svc}${bub}<div class="face"><span class="fc">${charSVG(c.look, state === "ok" ? "love" : state === "low" ? "impatient" : c.mood || "happy", S2)}</span><div class="burst"></div></div>
    <div class="pat"><i style="transform:scaleX(${f.toFixed(3)});background:${f < 0.3 ? "#FF6F91" : f < 0.6 ? "#FFD66B" : "#8FD9B6"}"></i></div>
    <div class="nm">${c.him ? `<span class="hrt">♥︎</span>` : ""}${esc(c.who)}</div>${whoTag}`;
}

const slotClass = (sh: Shift, i: number, extra = "") => { const c = sh.seats[i]; return "slot" + (c ? "" : " empty") + (c && mineIdx(sh) === i ? " mine" : "") + (c?.by ? " taken" : "") + (c?.reg ? " reg reg-" + (gachaItem(c.reg)?.rarity ?? "common") : "") + (extra ? " " + extra : ""); };
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
    return `<button class="cm" data-crew="${id}" data-watch="${id}" aria-label="Xem ${esc(petName(id))} làm bánh">${(() => { const ei = entityInfo(id); return ei ? entityAvatar(ei, 34, b ? "happy" : sh.lack[id] ? "impatient" : "open") : staffAvatar(id, 38, "open"); })()}<div class="ct"><b>${esc(petName(id))}</b>${sub}</div>${cake}</button>`;
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
  /* mục tiêu ca: 3 ô ngang gọn (số tiến độ, tên, thanh, thưởng) thay cho danh sách dài */
  const goals = sh.goals.map(g => {
    const done = goalDone(sh, g), calm = g.id === "calm", cur = goalProgress(sh, g), fail = calm && sh.left > 0;
    const pct = calm ? (sh.left ? 0 : 100) : Math.min(100, Math.round(cur / g.n * 100));
    const num = calm ? (fail ? `${sh.left} giận` : "✓") : `${Math.min(cur, g.n)}/${g.n}`;
    return `<div class="flex flex-col items-center gap-1 rounded-2xl bg-white px-2 pb-2 pt-2.5 text-center shadow-[0_2px_0_#EBD9C2] ${done ? "text-mint-d" : fail ? "text-red" : "text-ink"}">
      <b class="font-display text-[15px] leading-none">${num}</b><small class="text-[11px] font-bold leading-tight text-soft">${goalText(g)}</small>
      <i class="block h-1.5 w-full overflow-hidden rounded-full bg-[#F1E6DA]"><u class="block h-full rounded-full no-underline ${done ? "bg-[#7FD1AE]" : "bg-[#FFC94D]"} transition-[width] duration-500" style="width:${pct}%"></u></i>
      <em class="text-[11px] font-black not-italic text-[#A77A0E]">+${g.reward}</em></div>`;
  }).join("");
  return `<div class="ihead"><div><b>Đang rảnh tay</b><small class="${busy ? "hint" : ""}">${busy ? "↑ Chạm vào khách để nhận đơn" : any ? "Các bé đang lo hết đơn rồi" : "Chờ khách vào tiệm…"}</small></div>${toggleHTML()}</div>
    <p class="text-center text-[13px] font-extrabold text-soft"><b class="text-ink">${sh.served}</b> khách vui · <b class="text-mint-d">+${fmtN(earned)}</b> xu · <b class="${sh.left ? "text-red" : "text-ink"}">${sh.left}</b> giận</p>
    <div class="grid grid-cols-3 gap-2" aria-label="Mục tiêu ca này">${goals}</div>
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
      <div class="lvbadge">${levelMedal(L, 46)}</div>
      <div class="pbar"><small>Ca ${S.shifts + 1}</small><div class="track"><i id="xpBar" style="width:${Math.min(100, cur / need * 100)}%"></i></div></div>
      ${coinPill(true, "shCoins")}
      <button class="rbtn box" data-act="stock" aria-label="Kho nguyên liệu">${BOX}<span class="dot" id="lowDot" ${low ? "" : "hidden"}>${low}</span></button>
      <button class="rbtn" data-act="pause" aria-label="Tạm dừng">❚❚</button>
    </div>
    <div class="qhead"><b id="shLeft">Hàng đợi: còn ${remaining(sh)} khách</b><span>✦ ${f.n} · ${sh.seats.length} bàn</span></div>
    <div class="mx-[18px] mb-1.5 h-1.5 overflow-hidden rounded-full bg-pink-l" role="progressbar" aria-label="Tiến độ ca" aria-valuenow="${Math.round(shiftPct(sh) * 100)}" aria-valuemin="0" aria-valuemax="100"><i id="shBar" class="block h-full origin-left rounded-full bg-mint-d transition-transform duration-500" style="transform:scaleX(${shiftPct(sh).toFixed(3)})"></i></div>
    <div id="comboBox">${comboHTML(sh)}</div>
    <div id="mouseBox">${mouseChip(sh)}</div>
    ${queueHTML(sh.seats.map((c, i) => ({ html: slotBtn(sh, i, opts.states?.[i] ?? ""), off: !c })), Math.min(innerWidth, 430) - 28, QUEUE_H0)}
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
/* ===== hàng đợi tự co (queue-fit.ts) ===== */
const QUEUE_H0 = 330;      // chiều cao tạm cho lần vẽ đầu và Storybook, ngay sau đó fitQueueNow() tính lại theo khung thật
let fitQ = 0;
/** xếp lại hàng đợi: chiều cao cho phép = phần còn lại của màn trừ chỗ phiếu order (đang mở) hoặc dải thợ bánh + mục tiêu (đang rảnh) */
function fitQueueNow() {
  const p = $("#play"), q = $("#queue"); if (!p || !q || !SH) return;
  const sheetH = () => ($("#ohead")?.offsetHeight ?? 90) + ($("#rows")?.scrollHeight ?? 220) + ($("#give")?.offsetHeight ?? 54) + 54;      // chiều cao tự nhiên của phiếu (không dùng scrollHeight của phiếu vì chiều cao đó phụ thuộc vào hàng đợi)
  const below = p.classList.contains("up") ? sheetH() - 20 : ($("#crewBox")?.offsetHeight ?? 0) + ($("#idle")?.offsetHeight ?? 0) + 70;
  const room = p.clientHeight - (q.getBoundingClientRect().top - p.getBoundingClientRect().top) - below - 12;
  applyQueue(q, q.clientWidth, Math.max(120, Math.min(room, p.clientHeight * 0.55)));
}
/** gộp nhiều lần gọi trong một khung hình */
const scheduleFit = () => { cancelAnimationFrame(fitQ); fitQ = requestAnimationFrame(fitQueueNow); };
export function renderPlay() {
  if (!SH) return;
  leftShown = -1; views.length = 0; lastComboLost = SH.comboLost;
  $("#app")!.innerHTML = playHTML(SH);
  SH.seats.forEach((_, i) => renderSlot(i));
  bindSheetDrag(); fitSheet(); fitQueueNow();
  requestAnimationFrame(() => $("#queue")?.classList.remove("nofx"));      // lần xếp đầu không trượt, các lần sau mới có chuyển động
  lastT = performance.now();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function renderSlot(i: number, enter = false) {
  const el = $("#seat" + i); if (!el || !SH) return;
  const c = SH.seats[i];
  el.closest(".cell")?.classList.toggle("off", !c);      // bàn trống thì ẩn, các khách còn lại được xếp lại và phóng to
  scheduleFit();
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
  renderCombo(); fitStage(); fitSheet(); scheduleFit();
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
window.addEventListener("resize", () => { if (SH) { fitSheet(); fitStage(); scheduleFit(); } });
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
  if (res.craftUp) toast(`Tay nghề ${"★".repeat(res.craftUp.star)} · ${res.c.r.n}! +${res.craftUp.reward} xu`);
  if (res.tierBonus) toast(`Bánh ${tiersOf(res.c.r)} tầng tự tay làm! +${res.tierBonus} xu thưởng`);
  const sh = SH;
  if (res.c.svc) offerService(res.c, res.price);
  setTimeout(() => { if (SH !== sh) return; resetBuild(); if (mineIdx(sh) >= 0) sheetOpen = true; renderBuild(); }, 900);
}

/* khách xin gói quà / giao hàng: tạm dừng ca, người chơi tự làm minigame (bánh do bé làm mà bé chưa thạo kỹ năng thì bạn làm phần gói/giao) */
const svcQueue: { sh: Shift; c: Customer; price: number }[] = []; let svcBusy = false;
function offerService(c: Customer, price: number) {
  if (!SH) return;
  svcQueue.push({ sh: SH, c, price }); pause(); nextService();
}
function nextService() {
  if (svcBusy) return;
  const q = svcQueue.shift(); if (!q) return;
  if (SH !== q.sh) return nextService();
  svcBusy = true;
  setTimeout(() => {
    if (SH !== q.sh) { svcBusy = false; return nextService(); }
    runService(q.c, q.price, (fee, ok, complaint) => {
      svcBusy = false;
      if (SH === q.sh) {
        applyService(q.sh, fee, ok); refreshCoins();
        if (ok) { sfx("coin"); toast(`${svcLabel(q.c.svc!)} xuất sắc! +${fmtN(fee)} xu thưởng`); }
        else { sfx("wrong"); toast(`${q.c.who} phàn nàn: "${complaint}" · mất thưởng`); }
        if (svcQueue.length) nextService(); else resume();
      }
    });
  }, 700);
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
  const res = { sh, lv: lvl(), led }; setResult(res); SH = null;
  advanceSkills(sh.working).forEach(u => setTimeout(() => toast(`${petName(u.id)} đã thạo ${SKILL_NAME[u.k].toLowerCase()}!`), 900));
  navigate("/ket-qua", true);
  sfx(res.lv > sh.lv0 ? "level" : "end");
  void cloudSave();
  Sound.play("home");
}

/* cho Storybook: đặt ca mẫu */
export const _setShift = (sh: Shift | null) => { SH = sh; };

/* chỉ khi chạy dev: móc để kiểm tra giao diện trong ca bằng tay */
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__play = { sh: () => SH, renderPlay, renderTicket, renderCombo, makeCustomer, take, fitStage, setSheet };
