/* Sinh màn hình chờ (apple-touch-startup-image) cho các dòng iPhone vào public/splash/.
   Chạy lại khi đổi icon: node scripts/splash.mjs */
import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// [rộng, cao, tỉ lệ điểm ảnh] theo CSS px, chiều dọc
export const DEVICES = [
  [440, 956, 3], [430, 932, 3], [428, 926, 3], [414, 896, 3], [414, 896, 2],
  [402, 874, 3], [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2]
];
mkdirSync("public/splash", { recursive: true });
const page = "file://" + resolve("scripts/splash.html");
for (const [w, h, r] of DEVICES) {
  const out = `public/splash/splash-${w * r}x${h * r}.png`;
  await run(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=4000", "--allow-file-access-from-files",
    `--window-size=${w},${h}`, `--force-device-scale-factor=${r}`, `--screenshot=${out}`, `${page}?w=${w}&h=${h}`]);
  console.log(`✓ ${out}`);
}
// in ra thẻ <link> để dán vào index.html
console.log(DEVICES.map(([w, h, r]) =>
  `  <link rel="apple-touch-startup-image" href="/splash/splash-${w * r}x${h * r}.png" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)">`).join("\n"));
