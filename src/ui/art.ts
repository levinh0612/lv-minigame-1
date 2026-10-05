import { lidColor, spriteURL } from "./sprite";
import { CATS, PET_SIZE, SPRITES, type GuestLook, type Look, type Mood, type PartKey, type PetLook } from "../content/game";

/* ===================== VẼ: bánh, thú cưng, khách (ảnh vẽ sẵn trong public/chars), đồ ăn, nguyên liệu ===================== */
const INK = "#4A3438";
const sparkle = (x: number, y: number, s: number, delay = 0, dur = 1.8) => `<path d="M${x} ${y} l${1.8*s} ${-4.6*s} l${1.8*s} ${4.6*s} l${4.6*s} ${1.8*s} l${-4.6*s} ${1.8*s} l${-1.8*s} ${4.6*s} l${-1.8*s} ${-4.6*s} l${-4.6*s} ${-1.8*s} Z" style="transform-box:fill-box;transform-origin:center;animation:cakeTw ${dur}s ease-in-out ${delay}s infinite"/>`;
const heartP = (x: number, y: number, delay: number) => `<path d="M${x+6} ${y} C${x+6} ${y-4} ${x+1} ${y-5} ${x} ${y-1} C${x-1} ${y-5} ${x-6} ${y-4} ${x-6} ${y} C${x-6} ${y+4} ${x} ${y+7} ${x} ${y+9} C${x} ${y+7} ${x+6} ${y+4} ${x+6} ${y} Z" style="transform-box:fill-box;transform-origin:center;animation:cakeTw 1.4s ease-in-out ${delay}s infinite"/>`;
const CREAM_W = `<path d="M18 80 C18 64 40 56 70 56 C100 56 122 64 122 80 C116 80 116 86 110 86 C104 86 104 80 98 80 C92 80 94 88 86 88 C80 88 80 80 74 80 H66 C60 80 60 86 54 86 C48 86 48 80 42 80 C36 80 36 86 30 86 C24 86 24 80 18 80 Z" fill="%C"/>`;
const CREAM_T = `<path d="M50 60 C48 46 58 38 70 38 C82 38 92 46 90 60 Z" fill="%C"/><path d="M57 50 C64 46 76 46 83 50" stroke-width="2"/>`;
const CREAM_P = CREAM_W + CREAM_T;
const STRAW = `<path d="M70 42 C58 42 56 28 62 21 C66 17 74 17 78 21 C84 28 82 42 70 42 Z" fill="#F0506E"/><path d="M62 21 L65 14 L70 19 L75 14 L78 21 Z" fill="#7FB77E" stroke-width="2.2"/>`;
const NUT = `<path d="M70 16 C62 24 57 31 57 38 C57 45 83 45 83 38 C83 31 78 24 70 16 Z" fill="#B07A4A"/>`;
/* nét vẽ đế và topping dùng chung cho cakeSVG (một tầng) và cakeTiersSVG (nhiều tầng) */
const BASE_G = [
  `<rect x="22" y="74" width="96" height="34" rx="10" fill="#F6D59A"/><g fill="#E6B870" stroke="none"><circle cx="34" cy="100" r="2.4"/><circle cx="106" cy="99" r="2"/><circle cx="40" cy="86" r="1.8"/><circle cx="100" cy="86" r="2.2"/></g>`,
  `<path d="M16 76 H124 L114 108 H26 Z" fill="#D9A66B"/><path d="M30 80 L33 104 M44 80 L46 104 M96 80 L94 104 M110 80 L107 104" stroke="#B98246" stroke-width="2.2"/>`,
  `<path d="M22 108 C20 82 40 70 70 70 C100 70 120 82 118 108 Z" fill="#FFF4EE"/><g fill="#F1DDD5" stroke="none"><circle cx="36" cy="96" r="1.8"/><circle cx="104" cy="94" r="1.8"/><circle cx="44" cy="84" r="1.4"/><circle cx="98" cy="84" r="1.4"/></g>`,
  `<path d="M14 108 C12 86 30 72 70 72 C110 72 128 86 126 108 C120 110 116 104 108 104 C100 104 98 110 90 110 C82 110 80 104 70 104 C60 104 58 110 50 110 C42 110 40 104 32 104 C24 104 20 110 14 108 Z" fill="#E8A857"/><path d="M34 80 L40 102 M52 74 L56 103 M70 72 V104 M88 74 L84 103 M106 80 L100 102" stroke="#C57F36" stroke-width="2.2"/><g fill="#F6CE8A" stroke="none"><ellipse cx="44" cy="82" rx="4" ry="1.8"/><ellipse cx="96" cy="82" rx="4" ry="1.8"/><ellipse cx="70" cy="78" rx="4" ry="1.8"/></g>`,
  `<rect x="22" y="74" width="96" height="34" rx="8" fill="#FFF1CF"/><path d="M22 98 H118 V100 C118 106 115 108 109 108 H31 C25 108 22 106 22 100 Z" fill="#C98E55"/><g fill="#E9D3A4" stroke="none"><circle cx="36" cy="88" r="2"/><circle cx="104" cy="86" r="2.2"/><circle cx="44" cy="80" r="1.5"/><circle cx="98" cy="80" r="1.5"/></g><g fill="#A8733F" stroke="none"><circle cx="40" cy="103" r="1.6"/><circle cx="70" cy="104" r="1.4"/><circle cx="100" cy="103" r="1.6"/></g>`
];
const TOP_G = [
  `${STRAW}<g fill="#FFE08A" stroke="none"><ellipse cx="65" cy="28" rx="1.2" ry="1.8"/><ellipse cx="75" cy="28" rx="1.2" ry="1.8"/><ellipse cx="70" cy="34" rx="1.2" ry="1.8"/></g><g transform="translate(34 62) scale(.55) translate(-70 -30)" stroke-width="4.4">${STRAW}</g><g transform="translate(106 62) scale(.55) translate(-70 -30)" stroke-width="4.4">${STRAW}</g>`,
  `<g fill="#8E3B46" stroke-width="2"><ellipse cx="60" cy="38" rx="5.5" ry="4.2"/><ellipse cx="72" cy="32" rx="5.5" ry="4.2" transform="rotate(-15 72 32)"/><ellipse cx="81" cy="40" rx="5.5" ry="4.2" transform="rotate(20 81 40)"/><ellipse cx="68" cy="42" rx="5.5" ry="4.2"/><ellipse cx="34" cy="64" rx="4.5" ry="3.4"/><ellipse cx="44" cy="60" rx="4.5" ry="3.4"/><ellipse cx="96" cy="60" rx="4.5" ry="3.4"/><ellipse cx="106" cy="64" rx="4.5" ry="3.4"/><g fill="#fff" stroke="none" opacity=".8"><circle cx="58.5" cy="36.5" r="1.2"/><circle cx="70.5" cy="30.5" r="1.2"/><circle cx="79.5" cy="38.5" r="1.2"/></g></g>`,
  `${NUT}<path d="M58.5 37 C60 43 80 43 81.5 37 C76 40.5 64 40.5 58.5 37 Z" fill="#E8C9A0" stroke-width="2"/><path d="M66 24 C64 27 63 30 63 32" stroke="#D4A472" stroke-width="2.2"/><g transform="translate(36 62) scale(.55) translate(-70 -32)" stroke-width="4.4">${NUT}</g><g transform="translate(104 62) scale(.55) translate(-70 -32)" stroke-width="4.4">${NUT}</g>`,
  `<g fill="#4B5FB0" stroke-width="2.2"><circle cx="62" cy="33" r="8.5"/><circle cx="79" cy="33" r="8.5"/><circle cx="70.5" cy="22" r="8.5"/></g><g stroke="#2E3A7A" stroke-width="1.5"><path d="M59.500 31 l2.500 2.500 l2.500 -2.500 M76.500 31 l2.500 2.500 l2.500 -2.500 M68 20 l2.500 2.500 l2.500 -2.500"/></g><g fill="#fff" stroke="none" opacity=".7"><circle cx="58" cy="36" r="1.3"/><circle cx="75" cy="36" r="1.3"/><circle cx="66" cy="25" r="1.3"/></g><g transform="translate(34 62) scale(.55) translate(-70 -30)" stroke-width="4.4"><circle cx="70" cy="30" r="9" fill="#4B5FB0"/></g><g transform="translate(106 62) scale(.55) translate(-70 -30)" stroke-width="4.4"><circle cx="70" cy="30" r="9" fill="#4B5FB0"/></g>`,
  `<g fill="#D6456A" stroke-width="2"><circle cx="70" cy="22" r="6"/><circle cx="62" cy="29" r="6"/><circle cx="78" cy="29" r="6"/><circle cx="66" cy="38" r="6"/><circle cx="74" cy="38" r="6"/><circle cx="70" cy="30" r="6"/></g><g fill="#F7A3B8" stroke="none"><circle cx="68" cy="20" r="1.4"/><circle cx="60" cy="27" r="1.4"/><circle cx="76" cy="27" r="1.4"/><circle cx="64" cy="36" r="1.4"/><circle cx="72" cy="36" r="1.4"/></g><path d="M70 17 C66 10 59 11 59 11 C60 16 66 18 70 17 Z" fill="#7FB77E" stroke-width="2"/><g transform="translate(34 62) scale(.55) translate(-70 -30)" stroke-width="4.4"><circle cx="64" cy="30" r="6" fill="#D6456A"/><circle cx="76" cy="30" r="6" fill="#D6456A"/><circle cx="70" cy="38" r="6" fill="#D6456A"/></g><g transform="translate(106 62) scale(.55) translate(-70 -30)" stroke-width="4.4"><circle cx="64" cy="30" r="6" fill="#D6456A"/><circle cx="76" cy="30" r="6" fill="#D6456A"/><circle cx="70" cy="38" r="6" fill="#D6456A"/></g>`
];
export interface CakeParts { base?: number | null; cream?: number | null; top?: number | null; sweet?: number | null }
export interface CakeOpts { size?: number; done?: boolean; drop?: PartKey | null; still?: boolean }
// Chỉ số -1..2; drop = phần vừa thêm (chỉ phần đó rơi xuống), still = không động
export function cakeSVG(p: CakeParts, o: CakeOpts = {}){
  const S = o.size || 140, b = p.base ?? -1, c = p.cream ?? -1, t = p.top ?? -1, s = p.sweet ?? -1, done = !!o.done;
  const drop = (k: PartKey) => o.drop === k ? ` style="transform-box:fill-box;transform-origin:50% 100%;animation:cakeDrop .55s cubic-bezier(.3,1.4,.5,1) both"` : "";
  const body = o.still ? "" : `transform-box:fill-box;transform-origin:50% 100%;animation:${done ? "cakeHop .8s cubic-bezier(.3,1.4,.5,1) infinite" : "cakeIdle 2.8s ease-in-out infinite"}`;
  let g = "";
  if (b >= 0 && BASE_G[b]) g += `<g${drop("base")}>${BASE_G[b]}</g>`;
  if (b>=0){
    g += `<ellipse cx="50" cy="100" rx="4.6" ry="2.6" fill="#FF9FB6" stroke="none" opacity=".8"/><ellipse cx="90" cy="100" rx="4.6" ry="2.6" fill="#FF9FB6" stroke="none" opacity=".8"/>`;
    g += done ? `<path d="M54 97 Q58 92 62 97 M78 97 Q82 92 86 97" stroke-width="2.2"/>`
              : `<circle cx="58" cy="96" r="3.4" fill="${INK}" stroke="none"/><circle cx="59.2" cy="94.8" r="1.2" fill="#fff" stroke="none"/><circle cx="82" cy="96" r="3.4" fill="${INK}" stroke="none"/><circle cx="83.2" cy="94.8" r="1.2" fill="#fff" stroke="none"/>`;
    g += `<path d="M66 100 Q70 104 74 100" stroke-width="2.2"/>`;
  }
  if (c>=0) g += `<g${drop("cream")}>${CREAM_P.replace(/%C/g, CATS.cream[c][1])}</g>`;
  if (t >= 0 && TOP_G[t]) g += `<g${drop("top")}>${TOP_G[t]}</g>`;
  if (s===2) g += `<path d="M26 72 C38 67 46 76 56 71 C66 66 76 76 86 71 C96 66 104 74 114 69" stroke="#E8A92A" stroke-width="3.6" style="animation:cakeDrop .5s ease-out both"/>`;
  let out = `<ellipse cx="70" cy="110" rx="62" ry="8" fill="#FFFFFF"/>`;
  if (b<0) out += `<path d="M24 108 C22 82 42 66 70 66 C98 66 118 82 116 108 Z" stroke="#D9C4CB" stroke-dasharray="6 6"/>`;
  out += `<g style="${body}">${g}</g>`;
  if (s>=0){
    out += `<g fill="#FFD166" stroke-width="1.6">${sparkle(104,44,1)}`;
    if (s>=1) out += sparkle(28,48,1,-.9);
    if (s>=2) out += sparkle(44,26,.78,-.4) + sparkle(94,22,.78,-1.3);
    out += `</g>`;
  }
  if (done) out += `<g fill="#FF8FAB" stroke-width="1.6"><g fill="#FFD166">${sparkle(14,60,1.3,0,1.2)}${sparkle(122,70,1.3,-.6,1.2)}</g>${heartP(110,29,-.3)}${heartP(24,25,-1)}</g>`;
  return `<svg width="${S}" height="${Math.round(S*114/140)}" viewBox="0 6 140 114" style="display:block;overflow:visible;flex:none" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${out}</svg>`;
}

/* Bánh nhiều tầng: dựng từ chính các nét của cakeSVG. Mỗi tầng = đế + một lớp kem rộng, tầng sau nhỏ dần (×0,8) và đứng trên mặt kem tầng dưới.
   Chỉ tầng đáy có mặt cười; tầng trên cùng có đỉnh kem và topping. tiers[0] là tầng dưới cùng, mỗi tầng là [đế, kem]. */
export function cakeTiersSVG(tiers: [number, number][], top: number, o: { size?: number; still?: boolean } = {}) {
  const S = o.size || 140, n = Math.max(1, tiers.length), SC = 0.8;
  const face = `<ellipse cx="50" cy="100" rx="4.6" ry="2.6" fill="#FF9FB6" stroke="none" opacity=".8"/><ellipse cx="90" cy="100" rx="4.6" ry="2.6" fill="#FF9FB6" stroke="none" opacity=".8"/><circle cx="58" cy="96" r="3.4" fill="${INK}" stroke="none"/><circle cx="59.2" cy="94.8" r="1.2" fill="#fff" stroke="none"/><circle cx="82" cy="96" r="3.4" fill="${INK}" stroke="none"/><circle cx="83.2" cy="94.8" r="1.2" fill="#fff" stroke="none"/><path d="M66 100 Q70 104 74 100" stroke-width="2.2"/>`;
  let g = "", creamTop = 56, minY = 56;
  tiers.forEach(([b, c], i) => {
    const s = Math.pow(SC, i), last = i === n - 1, bottom = i === 0 ? 108 : creamTop + 3, ty = bottom - 108 * s, cc = CATS.cream[c][1];
    g += `<g transform="translate(${+(70 * (1 - s)).toFixed(2)} ${+ty.toFixed(2)}) scale(${+s.toFixed(3)})" stroke-width="${+(2.6 / s).toFixed(2)}">`
      + `<g>${BASE_G[b]}</g>${i === 0 ? face : ""}${CREAM_W.replace(/%C/g, cc)}`
      + (last ? `${CREAM_T.replace(/%C/g, cc)}<g>${TOP_G[top] ?? ""}</g>` : "") + `</g>`;
    creamTop = ty + 56 * s;
    if (last) minY = ty + 12 * s;
  });
  const y0 = Math.floor(minY - 4), h = 120 - y0, body = o.still ? "" : `transform-box:fill-box;transform-origin:50% 100%;animation:cakeIdle 2.8s ease-in-out infinite`;
  return `<svg width="${S}" height="${Math.round(S * h / 140)}" viewBox="0 ${y0} 140 ${h}" style="display:block;overflow:visible;flex:none" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><ellipse cx="70" cy="110" rx="62" ry="8" fill="#FFFFFF"/><g style="${body}">${g}</g></svg>`;
}

/* Thú cưng của tiệm: mỗi biểu cảm là một ảnh (vẫy tay là ảnh riêng), nằm sau quầy */
export function petSVG(p: PetLook & { mood?: Mood }, S = 90){
  const [w, h] = PET_SIZE[p.pet], H = Math.round(120 * h / w), file = p.wave ? "wave" : p.mood || "happy";
  const px = Math.round(S * .77 * w / h);   // ảnh cao hơn bản vẽ cũ: giữ chiều cao tương đương S × 0.77 để các khung cũ vẫn vừa
  return `<svg width="${px}" height="${Math.round(px*H/120)}" viewBox="0 0 120 ${H}" style="display:block;overflow:visible;flex:none" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><image href="/chars/pets/${p.pet}-${file}.png" width="120" height="${H}"/>${p.ledge !== false ? `<path d="M-6 ${H} H126"/>` : ""}</svg>`;
}

/* Khách (nam/nữ): ảnh vẽ sẵn tô lại màu theo từng khách, thỉnh thoảng chớp mắt; ló nửa người sau quầy */
export function guestSVG(p: GuestLook & { mood?: Mood }, S = 90){
  const mood = p.mood || "happy", def = SPRITES[p.sprite], tint = { hair: p.hair, eye: p.eye, coat: p.coat, shirt: p.shirt, skin: p.skin };
  const k = 92 / def.h, wd = def.w * k, x0 = (120 - wd) / 2, ex = Math.min(112, x0 + wd - 4);
  let o = `<image href="${spriteURL(p.sprite, tint)}" x="${x0.toFixed(1)}" y="8" width="${wd.toFixed(1)}" height="92"/>`;
  const closed = mood==="wink" || mood==="love";   // nháy mắt / mắt cười; còn lại thỉnh thoảng chớp
  o += `<g${closed ? "" : ` class="blk" style="animation-delay:-${(Math.random()*4.2).toFixed(2)}s"`}>${def.eyes.map(([cx, cy, rx, ry]) => {
    const X = x0 + cx * k, Y = 8 + cy * k, R = rx * k, V = ry * k * .8;
    return `<ellipse cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" rx="${R.toFixed(1)}" ry="${V.toFixed(1)}" fill="${lidColor(p.sprite, p.skin)}" stroke="none"/><path d="M${(X-R*.8).toFixed(1)} ${Y.toFixed(1)} Q${X.toFixed(1)} ${(Y+V*.55).toFixed(1)} ${(X+R*.8).toFixed(1)} ${Y.toFixed(1)}" stroke-width="1.8"/>`;
  }).join("")}</g>`;
  if (mood==="impatient") o += `<path d="M${ex-6} 30 C${ex-11} 37 ${ex-11} 43 ${ex-6} 43 C${ex-1} 43 ${ex-1} 37 ${ex-6} 30 Z" fill="#A8DDF5" stroke-width="2"/>`;
  if (mood==="love") o += `<g style="animation:critHeart 1.6s ease-in-out infinite" transform="translate(${ex-110} 0)"><path d="M110 28 C110 23 104 22 103 27 C102 22 96 23 96 28 C96 33 103 36 103 39 C103 36 110 33 110 28 Z" fill="#FF6F91" stroke-width="2"/></g>`;
  if (p.ledge !== false) o += `<path d="M-6 100 H126"/>`;
  return `<svg width="${S}" height="${Math.round(S*94/120)}" viewBox="0 6 120 94" style="display:block;overflow:visible;flex:none" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${o}</svg>`;
}
export const charSVG = (look: Look, mood: Mood, S?: number) => guestSVG({ ...look, mood }, S);

/* Đồ ăn thú cưng (FoodIcon của Claude Design): Hạt (bát), Pate (lon), Ức gà (miếng thịt) */
const FOOD_ART = {
  kibble: `<ellipse cx="50" cy="86" rx="36" ry="6" fill="#F3D5DD" stroke="none"/><path d="M40 40 C36 30 44 26 48 32 C52 26 60 30 56 40 Z" fill="#D9A66B" stroke-width="2.6"/><circle cx="30" cy="50" r="8" fill="#C98E5A" stroke-width="2.6"/><circle cx="68" cy="48" r="8.5" fill="#D9A66B" stroke-width="2.6"/><path d="M44 52 C40 44 50 40 54 46 C60 42 66 50 58 54 Z" fill="#E6B870" stroke-width="2.6"/><circle cx="78" cy="56" r="6" fill="#C98E5A" stroke-width="2.6"/><path d="M12 56 H88 C86 76 72 86 50 86 C28 86 14 76 12 56 Z" fill="#FF8FAB"/><path d="M12 56 H88"/><path d="M20 62 H80" stroke="#FFC4D4"/><g fill="#FFFFFF" stroke="none"><ellipse cx="50" cy="74" rx="6" ry="4.6"/><circle cx="42" cy="67" r="2.6"/><circle cx="48" cy="64.5" r="2.6"/><circle cx="54" cy="64.5" r="2.6"/><circle cx="60" cy="67" r="2.6"/></g>`,
  pate: `<ellipse cx="50" cy="88" rx="34" ry="6" fill="#F3D5DD" stroke="none"/><path d="M18 54 V76 C18 88 82 88 82 76 V54" fill="#8FD9B6"/><path d="M18 62 C18 72 82 72 82 62" stroke="#5FB892" stroke-width="2.4"/><path d="M40 74 C44 70 52 70 56 74 C52 78 44 78 40 74 Z M56 74 L62 70 V78 Z" fill="#FFFFFF" stroke-width="2"/><ellipse cx="50" cy="54" rx="32" ry="10" fill="#E8E4EE"/><ellipse cx="50" cy="54" rx="26" ry="7" fill="#FFA99A" stroke-width="2.2"/><path d="M36 52 C40 49 46 50 48 53 M54 51 C58 49 62 51 64 54" stroke="#E27F72" stroke-width="2"/><g transform="rotate(-24 70 26)"><ellipse cx="70" cy="26" rx="22" ry="7.5" fill="#E8E4EE"/><ellipse cx="70" cy="25" rx="15" ry="4" stroke="#C3BCCB" stroke-width="2"/></g><path d="M52 44 C50 38 54 34 58 36" stroke-width="2.6"/>`,
  chicken: `<ellipse cx="50" cy="84" rx="42" ry="10" fill="#FFFFFF"/><path d="M20 66 C14 46 32 28 56 30 C78 32 90 48 85 62 C80 76 60 82 44 80 C32 79 23 74 20 66 Z" fill="#F7D9A8"/><path d="M28 70 C26 60 34 46 50 42" stroke="#FFF1D8" stroke-width="4"/><path d="M38 52 L50 44 M44 64 L64 50 M56 72 L74 58" stroke="#C98E5A" stroke-width="3.2"/><path d="M70 34 C74 26 82 24 86 26 C84 32 78 36 72 36 Z" fill="#8FCB7A" stroke-width="2.4"/><path d="M74 34 L82 28" stroke-width="1.8"/>`
};
export const foodSVG = (id: "kibble" | "pate" | "chicken", S = 40) =>
  `<svg width="${S}" height="${S}" viewBox="0 0 100 100" style="display:block;flex:none;overflow:visible" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${FOOD_ART[id]}</svg>`;

/* Icon nguyên liệu (IngIcon của Claude Design): đế / kem / topping / độ ngọt, mỗi loại 3 món đầu có từ đầu, các món sau thuộc nhà cung cấp (content/game.ts) */
const ING: Record<PartKey, string[]> = {
  base: [
    `<path d="M5 17 C5 11 10 8 20 8 C30 8 35 11 35 17 V30 C35 32 33 33 31 33 H9 C7 33 5 32 5 30 Z" fill="#F6D59A"/><path d="M5 17 C5 21 35 21 35 17" fill="#E8B866"/><g fill="#E0B070" stroke="none"><circle cx="12" cy="26" r="1.6"/><circle cx="20" cy="28" r="1.3"/><circle cx="27" cy="25" r="1.6"/><circle cx="16" cy="23" r="1"/></g>`,
    `<path d="M4 15 H36 L32 32 H8 Z" fill="#D9A66B"/><path d="M4 15 C4 12 36 12 36 15" fill="#FFF0C2"/><path d="M11 18 L12.5 29 M17 18 L17.6 29 M23 18 L22.4 29 M29 18 L27.5 29" stroke="#B98246" stroke-width="1.8"/>`,
    `<path d="M5 30 C4 18 11 10 20 10 C29 10 36 18 35 30 C35 32 33 33 31 33 H9 C7 33 5 32 5 30 Z" fill="#FFF4EE"/><ellipse cx="13" cy="25" rx="2.4" ry="1.4" fill="#FFB3C7" stroke="none"/><ellipse cx="27" cy="25" rx="2.4" ry="1.4" fill="#FFB3C7" stroke="none"/><g fill="#E9D6CE" stroke="none"><circle cx="16" cy="15" r="1"/><circle cx="24" cy="16" r="1"/><circle cx="20" cy="13" r=".9"/></g>`,
    `<path d="M3 27 C3 17 11 10 20 10 C29 10 37 17 37 27 C37 31 33 32 31 29 C29 27 26 27 24 30 C22 32 18 32 16 30 C14 27 11 27 9 29 C7 32 3 31 3 27 Z" fill="#E8A857"/><path d="M12 14 L14 26 M20 11 V27 M28 14 L26 26" stroke="#C57F36" stroke-width="1.8"/><g fill="#F6CE8A" stroke="none"><ellipse cx="16" cy="16" rx="2.4" ry="1.2"/><ellipse cx="25" cy="17" rx="2.4" ry="1.2"/></g>`,
    `<path d="M5 14 C5 9 35 9 35 14 V30 C35 32 33 33 31 33 H9 C7 33 5 32 5 30 Z" fill="#FFF1CF"/><path d="M5 25 H35 V30 C35 32 33 33 31 33 H9 C7 33 5 32 5 30 Z" fill="#C98E55"/><ellipse cx="20" cy="14" rx="15" ry="4.2" fill="#FFF8E4"/><g fill="#E9D3A4" stroke="none"><circle cx="13" cy="19" r="1.2"/><circle cx="24" cy="20" r="1.2"/><circle cx="30" cy="18" r="1"/></g>`
  ],
  cream: [["#9CCB86", "#6FAE5A", `<path d="M27 7 C29 4 33 4 34 5 C33 8 30 9 28 9 Z" fill="#7FB77E" stroke-width="1.6"/>`],
          ["#FFB3C7", "#F08FAA", `<path d="M27 4 C24 4 23 8 26 10 C29 8 30 4 27 4 Z" fill="#F0506E" stroke-width="1.6"/>`],
          ["#FFF0C2", "#E6CF86", `<path d="M26 11 L35 3" stroke="#5C3A26" stroke-width="2.6"/><path d="M33 3 C35 2 37 4 35 6" fill="#9FD18A" stroke-width="1.6"/>`],
          ["#FFF6D6", "#EBD58E", `<path d="M26 10 L35 4 L35 11 Z" fill="#F7D560" stroke-width="1.6"/><circle cx="31" cy="8.5" r="1" fill="#E3B93E" stroke="none"/>`],
          ["#8A5A44", "#5C3A2C", `<rect x="26" y="3" width="8" height="8" rx="1.6" fill="#5C3A2C" stroke-width="1.6"/><path d="M26 7 H34 M30 3 V11" stroke="#8A5A44" stroke-width="1.2"/>`]]
    .map(([f, l, x]) => `<path d="M6 33 C4 27 8 24 11 24 C9 19 14 15 18 17 C17 11 24 7 27 12 C31 13 32 18 29 21 C34 22 36 28 33 33 Z" fill="${f}"/><path d="M14 27 C18 25 24 25 28 27 M18 20 C21 19 24 19 26 20" stroke="${l}" stroke-width="1.8"/>${x}`),
  top: [
    `<path d="M20 35 C9 33 6 21 10 15 C13 11 27 11 30 15 C34 21 31 33 20 35 Z" fill="#F0506E"/><path d="M11 14 L15 7 L20 12 L25 7 L29 14 C24 17 16 17 11 14 Z" fill="#7FB77E"/><path d="M20 12 V4"/><g fill="#FFE08A" stroke="none"><ellipse cx="15" cy="21" rx="1" ry="1.6"/><ellipse cx="25" cy="21" rx="1" ry="1.6"/><ellipse cx="20" cy="26" rx="1" ry="1.6"/><ellipse cx="15" cy="29" rx="1" ry="1.6"/><ellipse cx="25" cy="29" rx="1" ry="1.6"/></g>`,
    `<g fill="#8E3B46"><ellipse cx="13" cy="25" rx="7.5" ry="5.8" transform="rotate(-18 13 25)"/><ellipse cx="27" cy="25" rx="7.5" ry="5.8" transform="rotate(18 27 25)"/><ellipse cx="20" cy="14" rx="7.5" ry="5.8"/></g><g stroke="#E8C3C8" stroke-width="1.6"><path d="M10 23 L13 24"/><path d="M25 23 L28 24"/><path d="M18 12 L21 12"/></g><g fill="#fff" stroke="none" opacity=".75"><circle cx="11" cy="22" r="1.3"/><circle cx="25" cy="22" r="1.3"/><circle cx="17" cy="11.5" r="1.3"/></g>`,
    `<path d="M20 6 C12 13 6 20 6 27 C6 34 34 34 34 27 C34 20 28 13 20 6 Z" fill="#B07A4A"/><path d="M7.5 26 C9 33 31 33 32.5 26 C27 29 13 29 7.5 26 Z" fill="#EAD0A8" stroke-width="1.8"/><path d="M15 15 C13 18 12 21 12 23" stroke="#D4A472" stroke-width="2"/>`,
    `<g fill="#4B5FB0"><circle cx="13" cy="26" r="8"/><circle cx="27" cy="26" r="8"/><circle cx="20" cy="14" r="8"/></g><g stroke="#2E3A7A" stroke-width="1.5"><path d="M10.5 24 l2.5 2.5 l2.5 -2.5 M24.5 24 l2.5 2.5 l2.5 -2.5 M17.5 12 l2.5 2.5 l2.5 -2.5"/></g><g fill="#fff" stroke="none" opacity=".7"><circle cx="10" cy="29" r="1.3"/><circle cx="24" cy="29" r="1.3"/><circle cx="17" cy="17" r="1.3"/></g>`,
    `<g fill="#D6456A"><circle cx="20" cy="15" r="5.2"/><circle cx="13" cy="20" r="5.2"/><circle cx="27" cy="20" r="5.2"/><circle cx="16" cy="27" r="5.2"/><circle cx="24" cy="27" r="5.2"/><circle cx="20" cy="22" r="5.2"/></g><g fill="#F7A3B8" stroke="none"><circle cx="18" cy="13" r="1.2"/><circle cx="11" cy="18" r="1.2"/><circle cx="25" cy="18" r="1.2"/><circle cx="14" cy="25" r="1.2"/><circle cx="22" cy="25" r="1.2"/></g><path d="M20 10 C17 5 12 6 12 6 C13 10 17 11 20 10 Z" fill="#7FB77E" stroke-width="1.8"/>`
  ],
  sweet: [
    `<rect x="12" y="15" width="16" height="16" rx="3" fill="#FFFFFF"/><path d="M12 19 H28" stroke="#EDE1D2" stroke-width="1.6"/>`,
    `<rect x="4" y="17" width="15" height="15" rx="3" fill="#FFF7E3"/><rect x="21" y="17" width="15" height="15" rx="3" fill="#FFE3A0"/><path d="M4 21 H19 M21 21 H36" stroke="#EAD4A5" stroke-width="1.6"/>`,
    `<rect x="3" y="21" width="14" height="13" rx="3" fill="#FFE3A0"/><rect x="19" y="21" width="14" height="13" rx="3" fill="#FFC94D"/><rect x="11" y="7" width="14" height="13" rx="3" fill="#FFD66B"/><path d="M34 6 l1.4 -3.4 l1.4 3.4 l3.4 1.4 l-3.4 1.4 l-1.4 3.4 l-1.4 -3.4 l-3.4 -1.4 Z" fill="#FFD166" stroke-width="1.2"/>`
  ]
};
export const ingSVG = (k: PartKey, i: number, S = 24, dim = false) =>
  `<svg width="${S}" height="${S}" viewBox="0 0 40 40" style="display:block;overflow:visible;flex:none${dim ? ";opacity:.45" : ""}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${ING[k][i]}</svg>`;
