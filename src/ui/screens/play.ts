/* Màn Chơi và màn Kết quả: phần hiển thị. Luật chơi nằm ở engine/shift.ts.
   Các hàm *HTML là hàm thuần (chỉ đọc trạng thái, trả về chuỗi) để Storybook dùng lại. */
import { Sound, sfx } from "../../audio/sound";
import type { PetId } from "../../content/couple";
import { CATS, KEYS, LABELS, PETS, RECIPES, STAFF, STOCK_KEYS, type PartKey, type StockKey } from "../../content/game";
import { daysTogether } from "../../engine/dates";
import { fame, quickBuy, quickPrice, stockOf } from "../../engine/economy";
import { giftReady, lvl, xpFor } from "../../engine/progress";
import {
  beginShift, emptyBuild, finishShift, isComplete, isOver, ledger, mineIdx, needOf, peek, remaining, serve, summary, take, tick,
  type Customer, type ServeResult, type Shift
} from "../../engine/shift";
import { S, petName, save } from "../../engine/state";
import { fmtN, pick } from "../../engine/util";
import { cakeSVG, charSVG, critterSVG } from "../art";
import { $, bump, coinPill, esc, floatText, haptic, toast } from "../dom";
import { himNote } from "../modals";
import { navigate } from "../router";
import { goalsList } from "./goals";

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
    if (ev.assigned >= 0) { renderTicket(); sfx("click"); }
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
const faceSize = (sh: Shift) => ({ 3: 78, 4: 66, 5: 58, 6: 50 } as Record<number, number>)[sh.seats.length] ?? 50;
const sweetIcon = (i: number) => `<i class="cube" style="background:${CATS.sweet[i][1]}"></i>`;
const cakeOf = (c: Customer, size: number) => cakeSVG({ base: c.r.base, cream: c.r.cream, top: c.r.top, sweet: c.sweet }, { size, still: true });

/* một khách trong hàng đợi: bong bóng hình bánh đã gọi (không ghi nguyên liệu), mặt, kiên nhẫn, ai đang làm */
export function slotHTML(sh: Shift, i: number, state: "" | "low" | "ok" = "") {
  const c = sh.seats[i]; if (!c) return "";
  const f = c.pat / c.max, S2 = faceSize(sh), mine = mineIdx(sh) === i;
  const b = c.by ? sh.bakers.find(x => x.id === c.by) : null, pct = b ? Math.round(b.done / b.need * 100) : 0;
  const bub = state === "ok" ? `<div class="bub ok">+${c.r.price}<small>xu</small></div>` : `<div class="bub">${cakeOf(c, S2 * 0.62)}</div>`;
  const who = c.by ? `<div class="who by" data-bake="${c.by}">${critterSVG({ ...PETS[c.by], ledge: false }, 18)}<span>${pct}%</span><i style="width:${pct}%"></i></div>`
    : mine ? `<div class="who me">Bạn</div>` : `<div class="who"></div>`;
  return `<div class="burst"></div>${bub}
    <button class="face" data-seat="${i}" aria-label="${c.by ? `${esc(petName(c.by))} đang làm cho ${esc(c.who)}` : `Nhận đơn của ${esc(c.who)}`}">${charSVG(c.look, state === "ok" ? "love" : state === "low" ? "impatient" : c.mood || "happy", S2)}</button>
    <div class="pat"><i style="transform:scaleX(${f.toFixed(3)});background:${f < 0.3 ? "#FF6F91" : f < 0.6 ? "#FFD66B" : "#8FD9B6"}"></i></div>
    <div class="nm">${c.him ? "♥︎ " : ""}${esc(c.who)}</div>${who}`;
}
const slotClass = (sh: Shift, i: number, extra = "") => { const c = sh.seats[i]; return "slot" + (c && mineIdx(sh) === i ? " mine" : "") + (c?.by ? " taken" : "") + (extra ? " " + extra : ""); };

/* Đơn của bạn: hình bánh + tên + độ ngọt; nguyên liệu ẩn tới khi bấm Xem công thức */
export function ticketHTML(sh: Shift) {
  const m = mineIdx(sh), c = m >= 0 ? sh.seats[m] : null;
  const toggle = `<button class="toggle ${S.autoTake ? "on" : ""}" data-act="auto" role="switch" aria-checked="${S.autoTake}"><span>Tự nhận đơn</span><i></i></button>`;
  if (!c) {
    const any = sh.seats.some(x => x && !x.gone), busy = sh.seats.some(x => x && !x.gone && !x.by);
    return `<div class="th"><b>Đơn của bạn</b>${toggle}</div><div class="tb idle"><b>Đang rảnh tay</b><small>${
      busy ? "Chạm vào một khách ở trên để nhận đơn" : any ? "Các bé đang lo hết đơn rồi" : "Chờ khách vào tiệm…"}</small></div>`;
  }
  const ings = STOCK_KEYS.map(k => `<span><i style="background:${CATS[k][c.r[k]][1]}"></i>${CATS[k][c.r[k]][0]}</span>`).join("");
  return `<div class="th"><b>Đơn của bạn</b>${toggle}</div>
    <div class="tb">${cakeOf(c, 86)}<div class="ti"><b>${esc(c.r.n)}</b><small>cho ${esc(c.who)}</small>
      <div class="sweet">${sweetIcon(c.sweet)}${CATS.sweet[c.sweet][0]}</div>
      ${sh.peek ? `<div class="ings">${ings}</div>` : `<div class="peekrow"><button class="peek" data-act="peek">Xem công thức</button><span class="bonus">Tự nhớ: +50% thưởng</span></div>`}</div></div>`;
}

/* nút nguyên liệu: chỉ hiện đúng/sai khi đã xem công thức; luôn hiện số tồn kho */
function chipState(sh: Shift, k: PartKey, i: number) {
  const b = sh.build, m = mineIdx(sh), c = m >= 0 ? sh.seats[m] : null, n = c && sh.peek ? needOf(c) : null;
  const on = b[k] === i, st = !on ? "" : !n ? "on" : n[k] === i ? "ok" : "bad";
  const q = k === "sweet" ? -1 : stockOf(k as StockKey, i);
  return { cls: "chip" + (k === "sweet" ? " sq" : "") + (st ? " " + st : "") + (q === 0 && !on ? " out" : ""),
    mark: st === "ok" ? "✓" : st === "bad" ? "✕" : "", qty: q < 0 ? "" : q > 0 ? String(q) : `+${quickPrice(k as StockKey, i)} xu` };
}
const chipHTML = (sh: Shift, k: PartKey, i: number) => {
  const s = chipState(sh, k, i), [n, c] = CATS[k][i];
  return `<button class="${s.cls}" data-ing="${k}:${i}"><i style="background:${c}"></i><span class="cn">${n}</span><b class="q">${s.qty}</b><em>${s.mark}</em></button>`;
};

/* cột thợ bánh: mỗi bé đang làm cho ai, bao nhiêu phần trăm, hoặc thiếu gì */
export function crewHTML(sh: Shift) {
  const ids = STAFF.map(d => d.id).filter(id => sh.working.includes(id));
  if (!ids.length) return `<div class="crew empty"><small>Chưa có bé nào đi làm</small></div>`;
  return `<div class="crew">${ids.map(id => {
    const b = sh.bakers.find(x => x.id === id), c = b ? sh.seats[b.seat] : null, pct = b ? Math.round(b.done / b.need * 100) : 0;
    const status = b && c ? `<small>Làm cho ${esc(c.who)}</small><div class="pb" data-bake="${id}"><i style="width:${pct}%"></i><span>${pct}%</span></div>`
      : sh.lack[id] ? `<small class="bad">Thiếu ${esc(sh.lack[id]!)}</small>` : `<small>Đang rảnh</small>`;
    return `<div class="cm ${b ? "busy" : ""}" data-crew="${id}">${critterSVG({ ...PETS[id], mood: b ? "happy" : sh.lack[id] ? "impatient" : "open", ledge: false }, 32)}<div class="ct"><b>${esc(petName(id))}</b>${status}</div></div>`;
  }).join("")}</div>`;
}

export function playHTML(sh: Shift, opts: { done?: boolean; states?: ("" | "low" | "ok")[] } = {}) {
  const L = lvl(), cur = S.xp - xpFor(L), need = xpFor(L + 1) - xpFor(L), f = fame();
  return `<div class="scr play">
    <div class="ptop">
      <div class="lv">Lv${L}</div>
      <div class="pbar"><small id="shLeft">Ca ${S.shifts + 1} · còn ${remaining(sh)} khách</small><div class="track"><i id="xpBar" style="width:${Math.min(100, cur / need * 100)}%"></i></div></div>
      ${coinPill(true, "shCoins")}
      <button class="rbtn" data-act="pause" aria-label="Tạm dừng">❚❚</button>
    </div>
    <div class="qhead"><b>Hàng đợi</b><span>✦ ${f.n} · ${sh.seats.length} bàn</span></div>
    <div class="queue" style="--n:${sh.seats.length}">${sh.seats.map((_, i) => `<div class="${slotClass(sh, i, opts.states?.[i] === "low" ? "low" : "")}" id="seat${i}">${slotHTML(sh, i, opts.states?.[i] ?? "")}</div>`).join("")}</div>
    <div class="ticket" id="ticket">${ticketHTML(sh)}</div>
    <div class="bench"><div class="plate"><div id="cake">${cakeSVG(sh.build, { size: 112, done: opts.done })}</div></div><div id="crewBox">${crewHTML(sh)}</div></div>
    <div class="sheet">
      ${KEYS.map(k => `<div class="crow"><span>${LABELS[k]}</span><div class="g3">${CATS[k].map((_, i) => chipHTML(sh, k, i)).join("")}</div></div>`).join("")}
      <button class="b3 give" id="give" data-act="serve" ${isComplete(sh.build) ? "" : "disabled"}>Giao bánh</button>
    </div>
  </div>`;
}

/* ================= Cập nhật DOM trong ca ================= */
export function renderPlay() {
  if (!SH) return;
  leftShown = -1; views.length = 0;
  $("#app")!.innerHTML = playHTML(SH);
  SH.seats.forEach((_, i) => renderSlot(i));
  lastT = performance.now();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function renderSlot(i: number, enter = false) {
  const el = $("#seat" + i); if (!el || !SH) return;
  const c = SH.seats[i];
  el.className = slotClass(SH, i, enter ? "enter" : "");
  el.innerHTML = slotHTML(SH, i);
  views[i] = c ? { el, bar: el.querySelector<HTMLElement>(".pat i")!, art: el.querySelector<HTMLElement>(".face")!, cls: "" } : null;
}
const renderCrew = () => { const b = $("#crewBox"); if (b && SH) b.innerHTML = crewHTML(SH); };
/* thẻ Đơn của bạn + đánh dấu khách của mình + nút nguyên liệu */
export function renderTicket() {
  if (!SH || !$("#ticket")) return;
  $("#ticket")!.innerHTML = ticketHTML(SH);
  SH.seats.forEach((c, i) => {
    const el = $("#seat" + i); if (!el || !c || c.gone) return;
    const was = el.classList.contains("mine"), now = mineIdx(SH!) === i;
    if (was !== now) { el.classList.toggle("mine", now); const w = el.querySelector(".who"); if (w && !c.by) w.outerHTML = now ? `<div class="who me">Bạn</div>` : `<div class="who"></div>`; }
    el.classList.toggle("taken", !!c.by);
  });
  document.querySelectorAll<HTMLElement>("[data-ing]").forEach(el => {
    const [k, i] = el.dataset.ing!.split(":") as [PartKey, string], s = chipState(SH!, k, +i);
    el.className = s.cls; el.querySelector("em")!.textContent = s.mark; el.querySelector(".q")!.textContent = s.qty;
  });
  $<HTMLButtonElement>("#give")!.disabled = !isComplete(SH.build);
}
function renderBuild(done = false) {
  if (!SH) return;
  $("#cake")!.innerHTML = cakeSVG(SH.build, { size: 112, done, drop });
  drop = null;
  renderTicket();
}
const refreshCoins = (pulse = true) => { const cp = $("#shCoins"); if (cp) { cp.querySelector("span:last-child")!.textContent = fmtN(S.coins); if (pulse) bump(cp, "pulse"); } };

export function pickIngredient(k: PartKey, i: number) {
  if (!SH) return;
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
  if (take(SH, i)) { renderTicket(); sfx("click"); }
}
export function doPeek() { if (!SH || mineIdx(SH) < 0) return; peek(SH); renderTicket(); sfx("tap"); }
export function toggleAuto() {
  S.autoTake = !S.autoTake; save();
  if (SH) renderTicket();
  toast(S.autoTake ? "Tự nhận đơn: bật. Làm xong sẽ được gán đơn mới" : "Rảnh tay: các bé nhận hết, chạm vào khách để tự làm");
}

export function doServe() {
  if (!SH) return;
  const res = serve(SH);
  if (!res.ok) { sfx("wrong"); haptic([60, 40, 60]); renderTicket(); return toast(res.msg); }
  showServed(res);
  renderBuild(true);
  if (res.bonus) toast(`Nhớ công thức giỏi quá! +${res.bonus} xu thưởng`);
  const sh = SH;
  setTimeout(() => { if (SH !== sh) return; sh.build = emptyBuild(); renderBuild(); }, 900);
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
  Sound.play("home");
}

/* ================= Màn Kết quả ================= */
export function resultHTML(r: Result | null = result) {
  if (!r) return "";
  const { sh, lv, led } = r, { total, stars } = summary(sh);
  const newR = RECIPES.filter(x => x.lv > sh.lv0 && x.lv <= lv);
  const conf = Array.from({ length: 36 }, (_, i) => {
    const d = 3.5 + Math.random() * 3;
    return `<i style="left:${Math.random() * 100}%;width:${7 + Math.random() * 6}px;height:${10 + Math.random() * 8}px;background:${["#FF8FAB", "#8FD9B6", "#FFD66B", "#FFFFFF", "#C9B8F0"][i % 5]};border-radius:${Math.random() > 0.6 ? "50%" : "3px"};animation-duration:${d}s;animation-delay:${-Math.random() * d}s"></i>`;
  }).join("");
  const row = (n: string, v: number, sign = "−") => v ? `<div class="lg"><span>${n}</span><b>${sign}${fmtN(v)}</b></div>` : "";
  return `<div class="scr res">
    <div class="conf" aria-hidden="true">${conf}</div>
    <div class="hd"><small>Ngày ${fmtN(daysTogether())} · Ca ${S.shifts}</small><h1>${["", "Cố lên nha!", "Giỏi lắm!", "Tuyệt vời!"][stars]}</h1>
      <div class="stars">${[1, 2, 3].map(i => `<span class="${i <= stars ? "" : "off"}">★</span>`).join("")}</div></div>
    <div class="rcard">
      <div class="mas">${critterSVG({ ...pick([PETS.white, PETS.gold, PETS.dog]), mood: "love" }, 88)}</div>
      <div class="kp"><div style="background:#FFF6DA"><b style="color:#A77A0E">${led.profit >= 0 ? "+" : ""}${fmtN(led.profit)}</b><small>Lãi</small></div><div style="background:var(--mint-bg)"><b style="color:var(--mint-d)">+${fmtN(sh.tips)}</b><small>Tip</small></div><div style="background:#FFE9EF"><b style="color:var(--pink-d)">${sh.served}/${total}</b><small>Khách vui</small></div></div>
      <div class="ledger">
        ${row("Tiền bánh + tip", sh.coins + sh.tips, "+")}${row("Thưởng nhớ công thức", sh.bonus, "+")}${row("Nguyên liệu đã dùng", led.ingUsed)}${row("Nhập nhanh", led.quick)}${row("Lương thú cưng (đồ ăn)", led.wages)}
        <div class="lg tot"><span>Lãi ca này</span><b>${led.profit >= 0 ? "+" : ""}${fmtN(led.profit)} xu</b></div>
      </div>
      ${lv > sh.lv0 ? `<div class="lvup">Lên Lv ${lv}!${newR.length ? " Mở khoá: " + newR.map(x => esc(x.n)).join(", ") : ""}${STAFF.filter(d => d.unlock > sh.lv0 && d.unlock <= lv).map(d => ` · ${esc(petName(d.id))} xin vào làm ${d.role.toLowerCase()}`).join("")}</div>` : ""}
      <div class="gl"><h4>Mục tiêu hôm nay</h4>${goalsList()}</div>
      ${unlockCard()}
    </div>
    <div class="rbtns"><button class="b3 w" style="flex:1" data-go="/">Về tiệm</button><button class="b3" style="flex:1.6" data-go="/chuan-bi" data-replace>Bán tiếp</button></div>
  </div>`;
}
export const unlockCard = () => giftReady()
  ? `<button class="unlock" data-act="claim"><div class="env"></div><div><b>Mở khoá thư tình mới</b><small>Chạm để nhận quà hôm nay</small></div></button>`
  : S.daily.claimed ? `<div class="unlock"><div class="env"></div><div><b>Đã mở thư tình hôm nay</b><small>Đọc lại ở mục Quà tặng</small></div></div>` : "";

/* cho Storybook: đặt kết quả mẫu */
export const _setResult = (r: Result | null) => { result = r; };
export const _setShift = (sh: Shift | null) => { SH = sh; };
