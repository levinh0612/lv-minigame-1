/* Màn Chơi và màn Kết quả: phần hiển thị. Luật chơi nằm ở engine/shift.ts */
import { Sound, sfx } from "../../audio/sound";
import { CATS, KEYS, LABELS, PETS, RECIPES, partsText, recipeOf, type PartKey } from "../../content/game";
import { daysTogether } from "../../engine/dates";
import { giftReady, lvl, xpFor } from "../../engine/progress";
import {
  createShift, emptyBuild, isComplete, isOver, needOf, remaining, serve, summary, targetIdx, tick,
  type Customer, type Shift
} from "../../engine/shift";
import { S, save } from "../../engine/state";
import { fmtN, pick } from "../../engine/util";
import { cakeSVG, charSVG, critterSVG } from "../art";
import { $, bump, coinPill, esc, floatText, toast } from "../dom";
import { himNote } from "../modals";
import { navigate } from "../router";
import { goalsList } from "./goals";

export let SH: Shift | null = null;
let raf = 0, lastT = 0, leftShown = -1, drop: PartKey | null = null;
let result: { sh: Shift; lv: number } | null = null;

// phần tử DOM của từng ghế, cache để vòng lặp không phải tìm lại mỗi khung hình
interface SeatView { el: HTMLElement; bar: HTMLElement; art: HTMLElement; cls: string }
const views: (SeatView | null)[] = [null, null, null];

export function startShift() {
  SH = createShift(); result = null;
  navigate("/choi", location.hash === "#/ket-qua");
  sfx("open"); Sound.play("shift");
}
export const hasResult = () => !!result;
export function resume() { if (SH) { SH.paused = false; lastT = performance.now(); } }
export function pause() { if (SH) SH.paused = true; }

function loop(now: number) {
  if (!SH) return;
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (!SH.paused) {
    const ev = tick(SH, dt);
    if (ev.spawned >= 0) { renderSeat(ev.spawned, true); sfx("bell"); }
    ev.left.forEach(onLeave);
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
  if (cls === "low") { c.mood = "impatient"; v.art.innerHTML = charSVG(c.look, "impatient", 84); }
}

export function renderPlay() {
  if (!SH) return;
  const L = lvl(), cur = S.xp - xpFor(L), need = xpFor(L + 1) - xpFor(L);
  leftShown = -1;
  $("#app")!.innerHTML = `<div class="scr play">
    <div class="ptop">
      <div class="lv">Lv${L}</div>
      <div class="pbar"><small id="shLeft">Ca ${S.shifts + 1} · còn ${remaining(SH)} khách</small><div class="track"><i id="xpBar" style="width:${Math.min(100, cur / need * 100)}%"></i></div></div>
      ${coinPill(true, "shCoins")}
      <button class="rbtn" data-act="pause" aria-label="Tạm dừng">❚❚</button>
    </div>
    <div class="lane">${[0, 1, 2].map(i => `<div class="seat" id="seat${i}"></div>`).join("")}</div>
    <div class="ctr"></div>
    <div class="bench"><div id="cake"></div><div class="for" id="forBox"></div></div>
    <div class="sheet">
      ${KEYS.map(k => `<div class="crow"><span>${LABELS[k]}</span><div class="g3">${CATS[k].map(([n, c], i) =>
        `<button class="chip ${k === "sweet" ? "sq" : ""}" data-ing="${k}:${i}"><i style="background:${c}"></i>${n}<em></em></button>`).join("")}</div></div>`).join("")}
      <div class="grow" style="min-height:4px"></div>
      <button class="b3 give" id="give" data-act="serve">Giao bánh</button>
    </div>
  </div>`;
  SH.seats.forEach((_, i) => renderSeat(i));
  renderBuild();
  lastT = performance.now();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}

function renderSeat(i: number, enter = false) {
  const el = $("#seat" + i); if (!el || !SH) return;
  const c = SH.seats[i];
  el.className = "seat" + (enter ? " enter" : "");
  if (!c) { el.innerHTML = ""; views[i] = null; renderTarget(); return; }
  el.innerHTML = `<div class="burst"></div>
    <div class="ord"><div class="rn">${esc(c.r.n)}</div><div>${esc(partsText(c.r))}</div><div class="sw">${CATS.sweet[c.sweet][0]}</div></div>
    <div class="who-art"><button data-seat="${i}" aria-label="Làm bánh cho ${esc(c.who)}">${charSVG(c.look, c.mood || "happy", 84)}</button></div>
    <div class="pat"><i style="transform:scaleX(${(c.pat / c.max).toFixed(3)})"></i></div><div class="nm">${c.him ? "♥︎ " : ""}${esc(c.who)}</div>`;
  views[i] = { el, bar: el.querySelector<HTMLElement>(".pat i")!, art: el.querySelector<HTMLElement>(".who-art button")!, cls: "" };
  renderTarget();
}

/* "Đang làm cho" + đánh dấu đúng/sai trên từng nút nguyên liệu */
export function renderTarget() {
  if (!SH || !$("#forBox")) return;
  const ti = targetIdx(SH), b = SH.build, c = ti >= 0 ? SH.seats[ti] : null, n = c ? needOf(c) : null;
  SH.seats.forEach((_, k) => $("#seat" + k)?.classList.toggle("tgt", k === ti));
  const made = recipeOf(b);
  $("#forBox")!.innerHTML = c
    ? `<small>Đang làm cho</small><b>${esc(c.who)}</b><div class="rc">${esc(c.r.n)}</div><div class="sw">${b.sweet != null ? CATS.sweet[b.sweet][0] : "Chọn độ ngọt"}</div>`
    : `<small>Chờ khách vào tiệm…</small><b>${made ? esc(made.n) : "Đĩa trống"}</b>`;
  document.querySelectorAll<HTMLElement>("[data-ing]").forEach(el => {
    const [k, i] = el.dataset.ing!.split(":") as [PartKey, string], on = b[k] === +i;
    const st = !on ? "" : !n ? "on" : n[k] === +i ? "ok" : "bad";
    el.className = "chip" + (k === "sweet" ? " sq" : "") + (st ? " " + st : "");
    el.querySelector("em")!.textContent = st === "ok" ? "✓" : st === "bad" ? "✕" : "";
  });
  $<HTMLButtonElement>("#give")!.disabled = !isComplete(b);
}
function renderBuild(done = false) {
  if (!SH) return;
  const b = SH.build;
  $("#cake")!.innerHTML = cakeSVG(b, { size: 136, done, drop });
  drop = null;
  renderTarget();
}

export function pickIngredient(k: PartKey, i: number) {
  if (!SH) return;
  const add = SH.build[k] !== i;
  SH.build[k] = add ? i : null; drop = add && k !== "sweet" ? k : null;
  renderBuild(); sfx(add ? "tap" : "untap");
}
export function selectSeat(i: number) { if (!SH) return; SH.sel = SH.sel === i ? -1 : i; renderTarget(); sfx("click"); }

export function doServe() {
  if (!SH) return;
  const res = serve(SH);
  if (!res.ok) { sfx("wrong"); return toast(res.msg); }
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
  sfx("coin");
  const cp = $("#shCoins")!; cp.querySelector("span:last-child")!.textContent = fmtN(S.coins); bump(cp, "pulse");
  const L = lvl(); $("#xpBar")!.style.width = Math.min(100, (S.xp - xpFor(L)) / (xpFor(L + 1) - xpFor(L)) * 100) + "%";
  renderBuild(true);
  const sh = SH;
  setTimeout(() => { if (SH !== sh) return; sh.build = emptyBuild(); renderBuild(); }, 900);
  setTimeout(() => {
    if (SH !== sh) return; v.el.classList.add("bye");
    setTimeout(() => { if (SH !== sh) return; sh.seats[idx] = null; renderSeat(idx); }, 450);
  }, 1300);
  if (c.him) setTimeout(() => { if (SH === sh) { pause(); himNote(c); } }, 700);
}

function onLeave(i: number) {
  const c = SH!.seats[i]!, v = views[i];
  if (v) { v.art.innerHTML = charSVG(c.look, "impatient", 84); v.el.classList.add("bye"); }
  sfx("leave");
  const sh = SH; setTimeout(() => { if (SH !== sh) return; sh!.seats[i] = null; renderSeat(i); }, 500);
}

export function endShift() {
  if (!SH) return;
  cancelAnimationFrame(raf);
  S.shifts++; save();
  result = { sh: SH, lv: lvl() }; SH = null;
  navigate("/ket-qua", true);
  sfx(result.lv > result.sh.lv0 ? "level" : "end");
  Sound.play("home");
}

export function resultHTML() {
  if (!result) return "";
  const { sh, lv } = result, { total, stars } = summary(sh);
  const newR = RECIPES.filter(r => r.lv > sh.lv0 && r.lv <= lv);
  const conf = Array.from({ length: 36 }, (_, i) => {
    const d = 3.5 + Math.random() * 3;
    return `<i style="left:${Math.random() * 100}%;width:${7 + Math.random() * 6}px;height:${10 + Math.random() * 8}px;background:${["#FF8FAB", "#8FD9B6", "#FFD66B", "#FFFFFF", "#C9B8F0"][i % 5]};border-radius:${Math.random() > 0.6 ? "50%" : "3px"};animation-duration:${d}s;animation-delay:${-Math.random() * d}s"></i>`;
  }).join("");
  return `<div class="scr res">
    <div class="conf" aria-hidden="true">${conf}</div>
    <div class="hd"><small>Ngày ${fmtN(daysTogether())} · Ca ${S.shifts}</small><h1>${["", "Cố lên nha!", "Giỏi lắm!", "Tuyệt vời!"][stars]}</h1>
      <div class="stars">${[1, 2, 3].map(i => `<span class="${i <= stars ? "" : "off"}">★</span>`).join("")}</div></div>
    <div class="rcard">
      <div class="mas">${critterSVG({ ...pick([PETS.white, PETS.gold, PETS.dog]), mood: "love" }, 88)}</div>
      <div class="kp"><div style="background:#FFF6DA"><b style="color:#A77A0E">+${fmtN(sh.coins)}</b><small>Xu</small></div><div style="background:var(--mint-bg)"><b style="color:var(--mint-d)">+${fmtN(sh.tips)}</b><small>Tip</small></div><div style="background:#FFE9EF"><b style="color:var(--pink-d)">${sh.served}/${total}</b><small>Khách vui</small></div></div>
      ${lv > sh.lv0 ? `<div class="lvup">Lên Lv ${lv}!${newR.length ? " Mở khoá: " + newR.map(r => esc(r.n)).join(", ") : ""}</div>` : ""}
      <div class="gl"><h4>Mục tiêu hôm nay</h4>${goalsList()}</div>
      ${unlockCard()}
    </div>
    <div class="rbtns"><button class="b3 w" style="flex:1" data-go="/">Về tiệm</button><button class="b3" style="flex:1.6" data-act="open">Bán tiếp</button></div>
  </div>`;
}
export const unlockCard = () => giftReady()
  ? `<button class="unlock" data-act="claim"><div class="env"></div><div><b>Mở khoá thư tình mới</b><small>Chạm để nhận quà hôm nay</small></div></button>`
  : S.daily.claimed ? `<div class="unlock"><div class="env"></div><div><b>Đã mở thư tình hôm nay</b><small>Đọc lại ở mục Quà tặng</small></div></div>` : "";
