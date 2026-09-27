import { CFG, type PetId } from "../../content/couple";
import { DECOR, FOODS, PETS } from "../../content/game";
import { canHire, foodDef, foodOf, mealFor, mealOf, onDuty, staffDef, trainCost } from "../../engine/economy";
import { lvl, xpFor } from "../../engine/progress";
import { S, petName } from "../../engine/state";
import { fmtD, fmtN, parse } from "../../engine/util";
import { critterSVG, foodSVG } from "../art";
import { backBtn, coinPill, esc, hearts, levelChip } from "../dom";
import { SHOP_PATH, type ShopTab } from "../router";
import { claimBtn, goalsList } from "./goals";

export const roomHTML = () => `<div class="room"><div class="floor"></div><div class="rwin"></div><div class="board">Menu<br>hôm nay</div>
  ${S.decor.map(id => DECOR.find(d => d.id === id)?.rm || "").join("")}
  <div class="pets">${critterSVG(PETS.dog, 62)}${critterSVG(PETS.gold, 68)}${critterSVG({ ...PETS.white, mood: "love" }, 62)}</div></div>`;

export function decorTab() {
  const L = lvl();
  return `<div class="grid2">${DECOR.map(d => {
    const own = S.decor.includes(d.id), lock = d.lv > L;
    return `<div class="item ${lock ? "lock" : ""}"><div class="pv" style="background:${d.bg}">${d.pv}</div><b>${esc(d.n)}</b><small>${esc(d.d)}</small>
      ${own ? '<div class="tag use">Đang dùng</div>' : lock ? `<div class="tag lk">Mở ở Lv ${d.lv}</div>` : `<button class="buy" data-buy="${d.id}" ${S.coins < d.cost ? "disabled" : ""}>${fmtN(d.cost)} xu</button>`}</div>`;
  }).join("")}</div>`;
}
/* Tủ đồ ăn: mua bằng xu, dùng làm lương và để thưởng */
export function pantryHTML() {
  return `<div class="card"><h3>Tủ đồ ăn</h3>
    <p class="cnote">Lương mỗi ca của các bé: bậc 1 ăn Hạt, bậc 2 ăn Pate, bậc 3 ăn Ức gà. Mỗi ngày thưởng thêm một món để các bé thân hơn.</p>
    ${FOODS.map(f => `<div class="frow">${foodSVG(f.id, 40)}<div class="fn"><b>${f.n}</b><small>+${f.aff} ♥ khi thưởng</small></div><span class="sq ${foodOf(f.id) ? "" : "zero"}">${foodOf(f.id)}</span>
      <button class="pk" data-food-buy="${f.id}:1" ${S.coins < f.cost ? "disabled" : ""}>+1<small>${f.cost} xu</small></button>
      <button class="pk" data-food-buy="${f.id}:5" ${S.coins < f.cost * 5 ? "disabled" : ""}>+5<small>${f.cost * 5} xu</small></button></div>`).join("")}
  </div>`;
}

/* Một bé: vuốt ve, thưởng đồ ăn, và làm nhân viên */
export function petCardHTML(id: PetId) {
  const p = CFG.pets.find(x => x.id === id)!, d = staffDef(id), st = S.staff[id], pet = S.pets[id], td = S.daily.day;
  const on = onDuty(id), meal = st.hired ? mealFor(id) : null, need = st.hired ? foodDef(mealOf(id)) : null;
  const work = !canHire(id)
    ? `<div class="job lock"><span class="tag lk">Xin vào làm ${d.role.toLowerCase()} từ Lv ${d.unlock}</span><small>${d.effect[0]}</small></div>`
    : !st.hired
      ? `<div class="job"><small>Muốn làm <b>${d.role.toLowerCase()}</b>: ${d.effect[0].toLowerCase()}. Lương mỗi ca: 1 Hạt.</small><button class="mini pk" data-hire="${id}">Nhận vào làm</button></div>`
      : `<div class="job ${on ? "" : "off"}"><small><b>${d.role} · bậc ${st.lv}:</b> ${d.effect[st.lv - 1]}</small>
          <small class="wg ${on && !meal ? "bad" : ""}">Lương mỗi ca: 1 ${need!.n} · ${on && !meal ? "hết đồ ăn, bé sẽ nghỉ" : `còn ${foodOf(mealOf(id))}`}</small>
          <div class="acts"><button class="duty ${on ? "on" : ""}" data-duty="${id}" aria-pressed="${on}">${on ? "Đi làm" : "Nghỉ"}</button>
          ${trainCost(id) ? `<button class="mini" data-train="${id}" ${S.coins < trainCost(id) ? "disabled" : ""}>Huấn luyện · ${fmtN(trainCost(id))} xu</button>` : '<span class="tag use">Bậc tối đa</span>'}</div></div>`;
  const fed = pet.fedDay === td;
  return `<div class="card pcard2">
    <div class="ph"><button class="pet" data-pet="${id}" aria-label="Vuốt ve ${esc(petName(id))}">${critterSVG({ ...PETS[id], mood: on ? "happy" : "open" }, 88)}</button>
      <div><div class="nm">${esc(petName(id))}${st.hired ? ` <em>${d.role}</em>` : ""}</div><div class="ds">${esc(p.desc)}</div><div class="hearts" data-hearts="${id}">${hearts(pet.aff)}</div></div></div>
    ${work}
    <div class="snack"><span>${fed ? "Đã được thưởng hôm nay ♥" : "Thưởng hôm nay"}</span>
      ${FOODS.map(f => `<button class="fbtn" data-snack="${id}:${f.id}" ${fed || !foodOf(f.id) ? "disabled" : ""} aria-label="Thưởng ${f.n}">${foodSVG(f.id, 28)}<b>${foodOf(f.id)}</b></button>`).join("")}</div>
  </div>`;
}
function petsTab() {
  return `<div class="list">${pantryHTML()}${CFG.pets.map(p => petCardHTML(p.id)).join("")}<p class="hint">Chạm vào bé để vuốt ve. Bé càng thân thì càng hay ghé tiệm mua bánh.</p></div>`;
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
  const body = { decor: decorTab, pets: petsTab, gift: giftTab }[tab](), L = lvl();
  return `<div class="scr">
    <div class="shead">${backBtn}<h2>${title}</h2>${coinPill()}</div>
    ${roomHTML()}
    <div class="shoplv">${levelChip(L, S.xp - xpFor(L), xpFor(L + 1) - xpFor(L))}<span>Lên cấp để mở thêm đồ trang trí, công thức và nhân viên</span></div>
    <div class="seg" role="tablist">${([["decor", "Trang trí"], ["pets", "Thú cưng"], ["gift", "Quà tặng"]] as [ShopTab, string][]).map(([id, n]) =>
      `<button class="${tab === id ? "on" : ""}" data-go="${SHOP_PATH[id]}" data-replace role="tab" aria-selected="${tab === id}">${n}</button>`).join("")}</div>
    ${body}
  </div>`;
}
