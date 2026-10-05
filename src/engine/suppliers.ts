/* Nhà cung cấp: nguyên liệu mới (Croissant, Socola, Việt quất…) chỉ dùng được sau khi ký hợp đồng với nhà cung cấp của nó.
   Một món bánh chỉ bán được khi ĐỦ HAI điều kiện: có công thức (lên cấp hoặc Gacha) và có đủ nguyên liệu (đã ký nhà cung cấp). */
import { CATS, HOME_SUPPLIER, ING_SUPPLIER, STOCK_KEYS, SUPPLIERS, partsOfRecipe, type StockKey, type Supplier } from "../content/game";
import { S, save } from "./state";
import { spend } from "./wallet";

export const supplierOf = (k: StockKey, i: number) => ING_SUPPLIER[k][i] ?? HOME_SUPPLIER.id;
export const isSigned = (id: string) => id === HOME_SUPPLIER.id || S.suppliers.includes(id);
export const ingAvailable = (k: StockKey, i: number) => isSigned(supplierOf(k, i));
/** các chỉ số nguyên liệu đã dùng được của một loại (đã ký nhà cung cấp) */
export const availableIdx = (k: StockKey) => CATS[k].map((_, i) => i).filter(i => ingAvailable(k, i));
/** công thức có đủ nguyên liệu để làm không */
export const recipeReady = (r: { base: number; cream: number; top: number; up?: [number, number][] }) => partsOfRecipe(r).every(p => ingAvailable(p.k, p.i));
/** nguyên liệu của một nhà cung cấp, theo chỉ số */
export const ingsOf = (id: string) => STOCK_KEYS.flatMap(k => CATS[k].map((_, i) => ({ k, i })).filter(x => supplierOf(x.k, x.i) === id));
/** nhà cung cấp đang thiếu gì để ký: "done" đã ký, "lv" chưa đủ cấp, "coin" chưa đủ xu, "ok" ký được */
export const signState = (s: Supplier, level: number): "done" | "lv" | "coin" | "ok" =>
  isSigned(s.id) ? "done" : level < s.lv ? "lv" : S.coins < s.cost ? "coin" : "ok";
export function signSupplier(id: string, level: number): ReturnType<typeof signState> {
  const s = SUPPLIERS.find(x => x.id === id); if (!s) return "lv";
  const st = signState(s, level); if (st !== "ok") return st;
  spend("supplier", s.cost, `Ký hợp đồng ${s.n}`); S.suppliers.push(id); save();
  return "ok";
}
