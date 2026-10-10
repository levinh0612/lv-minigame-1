/* Gacha: bảng vật phẩm, độ hiếm, tỷ lệ. Mọi vật phẩm đều có lợi ích thật trong game (xem engine/gacha.ts).
   Trùng đồ không phí: đổi Bụi sao, và công thức trùng thì tăng độ thành thạo (giá bán cao hơn). */
import type { FxKey } from "./game";
import type { RoomKey } from "./room";

export type Rarity = "common" | "rare" | "ultra";
export type GachaKind = "recipe" | "decor" | "char" | "mascot" | "manager";
export const RARITY: Record<Rarity, { n: string; w: number; dust: number; c: string; c2: string }> = {
  common: { n: "Thường", w: 70, dust: 5, c: "#8FB4D9", c2: "#DCEBFA" },
  rare: { n: "Hiếm", w: 25, dust: 15, c: "#7A8CFF", c2: "#E1E5FF" },
  ultra: { n: "Cực hiếm", w: 5, dust: 40, c: "#F2B84B", c2: "#FFF0C4" }
};
export const RARITIES: Rarity[] = ["common", "rare", "ultra"];
export const KIND_NAME: Record<GachaKind, string> = { recipe: "Công thức", decor: "Trang trí", char: "Khách quen", mascot: "Linh vật", manager: "Quản lý" };

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
  full?: string;                                          // tranh minh hoạ full (public/gacha/full-<id>.webp): hiện to lúc triệu hồi, rồi thu nhỏ vào thẻ
  mgr?: { model: string; gender: "girl" | "boy"; tags: string[]; fx: Partial<Record<FxKey, number>> };   // quản lý một tầng: đứng ở tầng đó trong tiệm, buff cho cả tiệm; tags: nghề/tính cách hiện trên thẻ
  mascot?: { img: string; fx: Partial<Record<FxKey, number>>; model?: string; art?: boolean };   // model: id GLB trong public/models/gacha (đứng trong tiệm); art: có tranh minh hoạ riêng   // art: có tranh minh hoạ riêng (hiện tranh khi triệu hồi, không dùng 3D xoay)   // img: ảnh trong public/gacha/mascot-<img>.webp
}

/* khách quen từ Hiếm trở lên cũng làm được quản lý: đứng ở tầng và cộng chỉ số cho cả tiệm (nhẹ hơn quản lý thật vì là phần phụ) */
const CHAR_MGR_FX: Record<Rarity, Partial<Record<FxKey, number>>> = { common: {}, rare: { tip: 0.08, pat: 0.1 }, ultra: { price: 0.1, tip: 0.1, pat: 0.1 } };
const CHAR_FX: Record<Rarity, CharFx> = {
  common: { tip: 0.2, pat: 0, price: 0 },
  rare: { tip: 0.2, pat: 0.3, price: 0 },
  ultra: { tip: 0.5, pat: 0.5, price: 0.5 }
};
const ch = (sprite: string, gender: "girl" | "boy", rarity: Rarity, n: string): GachaItem => ({
  id: "c_" + sprite, kind: "char", rarity, n, char: { sprite, gender, ...CHAR_FX[rarity] },
  desc: (rarity === "ultra" ? "Khách VIP: gọi món đắt, trả tip hậu hĩnh, kiên nhẫn" : rarity === "rare" ? "Khách quen: tip nhiều và kiên nhẫn hơn" : "Khách quen: tip nhiều hơn")
    + (rarity === "common" ? "" : `. Đặt làm quản lý một tầng: ${fxLine(CHAR_MGR_FX[rarity])}`)
});

/* Model 3D gacha: file GLB trong public/models/gacha/<id>.glb (đã giảm mặt, texture 512 WebP, không nén mesh), khai báo kích thước/hướng mặt
   trong scene/glbprop.ts (PROPS). Model T-pose không rig được thì không đưa vào tiệm; không thay bằng hình 2D. */
/** chỉ số thành câu: "tip +8%, khách chờ lâu hơn 10%" */
export const fxLine = (fx: Partial<Record<FxKey, number>>) => FX_TEXT.filter(([k]) => fx[k]).map(([k, t]) => t(k === "cust" ? fx[k]! : Math.round(fx[k]! * 100))).join(", ");
const FX_TEXT: [FxKey, (v: number) => string][] = [["price", v => `giá bánh +${v}%`], ["tip", v => `tip +${v}%`], ["pat", v => `khách chờ lâu hơn ${v}%`], ["cust", v => `thêm ${v} khách mỗi ca`]];
const mg = (id: string, rarity: Rarity, n: string, gender: "girl" | "boy", tags: string[], fx: Partial<Record<FxKey, number>>): GachaItem => ({
  id: "g_" + id, kind: "manager", rarity, n, mgr: { model: "g_" + id, gender, tags, fx },
  desc: "Quản lý một tầng: " + fxLine(fx)
});
export const asManager = (it: GachaItem) => !!it.mgr || (!!it.char && it.rarity !== "common");
export const mgrFx = (it: GachaItem): Partial<Record<FxKey, number>> => it.mgr?.fx ?? CHAR_MGR_FX[it.rarity];
/** vai của vật phẩm, để thẻ và chi tiết ghi rõ khách quen hay quản lý */
export const roleOf = (it: GachaItem) => it.mgr ? { n: "Quản lý", c: "mgr" } : it.char ? { n: "Khách quen", c: "reg" } : null;
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
  ch("k7", "boy", "common", "Anh Long"), ch("k8", "girl", "common", "Chị Mây"), ch("k9", "girl", "common", "Chị Trang"),
  ch("k10", "girl", "rare", "Chị Thu"), ch("k11", "girl", "rare", "Chị Vy"), ch("n4", "girl", "rare", "Chị Yến"),
  ch("n5", "girl", "rare", "Nàng mũ mèo"), ch("m1", "boy", "rare", "Anh Nam"), ch("m2", "boy", "rare", "Kiếm sĩ"),
  ch("n1", "girl", "ultra", "Anime Chan"), ch("n2", "girl", "ultra", "Cyber Nova"), ch("n3", "girl", "ultra", "Lynae"),
  /* quản lý: mỗi tầng một người, đứng ở tầng đó trong tiệm và cộng chỉ số cho cả tiệm */
  mg("tanjiro", "ultra", "Tanjiro", "boy", ["Kiếm sĩ", "Kiên nhẫn"], { pat: 0.15, tip: 0.08, cust: 1 }),
  mg("violet", "ultra", "Violet", "girl", ["Pháp sư", "Tinh tế"], { price: 0.12, tip: 0.1 }),
  mg("goku", "ultra", "Goku", "boy", ["Chiến binh", "Đông khách"], { cust: 1, price: 0.08, pat: 0.1 }),
  mg("punchan", "rare", "Pun Chan", "girl", ["Dễ thương", "Hay cười"], { tip: 0.1 }),
  mg("mizuki", "rare", "Mizuki", "girl", ["Duyên dáng", "Chu đáo"], { price: 0.08 }),
  mg("kenji", "rare", "Kenji", "boy", ["Hộ vệ", "Điềm tĩnh"], { pat: 0.15 }),
  mg("gohan", "rare", "Gohan", "boy", ["Học giỏi", "Hoạt bát"], { tip: 0.08, price: 0.04 }),
  mg("samba", "rare", "Samba", "girl", ["Vũ công", "Quẩy hết mình"], { pat: 0.1, tip: 0.05 }),
  mg("nakroth", "ultra", "Nakroth", "boy", ["Sát thủ", "Bí ẩn"], { price: 0.1, tip: 0.12 }),
  mg("naruto", "ultra", "Naruto", "boy", ["Ninja", "Nhiệt huyết"], { cust: 1, tip: 0.1, pat: 0.1 }),
  mg("elaina", "ultra", "Elaina", "girl", ["Phù thủy", "Lữ khách"], { price: 0.1, pat: 0.12, tip: 0.08 }),
  mg("tsubasa", "rare", "Tsubasa", "boy", ["Cầu thủ", "Bền bỉ"], { pat: 0.12 }),
  mg("ryo", "rare", "Ryo", "boy", ["Lặng lẽ", "Bí ẩn"], { pat: 0.1, tip: 0.04 }),
  /* Bạch Chi là nhân vật (không phải linh thú): làm quản lý, model 3D baizhi.glb, thẻ dùng tranh minh hoạ */
  { ...mg("baizhi", "rare", "Bạch Chi", "girl", ["Hộ vệ", "Điềm tĩnh"], { price: 0.08, pat: 0.1 }), mgr: { model: "baizhi", gender: "girl", tags: ["Hộ vệ", "Điềm tĩnh"], fx: { price: 0.08, pat: 0.1 } } },
  /* linh vật: chọn một bé đồng hành, hưởng lợi ích khi đi cùng */
  { id: "m_bong", kind: "mascot", rarity: "common", n: "Chó Corgi", desc: "Đồng hành 3D trong tiệm: tip +5%", mascot: { img: "corgi", model: "pet_corgi", fx: { tip: 0.05 } } },
  { id: "m_anhdao", kind: "mascot", rarity: "rare", n: "Mèo Xám", desc: "Đồng hành 3D trong tiệm: tip +5%, giá bánh +5%", mascot: { img: "gray", model: "pet_graycat", fx: { tip: 0.05, price: 0.05 } } },
  { id: "m_tuyet", kind: "mascot", rarity: "rare", n: "Mèo Đêm", desc: "Đồng hành 3D trong tiệm: khách chờ lâu hơn 10%, tip +5%", mascot: { img: "black", model: "pet_blackcat", fx: { pat: 0.1, tip: 0.05 } } },
  { id: "m_thienthan", kind: "mascot", rarity: "ultra", n: "Mèo Thiên Thần", desc: "Linh vật 3D trong tiệm: giá +10%, tip +8%, chờ lâu hơn 10%, thêm 1 khách mỗi ca", mascot: { img: "angel", model: "pet_angel", fx: { price: 0.1, tip: 0.08, pat: 0.1, cust: 1 } } },
  { id: "m_cacao", kind: "mascot", rarity: "common", n: "Mèo Béo", desc: "Đồng hành 3D trong tiệm: tip +5%", mascot: { img: "cacao_cat", model: "cacao_cat", fx: { tip: 0.05 } } },
  { id: "m_xiem", kind: "mascot", rarity: "rare", n: "Mèo Xiêm", desc: "Đồng hành 3D trong tiệm: tip +5%, giá bánh +5%", mascot: { img: "siamese", model: "siamese", fx: { tip: 0.05, price: 0.05 } } },
  { id: "m_ga", kind: "mascot", rarity: "common", n: "Gà Trống", desc: "Đồng hành 3D trong tiệm: tip +5%", mascot: { img: "chicken", model: "pet_chicken", fx: { tip: 0.05 } } },
  { id: "m_ech", kind: "mascot", rarity: "common", n: "Ếch Xanh", desc: "Đồng hành 3D trong tiệm: tip +5%", mascot: { img: "frog", model: "pet_frog", fx: { tip: 0.05 } } },
  { id: "m_chuot", kind: "mascot", rarity: "common", n: "Chuột Vàng", desc: "Đồng hành 3D trong tiệm: khách chờ lâu hơn 6%", mascot: { img: "mouse", model: "pet_mouse", fx: { pat: 0.06 } } },
  { id: "m_meocam", kind: "mascot", rarity: "common", n: "Mèo Cam", desc: "Đồng hành 3D trong tiệm: giá bánh +4%", mascot: { img: "cat", model: "pet_cat", fx: { price: 0.04 } } },
  { id: "m_rover", kind: "mascot", rarity: "rare", n: "Cún Rover", desc: "Đồng hành 3D trong tiệm: tip +5%, giá bánh +5%", mascot: { img: "rover", model: "pet_rover", fx: { tip: 0.05, price: 0.05 } } },
  { id: "m_baodom", kind: "mascot", rarity: "rare", n: "Báo Đốm", desc: "Đồng hành 3D trong tiệm: giá bánh +6%, khách chờ lâu hơn 8%", mascot: { img: "leopard", model: "pet_leopard", fx: { price: 0.06, pat: 0.08 } } },
  { id: "m_daibang", kind: "mascot", rarity: "rare", n: "Đại Bàng", desc: "Đồng hành bay 3D trong tiệm: giá bánh +8%, tip +4%", mascot: { img: "eagle", model: "pet_eagle", fx: { price: 0.08, tip: 0.04 } } },
  { id: "m_tako", kind: "mascot", rarity: "rare", n: "Takodachi", desc: "Đồng hành 3D trong tiệm: tip +8%, khách chờ lâu hơn 6%", mascot: { img: "tako", model: "pet_tako", fx: { tip: 0.08, pat: 0.06 } } },
  { id: "m_rong1", kind: "mascot", rarity: "rare", n: "Rồng Con Pha Lê", desc: "Đồng hành 3D trong tiệm: giá +8%, tip +5%, chờ lâu hơn 6%", mascot: { img: "dragon1", model: "pet_dragon1", fx: { price: 0.08, tip: 0.05, pat: 0.06 } } },
  { id: "m_rong2", kind: "mascot", rarity: "ultra", n: "Rồng Pha Lê", desc: "Linh vật bay 3D trong tiệm: giá +10%, tip +8%, chờ lâu hơn 10%, thêm 1 khách mỗi ca", mascot: { img: "dragon2", model: "pet_dragon2", fx: { price: 0.1, tip: 0.08, pat: 0.1, cust: 1 } } },
  { id: "m_baoden", kind: "mascot", rarity: "ultra", n: "Báo Đen", desc: "Linh vật 3D trong tiệm: giá +12%, tip +6%, thêm 1 khách mỗi ca", mascot: { img: "panther", model: "pet_panther", fx: { price: 0.12, tip: 0.06, cust: 1 } } },
  { id: "m_phuonghoang", kind: "mascot", rarity: "ultra", n: "Phượng Hoàng", desc: "Linh vật bay 3D trong tiệm: giá +10%, tip +10%, chờ lâu hơn 10%, thêm 1 khách mỗi ca", mascot: { img: "phoenix", model: "phoenix", art: true, fx: { price: 0.1, tip: 0.1, pat: 0.1, cust: 1 } } }
];
/* tranh minh hoạ do người chơi cung cấp */
for (const [id, full] of Object.entries({ c_n3: "lynae", m_phuonghoang: "phoenix", g_baizhi: "baizhi" })) { const it = GACHA_ITEMS.find(i => i.id === id); if (it) it.full = full; }
/** ảnh thẻ nhỏ của vật phẩm có model 3D (chụp từ model): linh vật dùng mascot-<img>, quản lý dùng mgr-<tên> */
export const itemImg = (it: GachaItem) => it.mascot ? `/gacha/mascot-${it.mascot.img}.webp` : it.mgr ? `/gacha/mgr-${it.mgr.model.replace(/^g_/, "")}.webp` : "";   // khách quen (char) không có ảnh riêng: dùng gachaArt
export const gachaItem = (id: string) => GACHA_ITEMS.find(i => i.id === id);
export const itemsOf = (r: Rarity) => GACHA_ITEMS.filter(i => i.rarity === r);
