/* Cấp, mục tiêu ngày, hiệu ứng đồ trang trí */
import { DECOR, RECIPES, type FxKey } from "../content/game";
import { daysTogether } from "./dates";
import { S, save } from "./state";
import { DAY, today, ymd } from "./util";

export const xpFor = (L: number) => 40 * (L - 1) * (L - 1);
export const lvl = () => Math.min(99, Math.floor(Math.sqrt(S.xp / 40)) + 1);
export const unlocked = () => RECIPES.filter(r => r.lv <= lvl());
export const fx = (k: FxKey) => S.decor.reduce((a, id) => a + (DECOR.find(x => x.id === id)?.fx[k] || 0), 0);

/* Sang ngày mới: reset mục tiêu, tính chuỗi ngày chơi */
export function rollDay() {
  const t = ymd(today());
  if (S.daily.day !== t) S.daily = { day: t } as typeof S.daily;
  const u = unlocked();
  S.daily = Object.assign({ served: 0, earned: 0, feat: 0, angry: 0, claimed: false, boy: false, featId: u[(daysTogether() - 1) % u.length].id }, S.daily);
  (["served", "earned", "feat", "angry"] as const).forEach(k => { if (!Number.isFinite(S.daily[k])) S.daily[k] = 0; });
  if (S.lastDay !== t) {
    const y = ymd(new Date(+today() - DAY));
    S.streak = S.lastDay === y ? S.streak + 1 : 1;
    S.lastDay = t;
  }
  save();
}

export const featured = () => RECIPES.find(r => r.id === S.daily.featId) || RECIPES[0];
export interface Goal { t: string; cur: number; need: number; bool?: boolean; fail?: boolean }
export function goals(): Goal[] {
  const L = lvl(), d = S.daily;
  return [
    { t: `Phục vụ ${5 + L} khách`, cur: d.served, need: 5 + L },
    { t: `Làm 3 bánh ${featured().n}`, cur: d.feat, need: 3 },
    { t: "Không để khách nào giận", cur: d.served > 0 && !d.angry ? 1 : 0, need: 1, bool: true, fail: d.angry > 0 }
  ];
}
export const goalsDone = () => goals().every(g => g.cur >= g.need);
export const letterNew = () => !S.letters.some(l => l.day === S.daily.day && !l.bonus);
export const giftReady = () => goalsDone() && !S.daily.claimed;
