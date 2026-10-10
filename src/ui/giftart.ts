/* Hình vẽ cho hai minigame gói quà và giao hàng, cùng phong cách bánh và nguyên liệu (art.ts):
   màu phẳng pastel, viền mực INK, nét tròn đầu. Mỗi hàm trả về chuỗi SVG. */
import type { ObstacleKind, Ribbon } from "../content/minigames";

const INK = "#4A3438";
const svg = (vb: number, S: number, body: string, extra = "") =>
  `<svg width="${S}" height="${S}" viewBox="0 0 ${vb} ${vb}" style="display:block;overflow:visible;flex:none${extra}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${body}</svg>`;

/* cái nơ: hai tai và nút giữa */
const bow = (cx: number, cy: number, c: string, c2: string, s = 1) =>
  `<g transform="translate(${cx} ${cy}) scale(${s})"><path d="M0 0 C-6 -14 -22 -14 -22 -5 C-22 3 -8 4 0 0 Z" fill="${c}"/><path d="M0 0 C6 -14 22 -14 22 -5 C22 3 8 4 0 0 Z" fill="${c}"/><path d="M-1 0 L-9 12 L-3 12 L1 4 Z" fill="${c2}" stroke-width="2.2"/><path d="M1 0 L9 12 L3 12 L-1 4 Z" fill="${c2}" stroke-width="2.2"/><circle cx="0" cy="0" r="4.6" fill="${c2}"/></g>`;

/* miếng bánh nhỏ nằm trong hộp (cùng bảng màu bánh trong game) */
const SLICE = `<g transform="translate(50 46)"><path d="M-17 8 C-17 -4 17 -4 17 8 L17 14 H-17 Z" fill="#F6D59A"/><path d="M-19 4 C-19 -8 19 -8 19 4 C13 6 13 0 8 3 C3 6 3 0 -2 3 C-7 6 -9 0 -14 4 C-16 5 -18 5 -19 4 Z" fill="#FFF4EE"/><circle cx="0" cy="-8" r="5" fill="#F0506E"/><path d="M-1 -13 L1 -17" stroke="#7FB77E" stroke-width="2.2"/></g>`;

export interface BoxOpts { size?: number; lid?: "off" | "open" | "shut"; ribbon?: Ribbon | null; tied?: boolean; cake?: boolean; face?: boolean }
/** hộp quà: thân hộp kem, nắp hồng nhạt; nắp mở lật sang bên, nắp đóng thì đậy kín; ruy băng quấn dọc khi đã chọn */
export function boxSVG(o: BoxOpts = {}) {
  const { size = 120, lid = "shut", ribbon = null, tied = false, cake = lid !== "shut", face = false } = o;
  const body = `<path d="M16 46 H84 V82 C84 88 80 92 74 92 H26 C20 92 16 88 16 82 Z" fill="#FFF1CF"/><path d="M16 80 H84" stroke="#E9D3A4" stroke-width="2"/>`;
  const inside = lid === "off" ? "" : cake ? `<g>${SLICE}</g>` : "";
  const band = ribbon ? `<path d="M44 46 H56 V92 H44 Z" fill="${ribbon.c}"/><path d="M16 66 H84" stroke="${ribbon.c}" stroke-width="10" stroke-linecap="butt"/><path d="M16 61 H84 M16 71 H84" stroke="${INK}" stroke-width="2.2" stroke-linecap="butt"/>` : "";
  const tie = ribbon && tied ? bow(50, 60, ribbon.c, ribbon.c2) : "";
  const cap = lid === "shut" ? `<g><rect x="12" y="32" width="76" height="18" rx="6" fill="#FFD5E1"/><path d="M20 38 H34" stroke="#fff" stroke-width="2.6" opacity=".8"/>${ribbon ? `<path d="M44 32 H56 V50 H44 Z" fill="${ribbon.c}"/>` : ""}</g>`
    : lid === "open" ? `<g transform="rotate(-22 14 30)"><rect x="-4" y="12" width="76" height="18" rx="6" fill="#FFD5E1"/><path d="M4 18 H18" stroke="#fff" stroke-width="2.6" opacity=".8"/></g>` : "";
  const f = face ? `<g stroke-width="2.2"><circle cx="38" cy="73" r="1.6" fill="${INK}"/><circle cx="62" cy="73" r="1.6" fill="${INK}"/><path d="M45 77 Q50 81 55 77"/></g>` : "";
  return svg(100, size, `${body}${inside}${lid === "shut" || lid === "off" ? "" : ""}${band}${cap}${tie}${f}`);
}

/** cuộn ruy băng (chỉ để chọn) */
export function ribbonSVG(r: Ribbon, S = 64) {
  return svg(40, S, `<ellipse cx="20" cy="29" rx="14" ry="6" fill="${r.c2}"/><path d="M6 29 V16 C6 11 34 11 34 16 V29 C34 34 6 34 6 29 Z" fill="${r.c}"/><ellipse cx="20" cy="16" rx="14" ry="5.6" fill="${r.c}"/><ellipse cx="20" cy="16" rx="5" ry="2" fill="#fff" stroke-width="1.8"/><path d="M11 22 V28 M20 23 V30 M29 22 V28" stroke="#fff" stroke-width="2" opacity=".7"/>`);
}

/** xe giao hàng: Mini Cooper xanh British racing green nhìn từ phía sau, thùng hàng bạc hà trên nóc, huy hiệu MINI có cánh ở cốp */
export function carSVG(S = 84, hurt = false) {
  const G = "var(--pink-d)", G2 = "color-mix(in srgb, var(--pink-d) 70%, #000)";   // màu thân xe theo màu chủ đề của người chơi
  const body = `<ellipse cx="50" cy="93" rx="38" ry="5" fill="${INK}" opacity=".16" stroke="none"/>
    <rect x="11" y="72" width="14" height="20" rx="5" fill="#3B2F33"/><rect x="75" y="72" width="14" height="20" rx="5" fill="#3B2F33"/>
    <rect x="22" y="0" width="56" height="20" rx="6" fill="#BEEAD7"/><path d="M22 14 H78" stroke="#8FD9B6" stroke-width="2.4"/>
    <path d="M30 10 C34 6 40 6.500 43 8 L43 12 C40 11 35 11.500 30 10 Z M70 10 C66 6 60 6.500 57 8 L57 12 C60 11 65 11.500 70 10 Z" fill="#fff" stroke-width="1.8"/>
    <circle cx="50" cy="10" r="8.200" fill="#fff" stroke-width="2.2"/><circle cx="50" cy="10" r="5.800" fill="#3B2F33" stroke="none"/><text x="50" y="11.800" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="4.400" fill="#fff" stroke="none">MINI</text>
    <path d="M33 18 V24 M67 18 V24" stroke-width="2.4"/>
    <path d="M22 50 C22 30 28 22 38 22 H62 C72 22 78 30 78 50 Z" style="fill:${G}"/>
    <path d="M29 46 C29 34 33 28 40 28 H60 C67 28 71 34 71 46 Z" fill="#BFE3E8"/><path d="M36 40 L42 31 M44 42 L52 31" stroke="#fff" stroke-width="2.4" opacity=".75"/>
    <path d="M45 24 H55" stroke="${INK}" stroke-width="2" opacity=".5"/>
    <circle cx="9" cy="48" r="5" style="fill:${G}" stroke-width="2.2"/><circle cx="91" cy="48" r="5" style="fill:${G}" stroke-width="2.2"/>
    <path d="M12 52 C12 46 20 46 22 46 H78 C80 46 88 46 88 52 V80 C88 85 85 87 80 87 H20 C15 87 12 85 12 80 Z" style="fill:${G}"/>
    <path d="M16 56 H84" style="stroke:${G2}" stroke-width="2.2"/>
    <rect x="14" y="54" width="13" height="19" rx="4" fill="#F0506E" stroke-width="2.4"/><rect x="73" y="54" width="13" height="19" rx="4" fill="#F0506E" stroke-width="2.4"/>
    <path d="M20.500 56 V71 M15.500 63 H25.500 M79.500 56 V71 M74.500 63 H84.500" stroke="#fff" stroke-width="1.8" opacity=".85"/>
    <path d="M33 58 C28 58 26 62 26 63 C26 64 28 64 33 64 Z M67 58 C72 58 74 62 74 63 C74 64 72 64 67 64 Z" fill="#fff" stroke-width="1.6"/>
    <circle cx="50" cy="62" r="8.500" fill="#fff" stroke-width="2.4"/><circle cx="50" cy="62" r="5.800" fill="#3B2F33" stroke="none"/><text x="50" y="64" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="4.600" fill="#fff" stroke="none">MINI</text>
    <rect x="37" y="74" width="26" height="8" rx="2.500" fill="#fff" stroke-width="2.2"/><path d="M42 78 H58" stroke="#B9AAB0" stroke-width="2"/>
    <path d="M14 84 H86" stroke="#D5D9DD" stroke-width="3.500"/>`;
  return svg(100, S, body, hurt ? ";filter:brightness(1.15) saturate(.6)" : "");
}

/** chướng ngại trên đường (nhìn từ trên xuống, đủ rõ để phân biệt) */
export function obstacleSVG(k: ObstacleKind, S = 64) {
  const g: Record<ObstacleKind, string> = {
    pothole: `<ellipse cx="50" cy="56" rx="34" ry="22" fill="#B9AAB0"/><ellipse cx="50" cy="58" rx="26" ry="15" fill="#6B5A5F"/><path d="M30 50 C38 44 46 46 50 52" stroke="#fff" stroke-width="2.2" opacity=".5"/><path d="M14 52 L8 44 M86 52 L92 44 M30 78 L26 86" stroke-width="2.4"/>`,
    cone: `<ellipse cx="50" cy="82" rx="30" ry="9" fill="#FFB36B"/><path d="M50 14 L74 80 H26 Z" fill="#FF9A4D"/><path d="M41 44 H59 L63 56 H37 Z" fill="#fff" stroke-width="2.2"/><path d="M50 14 C48 14 46 16 45 20 H55 C54 16 52 14 50 14 Z" fill="#FFB36B" stroke-width="2.2"/>`,
    dog: `<ellipse cx="50" cy="86" rx="24" ry="6" fill="${INK}" opacity=".14" stroke="none"/><path d="M26 70 C26 52 74 52 74 70 C74 82 26 82 26 70 Z" fill="#F2D2A6"/><path d="M74 66 C86 62 90 72 82 76" fill="none" stroke-width="4"/><circle cx="50" cy="42" r="22" fill="#F2D2A6"/><path d="M30 30 C20 34 20 52 30 54 C34 46 34 38 30 30 Z" fill="#B98246"/><path d="M70 30 C80 34 80 52 70 54 C66 46 66 38 70 30 Z" fill="#B98246"/><circle cx="43" cy="42" r="2.4" fill="${INK}" stroke="none"/><circle cx="57" cy="42" r="2.4" fill="${INK}" stroke="none"/><ellipse cx="50" cy="50" rx="4" ry="3" fill="${INK}"/><path d="M50 53 V57 M44 58 Q50 63 56 58" stroke-width="2.2"/>`,
    cart: `<path d="M12 28 H26 L34 66 H78 L86 38 H30" fill="#D8F0FF" stroke-width="2.8"/><path d="M38 44 H82 M40 54 H80 M48 38 V64 M60 38 V64 M72 38 V64" stroke="#8EC7F5" stroke-width="2"/><circle cx="42" cy="78" r="6.5" fill="#FFD66B"/><circle cx="72" cy="78" r="6.5" fill="#FFD66B"/>`
  };
  return svg(100, S, g[k]);
}

/** nhà người nhận ở cuối đường */
export function houseSVG(S = 64) {
  return svg(100, S, `<path d="M14 48 L50 16 L86 48 Z" fill="#FF9DB8"/><rect x="22" y="48" width="56" height="38" rx="3" fill="#FFF1CF"/><rect x="42" y="60" width="16" height="26" rx="5" fill="#8EC7F5"/><circle cx="54" cy="74" r="1.8" fill="${INK}" stroke="none"/><rect x="27" y="56" width="11" height="11" rx="2" fill="#D8F0FF"/><rect x="62" y="56" width="11" height="11" rx="2" fill="#D8F0FF"/><path d="M68 22 V32 M62 22 H74" stroke-width="3"/>`);
}
