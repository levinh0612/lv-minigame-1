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
  ["Bông lan Matcha Dâu", 0, 0, 0], ["Mochi Kem Dâu", 2, 1, 0], ["Tart Vani Hạt dẻ", 1, 2, 2],
  ["Bông lan Đậu đỏ", 0, 0, 1], ["Mochi Matcha Đậu đỏ", 2, 0, 1], ["Tart Dâu tây", 1, 1, 0],
  ["Bông lan Vani Hạt dẻ", 0, 2, 2], ["Mochi Vani Dâu", 2, 2, 0], ["Tart Matcha Hạt dẻ", 1, 0, 2]
] as [string, number, number, number][]).map(([n, base, cream, top], i) => ({ id: "r" + (i + 1), n, base, cream, top, lv: i + 1, price: 16 + i * 2 }));
export const recipeOf = (b: Build) => RECIPES.find(r => r.base === b.base && r.cream === b.cream && r.top === b.top);
export const partsText = (r: Recipe) => `${CATS.base[r.base][0]} · ${CATS.cream[r.cream][0]} · ${CATS.top[r.top][0]}`;

/* Nhân vật */
export type Mood = "happy" | "open" | "wink" | "impatient" | "love";
export interface CritterLook { kind: "cat" | "dog" | "bunny" | "bear"; fur: string; pattern?: "none" | "tabby" | "patch" | "tux"; mark?: string; mark2?: string; ear?: string; fluffy?: boolean; bow?: string; wave?: boolean; ledge?: boolean; gender?: undefined }
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
  dog:   { kind: "dog", fur: "#FFFFFF", ear: "#F3E9E1", fluffy: true },
  gold:  { kind: "cat", fur: "#F4C57E", pattern: "tabby", mark: "#D9964A" },
  white: { kind: "cat", fur: "#FFFFFF" }
};
export const HIM: GuestLook = { gender: "boy", hairStyle: "short", hair: "#3B2A26", skin: "#FFE3D0", accent: "#8FD9B6", gesture: "cheek" };
export const HAIR = ["#3B2A26", "#6B4A3A", "#C98B5A", "#E7B872", "#8C6BB5", "#F29AB2", "#5C7A99"];
export const SKIN = ["#FFE9DA", "#FFE3D0", "#F7D1B5", "#E8B996", "#C98E6A"];
export const ACCENT = ["#FF8FAB", "#8FD9B6", "#FFD166", "#C9B8F0", "#9FD8F5"];

/* Đồ trang trí: pv = hình trong thẻ, rm = hình trong phòng */
export type FxKey = "pat" | "tip" | "price" | "pet" | "cust";
export interface Decor { id: string; n: string; cost: number; lv: number; d: string; fx: Partial<Record<FxKey, number>>; bg: string; pv: string; rm: string }
export const DECOR: Decor[] = [
  {id:"curtain", n:"Rèm ren hồng", cost:60, lv:1, d:"Khách chờ lâu hơn 10%", fx:{pat:.10}, bg:"#FFF0F4",
   pv:`<div style="position:absolute;left:18%;right:18%;top:0;height:60px;background:repeating-linear-gradient(90deg,#FFB3C7 0 10px,#fff 10px 20px);border-radius:0 0 30px 30px"></div>`,
   rm:`<div class="d" style="left:16px;top:16px;width:108px;height:26px;background:repeating-linear-gradient(90deg,#FF8FAB 0 12px,#FFF 12px 24px);border-radius:10px 10px 4px 4px;z-index:2"></div>`},
  {id:"lamp", n:"Đèn mây", cost:180, lv:2, d:"Khách vui, tip thêm 10%", fx:{tip:.10}, bg:"#EEF9F3",
   pv:`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><div style="width:34px;height:34px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px #CFEFDD"></div><div style="width:46px;height:46px;border-radius:50%;background:#fff;margin:-14px -8px 0;box-shadow:0 0 0 3px #CFEFDD"></div><div style="width:30px;height:30px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px #CFEFDD"></div></div>`,
   rm:`<div class="d" style="left:50%;top:0;margin-left:-30px;display:flex;align-items:flex-end;z-index:2"><div style="width:2px;height:14px;background:#fff;position:absolute;left:30px;top:0"></div><div style="width:22px;height:22px;border-radius:50%;background:#fff;margin-top:14px"></div><div style="width:30px;height:30px;border-radius:50%;background:#fff;margin:6px -6px 0"></div><div style="width:20px;height:20px;border-radius:50%;background:#fff;margin-top:14px"></div></div>`},
  {id:"chair", n:"Ghế nhung bạc hà", cost:240, lv:3, d:"Khách chờ lâu hơn thêm 10%", fx:{pat:.10}, bg:"#FFF7E3",
   pv:`<div style="position:absolute;left:50%;bottom:12px;margin-left:-37px;width:74px;height:44px;border-radius:22px 22px 8px 8px;background:#8FD9B6;box-shadow:inset 0 -8px 0 #6CC49D"></div>`,
   rm:`<div class="d" style="left:22px;bottom:40px;width:58px;height:36px;border-radius:18px 18px 6px 6px;background:#8FD9B6;box-shadow:inset 0 -7px 0 #6CC49D;z-index:2"></div>`},
  {id:"plant", n:"Chậu cây nhỏ", cost:320, lv:4, d:"Thú cưng ghé tiệm thường hơn", fx:{pet:.10}, bg:"#EAF6E6",
   pv:`<div style="position:absolute;left:50%;bottom:10px;margin-left:-18px;width:36px;height:30px;border-radius:4px 4px 12px 12px;background:#F3C7A4;box-shadow:inset 0 -5px 0 #E2AE86"></div><div style="position:absolute;left:50%;bottom:36px;margin-left:-26px;width:52px;height:40px;border-radius:50%;background:#9CCB86;box-shadow:inset 0 -6px 0 #7FB77E"></div>`,
   rm:`<div class="d" style="right:20px;bottom:44px;z-index:2"><div style="width:40px;height:32px;border-radius:50%;background:#9CCB86;box-shadow:inset 0 -5px 0 #7FB77E;margin:0 auto -4px"></div><div style="width:28px;height:24px;margin:0 auto;border-radius:4px 4px 10px 10px;background:#F3C7A4"></div></div>`},
  {id:"flags", n:"Dây cờ tam giác", cost:450, lv:5, d:"Thêm 1 khách mỗi ca", fx:{cust:1}, bg:"#FFF3F6",
   pv:`<div style="position:absolute;left:8px;right:8px;top:18px;display:flex;justify-content:space-between">${["#FF8FAB","#8FD9B6","#FFD66B","#C9B8F0","#FF8FAB"].map(c=>`<i style="width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-top:22px solid ${c}"></i>`).join("")}</div>`,
   rm:`<div class="d" style="left:0;right:0;top:4px;display:flex;justify-content:space-around;z-index:1">${["#FF8FAB","#8FD9B6","#FFD66B","#C9B8F0","#FF8FAB","#8FD9B6","#FFD66B"].map(c=>`<i style="width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:16px solid ${c}"></i>`).join("")}</div>`},
  {id:"teapot", n:"Ấm trà matcha", cost:600, lv:6, d:"Bánh bán giá cao hơn 10%", fx:{price:.10}, bg:"#EAF1E1",
   pv:`<div style="position:absolute;left:50%;top:26px;margin-left:-26px;width:52px;height:40px;border-radius:26px 26px 14px 14px;background:#9CCB86;box-shadow:inset 0 -6px 0 #7FB77E"></div><div style="position:absolute;left:50%;top:20px;margin-left:-8px;width:16px;height:8px;border-radius:8px;background:#7FB77E"></div><div style="position:absolute;left:calc(50% + 22px);top:34px;width:16px;height:8px;border-radius:4px;background:#9CCB86;transform:rotate(-30deg)"></div>`,
   rm:`<div class="d" style="right:118px;bottom:74px;width:30px;height:24px;border-radius:15px 15px 8px 8px;background:#9CCB86;box-shadow:inset 0 -4px 0 #7FB77E;z-index:2"></div>`},
  {id:"bell", n:"Chuông gió", cost:800, lv:7, d:"Thêm 1 khách và tip thêm 15%", fx:{cust:1,tip:.15}, bg:"#F3EEFF",
   pv:`<div style="position:absolute;left:50%;top:0;width:2px;height:22px;background:#C9B8F0"></div><div style="position:absolute;left:50%;top:20px;margin-left:-20px;width:40px;height:30px;border-radius:20px 20px 4px 4px;background:#fff;box-shadow:0 0 0 3px #D6CBF6"></div><div style="position:absolute;left:50%;top:52px;margin-left:-5px;width:10px;height:22px;border-radius:4px;background:#FF8FAB"></div>`,
   rm:`<div class="d" style="left:130px;top:0;z-index:2"><div style="width:2px;height:16px;background:#fff;margin:0 auto"></div><div style="width:24px;height:18px;border-radius:12px 12px 3px 3px;background:#fff;box-shadow:0 0 0 2px #D6CBF6"></div></div>`},
  {id:"frame", n:"Khung ảnh đôi", cost:1000, lv:9, d:"Khách chờ lâu hơn 10%, bánh giá cao hơn 10%", fx:{pat:.10,price:.10}, bg:"#F3EEFF",
   pv:`<div style="position:absolute;left:50%;top:50%;margin:-31px 0 0 -29px;width:58px;height:62px;border-radius:10px;background:#fff;box-shadow:0 0 0 6px #D6CBF6;display:grid;place-items:center;font:800 22px Arial;color:#FF8FAB">♥︎</div>`,
   rm:`<div class="d" style="left:140px;top:30px;width:40px;height:44px;border-radius:8px;background:#fff;box-shadow:0 0 0 4px #D6CBF6;display:grid;place-items:center;font:800 16px Arial;color:#FF8FAB;z-index:2">♥︎</div>`}
];
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

export interface StaffDef { id: PetId; role: string; unlock: number; wage: [number, number, number]; train: [number, number]; effect: [string, string, string] }
export const STAFF: StaffDef[] = [
  { id: "dog", role: "Phụ bếp", unlock: 2, wage: [10, 14, 18], train: [120, 300],
    effect: ["Chọn sẵn đế bánh", "Chọn sẵn đế và kem", "Chọn sẵn đế, kem và topping"] },
  { id: "gold", role: "Thu ngân", unlock: 3, wage: [8, 12, 16], train: [150, 350],
    effect: ["Khách tip thêm 10%", "Khách tip thêm 20%", "Khách tip thêm 30%"] },
  { id: "white", role: "Chạy bàn", unlock: 4, wage: [8, 12, 16], train: [150, 350],
    effect: ["Dỗ khách sắp giận: chờ thêm 20%", "Dỗ khách sắp giận: chờ thêm 35%", "Dỗ khách sắp giận: chờ thêm 50%"] }
];
