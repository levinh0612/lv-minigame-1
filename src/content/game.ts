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
/** Khách: nam hoặc nữ, vẽ bằng ảnh `sprite` (xem SPRITES) và tô lại màu theo hair/skin/eye/coat/shirt */
export interface GuestLook { gender: "girl" | "boy"; sprite: string; hair?: string; skin?: string; eye?: string; coat?: string; shirt?: string; ledge?: boolean }
/** Thú cưng của tiệm: mỗi biểu cảm là một ảnh riêng (public/chars/pets/<id>-<mood>.png) */
export interface PetLook { pet: PetId; wave?: boolean; ledge?: boolean; paws?: boolean }
export type Look = GuestLook;

export const PETS: Record<PetId, PetLook> = { dog: { pet: "dog" }, gold: { pet: "gold" }, white: { pet: "white" } };
/** cỡ ảnh thú cưng (mọi biểu cảm cùng cỡ) */
export const PET_SIZE: Record<PetId, [number, number]> = { dog: [256, 241], gold: [238, 236], white: [233, 254] };
/** Nhân vật vẽ sẵn (ảnh trong public/chars), đổi màu bằng ui/sprite.ts.
 *  w,h: cỡ ảnh. skin: màu da gốc. eyes: [tâm x, tâm y, nửa rộng, nửa cao] của từng mắt (để chớp mắt). */
export interface SpriteDef { src: string; w: number; h: number; skin: string; eyes: [number, number, number, number][] }
const FEMALE = (n: number, w: number, eyes: SpriteDef["eyes"]): SpriteDef => ({ src: `/chars/g${n}.png`, w, h: 400, skin: "#FCD2B2", eyes });
const MALE = (n: number, w: number, eyes: SpriteDef["eyes"]): SpriteDef => ({ src: `/chars/b${n}.png`, w, h: 400, skin: "#F3C39A", eyes });
export const SPRITES: Record<string, SpriteDef> = {
  boy: { src: "/chars/anh.png", w: 279, h: 312, skin: "#F3C39A", eyes: [[145, 189, 22, 19]] },   // riêng cho "Anh"
  b1: MALE(1, 266, [[156, 189, 13, 19], [210, 183, 9, 17]]),   // tóc dựng, hoodie
  b2: MALE(2, 285, [[161, 192, 13, 19], [216, 187, 9, 17]]),   // tóc xoăn, áo len cổ sơ mi
  b3: MALE(3, 274, [[149, 190, 13, 16], [205, 183, 9, 15]]),   // tóc vuốt, áo khoác jean
  b4: MALE(4, 274, [[163, 174, 13, 18], [221, 167, 8, 16]]),   // tóc buộc thấp, yếm
  b5: MALE(5, 240, [[146, 168, 13, 18], [203, 160, 5, 17]]),   // tóc cua, tai nghe, sơ mi nơ
  b6: MALE(6, 264, [[150, 178, 13, 14], [208, 166, 9, 16]]),   // tóc nấm, áo khoác bomber
  g1: FEMALE(1, 294, [[186, 166, 15, 19], [239, 164, 9, 18]]),   // tóc dài, áo hoodie
  g2: FEMALE(2, 288, [[176, 171, 15, 19], [224, 167, 9, 18]]),   // hai búi, cardigan
  g3: FEMALE(3, 317, [[213, 177, 15, 19], [265, 175, 8, 18]]),   // đuôi ngựa, yếm
  g4: FEMALE(4, 265, [[160, 163, 15, 19], [211, 164, 8, 15]]),   // tóc ngắn, áo len
  g5: FEMALE(5, 253, [[152, 164, 15, 19], [202, 162, 9, 18]]),   // tóc tết, sơ mi nơ
  g6: FEMALE(6, 295, [[186, 159, 15, 19], [238, 155, 8, 18]])    // tóc gợn sóng, bờm, áo khoác
};
export const GIRL_SPRITES = ["g1", "g2", "g3", "g4", "g5", "g6"];
export const BOY_SPRITES = ["b1", "b2", "b3", "b4", "b5", "b6"];
export const HIM: GuestLook = { gender: "boy", sprite: "boy" };
export const HAIR = ["#3B2A26", "#6B4A3A", "#C98B5A", "#E7B872", "#8C6BB5", "#F29AB2", "#5C7A99"];
export const SKIN = ["#FFE9DA", "#FFE3D0", "#F7D1B5", "#E8B996", "#C98E6A"];
export const EYES = ["#5FA6C9", "#7A5A3E", "#4F9A6B", "#8A6BC9", "#3F4A5C", "#C9803F"];
export const COAT = ["#2F6F86", "#2E4A7A", "#3D7A55", "#8A3D55", "#C9962E", "#6A4C93", "#4A4F5C"];
/** Kiểu đầu 3D chọn riêng trong Hồ sơ (không phụ thuộc giới tính). id "" = giữ nguyên tóc gốc của model.
    scene/accessories.ts dựng phụ kiện/tóc giả tương ứng. */
export const STYLES: [string, string][] = [
  ["", "Gốc"], ["beanie", "Mũ len"], ["headband", "Băng đô"], ["bun", "Búi tóc"], ["ponytail", "Đuôi ngựa"], ["twintails", "Hai chùm"],
  ["ears", "Tai mèo"], ["bow", "Nơ lớn"], ["twinbows", "Hai nơ"], ["flower", "Hoa cài"], ["glasses", "Kính tròn"],
  ["bob", "Tóc bob"], ["long", "Tóc dài"], ["curly", "Tóc xoăn"], ["spiky", "Tóc dựng"], ["afro", "Tóc bồng"]
];
export const STYLE_NAME: Record<string, string> = Object.fromEntries(STYLES);
/** người chơi cũ chọn theo mã nhân vật (b2, g3...): ánh xạ sang kiểu đầu tương ứng */
export const STYLE_OF: Record<string, string> = { b2: "beanie", b3: "headband", b4: "bun", b5: "glasses", b6: "ears", g2: "bow", g3: "ears", g4: "flower", g5: "glasses", g6: "twinbows" };
export const styleOf = (me: { sprite: string; style?: string }) => me.style ?? STYLE_OF[me.sprite] ?? "";
export const PANTS = ["#2A2A33", "#3A4A6B", "#6B3F22", "#5A6B4A", "#8A3D55", "#E8E1D4"];
export const SHOES = ["#F2E6D0", "#E7B872", "#2E4A7A", "#8A3D55", "#3D7A55", "#2B1A1A"];
export const SHIRT = ["#8A3D55", "#F2E6D0", "#C9962E", "#2E4A7A", "#3D7A55"];

/* Đồ trang trí: pv = hình trong thẻ, rm = hình trong phòng */
export type FxKey = "pat" | "tip" | "price" | "cust";
export const GUEST_LINES: Record<number, string[]> = {
  3:["Ngon xỉu, mai tui ghé nữa!","Bánh xinh mà vị cũng xinh luôn.","Làm nhanh ghê, 10 điểm!","Chủ tiệm dễ thương quá trời.","Ngọt vừa đúng gu, mê!"],
  2:["Ngon nè, chờ hơi lâu xíu thôi.","Bánh ổn áp, lần sau quay lại.","Tiệm xinh, bánh thơm."],
  1:["Bánh ngon mà tui chờ hơi lâu.","Tạm ổn, mong nhanh hơn chút."],
  0:["Chờ lâu quá tui đi mất tiêu...","Tiệm đông quá, hẹn lần sau nha."]
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
