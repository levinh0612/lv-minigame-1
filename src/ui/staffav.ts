/* Ảnh đại diện nhân viên: 3 bé thợ bánh vẽ 2D theo tâm trạng, linh thú Gacha dùng ảnh thẻ chụp từ model 3D */
import { PETS, type StaffId } from "../content/game";
import { gachaItem } from "../content/gacha";
import { gachaArt } from "./gachafx";
import type { Mood } from "../content/game";
import { petSVG } from "./art";
import { wornBy } from "../engine/collection";

export function staffAvatar(id: StaffId, px: number, mood: Mood = "open", ledge = false): string {
  const p = PETS[id as keyof typeof PETS];
  if (p) { const o = wornBy(id); return o ? `<span class="outfitw">${petSVG({ ...p, mood, ledge, paws: false }, px)}<i class="outfit o-${o.slot}" style="font-size:${Math.round(px * 0.34)}px">${o.e}</i></span>` : petSVG({ ...p, mood, ledge, paws: false }, px); }
  const it = gachaItem(id);
  return it ? gachaArt(it, px) : "";
}
