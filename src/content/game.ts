/* Dữ liệu game theo thiết kế Claude Design (hướng 1a). Chỉ số 0..2 khớp với hình vẽ trong ui/art.ts */
import type { PetId } from "./couple";

export type PartKey = "base" | "cream" | "top" | "sweet";
export type Build = Record<PartKey, number | null>;
export const KEYS: PartKey[] = ["base", "cream", "top", "sweet"];
export const LABELS: Record<PartKey, string> = { base: "Đế", cream: "Kem", top: "Topping", sweet: "Độ ngọt" };
export const CATS: Record<PartKey, [string, string][]> = {
  base:  [["Bông lan", "#F6D59A"], ["Tart", "#D9A66B"], ["Mochi", "#FFF4EE"]],
  cream: [["Matcha", "#9CCB86"], ["Kem dâu", "#FFB3C7"], ["Vani", "#FFF0C2"]],
  top:   [["Dâu tây", "#F0506E"], ["Đậu đỏ", "#8E3B46"], ["Hạt dẻ", "#B07A4A"]],
  sweet: [["Ít ngọt", "#FFF7E3"], ["Vừa", "#FFE3A0"], ["Ngọt lịm", "#FFC94D"]]
};

export interface Recipe { id: string; n: string; base: number; cream: number; top: number; lv: number; price: number }
export const RECIPES: Recipe[] = ([
  // tên = Đế + Kem + Topping, đọc tên là biết bánh gồm gì
  ["Bông lan Matcha Dâu tây", 0, 0, 0], ["Mochi Kem dâu Dâu tây", 2, 1, 0], ["Tart Vani Hạt dẻ", 1, 2, 2],
  ["Bông lan Matcha Đậu đỏ", 0, 0, 1], ["Mochi Matcha Đậu đỏ", 2, 0, 1], ["Tart Kem dâu Dâu tây", 1, 1, 0],
  ["Bông lan Vani Hạt dẻ", 0, 2, 2], ["Mochi Vani Dâu tây", 2, 2, 0], ["Tart Matcha Hạt dẻ", 1, 0, 2]
] as [string, number, number, number][]).map(([n, base, cream, top], i) => ({ id: "r" + (i + 1), n, base, cream, top, lv: Math.max(1, i - 2), price: 16 + i * 2 }));
// Lv 1 mở sẵn 4 công thức, sau đó mỗi cấp mở thêm 1 (tới Lv 6)
export const recipeOf = (b: Build) => RECIPES.find(r => r.base === b.base && r.cream === b.cream && r.top === b.top);
export const partsText = (r: Recipe) => `${CATS.base[r.base][0]} · ${CATS.cream[r.cream][0]} · ${CATS.top[r.top][0]}`;

/* Nhân vật */
export type Mood = "happy" | "open" | "wink" | "impatient" | "love";
export interface CritterLook { kind: "cat" | "brit" | "dog" | "bunny" | "bear"; fur: string; pattern?: "none" | "tabby" | "patch" | "tux" | "shaded"; mark?: string; mark2?: string; ear?: string; eye?: string; fluffy?: boolean; bow?: string; wave?: boolean; paws?: boolean; ledge?: boolean; gender?: undefined }
export interface GuestLook { gender: "girl" | "boy"; hairStyle: "long" | "buns" | "short" | "cap"; hair: string; skin: string; accent: string; gesture: "rest" | "wave" | "cheek"; ledge?: boolean }
export type Look = CritterLook | GuestLook;

export const CRITTERS: (CritterLook & { n: string })[] = [
  { n: "Mèo Bơ",  kind: "cat",   fur: "#FFFFFF", pattern: "patch", mark: "#F2B266" },
  { n: "Thỏ Mây", kind: "bunny", fur: "#FFFFFF", bow: "#FF8FAB" },
  { n: "Gấu Mật", kind: "bear",  fur: "#E3B07A" },
  { n: "Mèo Mun", kind: "cat",   fur: "#FFFFFF", pattern: "tux", mark: "#5A4A48" },
  { n: "Cún Bơ",  kind: "dog",   fur: "#F6D59A", ear: "#D9A66B" },
  { n: "Thỏ Sữa", kind: "bunny", fur: "#FFF4EE" },
  { n: "Mèo Cam", kind: "cat",   fur: "#F4C57E", pattern: "tabby", mark: "#D9964A", bow: "#8FD9B6" },
  { n: "Gấu Sữa", kind: "bear",  fur: "#FFF4EE" }
];
export const PETS: Record<PetId, CritterLook> = {
  dog:   { kind: "dog", fur: "#FFFFFF", ear: "#F3ECE4", fluffy: true },
  gold:  { kind: "brit", fur: "#F3DDAE", pattern: "shaded", mark: "#DDB978", eye: "#7DBA5E" },
  white: { kind: "cat", fur: "#FFFFFF", eye: "#62AEE6" }
};
export const HIM: GuestLook = { gender: "boy", hairStyle: "short", hair: "#3B2A26", skin: "#FFE3D0", accent: "#8FD9B6", gesture: "cheek" };
export const HAIR = ["#3B2A26", "#6B4A3A", "#C98B5A", "#E7B872", "#8C6BB5", "#F29AB2", "#5C7A99"];
export const SKIN = ["#FFE9DA", "#FFE3D0", "#F7D1B5", "#E8B996", "#C98E6A"];
export const ACCENT = ["#FF8FAB", "#8FD9B6", "#FFD166", "#C9B8F0", "#9FD8F5"];

/* Đồ trang trí: pv = hình trong thẻ, rm = hình trong phòng */
export type FxKey = "pat" | "tip" | "price" | "pet" | "cust";
export const GUEST_LINES: Record<number, string[]> = {
  3:["Ngon xỉu, mai tui ghé nữa!","Bánh xinh mà vị cũng xinh luôn.","Làm nhanh ghê, 10 điểm!","Chủ tiệm dễ thương quá trời.","Ngọt vừa đúng gu, mê!"],
  2:["Ngon nè, chờ hơi lâu xíu thôi.","Bánh ổn áp, lần sau quay lại.","Tiệm xinh, bánh thơm."],
  1:["Bánh ngon mà tui chờ hơi lâu.","Tạm ổn, mong nhanh hơn chút."],
  0:["Chờ lâu quá tui đi mất tiêu...","Tiệm đông quá, hẹn lần sau nha."]
};
export const PET_LINES: Record<PetId, string[]> = {
  dog:["Gâu! (ý là ngon quá)","Gâu gâu! Cho Milo thêm miếng nữa!","*vẫy đuôi liên tục*"],
  gold:["Meo~ Siro nằm lên quầy luôn không đi.","Siro chấm 3 sao rồi đi ngủ tiếp.","*dụi má vào tay chủ tiệm*"],
  white:["Meo! Cacao ưng rồi đó.","*ngồi nghiêm túc canh khay bánh*","Meo meo, mai Cacao ghé nữa."]
};

/* ===== Kinh tế: nguyên liệu & nhân viên ===== */
export type StockKey = "base" | "cream" | "top";
export const STOCK_KEYS: StockKey[] = ["base", "cream", "top"];
// giá 1 phần nguyên liệu, theo chỉ số trong CATS (đường thì miễn phí)
export const UNIT_COST: Record<StockKey, number[]> = { base: [2, 3, 3], cream: [3, 2, 2], top: [3, 2, 3] };
export const PACKS = [{ n: 5, disc: 0 }, { n: 10, disc: 0.1 }];
export const QUICK_MULT = 1.5;    // nhập nhanh giữa ca: đắt hơn 50%
export const STARTER_STOCK = 8;   // kho tặng lúc đầu

/* Đồ ăn thú cưng: vừa là lương (mỗi ca 1 phần theo bậc), vừa để thưởng tăng thân thiết */
export type FoodId = "kibble" | "pate" | "chicken";
export interface Food { id: FoodId; n: string; cost: number; aff: number; c: string }
export const FOODS: Food[] = [
  { id: "kibble", n: "Hạt", cost: 6, aff: 3, c: "#C98B5A" },
  { id: "pate", n: "Pate", cost: 10, aff: 5, c: "#F2B266" },
  { id: "chicken", n: "Ức gà", cost: 15, aff: 8, c: "#F7C9A8" }
];
export const WELCOME = { coins: 300, food: { kibble: 5 } as Partial<Record<FoodId, number>> };

/* Thú cưng làm nhân viên: tự nhận đơn và làm bánh cho khách. Làm 1 bánh mất BAKE_TIME giây theo bậc.
   Lương mỗi ca = 1 phần ăn theo bậc: bậc 1 Hạt, bậc 2 Pate, bậc 3 Ức gà */
export const BAKE_TIME = [10, 7.5, 5];
const BAKE_TEXT: [string, string, string] = ["Tự nhận đơn, 10 giây một bánh", "Tự nhận đơn, 7,5 giây một bánh", "Tự nhận đơn, 5 giây một bánh"];
/* Độ nổi tiếng: càng nổi tiếng càng nhiều bàn, khách đến càng dày */
export const FAME = [
  { n: "Mới mở", seats: 3 }, { n: "Được biết đến", seats: 4 }, { n: "Đang hot", seats: 5 }, { n: "Viral", seats: 6 }
];
export interface StaffDef { id: PetId; role: string; unlock: number; train: [number, number]; effect: [string, string, string] }
export const STAFF: StaffDef[] = [
  { id: "dog", role: "Thợ bánh", unlock: 2, train: [120, 300], effect: BAKE_TEXT },
  { id: "gold", role: "Thợ bánh", unlock: 3, train: [150, 350], effect: BAKE_TEXT },
  { id: "white", role: "Thợ bánh", unlock: 4, train: [150, 350], effect: BAKE_TEXT }
];
