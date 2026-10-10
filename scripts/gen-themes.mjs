/* Sinh src/styles/themes.css: bản màu của từng theme cho mọi màu nhóm hồng trong :root của parts/base.css
   (các biến --pink*, --bg, --ink*, --soft*, --sh, --red và --k-xxxxxx). Thêm màu hồng mới vào parts/base.css thì chạy lại: npm run themes */
import { readFileSync, writeFileSync } from "node:fs";

/* hue: màu chủ đạo mới; sat: nhân độ đậm màu (1 = giữ nguyên). Hồng là bản gốc nên không cần ở đây. */
export const THEMES = [
  { id: "blue", hue: 212, sat: .9 },
  { id: "green", hue: 150, sat: .7 },
  { id: "purple", hue: 265, sat: .85 },
  { id: "orange", hue: 28, sat: .95 },
  { id: "slate", hue: 215, sat: .16 },
  { id: "red", hue: 2, sat: .95 },
  { id: "gold", hue: 42, sat: .95 },
  { id: "teal", hue: 175, sat: .8 },
  { id: "magenta", hue: 318, sat: .9 },
  /* đen: màu nhấn (nút, thanh, viền chính) gần đen; nền và màu nhạt vẫn sáng để chữ dễ đọc. dark = độ sáng riêng của từng biến nhấn */
  { id: "black", hue: 230, sat: .1, dark: { "--pink": .22, "--pink-d": .12, "--pink-m": .32 } }
];
const BASE_HUE = 346;
const css = readFileSync("src/styles/parts/base.css", "utf8");
const root = css.slice(css.indexOf(":root{"), css.indexOf("}", css.indexOf(":root{")));
const vars = [...root.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)].map(m => [m[1], m[2]]);

const toHSL = hex => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2, d = M - m; let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, s, l]; };
const toHex = (h, s, l) => { h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase(); };
const isPink = hex => { const [h, s] = toHSL(hex); return h >= 330 && h <= 358 && s >= .10; };

const mine = vars.filter(([n, hex]) => n !== "--red" && isPink(hex));   // --red là màu báo lỗi nên giữ đỏ
let out = "/* Tạo bằng `npm run themes` (scripts/gen-themes.mjs), đừng sửa tay. */\n";
for (const t of THEMES) {
  out += `:root[data-theme="${t.id}"]{\n  ` + mine.map(([n, hex]) => { const [h, s, l] = toHSL(hex); return `${n}:${toHex(t.hue + (h - BASE_HUE), Math.min(1, s * t.sat), t.dark?.[n] ?? l)}`; }).join(";") + ";\n}\n";
}
writeFileSync("src/styles/themes.css", out);
console.log(`${mine.length} màu × ${THEMES.length} theme -> src/styles/themes.css`);
