/* Hàng đợi theo bàn và lầu: ghế của ca (sh.seats) đã xếp theo bàn từ cao xuống thấp (economy.seatLevels),
   nên chỉ cần cắt dãy ghế theo số ghế của từng bàn, rồi gom bàn vào lầu. Hàm thuần để dễ kiểm tra. */
export interface TableGroup { n: number; lv: number; seats: number[] }
export interface FloorGroup { floor: number; tables: TableGroup[] }

/** Xếp bàn lên tầng giống cảnh 3D ở màn chính (shop3d: bàn thứ k nằm ở tầng k % số tầng, mỗi tầng tối đa perFloor bàn).
    tbl: cấp từng bàn (đúng thứ tự tableLvs), seatsOf: số ghế theo cấp. Ghế đánh số liên tục theo thứ tự bàn, nên ghế có số >= số ghế đang dùng trong ca là ghế dư. */
export function groupTables(tbl: number[], seatsOf: (lv: number) => number, floors: number, perFloor: number): FloorGroup[] {
  const nf = Math.max(1, floors), out: FloorGroup[] = Array.from({ length: nf }, (_, f) => ({ floor: f + 1, tables: [] })); let at = 0;
  tbl.forEach((lv, k) => {
    const n = seatsOf(lv), seats = Array.from({ length: n }, (_, j) => at + j); at += n;
    const f = out[k % nf]!; if (f.tables.length < Math.max(1, perFloor)) f.tables.push({ n: k + 1, lv, seats });
  });
  return out.filter(f => f.tables.length);
}
/** cỡ thu nhỏ của cả hàng đợi: vừa chiều cao còn trống thì thu lại, nhưng không nhỏ hơn K_MIN (dưới mức đó thì cuộn trong khung) */
export const K_MIN = 0.8;
export const fitK = (natural: number, room: number) => natural <= 0 ? 1 : Math.max(K_MIN, Math.min(1, room / natural));
/** thu nhỏ hàng đợi (zoom bên trong, khung ngoài cuộn khi vẫn không vừa) theo chiều cao còn trống */
export function fitQueueEl(queue: HTMLElement, room: number) {
  const qin = queue.querySelector<HTMLElement>(":scope > .qin"); if (!qin) return 1;
  qin.style.zoom = "1";
  const k = fitK(qin.offsetHeight, room);
  qin.style.zoom = String(k); queue.style.maxHeight = `${Math.round(room)}px`;
  return k;
}
/** Storybook (không có vòng lặp ca): xếp lại mọi hàng đợi đang có trên trang */
export const fitAllQueues = (room = 330) => document.querySelectorAll<HTMLElement>(".queue").forEach(q => fitQueueEl(q, room));
