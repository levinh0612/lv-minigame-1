/* Khách vẽ sẵn (ảnh trong public/chars). Đổi màu tóc, mắt, áo, da ngay trên máy:
   mỗi pixel được xếp vào một nhóm (tóc / áo / áo trong / tròng mắt / da) một lần, rồi tô lại theo màu muốn,
   giữ nguyên độ sáng tối của nét vẽ. Kết quả lưu theo từng bộ màu nên chỉ tính một lần. */
import { PET_SIZE, SPRITES, type SpriteDef } from "../content/game";

export interface Tint { hair?: string; eye?: string; coat?: string; shirt?: string; skin?: string }
type HSL = [number, number, number];
const toHSL = (r: number, g: number, b: number): HSL => {
  r /= 255; g /= 255; b /= 255;
  const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2, d = M - m;
  let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, s, l];
};
const toRGB = (h: number, s: number, l: number): [number, number, number] => {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};
const hex = (c: string): HSL => { const n = parseInt(c.slice(1), 16); return toHSL(n >> 16, (n >> 8) & 255, n & 255); };
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/* độ sáng chuẩn của từng nhóm trong nét vẽ gốc */
const REF = { hair: .25, coat: .29, shirt: .3, iris: .4 };
const enum K { None, Hair, Coat, Shirt, Iris, Skin }
interface Loaded { base: ImageData; kind: Uint8Array; skin: HSL }
const loaded = new Map<string, Loaded>(), cache = new Map<string, string>();

function classify(id: string, def: SpriteDef, base: ImageData): Uint8Array {
  const d = base.data, W = base.width, k = new Uint8Array(W * base.height), boy = id === "boy";
  for (let p = 0; p < k.length; p++) {
    if (d[p * 4 + 3] < 128) continue;
    const [h, s, l] = toHSL(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]), x = p % W, y = (p / W) | 0;
    const inEye = def.eyes.some(([cx, cy, rx, ry]) => ((x - cx) / (rx + 5)) ** 2 + ((y - cy) / (ry + 5)) ** 2 <= 1);
    if (inEye && h > 170 && h < 250 && s > .06 && l > .2 && l < .72) k[p] = K.Iris;
    else if (h > 170 && h < 225 && s > .3 && l > .1 && l < .62) k[p] = K.Coat;
    else if ((h > 320 || h < 14) && s > .25 && l < .45 && l > .12 && y > def.h * (boy ? .69 : .56)) k[p] = K.Shirt;
    else if (!inEye && h > 225 && h < 270 && s > .07 && s < .3 && l > .15 && l < .46 && (!boy || y < 255)) k[p] = K.Hair;
    else if (h > 14 && h < 48 && s > .3 && l > .55 && l < .95) k[p] = K.Skin;
  }
  return k;
}

const PET_MOODS = ["happy", "open", "wink", "impatient", "love", "wave"];
/** Tải ảnh gốc của mọi nhân vật và phân nhóm pixel; tải sẵn ảnh thú cưng để đổi biểu cảm không bị chớp.
 *  Gọi một lần lúc mở app; chưa xong thì khách dùng ảnh gốc chưa tô màu. */
export function loadSprites(): Promise<void> {
  const pets = Object.keys(PET_SIZE).flatMap(id => PET_MOODS.map(m => new Promise<void>(res => {
    const i = new Image(); i.onload = i.onerror = () => res(); i.src = `/chars/pets/${id}-${m}.webp`;
  })));
  return Promise.all([...pets, ...Object.entries(SPRITES).map(([id, def]) => new Promise<void>(res => {
    const i = new Image();
    i.onload = () => {
      try {
        const cv = document.createElement("canvas"); cv.width = i.naturalWidth; cv.height = i.naturalHeight;
        const cx = cv.getContext("2d", { willReadFrequently: true })!; cx.drawImage(i, 0, 0);
        const base = cx.getImageData(0, 0, cv.width, cv.height);
        loaded.set(id, { base, kind: classify(id, def, base), skin: hex(def.skin) });
      } catch { /* không tô màu được thì dùng ảnh gốc */ }
      res();
    };
    i.onerror = () => res();
    i.src = def.src;
  }))]).then(() => undefined);
}

const skinMap = (T: HSL, S: HSL, [h, s, l]: HSL): HSL => [h + (T[0] - S[0]), clamp(s * (T[1] / S[1])), clamp(l * (T[2] / S[2]), 0, .97)];

/** Địa chỉ ảnh đã tô màu (data URL). Chưa tải xong hoặc không có màu riêng thì trả ảnh gốc. */
export function spriteURL(id: string, t: Tint): string {
  const def = SPRITES[id], L = loaded.get(id);
  if (!L || !(t.hair || t.eye || t.coat || t.shirt || t.skin)) return def.src;
  const key = [id, t.hair, t.eye, t.coat, t.shirt, t.skin].join("|"), hit = cache.get(key);
  if (hit) return hit;
  const T = { hair: t.hair && hex(t.hair), eye: t.eye && hex(t.eye), coat: t.coat && hex(t.coat), shirt: t.shirt && hex(t.shirt), skin: t.skin && hex(t.skin) };
  const out = new ImageData(new Uint8ClampedArray(L.base.data), L.base.width, L.base.height), d = out.data;
  for (let p = 0; p < L.kind.length; p++) {
    const c = L.kind[p]; if (!c) continue;
    const px = toHSL(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]), [, s, l] = px;
    let n: HSL | null = null;
    if (c === K.Hair && T.hair) n = [T.hair[0], T.hair[1], clamp(l * (T.hair[2] / REF.hair), 0, .95)];
    else if (c === K.Coat && T.coat) n = [T.coat[0], clamp(s * (T.coat[1] / .5)), clamp(l * (T.coat[2] / REF.coat), 0, .95)];
    else if (c === K.Shirt && T.shirt) n = [T.shirt[0], clamp(s * (T.shirt[1] / .4)), clamp(l * (T.shirt[2] / REF.shirt), 0, .95)];
    else if (c === K.Iris && T.eye) n = [T.eye[0], clamp(Math.max(s, .3) * (T.eye[1] / .5)), clamp(l * (T.eye[2] / REF.iris), .1, .9)];
    else if (c === K.Skin && T.skin) n = skinMap(T.skin, L.skin, px);
    if (n) { const [r, g, b] = toRGB(...n); d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b; }
  }
  const cv = document.createElement("canvas"); cv.width = L.base.width; cv.height = L.base.height;
  cv.getContext("2d")!.putImageData(out, 0, 0);
  const url = cv.toDataURL("image/png"); cache.set(key, url); return url;
}

/** Màu da dùng cho mí mắt khi nhắm (khớp màu da đã tô) */
export function lidColor(id: string, skin?: string): string {
  const base = hex(SPRITES[id].skin);
  const [r, g, b] = toRGB(...(skin ? skinMap(hex(skin), base, base) : base));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
