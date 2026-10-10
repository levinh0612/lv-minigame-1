/* Luật hai minigame trong ca: gói quà (3 bước) và giao hàng (3 làn). Chỉ có số liệu và tính toán, không đụng giao diện;
   giao diện nằm ở ui/minigames/. Mọi hàm ngẫu nhiên nhận `rng` để test lặp lại được. */
import { ADDRESSES, RIBBONS, TIERS, TIER_XP, type Address, type ObstacleKind, type Ribbon } from "../content/minigames";

export type Rng = () => number;
export const clampTier = (t: number) => Math.max(0, Math.min(TIERS.length - 1, Math.round(t)));
/** bậc theo số lần hoàn thành tốt */
export const tierOf = (xp: number) => { let t = 0; TIER_XP.forEach((n, i) => { if (xp >= n) t = i; }); return t; };
/** còn thiếu bao nhiêu lần để lên bậc sau (null = đã tối đa) */
export const toNextTier = (xp: number) => { const t = tierOf(xp); return t >= TIER_XP.length - 1 ? null : TIER_XP[t + 1]! - xp; };

/* ============ Tỉ lệ khách có yêu cầu ============ */
export const SERVICE_RATE = 0.25;
/** số khách có yêu cầu trong ca: khoảng 25%, tối thiểu 1 (nếu có khách), tối đa 1/3 số khách */
export function serviceQuota(total: number): number {
  if (total <= 0) return 0;
  return Math.max(1, Math.min(Math.floor(total / 3) || 1, Math.round(total * SERVICE_RATE)));
}
export type Service = "gift" | "ship" | "both";
/** loại yêu cầu: 40% chỉ gói, 40% chỉ ship, 20% cả hai */
export const pickService = (rng: Rng): Service => { const x = rng(); return x < 0.4 ? "gift" : x < 0.8 ? "ship" : "both"; };
export const pickRibbon = (rng: Rng): Ribbon => RIBBONS[Math.floor(rng() * RIBBONS.length)]!;
export const pickAddress = (rng: Rng): Address => ADDRESSES[Math.floor(rng() * ADDRESSES.length)]!;

/* ============ Gói quà ============ */
export interface GiftParams {
  bars: number;            // số vạch trên thanh
  sweep: number;           // bước 1: tốc độ con trỏ (số lần chạy hết thanh mỗi giây)
  zone1: number;           // bước 1: số vạch xanh
  ribbons: number;         // bước 2: số ruy băng để chọn
  pickMs: number;          // bước 2: thời gian chọn
  fill: number;            // bước 3: tốc độ đầy thanh (số lần hết thanh mỗi giây)
  zone3: number;           // bước 3: số vạch xanh
}
const L = <T>(a: T[], t: number) => a[clampTier(t)]!;
export const giftParams = (tier: number): GiftParams => ({
  bars: 14,
  sweep: L([0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3], tier), zone1: L([4, 4, 3, 3, 2, 2, 2], tier),
  ribbons: L([3, 3, 3, 4, 4, 4, 5], tier), pickMs: L([3000, 2800, 2600, 2400, 2200, 2000, 1800], tier),
  fill: L([0.55, 0.6, 0.65, 0.7, 0.8, 0.9, 1.0], tier), zone3: L([4, 4, 3, 3, 3, 2, 2], tier)
});
/** vị trí con trỏ (0..1) sau t giây: chạy đi rồi chạy về như sóng tam giác */
export const sweepPos = (t: number, speed: number) => { const x = (t * speed) % 2; return x <= 1 ? x : 2 - x; };
/** vùng xanh [từ, đến] (0..1) của thanh, đặt `at` là tâm (0..1) */
export function zoneRange(bars: number, zone: number, at: number): [number, number] {
  const w = zone / bars, a = Math.max(0, Math.min(1 - w, at - w / 2));
  return [a, a + w];
}
export type Hit = "perfect" | "good" | "miss";
/** bấm tại vị trí p: trúng vùng xanh là good, trúng phần giữa vùng là perfect */
export function judge(p: number, [a, b]: [number, number]): Hit {
  if (p < a || p > b) return "miss";
  const mid = (a + b) / 2, half = (b - a) / 2;
  return Math.abs(p - mid) <= half * 0.4 ? "perfect" : "good";
}
export interface GiftResult { hits: Hit[]; misses: number; perfects: number; ok: boolean; fee: number; grade: "S" | "A" | "B" | "fail" }
/** kết quả gói: 0 lỗi nhận đủ, 1 lỗi nhận một nửa, từ 2 lỗi là hỏng (mất thưởng, khách phàn nàn) */
export function giftResult(price: number, hits: Hit[], tier: number): GiftResult {
  const misses = hits.filter(h => h === "miss").length, perfects = hits.filter(h => h === "perfect").length;
  const ok = misses <= 1;
  const rate = (0.15 + 0.05 * perfects) * (1 + 0.04 * clampTier(tier)) * (misses ? 0.5 : 1);
  const fee = ok ? Math.max(1, Math.round(price * rate)) : 0;
  return { hits, misses, perfects, ok, fee, grade: !ok ? "fail" : misses ? "B" : perfects >= 2 ? "S" : "A" };
}

/* ============ Giao hàng ============ */
export interface ShipParams { dur: number; gap: number; travel: number; double: number; kinds: ObstacleKind[] }
/** thời gian chạy theo quãng đường (6 đến 10 giây) và độ dày chướng ngại theo bậc */
export const shipParams = (tier: number, km: number): ShipParams => ({
  dur: Math.max(6, Math.min(10, 5 + km * 1.6)),
  gap: L([1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9], tier),                 // giây giữa hai hàng chướng ngại
  travel: L([1.8, 1.7, 1.6, 1.5, 1.45, 1.4, 1.3], tier),             // giây để chướng ngại trôi từ trên xuống chỗ xe
  double: L([0, 0.05, 0.12, 0.2, 0.3, 0.4, 0.5], tier),              // xác suất một hàng chặn 2 làn (không bao giờ hai hàng liền)
  kinds: (["pothole", "cone", "dog", "cart"] as ObstacleKind[]).slice(0, Math.min(4, 2 + Math.floor(clampTier(tier) / 2)))
});
export interface Row { t: number; blocked: number[]; kind: ObstacleKind[] }
/** sinh các hàng chướng ngại: luôn chừa một làn trống cách làn trống hàng trước tối đa 1 làn nên lúc nào cũng né được */
export function genRows(p: ShipParams, rng: Rng, startLane = 1): Row[] {
  const rows: Row[] = []; let safe = startLane, prevDouble = false;
  for (let t = p.travel * 0.6 + 0.4; t < p.dur - p.travel * 0.5; t += p.gap) {
    const opts = [safe - 1, safe, safe + 1].filter(l => l >= 0 && l <= 2);
    safe = opts[Math.floor(rng() * opts.length)]!;
    const others = [0, 1, 2].filter(l => l !== safe);
    const dbl: boolean = !prevDouble && rng() < p.double; prevDouble = dbl;
    const blocked = dbl ? others : [others[Math.floor(rng() * others.length)]!];
    rows.push({ t, blocked, kind: blocked.map(() => p.kinds[Math.floor(rng() * p.kinds.length)]!) });
  }
  return rows;
}
export interface ShipResult { hits: number; ok: boolean; fee: number; grade: "S" | "A" | "B" | "fail" }
export const SHIP_LIVES = 3;
/** 0 va chạm nhận đủ, 1 va nhận 70%, 2 va nhận 40%, 3 va là hỏng hàng (mất thưởng, khách phàn nàn) */
export function shipResult(price: number, km: number, hits: number, tier: number): ShipResult {
  const ok = hits < SHIP_LIVES, keep = [1, 0.7, 0.4][hits] ?? 0;
  const fee = ok ? Math.max(1, Math.round(price * (0.2 + 0.07 * km) * (1 + 0.04 * clampTier(tier)) * keep)) : 0;
  return { hits, ok, fee, grade: !ok ? "fail" : hits === 0 ? "S" : hits === 1 ? "A" : "B" };
}
