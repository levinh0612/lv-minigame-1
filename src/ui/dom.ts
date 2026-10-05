/* Tiện ích DOM dùng chung: hộp thoại, thông báo, hiệu ứng tim bay */
import { ic } from "./icons";
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

let toastT = 0;
export function toast(m: string) {
  clearTimeout(toastT);
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div"); t.className = "toast"; t.textContent = m;
  document.body.appendChild(t); toastT = window.setTimeout(() => t.remove(), 3200);
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
  `<button class="lvchip" data-go="/muc-tieu" aria-label="Tiệm cấp ${L}, ${cur}/${need} kinh nghiệm"><span class="lvb">Lv ${L}</span><span class="lvt"><i style="width:${Math.min(100, cur / need * 100)}%"></i></span><small>${cur}/${need}</small></button>`;
export const hearts = (n: number) => { const k = Math.min(5, Math.floor(n / 10)); return "♥".repeat(k) + "♡".repeat(5 - k); };
/* 5 trái tim thân thiết (10 điểm = 1 tim) */
export const heartRow = (n: number, S = 15) => { const k = Math.min(5, Math.floor(n / 10));
  return Array.from({ length: 5 }, (_, i) => `<svg width="${S}" height="${Math.round(S * 14 / 15)}" viewBox="0 0 16 14" aria-hidden="true"><path d="M8 13 C4 10 1 7.5 1 4.5 C1 2 3 1 4.7 1 C6.2 1 7.4 2 8 3 C8.6 2 9.8 1 11.3 1 C13 1 15 2 15 4.5 C15 7.5 12 10 8 13 Z" fill="${i < k ? "#FF7FA1" : "#FFF"}" stroke="#4A3438" stroke-width="1.4"/></svg>`).join(""); };
export const twinkles = (cols: string[], n: number) => `<div class="twk" aria-hidden="true">${Array.from({ length: n }, (_, i) =>
  `<i style="left:${6 + Math.random() * 88}%;top:${8 + Math.random() * 60}%;font-size:${10 + Math.random() * 14}px;color:${cols[i % cols.length]};animation-duration:${2 + Math.random() * 2}s;animation-delay:${-Math.random() * 3}s">✦</i>`).join("")}</div>`;
