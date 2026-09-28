import { CFG, type PetId } from "../../content/couple";
import { DECOR, FOODS, PETS } from "../../content/game";
import { canHire, foodOf, mealFor, onDuty, staffDef, trainCost } from "../../engine/economy";
import { lvl, xpFor } from "../../engine/progress";
import { S, petName } from "../../engine/state";
import { fmtD, fmtN, parse } from "../../engine/util";
import { critterSVG, foodSVG } from "../art";
import { backBtn, coinPill, esc, heartRow, levelChip } from "../dom";
import { pageHead } from "./prep";
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
/* ===== Nhân viên nhỏ (PetsScreen của Claude Design) ===== */
const BREED: Record<PetId, string> = { dog: "Cún trắng xù · làm bánh nhanh", gold: "Mèo Anh golden · khéo trang trí", white: "Mèo trắng · làm được món khó" };
let sel: PetId = "dog";
export const selectPet = (id: PetId) => { sel = id; };

/* Tủ đồ ăn: mua bằng xu, dùng làm lương và để thưởng */
export function pantryHTML() {
  return `<div class="pantry">${FOODS.map(f => `<div class="ftile">${foodSVG(f.id, 36)}<b>${f.n}</b><small>còn ${foodOf(f.id)}</small>
    <button class="pk" data-food-buy="${f.id}:5" ${S.coins < f.cost * 5 ? "disabled" : ""}>+5 · ${f.cost * 5} xu</button></div>`).join("")}</div>`;
}
/* một hàng trong Ca làm việc: bậc, lương, độ thân, nút thưởng */
export function petRowHTML(id: PetId) {
  const d = staffDef(id), st = S.staff[id], on = onDuty(id), fed = S.pets[id].fedDay === S.daily.day;
  const tier = st.hired ? st.lv : 1, food = FOODS[tier - 1], meal = st.hired ? mealFor(id) : null;
  const act = !canHire(id) ? `<div class="rb lock"><b>Lv ${d.unlock}</b><small>mới mở</small></div>`
    : !st.hired ? `<button class="rb hire" data-hire="${id}"><b>Nhận</b><small>vào làm</small></button>`
    : `<button class="rb ${fed ? "done" : ""}" data-treat="${id}:${food.id}" ${fed || (!foodOf(food.id) && S.coins < food.cost) ? "disabled" : ""}>${foodSVG(food.id, 28)}<small>${fed ? "Đã thưởng" : "Thưởng"}</small></button>`;
  const train = st.hired && trainCost(id) ? `<button class="up" data-train="${id}" ${S.coins < trainCost(id) ? "disabled" : ""}>Lên bậc ${st.lv + 1} · ${fmtN(trainCost(id))} xu</button>` : "";
  return `<div class="prow"><div class="pav ${on ? "on" : ""}">${critterSVG({ ...PETS[id], mood: on ? "happy" : "open", ledge: false }, 70)}</div>
    <div class="pin"><div class="pn"><b>${esc(petName(id))}</b><span class="tg t">Bậc ${tier}</span>${on ? `<span class="tg w">Đi làm</span>` : st.hired ? `<span class="tg o">Nghỉ</span>` : ""}</div>
      <div class="pw">${foodSVG(food.id, 20)}Lương: 1 ${food.n}/ca${st.hired && on && !meal ? ` <em>· hết đồ ăn</em>` : ""}</div>
      <div class="ph2"><span data-hearts="${id}">${heartRow(S.pets[id].aff)}</span><small>thân thiết</small></div>${train}</div>${act}</div>`;
}
export function petsHTML() {
  const id = sel, fed = S.pets[id].fedDay === S.daily.day, k = FOODS[0];
  return `<div class="scr pets2">
    ${pageHead("Nhân viên nhỏ")}
    <div class="hero">
      <div class="hn"><b>${esc(petName(id))}</b><small>${BREED[id]}</small></div><span class="hint">Chạm để vuốt ve</span>
      <button class="pet" data-pet="${id}" aria-label="Vuốt ve ${esc(petName(id))}">${critterSVG({ ...PETS[id], mood: fed ? "love" : "happy", wave: id === "white" && !fed, ledge: false }, 150)}</button>
      <div class="hb"><button class="feed" data-treat="${id}:${k.id}" ${fed || (!foodOf(k.id) && S.coins < k.cost) ? "disabled" : ""}>${foodSVG(k.id, 26)}${fed ? "Hôm nay ăn rồi ♥" : foodOf(k.id) ? `Cho ăn · 1 ${k.n}` : `Cho ăn · ${k.cost} xu`}</button>
        <div class="hh" data-hearts="${id}">${heartRow(S.pets[id].aff)}</div></div>
    </div>
    <div class="ptabs">${CFG.pets.map(p => `<button class="${p.id === id ? "on" : ""}" data-sel-pet="${p.id}">${critterSVG({ ...PETS[p.id], paws: false, ledge: false }, 52)}<span>${esc(petName(p.id))}</span></button>`).join("")}</div>
    <div class="sh2"><b>Ca làm việc</b><span class="lav">đi làm / nghỉ ở màn Chuẩn bị</span></div>
    <div class="prows">${CFG.pets.map(p => petRowHTML(p.id)).join("")}</div>
    <div class="sh2"><b>Tủ đồ ăn</b><span class="lav">lương & quà thưởng</span></div>
    ${pantryHTML()}
    <p class="phint">Mỗi ngày thưởng một lần. Bé càng thân càng hay ghé tiệm mua bánh.</p>
  </div>`;
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
  if (tab === "pets") return petsHTML();
  const body = { decor: decorTab, gift: giftTab }[tab](), L = lvl();
  return `<div class="scr">
    <div class="shead">${backBtn}<h2>${title}</h2>${coinPill()}</div>
    ${roomHTML()}
    <div class="shoplv">${levelChip(L, S.xp - xpFor(L), xpFor(L + 1) - xpFor(L))}<span>Lên cấp để mở thêm đồ trang trí, công thức và nhân viên</span></div>
    <div class="seg" role="tablist">${([["decor", "Trang trí"], ["pets", "Thú cưng"], ["gift", "Quà tặng"]] as [ShopTab, string][]).map(([id, n]) =>
      `<button class="${tab === id ? "on" : ""}" data-go="${SHOP_PATH[id]}" data-replace role="tab" aria-selected="${tab === id}">${n}</button>`).join("")}</div>
    ${body}
  </div>`;
}
