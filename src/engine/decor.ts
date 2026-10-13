/* Trang trí tiệm: chọn nhóm, thử món, mua / dùng, cất. Không đụng giao diện để kiểm thử được. */
import { ROOM_CATS, isDefault, roomItem, type RoomKey } from "../content/room";
import { GACHA_ITEMS } from "../content/gacha";
import { lvl } from "./progress";
import { S, save } from "./state";
import { spend } from "./wallet";

/** đã có món này chưa: mặc định, đã mua, hoặc quay trúng từ Gacha (bản lưu cũ có thể thiếu trong S.owned) */
export const ownsDecor = (k: RoomKey, v: string) => isDefault(k, v) || S.owned.includes(k + ":" + v)
  || GACHA_ITEMS.some(g => g.decor?.k === k && g.decor.v === v && (S.gacha.owned[g.id] ?? 0) > 0);
export let dcat = 0, trial: { k: RoomKey; v: string } | null = null;   // nhóm đang chọn, món đang thử
export let dopen = true;                                // hộp danh sách đang mở hay thu gọn
export const toggleDecorSheet = () => { dopen = !dopen; };
export const setDecorCat = (i: number) => { dcat = i; trial = null; };
export function tryDecor(k: RoomKey, v: string) { trial = S.room[k] === v ? null : { k, v }; }
export const cancelDecor = () => { trial = null; };
/** chạm đồ trong cảnh: chuyển sang nhóm đó để đổi kiểu hoặc cất (đang ở đúng nhóm thì giữ món đang thử) */
export function pickDecorCat(k: string) { const i = ROOM_CATS.findIndex(c => c.k === k); if (i >= 0 && i !== dcat) setDecorCat(i); }
/** cất đồ đang dùng của nhóm đang chọn về kiểu mặc định (đồ đã mua vẫn còn, dùng lại miễn phí) */
export function stashDecor(): string {
  const C = ROOM_CATS[dcat]!, it = roomItem(C.k, S.room[C.k]!); if (isDefault(C.k, S.room[C.k])) return "";
  S.room[C.k] = C.items[0]!.v; trial = null; save(); return `Đã cất ${it.n}, dùng lại lúc nào cũng được`;
}
/* mua (nếu chưa có) và dùng món đang thử; trả về thông báo hoặc "" nếu không làm gì */
export function applyDecor(): string {
  if (!trial) return "";
  const { k, v } = trial, it = roomItem(k, v), id = k + ":" + v, own = ownsDecor(k, v);
  if (!own) { if (it.gacha || S.coins < it.cost || lvl() < (it.lv ?? 0)) return ""; spend("decor", it.cost, `Mua ${it.n}`); S.owned.push(id); }
  S.room[k] = v; trial = null; save();
  return own ? `Đã đổi sang ${it.n}` : `Đã mua ${it.n}`;
}
