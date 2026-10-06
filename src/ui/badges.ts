/* Huy hiệu cấp: khiên có số, đổi màu theo khoảng cấp. Cấp người chơi ghi số thường, bậc nhân viên/linh thú ghi số La Mã I đến V. */
import { roman } from "../engine/util";

let uid = 0;
/** khiên SVG: txt là chữ trong khiên, c1/c2 là hai màu chuyển, wings: thêm cánh hai bên */
function shield(txt: string, c1: string, c2: string, size: number, wings: boolean) {
  const id = "bd" + uid++, fs = txt.length > 2 ? 15 : txt.length > 1 ? 19 : 24;
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" style="display:block;overflow:visible"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
${wings ? `<path d="M6 22C10 14 18 12 22 16L22 40C14 38 8 32 6 22ZM58 22C54 14 46 12 42 16L42 40C50 38 56 32 58 22Z" fill="${c1}" opacity=".78" stroke="#fff7" stroke-width="1.2"/>` : ""}
<path d="M32 6 50 14V32C50 44 42 52 32 58 22 52 14 44 14 32V14Z" fill="url(#${id})" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M32 10 46 16V32C46 41 40 48 32 53 24 48 18 41 18 32V16Z" fill="none" stroke="#ffffff88" stroke-width="1.4"/>
<text x="32" y="${txt.length > 2 ? 36 : 38}" text-anchor="middle" font-family="Baloo 2,Nunito,sans-serif" font-weight="800" font-size="${fs}" fill="#fff" stroke="#0005" stroke-width=".7" paint-order="stroke">${txt}</text></svg>`;
}
/* cấp người chơi: 1–9 đồng, 10–19 vàng, 20–29 xanh, 30–39 tím, 40+ cam (từ 30 có cánh) */
const LV: [number, string, string][] = [[1, "#E3A27A", "#9A5B3C"], [10, "#FFD45A", "#E08E0B"], [20, "#6FD3FF", "#2C7BE0"], [30, "#C9A0FF", "#7A45D6"], [40, "#FFB36B", "#E5522A"]];
export function levelBadge(lv: number, size = 34) {
  let i = 0; LV.forEach((x, k) => { if (lv >= x[0]) i = k; });
  return shield(String(lv), LV[i]![1], LV[i]![2], size, i >= 3);
}
/* bậc nhân viên: I đồng, II lục, III lam, IV tím (có cánh), V vàng cam (có cánh) */
const TIER: [string, string][] = [["#E3A27A", "#9A5B3C"], ["#8FE0B0", "#2F9C6A"], ["#6FD3FF", "#2C7BE0"], ["#C9A0FF", "#7A45D6"], ["#FFD45A", "#E5522A"]];
export function tierBadge(tier: number, size = 30) {
  const i = Math.max(0, Math.min(TIER.length - 1, Math.floor(tier) - 1));
  return `<span class="tbg" title="Bậc ${roman(tier)}">${shield(roman(tier), TIER[i]![0], TIER[i]![1], size, i >= 3)}</span>`;
}
