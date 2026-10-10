/* Chạy minigame gói quà / giao hàng trong ca: hộp thoại khoá, nối tiếp từng minigame khách yêu cầu.
   Tính xu thưởng và điểm hạng ở đây; engine/shift.ts lo ghi sổ (applyService). */
import { GIFT_COMPLAINTS, GIFT_TITLES, SHIP_COMPLAINTS, SHIP_TITLES } from "../../content/minigames";
import { clampTier, tierOf } from "../../engine/minigame";
import { S, save } from "../../engine/state";
import type { Customer } from "../../engine/shift";
import { closeModal, modal } from "../dom";
import { mountGift } from "./gift";
import { mountShip } from "./ship";

export const mgXp = () => (S.mg ??= { gift: 0, ship: 0 });
export const giftTier = () => clampTier(tierOf(mgXp().gift));
export const shipTier = () => clampTier(tierOf(mgXp().ship));
export const giftTitle = () => GIFT_TITLES[giftTier()]!;
export const shipTitle = () => SHIP_TITLES[shipTier()]!;
export const svcLabel = (s: NonNullable<Customer["svc"]>) => s === "gift" ? "Gói quà" : s === "ship" ? "Giao hàng" : "Gói + giao";

const pickOne = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!;

/** mở hộp thoại minigame cho khách c (giá bánh price); xong gọi done(tổng thưởng, thành công?, lời phàn nàn) */
export function runService(c: Customer, price: number, done: (fee: number, ok: boolean, complaint: string) => void) {
  const steps: ("gift" | "ship")[] = c.svc === "both" ? ["gift", "ship"] : [c.svc === "ship" ? "ship" : "gift"];
  let fee = 0, i = 0, off: (() => void) | null = null, finished = false;
  const end = (ok: boolean, complaint = "") => {
    if (finished) return; finished = true; off?.(); off = null;
    const fx = ok ? fee : 0; closeModal(); done(fx, ok, complaint);
  };
  const next = () => {
    off?.(); off = null;
    if (i >= steps.length) return end(true);
    const kind = steps[i++]!, host = document.querySelector<HTMLElement>("#svcHost")!;
    const fail = (list: readonly string[]) => end(false, pickOne(list));
    if (kind === "gift") off = mountGift(host, { tier: giftTier(), price, ribbon: c.ribbon!, onSkip: () => fail(GIFT_COMPLAINTS),
      onDone: r => { mgXp().gift += r.ok ? 1 + (r.perfects >= 2 ? 1 : 0) : 0; if (!r.ok) return fail(GIFT_COMPLAINTS); fee += r.fee; save(); next(); } });
    else off = mountShip(host, { tier: shipTier(), price, addr: c.addr!, onSkip: () => fail(SHIP_COMPLAINTS),
      onDone: r => { mgXp().ship += r.ok ? 1 + (r.hits === 0 ? 1 : 0) : 0; if (!r.ok) return fail(SHIP_COMPLAINTS); fee += r.fee; save(); next(); } });
  };
  modal(`<h2>Khách xin thêm dịch vụ</h2><div id="svcHost"></div>`, () => { if (!finished) { finished = true; off?.(); done(0, false, pickOne(GIFT_COMPLAINTS)); } }, true);
  next();
}
