/* Ghé thăm tiệm hàng xóm: xem cảnh 3D theo dữ liệu của chủ tiệm (chỉ xem, không sửa được gì).
   Vào tham quan phải đóng phí vé (luật ở engine/visit.ts); chủ tiệm nhận tiền mừng ở lần mở app sau. */
import { sfx } from "../../audio/sound";
import { RECIPES } from "../../content/game";
import { S, save } from "../../engine/state";
import { hostGift, seatsOfTables, setVisiting, visiting, type VisitShop } from "../../engine/visit";
import { spend } from "../../engine/wallet";
import { fmtN } from "../../engine/util";
import { visitEnter, visitQuote } from "../../net/cloud";
import { render } from "../app";
import { coinPill, dropModal, esc, modal, toast } from "../dom";
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

export function visitHTML(user: string) {
  const v = visiting();
  if (!v || v.username !== user) {
    void resume(user);
    return `<div class="scr visit5"><div class="vload"><div class="vz-art" aria-hidden="true">🏪</div><b>Đang đến tiệm ${esc(user)}…</b></div></div>`;
  }
  return shopHTML(v);
}

function shopHTML(v: VisitShop) {
  const name = v.shop.trim() || v.username, recipes = RECIPES.filter(r => r.lv <= v.lv).length;
  const note = paid === null ? "Bạn đang tham quan, chỉ xem thôi nha" : paid > 0 ? `Bạn đã gửi tiền mừng, phí vé ${fmtN(paid)} xu` : "Hôm nay bạn đã ghé tiệm này rồi nên không mất phí";
  return `<div class="scr home5 visit5">
    <div class="h5-room">${room3dHTML(v.room as never, { event: false, recipes, guests: 2, tables: v.venue.tbl.join(","), wide: v.venue.wide, floors: v.venue.floors, user: v.username }, true, true)}</div>
    <div class="h5-top">
      <div class="hrow4">${BACK}<div class="sp"></div>${coinPill()}</div>
      <div class="vcard"><div class="vav" aria-hidden="true">🏪</div>
        <div class="vmain"><small>Đang ghé thăm · Tiệm Bánh của</small><b>${esc(name)}</b>${name !== v.username ? `<em>@${esc(v.username)}</em>` : ""}</div>
        <span class="vlv">Lv ${v.lv}</span></div>
      <div class="h5-chips"><span class="pchip lav">🛍 ${v.decor} đồ trang trí</span><span class="pchip lav">🪑 sức chứa ${seatsOfTables(v.venue.tbl)}</span><span class="pchip lav">🏢 ${v.venue.floors} lầu</span><span class="pchip mint">🐾 ${v.hired} nhân viên</span></div>
    </div>
    <div class="h5-bottom">
      <div class="vstats"><div><b>${fmtN(v.earned)}</b><small>xu bán được</small></div><div><b>${fmtN(v.served)}</b><small>khách đã phục vụ</small></div><div><b>${recipes}</b><small>món bánh</small></div></div>
      <p class="vnote">${esc(note)}</p>
      <div class="h5-row"><button class="b3 h5-open" data-go="/"><span>Về tiệm của mình</span></button></div>
    </div>
  </div>`;
}
