/* Chụp từng story trong Storybook ra design-kit/*.png (2x) để gửi Claude Design.
   Dùng Chrome có sẵn trên máy (headless), không cần cài thêm gì.
   Chạy: npm run capture   (đặt CHROME_PATH nếu Chrome nằm chỗ khác) */
import { execFile, spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4174, BASE = `http://localhost:${PORT}/storybook.html`, OUT = "design-kit";
const flags = ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--virtual-time-budget=6000"];
const chrome = async (...args) => (await run(CHROME, [...flags, ...args], { maxBuffer: 64 << 20 })).stdout;

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
const stop = () => server.kill();
process.on("exit", stop);
try {
  for (let i = 0; ; i++) {                       // chờ server lên
    try { if ((await fetch(BASE)).ok) break; } catch { /* chưa lên */ }
    if (i > 60) throw new Error("vite preview không chạy được");
    await new Promise(r => setTimeout(r, 250));
  }
  const listDom = await chrome("--dump-dom", `${BASE}?list`);
  const stories = JSON.parse(listDom.match(/<pre id="list">([\s\S]*?)<\/pre>/)[1].replace(/&quot;/g, '"'));
  rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const s of stories) {
    const url = `${BASE}?story=${s.id}`;
    const size = (await chrome("--dump-dom", "--window-size=1600,1000", url)).match(/<title>size=(\d+)x(\d+)<\/title>/);
    const [w, h] = size ? [+size[1], +size[2]] : [438, 892];
    const file = `${OUT}/${String(++n).padStart(2, "0")}-${s.kind}-${s.id}.png`;
    await chrome(`--screenshot=${file}`, `--window-size=${w},${h}`, "--force-device-scale-factor=2", url);
    console.log(`✓ ${file}  (${w}×${h})`);
  }
  console.log(`\nXong ${n} ảnh trong ${OUT}/`);
} finally { stop(); }
