/* Hàng đợi tự co theo số bàn: mỗi ô khách có kích thước thiết kế cố định (SLOT_W × SLOT_H) rồi được đặt bằng
   translate + scale (chỉ transform nên chạy trên GPU, không bắt trình duyệt tính lại bố cục mỗi khung hình).
   fitQueue() là hàm thuần chọn số cột và tỉ lệ; applyQueue() ghi kết quả vào DOM, CSS (.cell) lo phần chuyển động mượt. */
export const SLOT_W = 84, SLOT_H = 152;       // cỡ thiết kế của một ô khách (k = 1)
export const GAP = 8;
export const K_MAX = 1.25;                    // ít khách vẫn không phình quá to
export const K_MIN = 0.5;                     // nhỏ nhất vẫn chạm được (84 × 0,5 = 42px)
export const MAX_COLS = 9;

export interface QueueLayout { cols: number; rows: number; k: number; w: number; h: number; fits: boolean }
/** chọn số cột (3..MAX_COLS) cho ô to nhất mà n ô vẫn nằm vừa khung W × H; không vừa thì dùng K_MIN và để khung cao hơn H */
export function fitQueue(n: number, W: number, H: number): QueueLayout {
  const count = Math.max(1, n);
  let best: QueueLayout | null = null;
  for (let cols = Math.min(3, count); cols <= Math.min(MAX_COLS, count + 2); cols++) {
    const cw = (W - GAP * (cols - 1)) / cols, k = Math.min(K_MAX, cw / SLOT_W);
    if (k < K_MIN) break;
    const rows = Math.ceil(count / cols), h = rows * (SLOT_H * k + GAP) - GAP;
    if (h <= H && (!best || k > best.k + 1e-6)) best = { cols, rows, k, w: cols * SLOT_W * k + (cols - 1) * GAP, h, fits: true };
  }
  if (best) return best;
  const cols = Math.max(1, Math.min(MAX_COLS, Math.floor((W + GAP) / (SLOT_W * K_MIN + GAP)))), rows = Math.ceil(count / cols);
  return { cols, rows, k: K_MIN, w: cols * SLOT_W * K_MIN + (cols - 1) * GAP, h: rows * (SLOT_H * K_MIN + GAP) - GAP, fits: false };
}
/** mức hiển thị chữ theo tỉ lệ (giữ chữ không nhỏ hơn 11px): full có tên, mid chỉ còn avatar bé và %, mini chỉ mặt + bánh */
export const modeOf = (k: number) => (k >= 0.92 ? "full" : k >= 0.7 ? "mid" : "mini");

/** transform của ô thứ i trong khung rộng W (dàn giữa khi ô bị chặn ở K_MAX) */
export function cellTransform(L: QueueLayout, W: number, i: number) {
  const c = i % L.cols, r = Math.floor(i / L.cols), x = Math.max(0, (W - L.w) / 2) + c * (SLOT_W * L.k + GAP), y = r * (SLOT_H * L.k + GAP);
  return `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${L.k.toFixed(4)})`;
}
/** HTML tĩnh của hàng đợi đã đặt sẵn vị trí (Storybook và lần vẽ đầu dùng được ngay, chạy tiếp thì applyQueue chỉnh lại theo khung thật) */
export function queueHTML(cells: string[], W: number, H: number) {
  const L = fitQueue(cells.length, W, H);
  return `<div class="queue nofx" id="queue" data-mode="${modeOf(L.k)}" style="height:${Math.round(L.h)}px">${cells.map((c, i) => `<div class="cell" style="transform:${cellTransform(L, W, i)}">${c}</div>`).join("")}</div>`;
}
/** đặt lại từng .cell theo khung thật W × H; đổi k hoặc số cột thì CSS tự trượt và phóng mượt. Trả về layout để nơi gọi dùng tiếp */
export function applyQueue(queue: HTMLElement, W: number, H: number): QueueLayout {
  const cells = queue.querySelectorAll<HTMLElement>(":scope > .cell"), L = fitQueue(cells.length, W, H);
  cells.forEach((el, i) => { el.style.transform = cellTransform(L, W, i); });
  queue.style.height = `${Math.round(L.h)}px`;
  queue.dataset.mode = modeOf(L.k);
  return L;
}
/** Storybook (không có vòng lặp ca): xếp lại mọi hàng đợi đang có trên trang theo bề rộng thật, giữ chiều cao tạm */
export function fitAllQueues(H = 330) {
  document.querySelectorAll<HTMLElement>(".queue").forEach(q => applyQueue(q, q.clientWidth, H));
}
