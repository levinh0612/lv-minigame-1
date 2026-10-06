/* Ảnh đại diện nhân viên: 3 bé thợ bánh vẽ 2D theo tâm trạng, linh thú Gacha dùng ảnh thẻ chụp từ model 3D */
import { PETS, type StaffId } from "../content/game";
import { gachaItem } from "../content/gacha";
import { gachaArt } from "./gachafx";
import type { Mood } from "../content/game";
import { petSVG } from "./art";

export function staffAvatar(id: StaffId, px: number, mood: Mood = "open", ledge = false): string {
  const p = PETS[id as keyof typeof PETS];
  if (p) return petSVG({ ...p, mood, ledge, paws: false }, px);
  const it = gachaItem(id);
  return it ? gachaArt(it, px) : "";
}
