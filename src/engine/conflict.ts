/* So sánh hai bản lưu (máy này và trên mây) khi hai máy cùng có thay đổi, để người chơi chọn có đủ thông tin.
   Thuần dữ liệu; hộp thoại ở ui/modals.ts, gửi và nhận ở net/cloud.ts. */
import { MAX_LV } from "./progress";

export interface Snap { lv: number; coins: number; shifts: number; earned: number; served: number; at: string }
/** lấy các số đáng so từ một bản lưu (thiếu trường thì coi là 0) */
export function snapOf(s: Record<string, unknown> | null | undefined): Snap | null {
  if (!s || typeof s !== "object") return null;
  const n = (k: string) => { const v = Number(s[k]); return Number.isFinite(v) && v > 0 ? v : 0; };
  const at = (s.cloud as { at?: string } | undefined)?.at ?? "";
  return { lv: Math.min(MAX_LV, Math.floor(Math.sqrt(n("xp") / 40)) + 1), coins: n("coins"), shifts: n("shifts"), earned: n("earned"), served: n("served"), at };
}
/** bản nào tiến xa hơn: so cấp, rồi tổng xu kiếm được, rồi số ca, rồi số khách đã phục vụ; bằng hết thì "same" */
export function ahead(mine: Snap, cloud: Snap): "mine" | "cloud" | "same" {
  for (const k of ["lv", "earned", "shifts", "served"] as const) if (mine[k] !== cloud[k]) return mine[k] > cloud[k] ? "mine" : "cloud";
  return "same";
}
/** những gì sẽ mất nếu bỏ bản `lose` mà giữ bản kia (chỉ liệt kê mục bị thua) */
export function lossLines(keep: Snap, lose: Snap): string[] {
  const out: string[] = [];
  if (lose.lv > keep.lv) out.push(`${lose.lv - keep.lv} cấp (Lv ${lose.lv} → ${keep.lv})`);
  if (lose.earned > keep.earned) out.push(`${(lose.earned - keep.earned).toLocaleString("vi-VN")} xu đã kiếm`);
  if (lose.shifts > keep.shifts) out.push(`${lose.shifts - keep.shifts} ca đã chơi`);
  return out;
}

/* Hai bản "giống nhau" khi mọi trường (trừ thông tin đồng bộ `cloud`) trùng khớp: lúc đó hỏi người chơi chỉ vô ích, tự gộp im lặng */
const stable = (v: unknown): string => Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object"
  ? `{${Object.keys(v as object).sort().map(k => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}` : JSON.stringify(v) ?? "null";
const without = (s: Record<string, unknown>) => { const { cloud: _c, ...rest } = s; return rest; };
export const sameState = (a: Record<string, unknown>, b: Record<string, unknown>) => stable(without(a)) === stable(without(b));
const KEY_LABEL: Record<string, string> = {
  stock: "kho nguyên liệu", food: "đồ ăn thú cưng", staff: "nhân viên", pets: "thú cưng", decor: "trang trí", owned: "trang trí", room: "phòng", gacha: "gacha", prog: "tiến trình, thành tích",
  book: "sổ thu chi", reviews: "đánh giá", daily: "mục tiêu ngày", letters: "thư", venue: "bàn, lầu", custom: "bánh tự tạo", suppliers: "nhà cung cấp", me: "nhân vật", mg: "hạng minigame",
  coins: "xu", xp: "kinh nghiệm", served: "số khách", shifts: "số ca", earned: "xu đã kiếm", streak: "chuỗi ngày", lastDay: "ngày chơi gần nhất"
};
/** những mục khác nhau giữa hai bản (tên tiếng Việt, bỏ trùng), để nói cho người chơi biết hai bản khác ở đâu */
export function diffLabels(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const x = without(a), y = without(b), out = new Set<string>();
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (stable(x[k]) !== stable(y[k])) out.add(KEY_LABEL[k] ?? "dữ liệu khác");
  return [...out];
}
