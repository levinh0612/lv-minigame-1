/* Hàng đợi tự co theo số bàn: mỗi ô khách có kích thước thiết kế cố định (SLOT_W × SLOT_H) rồi được đặt bằng
   translate + scale (chỉ transform nên chạy trên GPU, không bắt trình duyệt tính lại bố cục mỗi khung hình).
   fitQueue() là hàm thuần chọn số cột và tỉ lệ; applyQueue() ghi kết quả vào DOM, CSS (.cell) lo phần chuyển động mượt. */
export const SLOT_W = 84, SLOT_H = 152;       // cỡ thiết kế của một ô khách (k = 1)
export const GAP = 8;
export const K_MAX = 1.25;                    // ít khách vẫn không phình quá to
export const K_MIN = 0.5;                     // nhỏ nhất vẫn chạm được (84 × 0,5 = 42px)
export const MAX_COLS = 6;                    // iPhone (khung ~362px): 6 cột vẫn còn ô rộng ~54px, nhiều hơn thì mặt khách không còn nhìn rõ
export const K_FLOOR = 0.9;                   // trần chiều cao chỉ được ép ô nhỏ tới mức này (chiều rộng mới được ép thấp hơn)

export interface QueueLayout { cols: number; rows: number; k: number; w: number; h: number; fits: boolean }
/** chia n khách thành các dòng cân bằng: số cột ≈ √(2n) (bề ngang ô ≈ một nửa chiều cao nên lưới hơi ngang), chặn 2..MAX_COLS,
    rồi tính số dòng và chia lại cột cho đều để không có dòng cuối lẻ loi (8 khách → 4×2, 12 → 4×3, 30 → 6×5).
    Cỡ ô k = min(trần, vừa bề rộng, vừa chiều cao H nhưng không nhỏ hơn K_FLOOR); không vừa H thì khung cao hơn H và vùng này cuộn */
export function fitQueue(n: number, W: number, H: number): QueueLayout {
  const count = Math.max(1, n);
  let cols = count <= 3 ? count : Math.max(2, Math.min(MAX_COLS, Math.round(Math.sqrt(count * 2))));
  const widthK = (c: number) => (W - GAP * (c - 1)) / c / SLOT_W;
  while (cols > 2 && widthK(cols) < K_MIN) cols--;                 // màn hẹp: bớt cột cho ô còn chạm được
  const rows = Math.ceil(count / cols);
  cols = Math.ceil(count / rows);                                  // chia đều cột cho các dòng
  const kh = ((H + GAP) / rows - GAP) / SLOT_H;
  const k = Math.max(K_MIN, Math.min(K_MAX, widthK(cols), Math.max(kh, K_FLOOR))), h = rows * (SLOT_H * k + GAP) - GAP;
  return { cols, rows, k, w: cols * SLOT_W * k + (cols - 1) * GAP, h, fits: h <= H + 1e-6 };
}
/** mức hiển thị chữ theo tỉ lệ (giữ chữ không nhỏ hơn 11px): full có tên, mid chỉ còn avatar bé và %, mini chỉ mặt + bánh */
export const modeOf = (k: number) => (k >= 0.92 ? "full" : k >= 0.7 ? "mid" : "mini");

/** transform của ô thứ i trong khung rộng W (dàn giữa khi ô bị chặn ở K_MAX) */
export function cellTransform(L: QueueLayout, W: number, i: number) {
  const c = i % L.cols, r = Math.floor(i / L.cols), x = Math.max(0, (W - L.w) / 2) + c * (SLOT_W * L.k + GAP), y = r * (SLOT_H * L.k + GAP);
  return `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${L.k.toFixed(4)})`;
}
/** một ô của hàng đợi: bàn trống (off) thì ẩn đi và không chiếm chỗ, để khách còn lại được phóng to */
export interface QueueCell { html: string; off: boolean }
/** transform của ô đang ẩn: nằm ở chỗ trống kế tiếp, thu nhỏ lại, để lúc có khách mới ô nở ra từ đó */
const offTransform = (L: QueueLayout, W: number, i: number) => cellTransform({ ...L, k: L.k * 0.6 }, W, i);
/** xếp mọi ô: ô hiện chia chỗ theo thứ tự ghế, ô ẩn đứng chờ. Trả về layout (0 ô hiện thì chiều cao bằng 0) */
function place(cells: { off: boolean; set(transform: string, off: boolean): void }[], W: number, H: number) {
  const vis = cells.filter(c => !c.off), L = fitQueue(vis.length, W, H);
  let n = 0;
  cells.forEach(c => { c.off ? c.set(offTransform(L, W, vis.length), true) : c.set(cellTransform(L, W, n++), false); });
  return { L, visible: vis.length };
}
/** HTML tĩnh của hàng đợi đã đặt sẵn vị trí (Storybook và lần vẽ đầu dùng được ngay, chạy tiếp thì applyQueue chỉnh lại theo khung thật) */
export function queueHTML(cells: QueueCell[], W: number, H: number) {
  const tf: string[] = [], { L, visible } = place(cells.map((c, i) => ({ off: c.off, set: (t: string) => { tf[i] = t; } })), W, H);
  return `<div class="queue nofx" id="queue" data-mode="${modeOf(L.k)}" style="height:${visible ? Math.round(L.h) : 0}px">${cells.map((c, i) => `<div class="cell${c.off ? " off" : ""}" ${c.off ? "inert" : ""} style="transform:${tf[i]}">${c.html}</div>`).join("")}</div>`;
}
/** đặt lại từng .cell theo khung thật W × H (ô có class .off là bàn trống); đổi k hoặc số cột thì CSS tự trượt và phóng mượt */
export function applyQueue(queue: HTMLElement, W: number, H: number): QueueLayout {
  const els = [...queue.querySelectorAll<HTMLElement>(":scope > .cell")];
  const { L, visible } = place(els.map(el => ({ off: el.classList.contains("off"), set(t: string, off: boolean) { el.style.transform = t; el.toggleAttribute("inert", off); } })), W, H);
  queue.style.height = `${visible ? Math.round(L.h) : 0}px`;
  queue.dataset.mode = modeOf(L.k);
  return L;
}
/** Storybook (không có vòng lặp ca): xếp lại mọi hàng đợi đang có trên trang theo bề rộng thật, giữ chiều cao tạm */
export function fitAllQueues(H = 330) {
  document.querySelectorAll<HTMLElement>(".queue").forEach(q => applyQueue(q, q.clientWidth, H));
}
