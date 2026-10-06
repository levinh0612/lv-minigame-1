/* Huy hiệu: số cấp người chơi (khiên SVG), bậc nhân viên/linh thú (crest) và khung avatar theo cấp (ảnh vẽ trong public/badges, tách từ bảng thiết kế).
   Phong cách: nền tối, đường nét mảnh sáng màu, lưỡi cánh nhọn, điểm phát sáng. */
import { roman } from "../engine/util";

let uid = 0;
/** một hạng: a = màu sáng (viền), b = màu giữa (sống lưỡi, phát sáng), c = màu tối (thân lưỡi) */
interface Tier { n: string; a: string; b: string; c: string; a2?: string }
const BASE = "#0B1020", BASE2 = "#1B2338";
const TIERS: Tier[] = [
  { n: "Sắt", a: "#C4CBD6", b: "#7E8896", c: "#3A4150" },
  { n: "Đồng", a: "#F2B98E", b: "#B87348", c: "#5B3320" },
  { n: "Bạc", a: "#F4F8FF", b: "#AEBBCF", c: "#4A586E" },
  { n: "Vàng", a: "#FFE08A", b: "#E0A93A", c: "#7A5214" },
  { n: "Bạch kim", a: "#D8FBFF", b: "#6FD3E6", c: "#1F6F86" },
  { n: "Lục bảo", a: "#B6FFD9", b: "#38C98A", c: "#0F5B3F" },
  { n: "Kim cương", a: "#CFE4FF", b: "#5C94F2", c: "#24308F" },
  { n: "Cao thủ", a: "#EBD2FF", b: "#A765F0", c: "#3F2191" },
  { n: "Đại cao thủ", a: "#FFD2B0", b: "#F2602F", c: "#8A1F18" },
  { n: "Thách đấu", a: "#FFF0B8", b: "#E9B84A", c: "#1F6FB5", a2: "#7FE3FF" }
];
const f1 = (n: number) => n.toFixed(1);

const diamond = (x: number, y: number, r: number, fill: string, stroke: string) => `<path d="M${f1(x)} ${f1(y - r)}L${f1(x + r * .7)} ${f1(y)}L${f1(x)} ${f1(y + r)}L${f1(x - r * .7)} ${f1(y)}Z" fill="${fill}" stroke="${stroke}" stroke-width=".8" stroke-linejoin="miter"/>`;
const grad = (id: string, t: Tier) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.a}"/><stop offset=".5" stop-color="${t.a2 ?? t.b}"/><stop offset="1" stop-color="${t.b}"/></linearGradient>`;

/* ===== Số cấp người chơi: khiên lục giác tối, viền sáng theo hạng ===== */
const lvTier = (lv: number) => Math.max(0, Math.min(TIERS.length - 1, Math.floor(lv / 10)));
export function levelBadge(lv: number, size = 34) {
  const i = lvTier(lv), t = TIERS[i]!, id = "bd" + uid++, txt = String(lv), fs = txt.length > 2 ? 15 : txt.length > 1 ? 21 : 26;
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" style="display:block;overflow:visible"><defs>${grad(id, t)}<linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BASE2}"/><stop offset="1" stop-color="${BASE}"/></linearGradient></defs>
<path d="M32 4L53 15V39L32 60 11 39V15Z" fill="url(#${id}f)" stroke="url(#${id})" stroke-width="2.4" stroke-linejoin="miter"/>
<path d="M32 10L48 18V37L32 53 16 37V18Z" fill="none" stroke="${t.b}" stroke-opacity=".55" stroke-width="1"/>${diamond(32, 4, 3.4, t.a, t.c)}
<text x="32" y="${txt.length > 2 ? 36 : 39}" text-anchor="middle" font-family="Baloo 2,Nunito,sans-serif" font-weight="800" font-size="${fs}" fill="#fff" stroke="${t.c}" stroke-width=".6" paint-order="stroke">${txt}</text></svg>`;
}

/* ===== Bậc nhân viên / linh thú (1 đến 10): crest có cánh bằng ảnh public/badges/crest-N.webp (170x94, số La Mã nằm sẵn trong ảnh).
   I Sắt, II Đồng, III Bạc, IV Vàng, V Bạch kim, VI Lục bảo, VII Kim cương, VIII Cao thủ, IX Đại cao thủ, X Thách đấu. ===== */
export function tierBadge(tier: number, size = 36) {
  const i = Math.max(0, Math.min(TIERS.length - 1, Math.floor(tier) - 1)), rn = roman(tier);
  return `<span class="tbg crest" title="Bậc ${rn} · ${TIERS[i]!.n}"><img src="/badges/crest-${i}.webp" alt="Bậc ${rn}" width="${Math.round(size * 1.75)}" height="${Math.round(size * 0.97)}" decoding="async" style="display:block"></span>`;
}

/* ===== Khung avatar theo cấp người chơi (tối đa 100): mười khung, mỗi 10 cấp một khung (1–9 Sắt, 10–19 Đồng, ..., 90–100 Thách đấu).
   Ảnh public/badges/frame-N.webp (306x281, lỗ giữa trong suốt, tâm vòng hơi cao hơn giữa ảnh): đặt chồng lên avatar, căn theo tâm. ===== */
export const frameName = (lv: number) => TIERS[lvTier(lv)]!.n;
export function levelFrame(lv: number) {
  const i = lvTier(lv);
  return `<img class="lvf lvfimg lvf${i}" src="/badges/frame-${i}.webp" alt="" width="306" height="281" decoding="async" aria-hidden="true">`;
}
