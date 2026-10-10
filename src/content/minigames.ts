/* Nội dung hai minigame trong ca: gói quà và giao hàng (ship). Luật tính ở engine/minigame.ts, giao diện ở ui/minigames/. */

/** 7 bậc danh hiệu: D thấp nhất, SSS cao nhất (SSS mở kỹ năng cho nhân viên tự làm) */
export const TIERS = ["D", "C", "B", "A", "S", "SS", "SSS"] as const;
export type TierName = (typeof TIERS)[number];
/** số lần hoàn thành tốt cần để lên từng bậc */
export const TIER_XP = [0, 5, 15, 35, 70, 120, 200];

export const GIFT_TITLES = ["Thợ gói tập sự", "Thợ gói gọn gàng", "Thợ gói lành nghề", "Nghệ nhân ruy băng", "Bậc thầy gói quà", "Huyền thoại gói quà", "Thần gói quà"];
export const SHIP_TITLES = ["Shipper tập sự", "Shipper nhanh nhẹn", "Shipper lành nghề", "Tay lái lụa", "Vua giao hàng", "Siêu tốc độ", "Thần tốc"];

/** ruy băng khách có thể yêu cầu */
export interface Ribbon { id: string; n: string; c: string; c2: string }
export const RIBBONS: Ribbon[] = [
  { id: "pink", n: "Hồng", c: "#FF9DB8", c2: "#F0617F" },
  { id: "mint", n: "Bạc hà", c: "#8FD9B6", c2: "#5FB892" },
  { id: "gold", n: "Vàng", c: "#FFD66B", c2: "#E3B93E" },
  { id: "violet", n: "Tím", c: "#B79CF5", c2: "#8E6FD6" },
  { id: "sky", n: "Xanh trời", c: "#8EC7F5", c2: "#5D9AD9" }
];

/** địa chỉ giao hàng ngẫu nhiên (km = quãng đường, càng xa chạy càng lâu và phí ship càng cao) */
export interface Address { text: string; km: number }
export const ADDRESSES: Address[] = [
  { text: "12 hẻm Cầu Vồng", km: 0.6 }, { text: "45 đường Hoa Sữa", km: 0.9 }, { text: "7 ngõ Bánh Bao", km: 0.7 },
  { text: "88 phố Kẹo Ngọt", km: 1.4 }, { text: "3 chung cư Mây Hồng", km: 1.1 }, { text: "21 đường Matcha", km: 1.8 },
  { text: "150 phố Cá Chép", km: 2.2 }, { text: "9 xóm Dâu Tây", km: 1.3 }, { text: "64 đường Trăng Non", km: 2.6 },
  { text: "30 hẻm Mèo Mun", km: 0.8 }, { text: "102 phố Hạt Dẻ", km: 2.0 }, { text: "5 villa Hoa Giấy", km: 3.0 },
  { text: "77 ngõ Sao Băng", km: 1.6 }, { text: "18 đường Gấu Bông", km: 1.0 }, { text: "36 khu Đồi Thông", km: 2.8 }
];

export type ObstacleKind = "pothole" | "cone" | "dog" | "cart";
export const OBSTACLE_NAMES: Record<ObstacleKind, string> = { pothole: "Ổ gà", cone: "Nón giao thông", dog: "Chú chó", cart: "Xe đẩy" };

/** câu khách phàn nàn khi gói hỏng hoặc giao hỏng */
export const GIFT_COMPLAINTS = ["Hộp gói xộc xệch quá, mình hơi buồn.", "Ruy băng gì kỳ vậy, đâu phải màu mình chọn!", "Quà tặng người ta mà gói thế này thì ngại thật."];
export const SHIP_COMPLAINTS = ["Bánh giao tới mà méo hết rồi…", "Shipper chạy kiểu gì mà hộp xóc tung vậy?", "Giao trễ lại còn hỏng, mình thất vọng."];
