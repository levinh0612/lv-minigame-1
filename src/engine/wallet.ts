/* Sổ thu chi: mọi lần cộng / trừ xu đi qua earn() và spend() để bảng Ví hiện đủ tiền thu được, tiền bị trừ. */
import { S } from "./state";

export type InCat = "sales" | "tip" | "memo" | "goal" | "gift" | "welcome" | "daily" | "comp";
export type OutCat = "stock" | "quick" | "decor" | "food" | "train" | "incident";
export const IN_LABEL: Record<InCat, string> = {
  sales: "Tiền bánh", tip: "Tip", memo: "Thưởng tự nhớ công thức", goal: "Thưởng mục tiêu ca", gift: "Quà mục tiêu ngày", welcome: "Quà khai trương", daily: "Thưởng đăng nhập mỗi ngày", comp: "Đền bù"
};
export const OUT_LABEL: Record<OutCat, string> = {
  stock: "Nhập nguyên liệu", quick: "Nhập nhanh giữa ca", decor: "Đồ trang trí", food: "Đồ ăn thú cưng", train: "Huấn luyện các bé", incident: "Sự cố bất ngờ"
};
export interface Entry { t: number; n: string; v: number }
export interface Book {
  in: Partial<Record<InCat, number>>; out: Partial<Record<OutCat, number>>;
  day: string; dayIn: number; dayOut: number;
  log: Entry[];
  start: number;           // số xu lúc bắt đầu ghi sổ (người chơi cũ)
}
export function freshBook(start = 0): Book { return { in: {}, out: {}, day: "", dayIn: 0, dayOut: 0, log: [], start }; }

function today() { const b = S.book; if (b.day !== S.daily.day) { b.day = S.daily.day; b.dayIn = 0; b.dayOut = 0; } return b; }
/* ghi một dòng lịch sử (giữ 30 dòng gần nhất) */
export function note(n: string, v: number) { if (!v) return; S.book.log.unshift({ t: Date.now(), n, v }); S.book.log.length = Math.min(S.book.log.length, 30); }

export function earn(cat: InCat, v: number, n?: string) {
  if (v <= 0) return;
  const b = today(); S.coins += v; b.in[cat] = (b.in[cat] || 0) + v; b.dayIn += v;
  if (n) note(n, v);
}
export function spend(cat: OutCat, v: number, n?: string) {
  if (v <= 0) return;
  const b = today(); S.coins -= v; b.out[cat] = (b.out[cat] || 0) + v; b.dayOut += v;
  if (n) note(n, -v);
}
export const totalIn = () => Object.values(S.book.in).reduce((a, x) => a + (x || 0), 0);
export const totalOut = () => Object.values(S.book.out).reduce((a, x) => a + (x || 0), 0);
