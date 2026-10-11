/* Truyện khách quen: mỗi vị khách có vài lần ghé, giao bánh vừa lòng (từ 2 sao) thì xem được chương kế tiếp và nhận quà. */
import { STORIES, storyOf, type Story } from "../content/collection";
import { addTickets } from "./gacha";
import { giveOutfit, giveSticker, ex } from "./collection";
import { S, save } from "./state";
import { earn } from "./wallet";

export const STORY_MIN_SHIFTS = 3, STORY_CHANCE = 0.4;
export const storyDone = (s: Story) => (ex().story[s.id] ?? 0) >= s.chapters.length;
export const storyProg = (id: string) => ex().story[id] ?? 0;

/** kế hoạch ca này: vị khách còn truyện (ưu tiên người xem ít chương nhất) ghé sau khách thứ `at`, hoặc null.
    avoid = vị trí đã dành cho khách đặc biệt khác */
export function planStory(total: number, avoid = -1, rng: () => number = Math.random): { at: number; id: string } | null {
  if (S.shifts < STORY_MIN_SHIFTS || total < 5 || rng() >= STORY_CHANCE) return null;
  const left = STORIES.filter(s => !storyDone(s)); if (!left.length) return null;
  const least = Math.min(...left.map(s => storyProg(s.id))), pool = left.filter(s => storyProg(s.id) === least);
  let at = 1 + Math.floor(rng() * (total - 2));
  if (at === avoid) at = at + 1 <= total - 2 ? at + 1 : at - 1;
  return { at, id: pool[Math.floor(rng() * pool.length) % pool.length]!.id };
}

export interface ChapterOut { story: Story; chapter: number; notes: string[] }
/** xem chương kế tiếp và trao quà; trả null nếu hết truyện */
export function advanceStory(id: string): ChapterOut | null {
  const st = storyOf(id), e = ex(); if (!st) return null;
  const k = e.story[id] ?? 0, ch = st.chapters[k]; if (!ch) return null;
  e.story[id] = k + 1;
  const notes = [`${st.e} ${st.who} · ${ch.t}: ${ch.text}`, `🎁 +${ch.coins} xu${ch.tickets ? ` · +${ch.tickets} vé triệu hồi` : ""}`];
  earn("memo", ch.coins); if (ch.tickets) addTickets(ch.tickets);
  if (ch.sticker) notes.push(...(giveSticker(ch.sticker)?.notes ?? []));
  if (ch.outfit) { const o = giveOutfit(ch.outfit); if (o) notes.push(`🎀 Quà: ${o}`); }
  save(); return { story: st, chapter: k + 1, notes };
}
