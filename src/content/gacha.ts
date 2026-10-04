/* Gacha: bảng vật phẩm, độ hiếm, tỷ lệ. Mọi vật phẩm đều có lợi ích thật trong game (xem engine/gacha.ts).
   Trùng đồ không phí: đổi Bụi sao, và công thức trùng thì tăng độ thành thạo (giá bán cao hơn). */
import type { FxKey } from "./game";
import type { RoomKey } from "./room";

export type Rarity = "common" | "rare" | "ultra";
export type GachaKind = "recipe" | "decor" | "char" | "mascot";
export const RARITY: Record<Rarity, { n: string; w: number; dust: number; c: string; c2: string }> = {
  common: { n: "Thường", w: 70, dust: 5, c: "#8FB4D9", c2: "#DCEBFA" },
  rare: { n: "Hiếm", w: 25, dust: 15, c: "#7A8CFF", c2: "#E1E5FF" },
  ultra: { n: "Cực hiếm", w: 5, dust: 40, c: "#F2B84B", c2: "#FFF0C4" }
};
export const RARITIES: Rarity[] = ["common", "rare", "ultra"];
export const KIND_NAME: Record<GachaKind, string> = { recipe: "Công thức", decor: "Trang trí", char: "Khách quen", mascot: "Linh vật" };

/* giá và luật */
export const TICKET_COST = 300, PACK10_COST = 2700;     // 1 vé = 300 xu, gói 10 vé giảm 10%
export const PITY_RARE = 10, PITY_ULTRA = 50;           // 10 lần chắc chắn có Hiếm trở lên, 50 lần chắc chắn có Cực hiếm
export const DUST_PER_TICKET = 50;                      // 50 Bụi sao đổi 1 vé
export const MASTERY_STEP = 0.08, MASTERY_MAX = 5;      // công thức trùng: mỗi lần +8% giá bán, tối đa 5 lần

export interface CharFx { tip: number; pat: number; price: number }
export interface GachaItem {
  id: string; kind: GachaKind; rarity: Rarity; n: string; desc: string;
  recipe?: { base: number; cream: number; top: number; price: number };
  decor?: { k: RoomKey; v: string };
  char?: { sprite: string; gender: "girl" | "boy" } & CharFx;
  mascot?: { img: string; fx: Partial<Record<FxKey, number>> };   // img: ảnh trong public/gacha/mascot-<img>.webp
}

const CHAR_FX: Record<Rarity, CharFx> = {
  common: { tip: 0.2, pat: 0, price: 0 },
  rare: { tip: 0.2, pat: 0.3, price: 0 },
  ultra: { tip: 0.5, pat: 0.5, price: 0.5 }
};
const ch = (sprite: string, gender: "girl" | "boy", rarity: Rarity, n: string): GachaItem => ({
  id: "c_" + sprite, kind: "char", rarity, n, char: { sprite, gender, ...CHAR_FX[rarity] },
  desc: rarity === "ultra" ? "Khách VIP: gọi món đắt, trả tip hậu hĩnh, kiên nhẫn" : rarity === "rare" ? "Khách quen: tip nhiều và kiên nhẫn hơn" : "Khách quen: tip nhiều hơn"
});

export const GACHA_ITEMS: GachaItem[] = [
  /* công thức bánh đặc biệt (ngoài danh sách mở theo cấp) */
  { id: "r_dau_dau", kind: "recipe", rarity: "common", n: "Bông lan Kem dâu Đậu đỏ", desc: "Giá bán 30 xu", recipe: { base: 0, cream: 1, top: 1, price: 30 } },
  { id: "r_vani_dau", kind: "recipe", rarity: "common", n: "Tart Vani Dâu tây", desc: "Giá bán 32 xu", recipe: { base: 1, cream: 2, top: 0, price: 32 } },
  { id: "r_mochi_dau", kind: "recipe", rarity: "rare", n: "Mochi Kem dâu Hạt dẻ", desc: "Giá bán 40 xu", recipe: { base: 2, cream: 1, top: 2, price: 40 } },
  { id: "r_tart_matcha", kind: "recipe", rarity: "rare", n: "Tart Matcha Đậu đỏ", desc: "Giá bán 42 xu", recipe: { base: 1, cream: 0, top: 1, price: 42 } },
  { id: "r_hoang_gia", kind: "recipe", rarity: "ultra", n: "Mochi Vani Đậu đỏ", desc: "Món đắt nhất tiệm: giá bán 56 xu", recipe: { base: 2, cream: 2, top: 1, price: 56 } },
  /* trang trí chỉ có trong gacha (đồ nằm trong content/room.ts, đánh dấu gacha) */
  { id: "d_floor_rainbow", kind: "decor", rarity: "common", n: "Sàn cầu vồng", desc: "Khách chờ lâu hơn 5%", decor: { k: "floor", v: "rainbow" } },
  { id: "d_counter_candy", kind: "decor", rarity: "common", n: "Quầy kẹo", desc: "Giá bánh +5%", decor: { k: "counter", v: "candy" } },
  { id: "d_wall_candy", kind: "decor", rarity: "rare", n: "Tường kẹo ngọt", desc: "Tip +8%", decor: { k: "wall", v: "candy" } },
  { id: "d_floor_sakura", kind: "decor", rarity: "rare", n: "Sàn hoa anh đào", desc: "Khách chờ lâu hơn 8%, thêm 1 khách mỗi ca", decor: { k: "floor", v: "sakura" } },
  { id: "d_wall_starry", kind: "decor", rarity: "ultra", n: "Tường trời sao", desc: "Tip +12%, giá bánh +5%", decor: { k: "wall", v: "starry" } },
  { id: "d_counter_gold", kind: "decor", rarity: "ultra", n: "Quầy vàng", desc: "Giá bánh +12%", decor: { k: "counter", v: "gold" } },
  /* nhân vật 3D làm sẵn: thành khách quen của tiệm */
  ch("k4", "girl", "common", "Chị Hoa"), ch("k5", "boy", "common", "Anh Quân"), ch("k6", "boy", "common", "Anh Phát"),
  ch("k7", "boy", "common", "Anh Long"), ch("k8", "girl", "common", "Bé Mây"), ch("k9", "girl", "common", "Chị Trang"),
  ch("k10", "girl", "rare", "Chị Thảo"), ch("k11", "girl", "rare", "Chị Vy"), ch("n4", "girl", "rare", "Chị Yến"),
  ch("n5", "girl", "rare", "Nàng mũ mèo"), ch("m1", "boy", "rare", "Anh Nam"), ch("m2", "boy", "rare", "Kiếm sĩ"),
  ch("n1", "girl", "ultra", "Anime Chan"), ch("n2", "girl", "ultra", "Cyber Nova"), ch("n3", "girl", "ultra", "Lynae"),
  /* linh vật: chọn một bé đồng hành, hưởng lợi ích khi đi cùng */
  { id: "m_bong", kind: "mascot", rarity: "common", n: "Chó Bông", desc: "Đồng hành: tip +5%", mascot: { img: "corgi", fx: { tip: 0.05 } } },
  { id: "m_anhdao", kind: "mascot", rarity: "rare", n: "Mèo Xám", desc: "Đồng hành: tip +5%, giá bánh +5%", mascot: { img: "gray", fx: { tip: 0.05, price: 0.05 } } },
  { id: "m_tuyet", kind: "mascot", rarity: "rare", n: "Mèo Đêm", desc: "Đồng hành: khách chờ lâu hơn 10%, tip +5%", mascot: { img: "black", fx: { pat: 0.1, tip: 0.05 } } },
  { id: "m_thienthan", kind: "mascot", rarity: "ultra", n: "Mèo Thiên Thần", desc: "Đồng hành: giá +10%, tip +8%, chờ lâu hơn 10%, thêm 1 khách mỗi ca", mascot: { img: "angel", fx: { price: 0.1, tip: 0.08, pat: 0.1, cust: 1 } } }
];
export const gachaItem = (id: string) => GACHA_ITEMS.find(i => i.id === id);
export const itemsOf = (r: Rarity) => GACHA_ITEMS.filter(i => i.rarity === r);
