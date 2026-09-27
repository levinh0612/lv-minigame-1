/* Màn Chơi và màn Kết quả: phần hiển thị. Luật chơi nằm ở engine/shift.ts.
   Các hàm *HTML là hàm thuần (chỉ đọc trạng thái, trả về chuỗi) để Storybook dùng lại. */
import { Sound, sfx } from "../../audio/sound";
import { CATS, KEYS, LABELS, PETS, RECIPES, STAFF, partsText, recipeOf, type PartKey, type StockKey } from "../../content/game";
import { daysTogether } from "../../engine/dates";
import { onDuty, quickBuy, quickPrice, stockOf } from "../../engine/economy";
import { giftReady, lvl, xpFor } from "../../engine/progress";
import {
  autoPrep, createShift, emptyBuild, finishShift, isComplete, isOver, ledger, needOf, remaining, serve, summary, targetIdx, tick,
  type Customer, type Shift
} from "../../engine/shift";
import { S, petName } from "../../engine/state";
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

// phần tử DOM của từng ghế, cache để vòng lặp không phải tìm lại mỗi khung hình
interface SeatView { el: HTMLElement; bar: HTMLElement; art: HTMLElement; cls: string }
const views: (SeatView | null)[] = [null, null, null];

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
  SH = createShift(); result = null;
  navigate("/choi", true);
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
    if (ev.spawned >= 0) { renderSeat(ev.spawned, true); sfx("bell"); prep(); }
    ev.left.forEach(onLeave);
    ev.rescued.forEach(onRescue);
    SH.seats.forEach((c, i) => { if (c && !c.gone) updatePatience(c, i); });
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
  if (c.mood !== mood && !(mood === "happy" && !c.mood)) { c.mood = mood; v.art.innerHTML = charSVG(c.look, mood, 84); }
}

/* ================= HTML thuần ================= */
export function seatHTML(c: Customer | null, i: number, state: "" | "tgt" | "low" | "ok" = "") {
  if (!c) return "";
  const f = c.pat / c.max;
  const ord = state === "ok"
    ? `<div class="ord ok">+3 ★ · +${c.r.price} xu<small>Cảm ơn nha!</small></div>`
    : `<div class="ord"><div class="rn">${esc(c.r.n)}</div><div>${esc(partsText(c.r))}</div><div class="sw">${CATS.sweet[c.sweet][0]}</div></div>`;
  return `<div class="burst"></div>${ord}
    <div class="who-art"><button data-seat="${i}" aria-label="Làm bánh cho ${esc(c.who)}">${charSVG(c.look, state === "ok" ? "love" : state === "low" ? "impatient" : c.mood || "happy", 84)}</button></div>
    <div class="pat"><i style="transform:scaleX(${f.toFixed(3)});background:${f < 0.3 ? "#FF6F91" : f < 0.6 ? "#FFD66B" : "#8FD9B6"}"></i></div><div class="nm">${c.him ? "♥︎ " : ""}${esc(c.who)}</div>`;
}

/* trạng thái 1 nút nguyên liệu: chọn đúng / sai / chưa chọn, còn bao nhiêu trong kho */
function chipState(sh: Shift, k: PartKey, i: number) {
  const b = sh.build, ti = targetIdx(sh), c = ti >= 0 ? sh.seats[ti] : null, n = c ? needOf(c) : null;
  const on = b[k] === i, st = !on ? "" : !n ? "on" : n[k] === i ? "ok" : "bad";
  const q = k === "sweet" ? -1 : stockOf(k as StockKey, i);
  return { cls: "chip" + (k === "sweet" ? " sq" : "") + (st ? " " + st : "") + (q === 0 && !on ? " out" : ""),
    mark: st === "ok" ? "✓" : st === "bad" ? "✕" : "", qty: q < 0 ? "" : q > 0 ? String(q) : `+${quickPrice(k as StockKey, i)} xu` };
}
const chipHTML = (sh: Shift, k: PartKey, i: number) => {
  const s = chipState(sh, k, i), [n, c] = CATS[k][i];
  return `<button class="${s.cls}" data-ing="${k}:${i}"><i style="background:${c}"></i><span class="cn">${n}</span><b class="q">${s.qty}</b><em>${s.mark}</em></button>`;
};
export function forBoxHTML(sh: Shift) {
  const ti = targetIdx(sh), b = sh.build, c = ti >= 0 ? sh.seats[ti] : null, made = recipeOf(b);
  return c
    ? `<small>Đang làm cho</small><b>${esc(c.who)}</b><div class="rc">${esc(c.r.n)}</div><div class="sw">${b.sweet != null ? CATS.sweet[b.sweet][0] : "Chọn độ ngọt"}</div>`
    : `<small>Chờ khách vào tiệm…</small><b>${made ? esc(made.n) : "Đĩa trống"}</b>`;
}
export const crewHTML = () => {
  const on = STAFF.filter(d => onDuty(d.id));
  return on.length ? `<div class="crew">${on.map(d => `<div class="cm" data-crew="${d.id}" title="${esc(petName(d.id))} · ${d.role}">${critterSVG({ ...PETS[d.id], ledge: false }, 34)}<small>${d.role}</small></div>`).join("")}</div>` : "";
};

export function playHTML(sh: Shift, opts: { done?: boolean; seatStates?: ("" | "tgt" | "low" | "ok")[] } = {}) {
  const L = lvl(), cur = S.xp - xpFor(L), need = xpFor(L + 1) - xpFor(L), ti = targetIdx(sh);
  return `<div class="scr play">
    <div class="ptop">
      <div class="lv">Lv${L}</div>
      <div class="pbar"><small id="shLeft">Ca ${S.shifts + 1} · còn ${remaining(sh)} khách</small><div class="track"><i id="xpBar" style="width:${Math.min(100, cur / need * 100)}%"></i></div></div>
      ${coinPill(true, "shCoins")}
      <button class="rbtn" data-act="pause" aria-label="Tạm dừng">❚❚</button>
    </div>
    <div class="lane">${[0, 1, 2].map(i => {
      const st = opts.seatStates?.[i] ?? "", c = sh.seats[i];
      return `<div class="seat ${i === ti ? "tgt" : ""} ${st === "low" ? "low" : ""}" id="seat${i}">${seatHTML(c, i, st)}</div>`;
    }).join("")}</div>
    <div class="ctr"></div>
    <div class="bench"><div id="cake">${cakeSVG(sh.build, { size: 136, done: opts.done })}</div><div class="for" id="forBox">${forBoxHTML(sh)}</div>${crewHTML()}</div>
    <div class="sheet">
      ${KEYS.map(k => `<div class="crow"><span>${LABELS[k]}</span><div class="g3">${CATS[k].map((_, i) => chipHTML(sh, k, i)).join("")}</div></div>`).join("")}
      <div class="grow" style="min-height:4px"></div>
      <button class="b3 give" id="give" data-act="serve" ${isComplete(sh.build) ? "" : "disabled"}>Giao bánh</button>
    </div>
  </div>`;
}

/* ================= Cập nhật DOM trong ca ================= */
export function renderPlay() {
  if (!SH) return;
  leftShown = -1;
  $("#app")!.innerHTML = playHTML(SH);
  SH.seats.forEach((_, i) => renderSeat(i));
  prep();
  lastT = performance.now();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}

function renderSeat(i: number, enter = false) {
  const el = $("#seat" + i); if (!el || !SH) return;
  const c = SH.seats[i];
  el.className = "seat" + (enter ? " enter" : "");
  el.innerHTML = seatHTML(c, i);
  views[i] = c ? { el, bar: el.querySelector<HTMLElement>(".pat i")!, art: el.querySelector<HTMLElement>(".who-art button")!, cls: "" } : null;
  renderTarget();
}

export function renderTarget() {
  if (!SH || !$("#forBox")) return;
  const ti = targetIdx(SH);
  SH.seats.forEach((_, k) => $("#seat" + k)?.classList.toggle("tgt", k === ti));
  $("#forBox")!.innerHTML = forBoxHTML(SH);
  document.querySelectorAll<HTMLElement>("[data-ing]").forEach(el => {
    const [k, i] = el.dataset.ing!.split(":") as [PartKey, string], s = chipState(SH!, k, +i);
    el.className = s.cls; el.querySelector("em")!.textContent = s.mark; el.querySelector(".q")!.textContent = s.qty;
  });
  $<HTMLButtonElement>("#give")!.disabled = !isComplete(SH.build);
}
function renderBuild(done = false) {
  if (!SH) return;
  $("#cake")!.innerHTML = cakeSVG(SH.build, { size: 136, done, drop });
  drop = null;
  renderTarget();
}
const refreshCoins = () => { const cp = $("#shCoins"); if (cp) { cp.querySelector("span:last-child")!.textContent = fmtN(S.coins); bump(cp, "pulse"); } };

/* Milo chọn sẵn nguyên liệu khi đổi sang khách mới */
function prep() {
  if (!SH) return;
  const done = autoPrep(SH);
  if (!done.length) return;
  drop = done[0]; renderBuild();
  bump($('[data-crew="dog"]'), "squish");
}

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
export function selectSeat(i: number) { if (!SH) return; SH.sel = SH.sel === i ? -1 : i; SH.prepFor = null; renderTarget(); prep(); sfx("click"); }

export function doServe() {
  if (!SH) return;
  const res = serve(SH);
  if (!res.ok) { sfx("wrong"); haptic([60, 40, 60]); return toast(res.msg); }
  const { idx, c, stars, price, tip } = res, v = views[idx]!;
  // thẻ gọi món thành xanh, khách thả tim, bánh nhắm mắt cười nhún nhảy, bắn tim
  v.el.querySelector(".ord")!.outerHTML = `<div class="ord ok">+${stars} ★ · +${price} xu${tip ? ` · tip ${tip}` : ""}<small>${c.him ? "Thương em!" : "Cảm ơn nha!"}</small></div>`;
  v.art.innerHTML = charSVG(c.look, "love", 84);
  v.el.classList.remove("low");
  v.el.querySelector(".burst")!.innerHTML = Array.from({ length: 14 }, (_, i) => {
    const a = i / 14 * Math.PI * 2, d = 55 + (i % 3) * 20;
    return `<i style="font-size:${14 + (i % 3) * 7}px;color:${["#FF8FAB", "#FFC94D", "#8FD9B6"][i % 3]};--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d).toFixed(1)}px">${i % 2 ? "♥︎" : "✦"}</i>`;
  }).join("");
  const r = v.el.getBoundingClientRect(); floatText(r.left + r.width / 2, r.top + 60, "+" + (price + tip));
  sfx("coin"); haptic(25); refreshCoins();
  if (onDuty("gold") && tip) bump($('[data-crew="gold"]'), "squish");
  const L = lvl(); $("#xpBar")!.style.width = Math.min(100, (S.xp - xpFor(L)) / (xpFor(L + 1) - xpFor(L)) * 100) + "%";
  renderBuild(true);
  const sh = SH;
  setTimeout(() => { if (SH !== sh) return; sh.build = emptyBuild(); sh.prepFor = null; renderBuild(); prep(); }, 900);
  setTimeout(() => {
    if (SH !== sh) return; v.el.classList.add("bye");
    setTimeout(() => { if (SH !== sh) return; sh.seats[idx] = null; renderSeat(idx); prep(); }, 450);
  }, 1300);
  if (c.him) setTimeout(() => { if (SH === sh) { pause(); himNote(c); } }, 700);
}

function onLeave(i: number) {
  const c = SH!.seats[i]!, v = views[i];
  if (v) { v.art.innerHTML = charSVG(c.look, "impatient", 84); v.el.classList.add("bye"); }
  sfx("leave"); haptic(30);
  const sh = SH; setTimeout(() => { if (SH !== sh) return; sh!.seats[i] = null; renderSeat(i); prep(); }, 500);
}
/* Cacao dỗ khách sắp giận */
function onRescue(i: number) {
  const v = views[i]; if (!v) return;
  const r = v.el.getBoundingClientRect(); floatText(r.left + r.width / 2 - 30, r.top + 90, `${petName("white")} dỗ ♥︎`);
  bump($('[data-crew="white"]'), "squish"); sfx("boop");
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
        ${row("Tiền bánh + tip", led.revenue, "+")}${row("Nguyên liệu đã dùng", led.ingUsed)}${row("Nhập nhanh", led.quick)}${row("Lương nhân viên", led.wages)}
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
