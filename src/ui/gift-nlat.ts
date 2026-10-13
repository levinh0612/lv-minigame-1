/* Quà riêng từ chủ game tặng tài khoản "nlat": nhận một lần khi đăng nhập, hiện hộp thoại kèm lời nhắn */
import { sfx } from "../audio/sound";
import { GACHA_ITEMS } from "../content/gacha";
import { S, save } from "../engine/state";
import { fmtN } from "../engine/util";
import { account } from "../net/cloud";
import { modal } from "./dom";
import { render } from "./app";

const GIFT = { id: "nlat-1", user: "nlat", from: "Lê Vinh", msg: "Hack game vì em.", tickets: 100, char: "c_n3", mascot: "m_thienthan" };
const nameOf = (id: string) => GACHA_ITEMS.find(i => i.id === id)?.n ?? id;

/** nlat vừa đăng nhập và chưa nhận quà: cộng quà, lưu, hiện hộp thoại. Trả true nếu đã hiện */
export function nlatGift(): boolean {
  if (account().toLowerCase() !== GIFT.user || (S.gifts ?? []).includes(GIFT.id)) return false;
  (S.gifts ??= []).push(GIFT.id);
  S.gacha.tickets += GIFT.tickets;
  [GIFT.char, GIFT.mascot].forEach(id => { S.gacha.owned[id] = (S.gacha.owned[id] ?? 0) + 1; });
  save(); sfx("level"); render(true);
  modal(`<div class="tart" aria-hidden="true" style="font-size:64px">🎁</div><h2>Quà từ ${GIFT.from}</h2>
    <p class="sub">Tặng riêng cho <b>${GIFT.user}</b></p>
    <div class="rwbox"><div class="rwrow"><span>🎟️ Lượt quay</span><b>+${fmtN(GIFT.tickets)}</b></div>
      <div class="rwrow"><span>⭐ Nhân vật cực hiếm</span><b>${nameOf(GIFT.char)}</b></div>
      <div class="rwrow"><span>🐾 Linh thú cực hiếm</span><b>${nameOf(GIFT.mascot)}</b></div></div>
    <div class="paper">“${GIFT.msg}”<span class="sig">${GIFT.from}</span></div>
    <div class="mbtns"><button class="b3 w" data-close>Cảm ơn nha!</button></div>`, undefined, true);
  return true;
}
