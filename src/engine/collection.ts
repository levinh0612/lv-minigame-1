/* Sưu tầm: sticker (đủ trang được thưởng) và đồ cho thú cưng (mua, hoặc nhận từ trang, sự kiện, truyện). */
import { PAGES, STICKERS, outfitOf, stickerOf, type Outfit, type Sticker } from "../content/collection";
import { addTickets } from "./gacha";
import { S, save, type Extra } from "./state";
import { spend } from "./wallet";

/** nhóm dữ liệu sưu tầm, tạo khi cần và bù các khoá còn thiếu (bản lưu cũ chưa có) */
export function ex(): Extra {
  const e = (S.extra ??= { stickers: [], pages: [], outfits: [], worn: {}, story: {}, season: {}, seasonTier: {}, ch: { on: "", done: "", wins: 0, streak: 0, last: "" } });
  e.stickers ??= []; e.pages ??= []; e.outfits ??= []; e.worn ??= {}; e.story ??= {}; e.season ??= {}; e.seasonTier ??= {}; e.ch ??= { on: "", done: "", wins: 0, streak: 0, last: "" };
  return e;
}

export const hasSticker = (id: string) => ex().stickers.includes(id);
export const pageCount = (page: string) => STICKERS.filter(s => s.page === page && hasSticker(s.id)).length;
export const pageTotal = (page: string) => STICKERS.filter(s => s.page === page).length;

/** nhận một sticker; trả sticker (hoặc null nếu đã có) và các dòng thông báo về thưởng trang nếu vừa đủ trang */
export function giveSticker(id: string): { sticker: Sticker; notes: string[] } | null {
  const st = stickerOf(id), e = ex(); if (!st || e.stickers.includes(id)) return null;
  e.stickers.push(id);
  const notes = [`🏷️ Sticker mới: ${st.e} ${st.n}`];
  const pg = PAGES.find(p => p.id === st.page)!;
  if (pageCount(pg.id) === pageTotal(pg.id) && !e.pages.includes(pg.id)) {
    e.pages.push(pg.id); addTickets(pg.tickets);
    notes.push(`📖 Đủ trang "${pg.n}": +${pg.tickets} vé triệu hồi${pg.outfit ? ` và ${giveOutfit(pg.outfit)}` : ""}`);
  }
  save(); return { sticker: st, notes };
}
/** sticker ngẫu nhiên chưa có (mặc định trừ trang Mùa lễ hội, trang đó chỉ nhận từ sự kiện) */
export function randomSticker(rng: () => number = Math.random, pages = ["guest", "cake", "shop"]): string | null {
  const left = STICKERS.filter(s => pages.includes(s.page) && !hasSticker(s.id));
  return left.length ? left[Math.floor(rng() * left.length) % left.length]!.id : null;
}

export const hasOutfit = (id: string) => ex().outfits.includes(id);
/** thêm đồ vào tủ; trả dòng thông báo (rỗng nếu đã có) */
export function giveOutfit(id: string): string {
  const o = outfitOf(id), e = ex(); if (!o || e.outfits.includes(id)) return "";
  e.outfits.push(id); return `${o.e} ${o.n} (đồ cho các bé)`;
}
export function buyOutfit(id: string): boolean {
  const o = outfitOf(id); if (!o || !("buy" in o.src) || hasOutfit(id) || S.coins < o.src.buy) return false;
  spend("outfit", o.src.buy, `Mua ${o.n}`); giveOutfit(id); save(); return true;
}
/** mặc đồ cho một bé; outfitId rỗng = cởi đồ. Chỉ mặc được đồ đã có. */
export function wear(petId: string, outfitId: string): boolean {
  const e = ex();
  if (!outfitId) { delete e.worn[petId]; save(); return true; }
  if (!e.outfits.includes(outfitId)) return false;
  for (const k of Object.keys(e.worn)) if (e.worn[k] === outfitId) delete e.worn[k];   // mỗi món chỉ một bé mặc
  e.worn[petId] = outfitId; save(); return true;
}
export const wornBy = (petId: string): Outfit | null => { const id = ex().worn[petId]; return id && hasOutfit(id) ? outfitOf(id) ?? null : null; };
