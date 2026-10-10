/* Sự cố bất ngờ: trong lúc app đang mở (cả khi đang trong ca), cứ 3 phút chơi lại có một đồng xu để người chơi tự bấm tung.
   70% bình an, 30% gặp sự cố và bị trừ một khoản CỐ ĐỊNH theo cấp tiệm (không theo % xu đang có, để người nhiều xu không bị "đánh thuế"):
   thấp 10%, trung bình 20%, cao 30% doanh thu một ca ước tính ở cấp đó, và không quá 25% số xu đang có.
   Không xảy ra với người mới hoặc khi còn quá ít xu. Đồng hồ chỉ chạy khi app đang hiện; đồng xu không bao giờ hiện giữa ca hoặc
   trên màn Kết quả (tới giờ thì chờ, hết ca rồi mới hiện). */
import type { PetId } from "../content/couple";
import { lvl } from "./progress";
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

export const MIN_SHIFTS = 3, MIN_COINS = 100, GAP = 180, RETRY = 60, LOSE_CHANCE = 0.3;   // giây: cứ 3 phút có một đồng xu
export type Level = "low" | "mid" | "high";
/** mult: tỉ lệ so với doanh thu một ca ước tính (SHIFT_PER_LV xu mỗi cấp) */
export const LEVELS: Record<Level, { name: string; mult: number }> = { low: { name: "Thấp", mult: 0.1 }, mid: { name: "Trung bình", mult: 0.2 }, high: { name: "Cao", mult: 0.3 } };
export const SHIFT_PER_LV = 100, MAX_COIN_SHARE = 0.25;
export interface Hit { inc: Incident; cost: number; level: Level }

/** doanh thu một ca ước tính theo cấp (số đo mô phỏng: Lv 10 ≈ 770, Lv 30 ≈ 2.600, Lv 60 ≈ 8.000) */
export const shiftRevenue = (lv: number) => lv * SHIFT_PER_LV;
/** khoản trừ cố định theo cấp và mức; không bao giờ quá 25% số xu đang có, ít nhất 1 */
export const incidentCost = (coins: number, level: Level, lv = lvl()) =>
  Math.min(coins, Math.max(1, Math.min(Math.round(shiftRevenue(lv) * LEVELS[level].mult), Math.round(coins * MAX_COIN_SHARE))));

let left = -1;                                              // giây chơi còn lại tới đồng xu kế tiếp (-1 = chưa đặt)
export const resetIncidentClock = () => { left = -1; };
export const incidentLeft = () => left;

/** gọi mỗi giây khi app đang hiện (không có hộp thoại khác): trả true khi tới lúc hiện đồng xu để người chơi tung.
    blocked = đang trong ca hoặc ở màn Kết quả: tới giờ vẫn chờ, hết bận mới trả true */
export function tickIncident(dt: number, blocked = false): boolean {
  if (left < 0) left = GAP;
  left = Math.max(0, left - dt); if (left > 0 || blocked) return false;
  if (S.shifts < MIN_SHIFTS || S.coins < MIN_COINS) { left = RETRY; return false; }    // chưa đủ điều kiện: xét lại sau ít phút
  left = GAP; return true;
}

/** người chơi bấm đồng xu: 30% gặp sự cố (mức thấp, trung bình, cao ngẫu nhiên đều nhau), 70% bình an (null). Chưa trừ xu. */
export function tossCoin(rng: () => number = Math.random): Hit | null {
  if (rng() >= LOSE_CHANCE) return null;
  const level = (["low", "mid", "high"] as const)[Math.min(2, Math.floor(rng() * 3))]!;
  return { inc: INCIDENTS[Math.floor(rng() * INCIDENTS.length) % INCIDENTS.length]!, level, cost: incidentCost(S.coins, level) };
}

export function applyIncident(h: Hit) { spend("incident", h.cost, `${h.inc.title} (mức ${LEVELS[h.level].name.toLowerCase()})`); S.incAt = S.shifts; }
