/* Cấu hình game do admin (levinh) chỉnh và đồng bộ cho mọi máy: tên, tên khách, thư, thông báo.
   Dùng chung cho app và api (không đụng DOM). Trường nào thiếu thì dùng mặc định trong couple.ts. */
import { CFG, type EventKey, type PetId } from "./couple";

export interface GameConfig {
  his?: string; her?: string;                       // người gửi thư; người nhận mặc định (mỗi người chơi vẫn đặt được tên chủ tiệm của mình)
  pets?: Partial<Record<PetId, string>>;            // tên 3 bé thú cưng
  girls?: string; boys?: string;                    // tên khách, cách nhau bằng dấu phẩy
  notes?: string[];                                 // thư hằng ngày
  events?: Partial<Record<EventKey, string>>;       // thông báo ngày đặc biệt
  morning?: string[]; night?: string[];             // thông báo đẩy sáng / tối
}
export const EVENT_KEYS: EventKey[] = ["anniversary", "monthly", "herBirthday", "hisBirthday", "milestone", "valentine", "women83", "women2010"];
export const PET_IDS: PetId[] = ["dog", "gold", "white"];

const txt = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f<>]/g, "").trim().slice(0, max);
const list = (v: unknown, max: number, n: number) => (Array.isArray(v) ? v : []).map(x => txt(x, max)).filter(Boolean).slice(0, n);

/** làm sạch cấu hình nhận từ client (server gọi trước khi lưu) */
export function cleanGameConfig(raw: unknown): GameConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>, out: GameConfig = {};
  const his = txt(r.his, 20), her = txt(r.her, 20); if (his) out.his = his; if (her) out.her = her;
  const pets = (r.pets && typeof r.pets === "object" ? r.pets : {}) as Record<string, unknown>;
  const pm: Partial<Record<PetId, string>> = {}; PET_IDS.forEach(id => { const n = txt(pets[id], 16); if (n) pm[id] = n; });
  if (Object.keys(pm).length) out.pets = pm;
  const g = txt(r.girls, 2000), b = txt(r.boys, 2000); if (g) out.girls = g; if (b) out.boys = b;
  const notes = list(r.notes, 400, 200); if (notes.length) out.notes = notes;
  const ev = (r.events && typeof r.events === "object" ? r.events : {}) as Record<string, unknown>;
  const em: Partial<Record<EventKey, string>> = {}; EVENT_KEYS.forEach(k => { const t = txt(ev[k], 500); if (t) em[k] = t; });
  if (Object.keys(em).length) out.events = em;
  const mo = list(r.morning, 200, 30), ni = list(r.night, 200, 30); if (mo.length) out.morning = mo; if (ni.length) out.night = ni;
  return out;
}

/** bản mặc định (chụp một lần lúc nạp, trước khi áp cấu hình từ server) */
export const DEFAULT_CFG: Required<GameConfig> = {
  his: CFG.hisName, her: CFG.herName, pets: Object.fromEntries(CFG.pets.map(p => [p.id, p.name])) as Record<PetId, string>,
  girls: CFG.girlNames, boys: CFG.boyNames, notes: [...CFG.notes], events: { ...CFG.eventNotes },
  morning: [...CFG.morning], night: [...CFG.night]
};

/** áp cấu hình lên CFG (đặt lại mặc định trước, nên xoá một trường ở server thì máy tự về mặc định) */
export function applyGameConfig(c: GameConfig | null | undefined) {
  const d = DEFAULT_CFG, x = c ?? {};
  CFG.hisName = x.his || d.his; CFG.herName = x.her || d.her;
  CFG.pets.forEach(p => { p.name = x.pets?.[p.id] || d.pets[p.id] || p.name; });
  CFG.girlNames = x.girls || d.girls; CFG.boyNames = x.boys || d.boys;
  CFG.notes = x.notes?.length ? x.notes : [...d.notes];
  CFG.eventNotes = { ...d.events, ...(x.events ?? {}) } as Record<EventKey, string>;
  CFG.morning = x.morning?.length ? x.morning : [...d.morning]; CFG.night = x.night?.length ? x.night : [...d.night];
}
/** cấu hình đang dùng, dạng đầy đủ (để đổ vào form admin) */
export const currentCfg = (): Required<GameConfig> => ({
  his: CFG.hisName, her: CFG.herName, pets: Object.fromEntries(CFG.pets.map(p => [p.id, p.name])) as Record<PetId, string>,
  girls: CFG.girlNames, boys: CFG.boyNames, notes: [...CFG.notes], events: { ...CFG.eventNotes }, morning: [...CFG.morning], night: [...CFG.night]
});
