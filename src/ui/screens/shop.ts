import { CFG } from "../../content/couple";
import { DECOR, PETS } from "../../content/game";
import { lvl } from "../../engine/progress";
import { S, petName } from "../../engine/state";
import { fmtD, fmtN, parse } from "../../engine/util";
import { critterSVG } from "../art";
import { backBtn, coinPill, esc, hearts } from "../dom";
import { SHOP_PATH, type ShopTab } from "../router";
import { claimBtn, goalsList } from "./goals";

const roomHTML = () => `<div class="room"><div class="floor"></div><div class="rwin"></div><div class="board">Menu<br>hôm nay</div>
  ${S.decor.map(id => DECOR.find(d => d.id === id)?.rm || "").join("")}
  <div class="pets">${critterSVG(PETS.dog, 62)}${critterSVG(PETS.gold, 68)}${critterSVG({ ...PETS.white, mood: "love" }, 62)}</div></div>`;

function decorTab() {
  const L = lvl();
  return `<div class="grid2">${DECOR.map(d => {
    const own = S.decor.includes(d.id), lock = d.lv > L;
    return `<div class="item ${lock ? "lock" : ""}"><div class="pv" style="background:${d.bg}">${d.pv}</div><b>${esc(d.n)}</b><small>${esc(d.d)}</small>
      ${own ? '<div class="tag use">Đang dùng</div>' : lock ? `<div class="tag lk">Mở ở Lv ${d.lv}</div>` : `<button class="buy" data-buy="${d.id}" ${S.coins < d.cost ? "disabled" : ""}>${fmtN(d.cost)} xu</button>`}</div>`;
  }).join("")}</div>`;
}
function petsTab() {
  const td = S.daily.day;
  return `<div class="list">${CFG.pets.map(p => {
    const st = S.pets[p.id];
    return `<div class="card pcard"><button class="pet" data-pet="${p.id}" aria-label="Vuốt ve ${esc(petName(p.id))}">${critterSVG(PETS[p.id], 96)}</button>
      <div><div class="nm">${esc(petName(p.id))}</div><div class="ds">${esc(p.desc)}</div><div class="hearts" data-hearts="${p.id}">${hearts(st.aff)}</div>
      <button class="mini" data-feed="${p.id}" ${st.fedDay === td || S.coins < 5 ? "disabled" : ""}>${st.fedDay === td ? "Đã no bụng" : "Cho ăn · 5 xu"}</button></div></div>`;
  }).join("")}<p class="hint">Chạm vào bé để vuốt ve. Bé càng thân thì càng hay ghé tiệm.</p></div>`;
}
function giftTab() {
  const L2 = S.letters.slice().reverse();
  return `<div class="list">
    <div class="card"><h3>Quà hôm nay</h3><div class="gl">${goalsList()}</div>${claimBtn("Xong cả 3 mục tiêu để nhận quà")}</div>
    <div class="card"><h3>Hộp thư <small>${S.letters.length} lá</small></h3>
      ${L2.length ? L2.map(l => `<div class="lt"><small>${fmtD(parse(l.day))}/${l.day.slice(0, 4)}${l.tag ? " · " + esc(l.tag) : ""}</small><p>${esc(l.txt)}</p></div>`).join("")
        : '<p class="empty">Chưa có thư nào. Mở thư hôm nay ở màn chính nha.</p>'}
    </div></div>`;
}

export function shopHTML(tab: ShopTab) {
  const title = { decor: "Trang trí tiệm", pets: "Thú cưng", gift: "Quà tặng" }[tab];
  const body = { decor: decorTab, pets: petsTab, gift: giftTab }[tab]();
  return `<div class="scr">
    <div class="shead">${backBtn}<h2>${title}</h2>${coinPill()}</div>
    ${roomHTML()}
    <div class="seg" role="tablist">${([["decor", "Trang trí"], ["pets", "Thú cưng"], ["gift", "Quà tặng"]] as [ShopTab, string][]).map(([id, n]) =>
      `<button class="${tab === id ? "on" : ""}" data-go="${SHOP_PATH[id]}" data-replace role="tab" aria-selected="${tab === id}">${n}</button>`).join("")}</div>
    ${body}
  </div>`;
}
