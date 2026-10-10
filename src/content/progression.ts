/* Nội dung "để cày" cho người chơi đã qua Lv 24: tay nghề từng công thức, danh hiệu, nhiệm vụ tuần, nâng cấp tiệm cao cấp.
   File chỉ chứa dữ liệu và công thức tính; logic nằm ở engine/craft.ts, achievements.ts, weekly.ts, upgrades.ts. */
import type { FxKey } from "./game";

/* ===== Tay nghề công thức =====
   Mỗi công thức làm đủ số bánh sẽ lên một sao: giá bán +CRAFT_STEP mỗi sao và nhận thưởng xu một lần. */
export const CRAFT_AT = [15, 50, 120, 250, 500];       // số bánh cần cho sao 1..5
export const CRAFT_STEP = 0.04;                        // +4% giá bán mỗi sao (tối đa +20%)
export const CRAFT_MAX = CRAFT_AT.length;
/** thưởng xu khi món đạt sao thứ `star` (1..5): gấp giá món nhiều lần cho món đắt đáng cày */
export const craftReward = (price: number, star: number) => price * 8 * star;

/* ===== Danh hiệu (thành tích nhiều bậc) =====
   stat: tên chỉ số (engine/achievements.ts tính ra). need[i]: mốc bậc i + 1. Thưởng nhận thủ công ở màn Thành tích. */
export type StatId = "served" | "earned" | "perfect" | "tower" | "elite" | "shifts" | "streak" | "mastered";
export interface Reward { coins?: number; tickets?: number }
export interface Achievement { id: string; n: string; desc: string; stat: StatId; need: number[]; reward: Reward[] }
/** tên bậc danh hiệu, dùng chung cho mọi thành tích */
export const ACH_TIER = ["Tập sự", "Thành thạo", "Tinh hoa", "Bậc thầy", "Huyền thoại"];
export const ACHIEVEMENTS: Achievement[] = [
  { id: "serve", n: "Chủ tiệm tận tâm", desc: "Phục vụ khách", stat: "served", need: [100, 500, 2000, 5000, 12000],
    reward: [{ coins: 300 }, { coins: 1200 }, { coins: 4000, tickets: 1 }, { coins: 10000, tickets: 2 }, { coins: 30000, tickets: 5 }] },
  { id: "earn", n: "Triệu phú bánh ngọt", desc: "Tổng xu kiếm từ bán bánh", stat: "earned", need: [5000, 50000, 250000, 1000000, 5000000],
    reward: [{ coins: 300 }, { coins: 1500 }, { tickets: 2 }, { tickets: 4, coins: 20000 }, { tickets: 10, coins: 80000 }] },
  { id: "perfect", n: "Tay nhanh như chớp", desc: "Giao bánh Hoàn hảo (3 sao)", stat: "perfect", need: [50, 300, 1000, 3000, 8000],
    reward: [{ coins: 400 }, { coins: 1500 }, { coins: 5000, tickets: 1 }, { coins: 12000, tickets: 2 }, { coins: 35000, tickets: 5 }] },
  { id: "tower", n: "Kiến trúc sư bánh tầng", desc: "Phục vụ bánh nhiều tầng", stat: "tower", need: [20, 100, 400, 1000, 2500],
    reward: [{ coins: 500 }, { coins: 2000 }, { coins: 6000, tickets: 1 }, { coins: 15000, tickets: 2 }, { coins: 40000, tickets: 5 }] },
  { id: "elite", n: "Đầu bếp bánh cao cấp", desc: "Phục vụ món cao cấp (Lv 26 trở lên)", stat: "elite", need: [30, 150, 600, 1800, 5000],
    reward: [{ coins: 800 }, { coins: 3000 }, { coins: 9000, tickets: 1 }, { coins: 20000, tickets: 3 }, { coins: 50000, tickets: 6 }] },
  { id: "master", n: "Bậc thầy công thức", desc: "Công thức đạt đủ 5 sao tay nghề", stat: "mastered", need: [1, 4, 10, 20, 35],
    reward: [{ coins: 1000 }, { coins: 4000, tickets: 1 }, { coins: 12000, tickets: 2 }, { coins: 30000, tickets: 4 }, { coins: 80000, tickets: 8 }] },
  { id: "shift", n: "Chăm chỉ mở tiệm", desc: "Số ca đã mở", stat: "shifts", need: [10, 50, 150, 400, 1000],
    reward: [{ coins: 300 }, { coins: 1500 }, { coins: 5000, tickets: 1 }, { coins: 14000, tickets: 2 }, { coins: 40000, tickets: 5 }] },
  { id: "streak", n: "Khách quen của ngày", desc: "Chuỗi ngày chơi liên tiếp dài nhất", stat: "streak", need: [3, 7, 14, 30, 60],
    reward: [{ coins: 200 }, { coins: 800, tickets: 1 }, { coins: 2500, tickets: 2 }, { coins: 8000, tickets: 3 }, { coins: 25000, tickets: 8 }] }
];

/* ===== Nhiệm vụ tuần =====
   Mỗi tuần (bắt đầu thứ Hai) chọn WEEKLY_COUNT trong số này; mục tiêu và thưởng tăng theo cấp người chơi. */
export type WeeklyKey = "served" | "earned" | "perfect" | "tower" | "elite" | "shifts" | "stars3";
export interface WeeklyDef { key: WeeklyKey; text: (n: number) => string; base: number; coins: number; minLv?: number }
const fmt = (n: number) => n.toLocaleString("vi-VN");
export const WEEKLY_COUNT = 4;
export const WEEKLY_DEFS: WeeklyDef[] = [
  { key: "served", text: n => `Phục vụ ${fmt(n)} khách`, base: 60, coins: 600 },
  { key: "earned", text: n => `Kiếm ${fmt(n)} xu từ bán bánh`, base: 3000, coins: 700 },
  { key: "perfect", text: n => `Giao ${fmt(n)} bánh Hoàn hảo`, base: 25, coins: 700 },
  { key: "tower", text: n => `Phục vụ ${fmt(n)} bánh nhiều tầng`, base: 10, coins: 800, minLv: 10 },
  { key: "elite", text: n => `Phục vụ ${fmt(n)} món cao cấp (Lv 26+)`, base: 15, coins: 1200, minLv: 26 },
  { key: "shifts", text: n => `Mở tiệm ${fmt(n)} ca`, base: 5, coins: 600 },
  { key: "stars3", text: n => `Nhận ${fmt(n)} đánh giá 3 sao`, base: 30, coins: 700 }
];
/** mục tiêu tăng nhẹ theo cấp: Lv 1 ×1, Lv 50 ×2, Lv 100 ×3 */
export const weeklyScale = (lv: number) => 1 + lv / 50;
export const WEEKLY_CHEST: Reward = { coins: 3000, tickets: 3 };       // hoàn thành cả tuần
export const WEEKLY_TICKETS = 1;                                         // vé triệu hồi mỗi nhiệm vụ

/* ===== Nâng cấp tiệm cao cấp =====
   Chỗ tiêu xu cuối game: mỗi nâng cấp có nhiều cấp, giá tăng nhanh, mỗi cấp cộng buff cố định (cộng dồn vào fx() cùng đồ trang trí). */
export interface ShopUpgrade { id: string; n: string; desc: string; fx: FxKey; per: number; max: number; lv: number; cost: number; grow: number; icon: string }
export const SHOP_UPGRADES: ShopUpgrade[] = [
  { id: "oven", n: "Lò nướng công nghiệp", desc: "Bánh ra lò đều, bán được giá hơn", fx: "price", per: .03, max: 8, lv: 25, cost: 3000, grow: 1.85, icon: "🔥" },
  { id: "coffee", n: "Máy pha cà phê Ý", desc: "Khách vui vẻ, tip nhiều hơn", fx: "tip", per: .04, max: 8, lv: 28, cost: 3500, grow: 1.85, icon: "☕" },
  { id: "showcase", n: "Tủ trưng bày kính", desc: "Bánh nhìn là muốn mua, thêm khách mỗi ca", fx: "cust", per: 1, max: 6, lv: 30, cost: 5000, grow: 2, icon: "🪞" },
  { id: "lounge", n: "Khu chờ sofa", desc: "Khách ngồi thoải mái, chờ được lâu hơn", fx: "pat", per: .04, max: 8, lv: 32, cost: 4000, grow: 1.85, icon: "🛋️" }
];
/** giá nâng từ cấp `lv` lên `lv + 1` */
export const upgradeCost = (u: ShopUpgrade, lv: number) => Math.round(u.cost * u.grow ** lv / 100) * 100;
