import { PETS } from "../../content/game";
import { daysTogether, eventNote, todayEvents } from "../../engine/dates";
import { giftReady, letterNew, lvl, xpFor } from "../../engine/progress";
import { S, petName } from "../../engine/state";
import { fmtN } from "../../engine/util";
import type { PetId } from "../../content/couple";
import type { CritterLook } from "../../content/game";
import { critterSVG } from "../art";
import { coinPill, esc, levelChip, twinkles } from "../dom";

export function homeHTML() {
  const te = todayEvents(), ln = letterNew(), gift = giftReady(), L = lvl();
  const petBtn = (id: PetId, look: CritterLook & { mood?: "love" | "open" }, cls = "") =>
    `<button class="pet ${cls}" data-pet="${id}" aria-label="Vuốt ve ${esc(petName(id))}">${critterSVG(look, id === "gold" ? 86 : 78)}<small>${esc(petName(id))}</small></button>`;
  return `<div class="scr">
    ${twinkles(["#FF8FAB", "#FFC94D", "#8FD9B6"], 9)}
    <div class="awn"></div><div class="awn2"></div>
    <div class="hrow">
      <div class="pill love"><span>♥︎</span>${fmtN(daysTogether())} ngày yêu</div>
      <div class="sp"></div>
      <button class="rbtn" data-music aria-label="Bật/tắt nhạc" style="${S.music ? "color:var(--pink-d)" : "opacity:.45"}">♫</button>
      <button class="rbtn" data-act="settings" aria-label="Cài đặt">⚙︎</button>
      ${coinPill()}
    </div>
    <div class="title"><div class="t1">Tiệm Bánh</div><div class="t2">Matcha</div><div class="t3">của riêng ${esc(S.names.her.toLowerCase() === "em" ? "em" : S.names.her)}</div>
      <div class="trow">${levelChip(L, S.xp - xpFor(L), xpFor(L + 1) - xpFor(L))}<button class="soon-link" data-go="/sap-ra-mat">✦ Sắp ra mắt</button></div></div>
    ${te.map(e => `<div class="evt"><b>Hôm nay: ${esc(e.t)} · xu x2</b><p>${esc(eventNote(e))}</p></div>`).join("")}
    <div class="yard">
      <div class="win"></div><div class="sign">Mở cửa</div>
      ${petBtn("dog", PETS.dog)}${petBtn("gold", { ...PETS.gold, mood: "love" }, "mid")}${petBtn("white", { ...PETS.white, mood: "open", wave: true })}
    </div>
    <button class="letter" data-act="letter">
      <div class="env"></div>
      <div class="tx"><b>${ln ? "Thư hôm nay đã đến" : "Đã đọc thư hôm nay"}</b><small>${ln ? "Chạm để mở thư" : `Chuỗi ${S.streak} ngày · chạm để đọc lại`}</small></div>
      ${ln ? '<div class="dot"></div>' : ""}
    </button>
    <div class="grow"></div>
    <div class="openw"><button class="b3" data-go="/chuan-bi">Mở tiệm</button></div>
    <nav class="nav">
      <button data-go="/cua-hang/thu-cung"><div class="ic" style="background:#DDF4E8;box-shadow:0 4px 0 #BFE8D3;color:#3F9C78">✿</div>Thú cưng</button>
      <button data-go="/muc-tieu"><div class="ic ${gift ? "new" : ""}" style="background:#FFF0C9;box-shadow:0 4px 0 #F6DB94;color:#C08A12">★</div>Mục tiêu</button>
      <button data-go="/cua-hang/qua-tang"><div class="ic ${gift ? "new" : ""}" style="background:#FFE3EA;box-shadow:0 4px 0 #F6CBD7;color:#E0567A">♥︎</div>Quà tặng</button>
      <button data-go="/cua-hang"><div class="ic" style="background:#EDE6FF;box-shadow:0 4px 0 #D6CBF6;color:#7A62C9">✦</div>Cửa hàng</button>
    </nav>
  </div>`;
}
