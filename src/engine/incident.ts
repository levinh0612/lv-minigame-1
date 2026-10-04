/* Sự cố bất ngờ: thỉnh thoảng sau khi hết ca, tiệm gặp chuyện và bị trừ khoảng 1/10 số xu đang có.
   Không xảy ra với người mới, khi còn quá ít xu, hoặc ngay sau một sự cố khác. */
import type { PetId } from "../content/couple";
import { S } from "./state";
import { spend } from "./wallet";

export interface Incident { id: string; title: string; text: string; emoji: string; bg: string; pet: PetId }
export const INCIDENTS: Incident[] = [
  { id: "blackout", title: "Cúp điện!", text: "Cả khu phố mất điện, tủ lạnh ngừng chạy. Phải gọi thợ điện tới sửa gấp.", emoji: "🔌", bg: "#D9DCF5", pet: "dog" },
  { id: "dash", title: "Khách quỵt tiền", text: "Có vị khách ăn xong lẻn ra cửa sau, không trả xu nào. Chạy theo không kịp.", emoji: "🏃", bg: "#FFE3EA", pet: "gold" },
  { id: "spoiled", title: "Nguyên liệu bị hư", text: "Kem tươi để quên ngoài bàn cả đêm nên chua hết. Phải mua lô mới cho kịp ca sau.", emoji: "🤢", bg: "#E3F6EC", pet: "white" },
  { id: "inspector", title: "Sở y tế kiểm tra", text: "Bác kiểm tra vệ sinh ghé tiệm. Bạn đành \"gửi chút lễ\" cho yên chuyện.", emoji: "🕵️", bg: "#E1ECFB", pet: "dog" },
  { id: "leak", title: "Ống nước bị rò", text: "Nước chảy lênh láng sau quầy. Phải thuê thợ nước và lau dọn cả buổi.", emoji: "💧", bg: "#D8EFFA", pet: "white" },
  { id: "mice", title: "Chuột vào kho", text: "Chuột gặm thủng mấy bao bột. Thuê người diệt chuột và mua bột mới.", emoji: "🐭", bg: "#FFF0C9", pet: "gold" },
  { id: "broken", title: "Vỡ cả chồng đĩa", text: "Bé khách nhỏ vấp chân làm rơi chồng đĩa sứ. Phải mua bộ đĩa mới.", emoji: "🍽️", bg: "#FFE0E0", pet: "dog" },
  { id: "fine", title: "Bị phạt lấn vỉa hè", text: "Chú dân phố ghi biên bản vì bàn ghế kê sát ra lề đường.", emoji: "📝", bg: "#EEE6FB", pet: "white" },
  { id: "fridge", title: "Tủ lạnh hỏng", text: "Tủ lạnh kêu \"tách tách\" rồi tắt hẳn. Gọi thợ điện lạnh tới sửa.", emoji: "🧊", bg: "#D6F0F2", pet: "gold" }
];

export const MIN_SHIFTS = 3, MIN_COINS = 100, GAP_SHIFTS = 2, CHANCE = 0.3;
export interface Hit { inc: Incident; cost: number }

/** số xu bị trừ: 8% đến 12% số xu đang có (khoảng 1/10), ít nhất 10 và không vượt số xu có */
export const incidentCost = (coins: number, rng: () => number = Math.random) => Math.min(coins, Math.max(10, Math.round(coins * (0.08 + rng() * 0.04))));

/** gọi sau khi hết ca (S.shifts đã tăng): có thể trả về một sự cố, chưa trừ xu */
export function rollIncident(rng: () => number = Math.random): Hit | null {
  if (S.shifts < MIN_SHIFTS || S.coins < MIN_COINS || S.shifts - (S.incAt ?? 0) < GAP_SHIFTS) return null;
  if (rng() >= CHANCE) return null;
  return { inc: INCIDENTS[Math.floor(rng() * INCIDENTS.length) % INCIDENTS.length]!, cost: incidentCost(S.coins, rng) };
}

export function applyIncident(h: Hit) { spend("incident", h.cost, h.inc.title); S.incAt = S.shifts; }
