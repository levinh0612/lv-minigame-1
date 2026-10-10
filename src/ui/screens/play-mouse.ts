/* Chuột vào tiệm trong ca: hộp thoại đuổi chuột, thanh cảnh báo, trả tiền xử lý nhanh. Luật chơi ở engine/mouse.ts.
   Các hàm nhận `sh` (ca đang chạy) làm tham số để file này không phải import ngược play.ts. */
import { sfx } from "../../audio/sound";
import { T_FINE, T_PERFECT, T_WARN, catchMouse, mouseFine, mousePay, mouseRank, mouseStage, payMouse } from "../../engine/mouse";
import type { Shift } from "../../engine/shift";
import { S, petName } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { $, dropModal, esc, floatText, haptic, modal, toast } from "../dom";

const RAT_W = 140, RAT_H = 52;   // ảnh chuột 640x240 thu nhỏ
/* chạm vào khung: hiện cái vợt vung xuống đúng chỗ chạm (trúng chuột hay trượt đều có) */
function swingNet(arena: HTMLElement, e: PointerEvent) {
  const b = arena.getBoundingClientRect(), n = document.createElement("img");
  n.src = "/game/net.png"; n.alt = ""; n.className = "net"; n.draggable = false;
  n.style.left = e.clientX - b.left + "px"; n.style.top = e.clientY - b.top + "px";
  arena.appendChild(n); setTimeout(() => n.remove(), 520);
}
interface Rat { el: HTMLElement; x: number; y: number; a: number; turn: number }
let rat: Rat | null = null;
export function removeRat() { rat?.el.remove(); rat = null; if ($("#ratArena")) dropModal(); const b = $("#mouseBox"); if (b) b.innerHTML = ""; }
/* chuột chạy trong khung của hộp thoại; nhanh lúc mới vào rồi chậm dần theo thời gian */
export function moveRat(sh: Shift | null, dt: number, onCatch: () => void) {
  if (!sh?.mouse) { if (rat) removeRat(); return; }
  const arena = $("#ratArena"); if (!arena) { rat = null; return; }
  const box = arena.getBoundingClientRect(), SZ = RAT_W;
  if (!rat || !rat.el.isConnected) {
    const el = document.createElement("button"); el.id = "rat"; el.className = "rat"; el.setAttribute("aria-label", "Bắt chuột"); el.innerHTML = `<img src="/game/rat.png" alt="" draggable="false">`; arena.appendChild(el);
    el.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); swingNet(arena, e); onCatch(); });
    rat = { el, x: -SZ + 1, y: box.height * (.2 + Math.random() * .5), a: -.2 + Math.random() * .4, turn: 0 };
  }
  const k = box.width / 390, age = sh.mouse.age, speed = Math.max(55, 420 - age * 12) * k;
  rat.turn -= dt; if (rat.turn <= 0) { rat.a += (Math.random() - .5) * 2.2; rat.turn = .35 + Math.random() * .8; }
  rat.x += Math.cos(rat.a) * speed * dt; rat.y += Math.sin(rat.a) * speed * dt;
  const W = box.width - SZ, H = box.height - RAT_H;
  if (rat.x < 0 && rat.x > -SZ + 2) { rat.x = 0; rat.a = Math.PI - rat.a; } else if (rat.x > W) { rat.x = W; rat.a = Math.PI - rat.a; }
  if (rat.y < 0) { rat.y = 0; rat.a = -rat.a; } else if (rat.y > H) { rat.y = H; rat.a = -rat.a; }
  rat.el.style.transform = `translate(${rat.x.toFixed(1)}px,${rat.y.toFixed(1)}px) scaleX(${Math.cos(rat.a) > 0 ? -1 : 1})`;
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
export const mouseChip = (sh: Shift) => sh.mouse ? `<button class="mhud chip s-${mouseStage(sh.mouse)}" data-act="mouseopen">🐭 Chuột đang chạy trong tiệm · chạm để bắt (${Math.max(0, Math.ceil(T_FINE - sh.mouse.age))}s)</button>` : "";
export function openMouseDlg(sh: Shift | null) {
  if (!sh?.mouse) return;
  modal(`<h2>🐭 Chuột vào tiệm!</h2><div id="mouseInfo">${mouseInfo(sh)}</div><div class="arena" id="ratArena"></div>`);
  $("#ratArena")?.addEventListener("pointerdown", e => swingNet(e.currentTarget as HTMLElement, e));
}
export function renderMouse(sh: Shift | null) {
  if (!sh) return;
  const i = $("#mouseInfo"); if (i) i.innerHTML = mouseInfo(sh);
  const b = $("#mouseBox"); if (b) b.innerHTML = mouseChip(sh);
}
/** người chơi chạm trúng chuột; refreshCoins cập nhật số xu trên màn ca */
export function doCatchMouse(sh: Shift | null, refreshCoins: () => void) {
  if (!sh?.mouse) return;
  const r = rat?.el.getBoundingClientRect(), res = catchMouse(sh); removeRat(); if (!res) return;
  if (res.kind === "perfect") {
    sfx("level"); haptic([30, 30, 60]); if (r) floatText(r.left, r.top - 6, `+${res.reward}`);
    toast(`Bắt kịp chuột! Vua diệt chuột hạng ${res.rank}${res.rankUp ? " (vừa lên hạng!)" : ""} · +${res.reward} xu`); refreshCoins();
  } else { sfx("coin"); toast("Bắt được chuột rồi, may mà chưa ai thấy"); }
}
export function doMousePay(sh: Shift | null, refreshCoins: () => void) {
  if (!sh?.mouse) return; const c = payMouse(sh);
  if (c == null) return toast(sh.mouse.age < T_PERFECT ? "Cố bắt chuột trước đã nha" : "Không đủ xu để xử lý nhanh");
  removeRat(); sfx("coin"); refreshCoins(); toast(`Đã gọi người xử lý chuột nhanh: −${fmtN(c)} xu`);
}
