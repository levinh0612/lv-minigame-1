/* Giới hạn số liệu do máy khách tự báo (bảng xếp hạng). Hàm thuần, có test ở tests/limits.test.ts.
   Máy khách không thể chứng minh số xu, nên server chỉ cho tăng theo thời gian thực đã trôi qua. */

/** xu tối đa kiếm được mỗi giây ở cấp lv (rộng tay: ca Lv 60 ≈ 8.000 xu, tính cả khách đông + buff) */
export const earnRate = (lv: number) => 30 + lv * 4;
/** thời gian dồn tối đa: người chơi bỏ máy lâu rồi quay lại không bị mất phần đã kiếm thật */
export const MAX_IDLE_SEC = 24 * 3600;
/** mỗi lần lưu chỉ được tăng tối đa chừng này cấp */
export const MAX_LV_STEP = 2;

/** số xu được cộng thêm tối đa kể từ lần lưu trước */
export const maxEarnGain = (lv: number, idleSec: number) =>
  Math.floor(Math.max(0, Math.min(idleSec, MAX_IDLE_SEC)) * earnRate(lv));

/** earned/lv server chấp nhận: lấy số máy khách báo nhưng bị chặn theo thời gian */
export function clampProgress(old: { earned: number; lv: number }, claim: { earned: number; lv: number }, idleSec: number) {
  const lv = Math.max(old.lv, Math.min(claim.lv, old.lv + MAX_LV_STEP, 100));
  const gain = Math.max(0, Math.min(claim.earned - old.earned, maxEarnGain(lv, idleSec)));
  return { lv, earned: old.earned + gain, gain };
}

/* ===== khoá đăng nhập: đếm theo (tài khoản, IP) và theo tài khoản, thời gian khoá leo thang ===== */
export const PER_IP_FAILS = 5, PER_IP_WINDOW_MIN = 15;     // một IP sai 5 lần / 15 phút thì IP đó bị chặn với tài khoản này
export const PER_USER_FAILS = 30, PER_USER_WINDOW_MIN = 60; // cả tài khoản sai 30 lần / giờ (nhiều IP) thì khoá chung
export const PER_IP_ANY_FAILS = 20;                         // một IP sai 20 lần / giờ với bất kỳ tài khoản nào: chặn dò hàng loạt
/** số phút khoá chung, tăng gấp 4 mỗi lần khoá liên tiếp: 15p → 1h → 4h → 16h → tối đa 24h */
export const lockMinutes = (level: number) => Math.min(24 * 60, 15 * 4 ** Math.max(0, level));

/* ===== hằng số luật chơi mà server phải khớp với client (tests/limits.test.ts so hai bên, lệch là test lỗi) ===== */
export const FEE_PCT = 0.02, FEE_MIN = 10, FEE_MAX = 100, GIFT_PCT = 0.7;   // phí ghé thăm: src/engine/visit.ts
export const STAR5_AT = 500;                                                // số bánh cho sao 5: CRAFT_AT cuối trong src/content/progression.ts
export const feeOf = (coins: number) => Math.min(FEE_MAX, Math.max(FEE_MIN, Math.round(coins * FEE_PCT)));
