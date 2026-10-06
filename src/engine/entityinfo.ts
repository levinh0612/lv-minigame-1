/* Thông tin chung của một "đối tượng" trong game (thú cưng, linh thú, quản lý, khách quen, công thức, đồ trang trí).
   Thuần dữ liệu, không đụng DOM, nên test được. Các thành phần vẽ nằm ở ui/components/entity.ts. */
import { BAKE_TIME, PETS, type Food, type FxKey } from "../content/game";
import { asManager, fxLine, gachaItem, mgrFx, roleOf, type GachaItem, type Rarity } from "../content/gacha";
import type { PetId } from "../content/couple";
import { bondLevel, countOf, floorOfStaff, hasItem } from "./gacha";
import { foodDef, isMascotStaff, mascotBonus, mealOf, onDuty, plannedMeal, staffState } from "./economy";
import { petName } from "./state";

export type EntityKind = "pet" | "mascot" | "manager" | "regular" | "recipe" | "decor";
export type ChipTone = "price" | "tip" | "pat" | "cust" | "info";
export interface Chip { t: string; tone: ChipTone }
export type StatusTone = "on" | "off" | "bad" | "free" | "lock" | "work";
export interface EntityInfo {
  id: string; kind: EntityKind; name: string;
  rarity: Rarity | null; owned: boolean; count: number;
  tier: number | null;                 // bậc thợ bánh (1–10) khi đã vào làm
  staff: boolean; onDuty: boolean; hungry: boolean;
  bake: string | null; meal: Food | null;
  bond: number | null;                 // cấp thân thiết (linh thú)
  floor: number;                       // tầng đang đứng, -1 nếu rảnh
  role: { n: string; c: string } | null;
  fx: Partial<Record<FxKey, number>>;  // chỉ số khi đứng tầng
  workChips: Chip[];                   // buff khi làm thợ bánh (linh thú thuê)
  fxChips: Chip[];                     // buff khi đứng tầng
  status: { t: string; tone: StatusTone } | null;
}

const FX_LABEL: [FxKey, ChipTone, (v: number) => string][] = [["price", "price", v => `giá +${v}%`], ["tip", "tip", v => `tip +${v}%`], ["pat", "pat", v => `chờ +${v}%`], ["cust", "cust", v => `+${v} khách`]];
const toChips = (fx: Partial<Record<FxKey, number>>): Chip[] => FX_LABEL.filter(([k]) => fx[k]).map(([k, tone, f]) => ({ tone, t: f(k === "cust" ? fx[k]! : Math.round(fx[k]! * 100)) }));
export const bakeText = (lv: number) => `${String(BAKE_TIME[Math.min(BAKE_TIME.length, Math.max(1, lv)) - 1]).replace(".", ",")} giây/bánh`;
const itemFx = (it: GachaItem): Partial<Record<FxKey, number>> => it.mascot ? it.mascot.fx : asManager(it) ? mgrFx(it) : {};

/** gom toàn bộ thông tin hiển thị của một đối tượng (id thú cưng 3 bé hoặc id vật phẩm Gacha) */
export function entityInfo(id: string): EntityInfo | null {
  const pet = PETS[id as PetId], it = gachaItem(id);
  if (!pet && !it) return null;
  const st = staffState(id), staff = !!pet || (isMascotStaff(id) && st.hired), on = staff && onDuty(id);
  const meal = on ? plannedMeal(id) : null, hungry = on && !meal, tier = staff ? st.lv : null;
  const owned = pet ? true : hasItem(id), mas = !!it?.mascot, mgr = !!it && asManager(it);
  const floor = !it ? -1 : mgr ? floorOfStaff("mgr", id) : mas ? floorOfStaff("mascot", id) : -1;
  const fx = it ? itemFx(it) : {}, mb = mas && staff ? mascotBonus(id) : null;
  const kind: EntityKind = pet ? "pet" : mas ? "mascot" : it!.mgr ? "manager" : it!.char ? "regular" : it!.recipe ? "recipe" : "decor";
  let status: EntityInfo["status"] = null;
  if (staff) status = hungry ? { t: "Đói", tone: "bad" } : on ? { t: "Đi làm", tone: "on" } : { t: "Nghỉ", tone: "off" };
  else if (it) status = !owned ? { t: "Chưa có", tone: "lock" } : floor >= 0 ? { t: `Tầng ${floor + 1}`, tone: "on" } : mas && st.hired ? { t: "Thợ bánh", tone: "work" } : mgr || mas ? { t: "Rảnh", tone: "free" } : { t: `x${countOf(id)}`, tone: "free" };
  return {
    id, kind, name: pet ? petName(id) : it!.n, rarity: it?.rarity ?? null, owned, count: countOf(id), tier, staff, onDuty: on, hungry,
    bake: tier ? bakeText(tier) : null, meal: staff ? foodDef(mealOf(id)) : null,
    bond: mas && owned ? bondLevel(id) : null, floor, role: it ? roleOf(it) : null, fx,
    workChips: mb ? toChips({ price: mb.price, tip: mb.tip }) : [], fxChips: toChips(fx), status
  };
}


/** mô tả chỉ số dạng một câu (dùng khi cần chữ đầy đủ) */
export const fxText = (i: EntityInfo) => fxLine(i.fx);
