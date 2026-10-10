/* Ghé thăm tiệm hàng xóm: xem cảnh 3D theo dữ liệu của chủ tiệm (chỉ xem, không sửa được gì).
   Vào tham quan phải đóng phí vé (luật ở engine/visit.ts); chủ tiệm nhận tiền mừng ở lần mở app sau. */
import { visitStats } from "../../engine/stats";
import { statsDialog } from "../statsdlg";
import { sfx } from "../../audio/sound";
import { RECIPES } from "../../content/game";
import { S, save } from "../../engine/state";
import { hostGift, seatsOfTables, setVisiting, visiting, type VisitShop } from "../../engine/visit";
import { spend } from "../../engine/wallet";
import { fmtN } from "../../engine/util";
import { visitEnter, visitQuote } from "../../net/cloud";
import { render } from "../app";
import { ic } from "../icons";
import type { GuestLook } from "../../content/game";
import { levelFrame, levelMedal } from "../badges";
import { guestSVG } from "../art";
import { demandOf } from "../../engine/economy";
import { ROOM_CATS, isDefault } from "../../content/room";
import { coinPill, dropModal, esc, modal, shopStatsHTML, toast } from "../dom";
import { room3dHTML } from "../room3d";
import { navigate } from "../router";

let paid: number | null = null;       // phí vé lượt này (null = chưa biết, ví dụ tải lại trang)
let loading = "";

/** hộp thoại báo phí, người chơi đồng ý mới vào */
export async function askVisit(user: string) {
  let q;
  try { q = await visitQuote(user); } catch (e) { toast((e as Error).message); return; }
  const poor = !q.free && S.coins < q.fee;
  modal(`<div class="vz-art" aria-hidden="true">🏪</div><h2>Ghé thăm tiệm ${esc(q.username)}?</h2>
    <p class="sub">Tiệm đang ở cấp ${q.lv}. Bạn chỉ được xem, không sửa được gì.</p>
    <div class="inccost vz-fee"><b>${q.free ? "Miễn phí" : `−${fmtN(q.fee)} xu`}</b>
      <small>${q.free ? "Hôm nay bạn đã ghé tiệm này rồi nên vào lại không mất phí" : poor ? `Bạn cần ${fmtN(q.fee)} xu mà mới có ${fmtN(S.coins)} xu` : `Mỗi tiệm tính phí một lần mỗi ngày · chủ tiệm nhận ${fmtN(hostGift(q.fee))} xu tiền mừng`}</small></div>
    <div class="mbtns"><button class="b3" id="vGo" ${poor ? "disabled" : ""}>Ghé thăm</button><button class="b3 w" data-close>Để sau</button></div>`);
  document.getElementById("vGo")?.addEventListener("click", async e => {
    const b = e.currentTarget as HTMLButtonElement; b.disabled = true; b.textContent = "Đang mở cửa…";
    try {
      const r = await visitEnter(user);
      if (r.fee > 0) { spend("visit", r.fee, `Ghé thăm tiệm ${r.shop.username}`); save(); sfx("coin"); toast(`Đã gửi tiền mừng, phí vé ${fmtN(r.fee)} xu`); }
      paid = r.fee; setVisiting(r.shop); dropModal(); navigate("/ghe-tham/" + encodeURIComponent(r.shop.username));
    } catch (err) { toast((err as Error).message); b.disabled = false; b.textContent = "Ghé thăm"; }
  });
}

/** tải lại trang giữa lúc tham quan: vào lại miễn phí nếu hôm nay đã ghé, còn không thì hỏi lại phí */
async function resume(user: string) {
  if (loading === user) return; loading = user;
  try {
    const q = await visitQuote(user);
    if (!q.free) { navigate("/", true); setTimeout(() => void askVisit(user), 50); return; }
    const r = await visitEnter(user); paid = 0; setVisiting(r.shop); render();
  } catch (e) { toast((e as Error).message); navigate("/", true); }
  finally { loading = ""; }
}

const BACK = `<button class="rbtn back" data-go="/" aria-label="Về tiệm của mình"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" stroke="#C07A8C" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;

/** mở hộp thoại chỉ số của tiệm đang tham quan */
export function visitStatsDialog() {
  const v = visiting(); if (!v) return;
  const viral = demandOf(v.stars ?? 2, ROOM_CATS.filter(c => !isDefault(c.k, v.room[c.k])).length, v.lv, v.venue);
  statsDialog(v.shop.trim() || v.username, visitStats(v, seatsOfTables(v.venue.tbl), viral), false);
}
export function visitHTML(user: string) {
  const v = visiting();
  if (!v || v.username !== user) {
    void resume(user);
    return `<div class="scr visit5"><div class="vload"><div class="vz-art" aria-hidden="true">🏪</div><b>Đang đến tiệm ${esc(user)}…</b></div></div>`;
  }
  return shopHTML(v);
}

function shopHTML(v: VisitShop) {
  const me = v.me, look = { ...me, gender: me.sprite?.[0] === "b" || me.sprite?.[0] === "m" ? "boy" : "girl" } as unknown as GuestLook;
  const viral = demandOf(v.stars ?? 2, ROOM_CATS.filter(c => !isDefault(c.k, v.room[c.k])).length, v.lv, v.venue);
  const name = v.shop.trim() || v.username, recipes = RECIPES.filter(r => r.lv <= v.lv).length;
  const note = paid === null ? "Bạn đang tham quan, chỉ xem thôi nha" : paid > 0 ? `Bạn đã gửi tiền mừng, phí vé ${fmtN(paid)} xu` : "Hôm nay bạn đã ghé tiệm này rồi nên không mất phí";
  return `<div class="scr home5 visit5">
    <div class="h5-room">${room3dHTML(v.room as never, { event: false, recipes, guests: 2, tables: v.venue.tbl.join(","), wide: v.venue.wide, floors: v.venue.floors, user: v.username }, true, true)}</div>
    <div class="h5-top">
      <div class="hrow5">${BACK}<div class="sp"></div>${coinPill(false, "", true)}</div>
      <div class="pcard5">
        <div class="pc-top">
          <div class="pc-av" style="--p:0" aria-hidden="true">${guestSVG({ ...look, mood: "happy", ledge: false }, 72)}${levelFrame(v.lv)}<span class="pc-lv bdg">${levelMedal(v.lv, 34)}</span></div>
          <div class="pc-t">
            <small>${ic.sprout(16, 2.2)}Đang ghé thăm</small>
            <b style="font-size:${name.length <= 12 ? 26 : 20}px">${esc(name)}</b>
            ${name !== v.username ? `<em class="pc-title">@${esc(v.username)}</em>` : ""}
            <div class="pc-stats"><span>${ic.seat(20, 2)}<i><small>Sức chứa</small><b>${seatsOfTables(v.venue.tbl)} ghế</b></i></span><span>${ic.fire(20, 2)}<i><small>Độ viral</small><b>${viral} khách</b></i></span></div>
          </div>
        </div>
        <div class="pc-buffs pc-info"><span class="bf">🛍 ${v.decor} đồ trang trí</span><span class="bf">🏢 ${v.venue.floors} lầu</span><span class="bf">🐾 ${v.hired} nhân viên</span></div>
        ${shopStatsHTML("visit")}
      </div>
    </div>
    <div class="h5-bottom">
      <p class="vnote">${esc(note)}</p>
      <div class="h5-row"><button class="b3 h5-open" data-go="/"><span>Về tiệm của mình</span></button></div>
    </div>
  </div>`;
}
