/* Sinh src/content/hanzi-strokes.json (dữ liệu nét) và hanzi-n.json (số nét, nhỏ, dùng để xếp độ khó): dữ liệu nét của các chữ trong content/hanzi.ts (lấy từ gói hanzi-writer-data),
   để game viết chữ chạy offline mà không phải nhúng cả bộ 9500 chữ. Thêm chữ mới vào hanzi.ts thì chạy lại: npm run hanzi:data */
import { readFileSync, writeFileSync } from "node:fs";

const chars = [...new Set([...readFileSync("src/content/hanzi.ts", "utf8").matchAll(/H\("(.)"/gu)].map(m => m[1]))];
const out = {}, n = {};
for (const c of chars) {
  const d = JSON.parse(readFileSync(`node_modules/hanzi-writer-data/${c}.json`, "utf8"));
  out[c] = { strokes: d.strokes, medians: d.medians }; n[c] = d.strokes.length;
}
writeFileSync("src/content/hanzi-strokes.json", JSON.stringify(out));
writeFileSync("src/content/hanzi-n.json", JSON.stringify(n));
console.log(`${chars.length} chữ → src/content/hanzi-strokes.json`);
