/* Tiến trình người chơi, lưu trong localStorage (cùng key với bản cũ để không mất dữ liệu). */
import { CFG, type PetId } from "../content/couple";
import { BOY_SPRITES, GIRL_SPRITES, SPRITES, STARTER_STOCK, type FoodId, type GuestLook, type Look, type StockKey } from "../content/game";
import { DEFAULT_ROOM, OLD_TO_ROOM, type Room } from "../content/room";
import { freshBook, type Book } from "./wallet";

export const KEY = "tiem-banh-matcha-v1";

export interface Review { who: string; look: Look; s: number; txt: string; love: boolean }
export interface Letter { day: string; txt: string; tag?: string; bonus?: boolean }
export interface PetState { aff: number; petDay: string; pets: number; fedDay: string }
export interface StaffState { hired: boolean; lv: number; onDuty: boolean; food?: FoodId }
export interface Daily { day: string; served: number; earned: number; feat: number; angry: number; claimed: boolean; boy: boolean; featId: string }
export interface State {
  v: number; coins: number; xp: number; decor: string[]; reviews: Review[]; letters: Letter[]; served: number; shifts: number;
  names: { her: string; his: string; girls: string; boys: string; pets: Record<PetId, string> };
  pets: Record<PetId, PetState>;
  daily: Daily; streak: number; lastDay: string; sound: boolean; music: boolean; song?: string; vibe: boolean; refund?: number;
  stock: Record<StockKey, number[]>; staff: Record<PetId, StaffState>; tut: boolean;
  food: Record<FoodId, number>; welcome: boolean; autoTake: boolean;
  room: Room; owned: string[];    // đồ trang trí đang dùng / đã mua ("nhóm:kiểu")
  earned: number;                 // tổng xu kiếm được từ bán bánh (bảng xếp hạng)
  book: Book;                     // sổ thu chi (bảng Ví)
  me: Avatar;                     // nhân vật của người chơi (chọn kiểu + màu), đồng bộ theo tài khoản
  shop: string;                   // tên tiệm hiện ở màn chính (để trống thì dùng tên tài khoản)
  theme: string;                  // theme màu giao diện (content/theme.ts)
  scene3d: boolean;               // cảnh tiệm 3D ở màn chính (tắt trên máy yếu thì dùng cảnh 2D)
  photo: string;                  // ảnh treo tường tiệm (data URL đã thu nhỏ)
  comp?: number;                  // đã nhận khoản đền bù một lần chưa
  loginDay?: string;              // ngày (YYYY-MM-DD) đã nhận thưởng đăng nhập gần nhất
  incAt?: number;                 // số ca đã chơi lúc gặp sự cố gần nhất (để cách nhau vài ca)
  cloud: Cloud;
}
/* Lưu trên mây: mã tiệm (bí mật, dùng để khôi phục), tên trên bảng xếp hạng, giờ nhắc */
/** nhân vật người chơi: id ảnh (content/game.ts SPRITES) và màu tô */
export interface Avatar { sprite: string; hair: string; eye: string; coat: string; shirt: string; skin: string; pants?: string; shoes?: string; style?: string }
export const meLook = (): GuestLook => ({ gender: S.me.sprite[0] === "b" || S.me.sprite[0] === "m" ? "boy" : "girl", ...S.me });
export const DEFAULT_ME: Avatar = { sprite: "g1", hair: "#3B2A26", eye: "#6C8FC0", coat: "#2F6F86", shirt: "#8A3D55", skin: "#FFE3D0" };
export interface Cloud { code: string; name: string; show: boolean; at: string; morning: boolean; night: boolean; push: boolean; rev: number; named: boolean; pair: string }

const petMap = <T>(f: (id: PetId, i: number) => T) => Object.fromEntries(CFG.pets.map((p, i) => [p.id, f(p.id, i)])) as Record<PetId, T>;

export function fresh(): State {
  return {
    v: 6, coins: 40, xp: 0, decor: [], reviews: [], letters: [], served: 0, shifts: 0,
    names: { her: CFG.herName, his: CFG.hisName, girls: CFG.girlNames, boys: CFG.boyNames, pets: petMap((_, i) => CFG.pets[i].name) },
    pets: petMap(() => ({ aff: 0, petDay: "", pets: 0, fedDay: "" })),
    daily: { day: "" } as Daily, streak: 0, lastDay: "", sound: true, music: true, vibe: true,
    stock: { base: [STARTER_STOCK, STARTER_STOCK, STARTER_STOCK], cream: [STARTER_STOCK, STARTER_STOCK, STARTER_STOCK], top: [STARTER_STOCK, STARTER_STOCK, STARTER_STOCK] },
    staff: petMap(() => ({ hired: false, lv: 1, onDuty: false })), tut: false,
    food: { kibble: 0, pate: 0, chicken: 0 }, welcome: false, autoTake: true,
    room: { ...DEFAULT_ROOM }, owned: [], earned: 0, book: freshBook(), me: { ...DEFAULT_ME }, shop: "", theme: "pink", scene3d: true, photo: "",
    cloud: { code: "", name: "", show: true, at: "", morning: true, night: true, push: false, rev: 0, named: false, pair: "" }
  };
}

// giá đồ trang trí của bản 1 (để hoàn xu)
const OLD_DECOR: Record<string, number> = { plant: 60, lights: 120, vase: 180, frame: 260, bell: 350, bear: 480, tea: 650, ribbon: 900 };
/* Hình khách trong "đánh giá" đã lưu: chuyển từ kiểu vẽ cũ sang ảnh mới, hình thú cưng và con vật bỏ đi (nay khách chỉ có nam và nữ) */
function upgradeLook(l: unknown): Look | null {
  const x = l as Record<string, unknown> | null;
  if (!x) return null;
  if (typeof x.sprite === "string" && x.sprite in SPRITES) return x as unknown as Look;
  if (x.gender === "girl" || x.gender === "boy") {
    const girl = x.gender === "girl", n = String(x.hair || "").length % 6;
    return { gender: x.gender, sprite: (girl ? GIRL_SPRITES : BOY_SPRITES)[n], hair: typeof x.hair === "string" ? x.hair : undefined, skin: typeof x.skin === "string" ? x.skin : undefined };
  }
  return null;
}

/* Đọc dữ liệu đã lưu và chuyển từ các bản cũ.
   Phiên bản đọc từ dữ liệu gốc: bản 1 không có trường `v`. */
export function loadState(raw: string | null): State {
  let saved: Partial<State>;
  try { saved = JSON.parse(raw || "{}"); } catch { saved = {}; }
  const ver = saved.v ?? (raw && Object.keys(saved).length ? 1 : 3);
  const s: State = Object.assign(fresh(), saved);
  let refund = 0;
  // v1 -> v2: đồ trang trí cũ được hoàn xu, đánh giá hình kiểu cũ bỏ đi
  if (ver < 2) {
    refund += (s.decor || []).reduce((a, id) => a + (OLD_DECOR[id] || 0), 0);
    s.decor = []; s.reviews = [];
  }
  // v2 -> v3: bản 2.0 từng bỏ sót bước trên; dọn đồ không còn tồn tại (hoàn xu) và đánh giá hình cũ
  if (ver < 3) {
    const known = new Set(Object.keys(OLD_TO_ROOM));
    refund += s.decor.filter(id => !known.has(id)).reduce((a, id) => a + (OLD_DECOR[id] || 0), 0);
    s.decor = s.decor.filter(id => known.has(id));
  }
  // v3 -> v4: đồ trang trí thành 8 nhóm (Tường, Sàn, Quầy...); món cũ chuyển sang kiểu tương ứng và được dùng luôn
  if (ver < 4) {
    s.room = { ...DEFAULT_ROOM }; s.owned = [];
    (s.decor || []).forEach(id => { const m = OLD_TO_ROOM[id]; if (!m) return; s.owned.push(m.join(":")); if (s.room[m[0]] === DEFAULT_ROOM[m[0]]) s.room[m[0]] = m[1]; });
    s.decor = [];
  }
  // v4 -> v5: bắt đầu đếm tổng xu kiếm được; người chơi cũ ước theo số khách đã phục vụ
  if (ver < 5 && raw) s.earned = Math.round((s.served || 0) * 20);
  // v5 -> v6: sổ thu chi; người chơi cũ ghi số xu hiện có là "trước khi có sổ"
  if (ver < 6 && raw) s.book = freshBook(s.coins);
  s.reviews = (s.reviews || []).flatMap(r => { const look = upgradeLook(r.look); return look ? [{ ...r, look }] : []; });
  s.v = 6; s.coins += refund; if (refund) s.refund = refund;
  s.names = Object.assign(fresh().names, s.names || {});
  s.names.pets = Object.assign(fresh().names.pets, s.names.pets || {});
  s.pets = Object.assign(fresh().pets, s.pets || {});
  s.staff = Object.assign(fresh().staff, s.staff || {});
  s.stock = Object.assign(fresh().stock, s.stock || {});
  s.food = Object.assign(fresh().food, s.food || {});
  s.room = Object.assign({ ...DEFAULT_ROOM }, s.room || {});
  s.owned = s.owned || [];
  s.cloud = Object.assign(fresh().cloud, s.cloud || {});
  s.book = Object.assign(freshBook(), s.book || {});
  s.me = Object.assign({ ...DEFAULT_ME }, s.me || {}); if (!(s.me.sprite in SPRITES)) s.me = { ...DEFAULT_ME };
  s.shop = typeof s.shop === "string" ? s.shop : ""; s.theme = typeof s.theme === "string" ? s.theme : "pink"; s.scene3d = s.scene3d !== false;
  ["Bông", "Mơ", "Tuyết"].forEach((old, i) => { const id = CFG.pets[i].id; if (!s.names.pets[id] || s.names.pets[id] === old) s.names.pets[id] = CFG.pets[i].name; });
  return s;
}

function read(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }
export let S: State = loadState(read());
let persist = true;
/* Storybook tắt lưu để không đè lên tiến trình thật (cùng tên miền nên dùng chung localStorage) */
export const setPersist = (on: boolean) => { persist = on; };
/* sau mỗi lần lưu trên máy, báo cho phần lưu trên mây (net/cloud.ts) để gộp rồi gửi */
let onSaved: (() => void) | null = null;
export const whenSaved = (f: () => void) => { onSaved = f; };
export function save() { if (!persist) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* chế độ riêng tư: bỏ qua */ } onSaved?.(); }
export function resetState() { S = fresh(); save(); }
/* thay toàn bộ tiến trình (tải từ server về) */
export function replaceState(s: State) { S = s; save(); }
export const petName = (id: PetId) => S.names.pets[id] || CFG.pets.find(p => p.id === id)!.name;
