/* Trang trí tiệm (DecorScreen của Claude Design): 8 nhóm, mỗi nhóm chọn một kiểu.
   Món số 0 / món đầu là mặc định (miễn phí). Hiệu ứng chỉ tính cho món đang dùng. */
import type { FxKey } from "./game";

export type RoomKey = "wall" | "floor" | "counter" | "curtain" | "lamp" | "wallItem" | "plant" | "rug";
export type Room = Record<RoomKey, string>;
export interface RoomItem { v: string; n: string; cost: number; sw: string; sws?: string; glyph?: string; fx?: Partial<Record<FxKey, number>> }
export interface RoomCat { k: RoomKey; n: string; hl: string; items: RoomItem[] }

const NONE = "#F6F0F2";
export const ROOM_CATS: RoomCat[] = [
  { k: "wall", n: "Tường", hl: "wall", items: [
    { v: "pink", n: "Sọc hồng", cost: 0, sw: "repeating-linear-gradient(90deg,#FFE6EC 0 8px,#FFDDE5 8px 16px)" },
    { v: "mint", n: "Sọc bạc hà", cost: 120, sw: "repeating-linear-gradient(90deg,#E4F6EC 0 8px,#D8F0E3 8px 16px)", fx: { tip: .05 } },
    { v: "cream", n: "Kem chấm bi", cost: 160, sw: "radial-gradient(#FFD9A8 2.5px,transparent 3px) #FFF6E3", sws: "12px 12px", fx: { tip: .05 } },
    { v: "lavender", n: "Ô vuông tím", cost: 200, sw: "linear-gradient(90deg,#E4DBFF 1.5px,transparent 1.5px),linear-gradient(#E4DBFF 1.5px,transparent 1.5px),#F4F0FF", sws: "12px 12px", fx: { tip: .05 } }] },
  { k: "floor", n: "Sàn", hl: "rug", items: [
    { v: "check", n: "Caro bạc hà", cost: 0, sw: "repeating-conic-gradient(#DDF4E8 0 25%,#CBEDDB 0 50%)", sws: "20px 20px" },
    { v: "wood", n: "Gỗ ấm", cost: 180, sw: "repeating-linear-gradient(90deg,#EFCB9E 0 18px,#E7BD8B 18px 20px)", fx: { pat: .05 } },
    { v: "tile", n: "Gạch hồng", cost: 150, sw: "repeating-conic-gradient(#FFE3EA 0 25%,#FFFFFF 0 50%)", sws: "16px 16px", fx: { pat: .05 } }] },
  { k: "counter", n: "Quầy", hl: "counter", items: [
    { v: "pink", n: "Quầy dâu", cost: 0, sw: "repeating-linear-gradient(90deg,#FFB3C7 0 10px,#FFC7D5 10px 20px)" },
    { v: "mint", n: "Quầy matcha", cost: 220, sw: "repeating-linear-gradient(90deg,#9FDCC0 0 10px,#B6E6CF 10px 20px)", fx: { price: .05 } },
    { v: "wood", n: "Quầy gỗ", cost: 200, sw: "repeating-linear-gradient(90deg,#D9A66B 0 10px,#E3B47D 10px 20px)", fx: { price: .05 } }] },
  { k: "curtain", n: "Rèm", hl: "curtain", items: [
    { v: "0", n: "Không rèm", cost: 0, sw: NONE, glyph: "–" },
    { v: "1", n: "Ren hồng", cost: 90, sw: "repeating-linear-gradient(90deg,#FF9FB6 0 8px,#fff 8px 16px)", fx: { pat: .10 } },
    { v: "2", n: "Caro xanh", cost: 110, sw: "repeating-conic-gradient(#8FD9B6 0 25%,#fff 0 50%)", sws: "12px 12px", fx: { pat: .10 } }] },
  { k: "lamp", n: "Đèn", hl: "lamp", items: [
    { v: "0", n: "Không đèn", cost: 0, sw: NONE, glyph: "–" },
    { v: "1", n: "Đèn mây", cost: 180, sw: "radial-gradient(circle at 35% 55%,#FFF7DC 12px,transparent 13px),radial-gradient(circle at 62% 45%,#FFF7DC 15px,transparent 16px),#FFE9EF", fx: { tip: .10 } },
    { v: "2", n: "Dây đèn sao", cost: 140, sw: "radial-gradient(#FFF1A8 4px,transparent 5px) #FFE9EF", sws: "14px 14px", fx: { tip: .15 } }] },
  { k: "wallItem", n: "Treo tường", hl: "wall", items: [
    { v: "0", n: "Để trống", cost: 0, sw: NONE, glyph: "+" },
    { v: "1", n: "Khung ảnh đôi", cost: 150, sw: "radial-gradient(circle,#FFD1DC 14px,#FFE9B8 15px)", fx: { price: .10 } },
    { v: "2", n: "Đồng hồ mèo", cost: 170, sw: "radial-gradient(circle,#FFF3F6 12px,#fff 13px,#fff 20px,#FFE3EA 21px)", fx: { pat: .10 } }] },
  { k: "plant", n: "Cây", hl: "plant", items: [
    { v: "0", n: "Không cây", cost: 0, sw: NONE, glyph: "+" },
    { v: "1", n: "Sen đá", cost: 90, sw: "radial-gradient(ellipse at 50% 40%,#9FD18A 12px,transparent 13px),linear-gradient(transparent 60%,#E9A27C 60%) #EEF9F3", fx: { tip: .04 } },
    { v: "2", n: "Monstera", cost: 160, sw: "radial-gradient(ellipse at 50% 38%,#6FB27A 16px,transparent 17px),linear-gradient(transparent 66%,#FFF3F6 66%) #EEF9F3", fx: { tip: .04, cust: 1 } }] },
  { k: "rug", n: "Thảm", hl: "rug", items: [
    { v: "0", n: "Không thảm", cost: 0, sw: NONE, glyph: "–" },
    { v: "1", n: "Thảm tròn", cost: 120, sw: "radial-gradient(ellipse,#FFD1DC 50%,#fff 52%,#fff 56%,#FFD1DC 58%,#FFD1DC 66%,transparent 68%) #DDF4E8", fx: { cust: 1 } },
    { v: "2", n: "Thảm dâu", cost: 190, sw: "radial-gradient(#FFF1A8 2px,transparent 2.5px) #FF8FAB", sws: "10px 8px", fx: { cust: 1, tip: .05 } }] }
];

export const DEFAULT_ROOM: Room = { wall: "pink", floor: "check", counter: "pink", curtain: "0", lamp: "0", wallItem: "0", plant: "0", rug: "0" };
export const roomCat = (k: RoomKey) => ROOM_CATS.find(c => c.k === k)!;
export const roomItem = (k: RoomKey, v: string) => roomCat(k).items.find(i => i.v === v) ?? roomCat(k).items[0];
export const isDefault = (k: RoomKey, v: string) => roomCat(k).items[0].v === v;

const FX_TXT: Record<FxKey, (n: number) => string> = {
  pat: n => `khách chờ lâu hơn ${Math.round(n * 100)}%`, tip: n => `tip +${Math.round(n * 100)}%`, price: n => `giá bánh +${Math.round(n * 100)}%`,
  cust: n => `+${n} khách mỗi ca`
};
export const fxText = (it: RoomItem) => Object.entries(it.fx || {}).map(([k, n]) => FX_TXT[k as FxKey](n!)).join(", ");

/* đồ trang trí bản 2.x → nhóm mới (món nào cũng có chỗ, không cần hoàn xu) */
export const OLD_TO_ROOM: Record<string, [RoomKey, string]> = {
  curtain: ["curtain", "1"], lamp: ["lamp", "1"], bell: ["lamp", "2"], chair: ["rug", "1"], flags: ["rug", "2"],
  plant: ["plant", "1"], teapot: ["counter", "mint"], frame: ["wallItem", "1"]
};
