/* Ghé thăm tiệm hàng xóm: luật phí và ảnh chụp công khai của tiệm đang tham quan.
   Phí vé = 2% số xu của khách (tối thiểu 10, tối đa 100) mỗi tiệm một lần mỗi ngày; chủ tiệm nhận 70% làm tiền mừng.
   Server (api/visit.ts) là nơi tính thật, phần này để hiển thị và kiểm tra; hai nơi phải khớp. */
export const FEE_PCT = 0.02, FEE_MIN = 10, FEE_MAX = 100, GIFT_PCT = 0.7;
export const visitFee = (coins: number) => Math.min(FEE_MAX, Math.max(FEE_MIN, Math.round(Math.max(0, coins) * FEE_PCT)));
export const hostGift = (fee: number) => Math.floor(fee * GIFT_PCT);

export interface VisitShop {
  username: string; lv: number; earned: number; shop: string; served: number; decor: number; hired: number; stars?: number;
  /* chỉ số công khai thêm (server cũ chưa gửi thì không có) */
  shifts?: number; streak?: number; made?: number; perfect?: number; tower?: number; elite?: number; mastered?: number; upgrades?: number; collected?: number;
  room: Record<string, string>; me: Record<string, string>;
  venue: { tbl: number[]; floors: number; wide: number };
}
let cur: VisitShop | null = null;
export const visiting = () => cur;
export const setVisiting = (s: VisitShop | null) => { cur = s; };
/** sức chứa (ghế) của một tiệm theo danh sách cấp bàn: cấp 1 có 2 ghế, cấp 2 có 3, cấp 3 có 4 */
export const seatsOfTables = (tbl: number[]) => tbl.reduce((a, l) => a + 1 + l, 0);
