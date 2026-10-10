/* Tiện ích DOM dùng chung: hộp thoại, thông báo, hiệu ứng tim bay */
import { ic } from "./icons";
import { levelColor } from "./badges";
import { S } from "../engine/state";
import { fmtN, pick, rnd } from "../engine/util";

export const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s);
export const esc = (s: unknown) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

let onClose: (() => void) | null = null;
/* Hộp thoại kiểu iOS: trượt từ dưới lên, kéo thanh trên cùng xuống để đóng.
   lock = true: không có nút ✕, không đóng được bằng chạm nền hay kéo xuống, chỉ đóng bằng nút trong hộp thoại */
export function modal(html: string, cb?: () => void, lock = false) {
  onClose = cb || null;
  $("#layer")!.innerHTML = `<div class="modal${lock ? " locked" : ""}" id="modal"><div class="mbox" role="dialog" aria-modal="true"><div class="mhead"><div class="grabber" aria-hidden="true"></div>${lock ? "" : `<button class="mx" data-close aria-label="Đóng">✕</button>`}</div><div class="mscroll">${html}</div></div></div>`;
  document.documentElement.classList.add("mlock");        // khoá cuộn trang phía sau (iPhone kéo cả app)
  const box = $<HTMLElement>("#modal .mbox")!, head = box.querySelector(".mhead")!, body = box.querySelector(".mscroll")!;
  // tiêu đề (+ dòng mô tả ngay sau) lên phần đầu cố định; hàng nút cuối xuống phần chân cố định
  const h2 = body.firstElementChild?.tagName === "H2" ? body.firstElementChild : null;
  if (h2) { const sub = h2.nextElementSibling; head.appendChild(h2); if (sub?.classList.contains("sub")) head.appendChild(sub); }
  // hàng nút nằm trong form: đưa ra chân, nút submit vẫn gắn với form qua thuộc tính form=""
  const last = body.lastElementChild, form = last?.tagName === "FORM" ? last as HTMLFormElement : null;
  const foot = form ? (form.lastElementChild?.classList.contains("mbtns") ? form.lastElementChild : null) : last;
  if (foot?.classList.contains("mbtns")) {
    if (form) { form.id ||= "mform"; foot.querySelectorAll<HTMLButtonElement>("button").forEach(b => { if (b.type === "submit") b.setAttribute("form", form.id); }); }
    const f = document.createElement("div"); f.className = "mfoot"; f.appendChild(foot); box.appendChild(f);
  }
  if (!lock) dragToClose(box, head as HTMLElement);
  // vuốt trên nền tối / phần đầu / chân: không để iPhone kéo cả trang phía sau; phần giữa vẫn cuộn được
  $("#modal")!.addEventListener("touchmove", e => {
    const sc = (e.target as HTMLElement).closest<HTMLElement>(".mscroll");
    if (!sc || sc.scrollHeight <= sc.clientHeight) e.preventDefault();
  }, { passive: false });
}
/* chỉ kéo ở phần đầu (thanh kéo + tiêu đề) mới đóng; phần giữa để cuộn nội dung */
function dragToClose(box: HTMLElement, head: HTMLElement) {
  let y0: number | null = null, dy = 0;
  head.addEventListener("pointerdown", e => {
    if ((e.target as HTMLElement).closest("button, input, textarea, select, label")) return;
    y0 = e.clientY; dy = 0; box.style.transition = "none"; head.setPointerCapture(e.pointerId);
  });
  head.addEventListener("pointermove", e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); box.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (y0 == null) return; y0 = null; box.style.transition = ""; box.style.transform = "";
    if (dy > 70 && box.closest("#modal")) closeModal();
  };
  head.addEventListener("pointerup", end); head.addEventListener("pointercancel", end);
}
/* trượt xuống rồi mới gỡ (hộp thoại mới mở ngay sau đó không bị ảnh hưởng) */
function dismiss() {
  const m = $("#modal"); if (!m) return;
  m.removeAttribute("id"); m.classList.add("out");
  setTimeout(() => { m.remove(); if (!$("#modal")) document.documentElement.classList.remove("mlock"); }, 220);
}
export function closeModal() { dismiss(); const cb = onClose; onClose = null; cb?.(); }
/* đóng mà không chạy callback (khi chuyển thẳng sang màn khác) */
export function dropModal() { onClose = null; dismiss(); }
export const modalLocked = () => !!$("#modal.locked");
export const hasModal = () => !!$("#modal");

/* Toast kiểu Sonner: xếp chồng (mới nhất ở trên, cũ thu nhỏ lùi sau), trượt vào/ra mượt, vuốt lên hoặc chạm để tắt */
const MAX_TOAST = 3;
function layoutToasts(wrap: HTMLElement) {
  [...wrap.children].reverse().forEach((el, i) => {
    (el as HTMLElement).style.setProperty("--i", String(i));
    if (i >= MAX_TOAST) dismissToast(el as HTMLElement);
  });
}
function dismissToast(el: HTMLElement) {
  if (el.dataset.gone) return; el.dataset.gone = "1";
  clearTimeout(+(el.dataset.t || 0));
  el.classList.add("out");
  window.setTimeout(() => { const w = el.parentElement; el.remove(); if (w) layoutToasts(w); }, 260);
}
export function toast(m: string) {
  let wrap = document.querySelector<HTMLElement>(".tstw");
  if (!wrap) { wrap = document.createElement("div"); wrap.className = "tstw"; wrap.setAttribute("role", "status"); wrap.setAttribute("aria-live", "polite"); document.body.appendChild(wrap); }
  const t = document.createElement("div"); t.className = "tst"; t.textContent = m;
  let y0 = 0;
  t.onpointerdown = e => { y0 = e.clientY; t.setPointerCapture(e.pointerId); };
  t.onpointermove = e => { if (y0) t.style.setProperty("--dy", Math.min(0, e.clientY - y0) + "px"); };
  t.onpointerup = e => { const dy = e.clientY - y0; y0 = 0; t.style.removeProperty("--dy"); if (dy < -20 || Math.abs(dy) < 4) dismissToast(t); };
  wrap.appendChild(t); layoutToasts(wrap);
  t.dataset.t = String(window.setTimeout(() => dismissToast(t), 3200));
}
export function floatHearts(x: number, y: number, n: number) {
  for (let i = 0; i < n; i++) {
    const h = document.createElement("div"); h.className = "fh";
    h.textContent = pick(["♥︎", "✦", "♥︎"]); h.style.color = pick(["#FF8FAB", "#FFC94D", "#8FD9B6", "#FF6F91"]);
    h.style.fontSize = 16 + Math.random() * 10 + "px";
    h.style.left = x - 10 + rnd(-20, 20) + "px"; h.style.top = y + rnd(-10, 10) + "px";
    h.style.setProperty("--dx", rnd(-40, 40) + "px"); h.style.animationDelay = i * 60 + "ms";
    document.body.appendChild(h); setTimeout(() => h.remove(), 1300 + i * 60);
  }
}
export function floatText(x: number, y: number, s: string) {
  const h = document.createElement("div"); h.className = "coinfly"; h.textContent = s;
  h.style.left = x - 14 + "px"; h.style.top = y + "px";
  document.body.appendChild(h); setTimeout(() => h.remove(), 1000);
}
/* rung nhẹ (Android); iPhone không hỗ trợ nên bỏ qua */
export function haptic(p: number | number[]) { if (S.vibe) try { navigator.vibrate?.(p); } catch { /* bỏ qua */ } }
export function bump(el: Element | null, cls: string) {
  if (!el) return; el.classList.remove(cls); void (el as HTMLElement).offsetWidth; el.classList.add(cls);
}

export const coinPill = (sm = false, id = "", plus = false) => `<button class="pill coin ${sm ? "sm" : ""}" ${id ? `id="${id}"` : ""} data-act="wallet" aria-label="Ví: ${fmtN(S.coins)} xu"><span class="coin-i"></span><span>${fmtN(S.coins)}</span>${plus ? `<i class="plus5">${ic.plus(13, 3.2)}</i>` : ""}</button>`;
export const backBtn = `<button class="rbtn back" data-go="/" aria-label="Về tiệm">←</button>`;
/* huy hiệu cấp tiệm + thanh kinh nghiệm */
export const levelChip = (L: number, cur: number, need: number) =>
  `<button class="lvchip" data-go="/muc-tieu" aria-label="Tiệm cấp ${L}, ${cur}/${need} kinh nghiệm"><span class="lvb" style="--lvc:${levelColor(L)}">Lv ${L}</span><span class="lvt"><i style="width:${Math.min(100, cur / need * 100)}%"></i></span><small>${cur}/${need}</small></button>`;
export const hearts = (n: number) => { const k = Math.min(5, Math.floor(n / 10)); return "♥".repeat(k) + "♡".repeat(5 - k); };
/* 5 trái tim thân thiết (10 điểm = 1 tim) */
export const heartRow = (n: number, S = 15) => { const k = Math.min(5, Math.floor(n / 10));
  return Array.from({ length: 5 }, (_, i) => i < k ? ic.heart(S, 2, "#FF7FA1", "pink") : ic.heart(S, 2, "none", "pink").replace('class="lu', 'class="lu hollow')).join(""); };
export const twinkles = (cols: string[], n: number) => `<div class="twk" aria-hidden="true">${Array.from({ length: n }, (_, i) =>
  `<i style="left:${6 + Math.random() * 88}%;top:${8 + Math.random() * 60}%;font-size:${10 + Math.random() * 14}px;color:${cols[i % cols.length]};animation-duration:${2 + Math.random() * 2}s;animation-delay:${-Math.random() * 3}s">✦</i>`).join("")}</div>`;

/** Nút mở hộp thoại chỉ số của tiệm (thay cho hàng 3 số cũ), dùng chung cho màn của mình và màn ghé thăm */
export const shopStatsHTML = (who: "self" | "visit" = "self") =>
  `<button class="mt-2 block w-full rounded-full bg-pink-l py-1.5 text-[13px] font-extrabold text-pink-d" data-stats="${who}">📊 Xem chỉ số</button>`;

/* Hỏi lại trước khi chi khoản lớn (từ CONFIRM_MIN xu): lớp nhỏ phủ lên trên, không đụng tới hộp thoại đang mở bên dưới */
export const CONFIRM_MIN = 500;
export function confirmSpend(cost: number, what: string, ok: () => void) {
  if (cost < CONFIRM_MIN) return ok();
  document.getElementById("cfm")?.remove();
  const el = document.createElement("div"); el.id = "cfm"; el.className = "cfm";
  el.innerHTML = `<div class="cfm-box" role="alertdialog" aria-modal="true" aria-label="Xác nhận chi xu"><b>${esc(what)}</b>
    <p>Sẽ trừ <strong>${fmtN(cost)} xu</strong>${S.coins >= cost ? `, còn lại ${fmtN(S.coins - cost)} xu` : ""}.</p>
    <div class="cfm-btns"><button type="button" data-cfm="no">Để sau</button><button type="button" class="yes" data-cfm="yes">Đồng ý · ${fmtN(cost)} xu</button></div></div>`;
  el.addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-cfm]");
    if (!b && e.target !== el) return;
    e.stopPropagation(); el.remove(); if (b?.dataset.cfm === "yes") ok();
  });
  document.body.appendChild(el);
}
