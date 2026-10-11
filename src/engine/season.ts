/* Sự kiện mùa: trong thời gian sự kiện, mỗi khách phục vụ được cộng vào tiến độ; đạt mốc thì nhận thưởng (xu theo cấp, vé, sticker, đồ riêng). */
import { SEASONS, SEASON_TIERS, type SeasonDef, type SeasonTier } from "../content/collection";
import { addTickets } from "./gacha";
import { ex, giveOutfit, giveSticker } from "./collection";
import { lvl } from "./progress";
import { save } from "./state";
import { dayKey } from "./passive";
import { earn } from "./wallet";

const inWin = (w: [string, string], day: string) => day >= w[0] && day <= w[1];
/** sự kiện đang diễn ra (và cửa sổ của nó) */
export function seasonNow(day = dayKey()): { def: SeasonDef; key: string; end: string } | null {
  for (const def of SEASONS) { const w = def.windows.find(x => inWin(x, day)); if (w) return { def, key: `${def.id}-${w[0].slice(0, 4)}`, end: w[1] }; }
  return null;
}
/** sự kiện sắp tới gần nhất */
export function seasonNext(day = dayKey()): { def: SeasonDef; start: string } | null {
  const all = SEASONS.flatMap(def => def.windows.filter(w => w[0] > day).map(w => ({ def, start: w[0] })));
  return all.sort((a, b) => a.start.localeCompare(b.start))[0] ?? null;
}
export const seasonServed = (key: string) => ex().season[key] ?? 0;
export const seasonTierDone = (key: string) => ex().seasonTier[key] ?? 0;
export const tierCoins = (t: SeasonTier, lv = lvl()) => t.coinsPerLv * lv;

/** cộng khách đã phục vụ vào sự kiện đang diễn ra; trả các dòng thông báo khi đạt mốc mới */
export function addSeasonServed(n: number, day = dayKey()): string[] {
  const cur = seasonNow(day); if (!cur || n <= 0) return [];
  const e = ex(), total = (e.season[cur.key] = (e.season[cur.key] ?? 0) + n), notes: string[] = [];
  let done = e.seasonTier[cur.key] ?? 0;
  while (done < SEASON_TIERS.length && total >= SEASON_TIERS[done]!.n) {
    const t = SEASON_TIERS[done]!, coins = tierCoins(t); done++;
    earn("memo", coins); if (t.tickets) addTickets(t.tickets);
    const bits = [`+${coins} xu`, t.tickets ? `+${t.tickets} vé` : ""];
    if (t.sticker) { const g = giveSticker(cur.def.sticker); if (g) bits.push(`sticker ${g.sticker.e}`); }
    if (t.outfit) { const o = giveOutfit(cur.def.outfit); if (o) bits.push(o); }
    notes.push(`${cur.def.e} ${cur.def.n} · đạt mốc ${t.n} khách: ${bits.filter(Boolean).join(", ")}`);
  }
  e.seasonTier[cur.key] = done; save(); return notes;
}
