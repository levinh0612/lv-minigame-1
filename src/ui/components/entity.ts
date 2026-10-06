/* Thành phần vẽ dùng chung cho mọi "đối tượng" trong game. Dữ liệu lấy từ engine/entityinfo.ts (`entityInfo(id)`);
   các hàm dưới đây (`entityAvatar`, `entityChips`, `entityRow`, `entityTile`, `entityHero`) chỉ việc vẽ, nên màn nào dùng cũng ra đủ bộ chỉ số,
   cùng một cách đặt huy hiệu, khung độ hiếm và nhãn trạng thái. */
import { PETS, type Mood } from "../../content/game";
import { RARITY, type Rarity } from "../../content/gacha";
import type { PetId } from "../../content/couple";
import { entityInfo, fxText, type Chip, type EntityInfo } from "../../engine/entityinfo";
import { esc } from "../dom";
import { foodSVG, petSVG } from "../art";
import { gachaArt } from "../gachafx";
import { gachaItem } from "../../content/gacha";
import { rarityIcon, tierBadge } from "../badges";

export { entityInfo, fxText };
export type { Chip, EntityInfo };

/** ảnh của đối tượng ở cỡ px (thú cưng vẽ 2D theo tâm trạng, vật phẩm Gacha dùng ảnh/thẻ) */
const artOf = (i: EntityInfo, px: number, mood: Mood = "open") => PETS[i.id as PetId] ? petSVG({ ...PETS[i.id as PetId], mood, ledge: false, paws: false }, px) : gachaArt(gachaItem(i.id)!, px);

/* ===== Thành phần ===== */
const HEARTS = (n: number) => `<i class="ec-bond" title="Thân thiết cấp ${n}">${"♥".repeat(Math.max(1, n))}</i>`;

/** ảnh đại diện: đồ Gacha nằm trong khung độ hiếm (bạc, xanh, vàng), thú cưng 3 bé nằm trên nền xanh nhạt */
export function entityAvatar(i: EntityInfo, px: number, mood: Mood = "open") {
  const inner = `<span class="cfi" style="width:${px}px;height:${px}px">${artOf(i, px, mood)}</span>`;
  const bw = px >= 80 ? 12 : 9;     // độ dày viền ảnh khung: cỡ lớn dày hơn
  return i.rarity ? `<span class="cf cf-${i.rarity} ${i.owned ? "" : "dim"}" style="--bw:${bw}px">${inner}</span>` : `<span class="cf cf-pet">${inner}</span>`;
}
/** nhóm chip chỉ số */
export const entityChips = (chips: Chip[]) => chips.length ? `<span class="ec-chips">${chips.map(c => `<i class="ec-${c.tone}">${esc(c.t)}</i>`).join("")}</span>` : "";
/** nhãn độ hiếm có sao phát sáng */
export const rarityChip = (r: Rarity) => `<i class="er-rar er-rar-${r}">${rarityIcon(r, 11)}${RARITY[r].n}</i>`;
const statusChip = (s: EntityInfo["status"]) => s ? `<em class="er-st er-st-${s.tone}">${s.t}</em>` : "";
const roleChip = (i: EntityInfo) => i.role ? `<u class="role ${i.role.c}">${i.role.n}</u>` : "";

export interface RowOpts {
  attrs?: string;            // thuộc tính của nút (data-..., draggable, role)
  cls?: string;
  px?: number;
  mood?: Mood;
  meta?: string;             // dòng phụ (HTML)
  chips?: Chip[];            // mặc định: chỉ số thợ bánh nếu đang làm thợ, không thì chỉ số khi đứng tầng
  trail?: string;            // phần bên phải; mặc định là nhãn trạng thái và dấu ›
  showMeta?: boolean;
}
/** thẻ dạng dòng: ảnh | tên + độ hiếm + bậc + vai trò / dòng phụ / chip chỉ số | trạng thái */
export function entityRow(i: EntityInfo, o: RowOpts = {}) {
  const px = o.px ?? 48, chips = o.chips ?? (i.workChips.length ? i.workChips : i.fxChips);
  const trail = o.trail ?? `${statusChip(i.status)}<span class="er-go" aria-hidden="true">›</span>`;
  const meta = o.meta ?? (i.staff ? `${i.bake ?? ""} · ${i.meal ? `${foodSVG(i.meal.id, 15)}${i.meal.n}` : ""}` : fxText(i) ? esc(fxText(i)) : "");
  return `<button class="er er-${i.rarity ?? "pet"} ${i.owned ? "own" : "lock"} ${o.cls ?? ""}" ${o.attrs ?? ""}>
    <span class="er-av">${entityAvatar(i, px, o.mood)}</span>
    <span class="er-main"><span class="er-name"><b>${esc(i.name)}</b>${i.rarity ? rarityChip(i.rarity) : ""}${i.tier ? tierBadge(i.tier, 22) : ""}${roleChip(i)}${i.bond !== null && i.bond > 0 ? HEARTS(i.bond) : ""}</span>
      ${meta ? `<span class="er-meta">${meta}</span>` : ""}${entityChips(chips)}</span>
    <span class="er-trail">${trail}</span></button>`;
}
/** thẻ dạng ô vuông (danh sách bộ sưu tập): khung độ hiếm, tên, nhãn độ hiếm, trạng thái */
export function entityTile(i: EntityInfo, o: { attrs?: string; cls?: string; px?: number; sub?: string } = {}) {
  const px = o.px ?? 56;
  return `<button class="et et-${i.rarity ?? "pet"} ${i.owned ? "own" : "lock"} ${o.cls ?? ""}" ${o.attrs ?? ""}>
    ${entityAvatar(i, px)}<b>${esc(i.name)}</b>${i.rarity ? rarityChip(i.rarity) : ""}
    <small>${roleChip(i)}${o.sub ?? ""}</small>${entityChips(i.fxChips.slice(0, 2))}${statusChip(i.status)}</button>`;
}

/** phần đầu hộp thoại chi tiết: ảnh lớn có khung, tên, độ hiếm, bậc, vai trò, trạng thái, thân thiết và chip chỉ số.
 *  art: thay ảnh mặc định (ví dụ nút vuốt ve của thú cưng); extra: dòng thêm dưới tên (HTML) */
export function entityHero(i: EntityInfo, o: { px?: number; art?: string; extra?: string } = {}) {
  const px = o.px ?? 100;
  const av = o.art ? `<span class="cf cf-${i.rarity ?? "pet"}"><span class="cfi" style="width:${px}px;height:${px}px">${o.art}</span></span>` : entityAvatar(i, px, i.onDuty ? "happy" : "open");
  const chips = i.workChips.length ? i.workChips : i.fxChips;
  return `<div class="eh eh-${i.rarity ?? "pet"}"><span class="eh-av">${av}</span><div class="eh-id"><b>${esc(i.name)}</b>
    <span class="eh-line">${i.rarity ? rarityChip(i.rarity) : ""}${i.tier ? tierBadge(i.tier, 24) : ""}${roleChip(i)}${i.bond ? HEARTS(i.bond) : ""}${statusChip(i.status)}</span>${o.extra ?? ""}${entityChips(chips)}</div></div>`;
}
