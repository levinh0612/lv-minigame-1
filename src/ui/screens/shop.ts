import { CFG, type PetId } from "../../content/couple";
import { FOODS, PETS } from "../../content/game";
import { ROOM_CATS, fxText, isDefault, roomCat, roomItem, type RoomKey } from "../../content/room";
import { tableLvs, canHire, foodOf, foodDef, mealOf, plannedMeal, onDuty, staffDef, trainCost } from "../../engine/economy";
import { decorCount, unlocked } from "../../engine/progress";
import { S, petName, save } from "../../engine/state";
import { spend } from "../../engine/wallet";
import { fmtD, fmtN, parse } from "../../engine/util";
import { petSVG, foodSVG } from "../art";
import { esc, heartRow } from "../dom";
import { room3dHTML } from "../room3d";
import { todayEvents } from "../../engine/dates";
import { pageHead } from "./prep";
import type { ShopTab } from "../router";
import { claimBtn, goalsList } from "./goals";

/* ===== Trang trí tiệm (DecorScreen của Claude Design): chạm để thử, rồi mua hoặc dùng ===== */
let dcat = 0, trial: { k: RoomKey; v: string } | null = null;
export const setDecorCat = (i: number) => { dcat = i; trial = null; };
export function tryDecor(k: RoomKey, v: string) { trial = S.room[k] === v ? null : { k, v }; }
export const cancelDecor = () => { trial = null; };
/* mua (nếu chưa có) và dùng món đang thử; trả về thông báo hoặc "" nếu không làm gì */
export function applyDecor(): string {
  if (!trial) return "";
  const { k, v } = trial, it = roomItem(k, v), id = k + ":" + v, own = isDefault(k, v) || S.owned.includes(id);
  if (!own) { if (S.coins < it.cost) return ""; spend("decor", it.cost, `Mua ${it.n}`); S.owned.push(id); }
  S.room[k] = v; trial = null; save();
  return own ? `Đã đổi sang ${it.n}` : `Đã mua ${it.n}`;
}
export function decorHTML() {
  const C = ROOM_CATS[dcat], room = { ...S.room }, tr = trial;
  if (tr) room[tr.k] = tr.v;
  const trIt = tr ? roomItem(tr.k, tr.v) : null, trOwn = tr ? isDefault(tr.k, tr.v) || S.owned.includes(tr.k + ":" + tr.v) : false;
  const items = C.items.map(it => {
    const own = isDefault(C.k, it.v) || S.owned.includes(C.k + ":" + it.v), eq = S.room[C.k] === it.v, sel = tr?.k === C.k && tr.v === it.v;
    return `<button class="ditem ${sel ? "sel" : eq ? "eq" : ""}" data-dtry="${C.k}:${it.v}"><span class="sw" style="background:${it.sw};background-size:${it.sws || "auto"}">${it.glyph || ""}</span>
      <span class="dn">${esc(it.n)}</span><span class="tg ${eq ? "use" : own ? "own" : "buy"}">${eq ? "Đang dùng" : own ? "Đã có" : `${it.cost} xu`}</span></button>`;
  }).join("");
  const act = !tr ? `<button class="b3 off" disabled>Chạm món để thử</button>`
    : trOwn ? `<button class="b3 use" data-act="dbuy">Dùng món này</button>`
    : S.coins >= trIt!.cost ? `<button class="b3" data-act="dbuy">Mua · ${trIt!.cost} xu</button>` : `<button class="b3 off" disabled>Chưa đủ xu · ${trIt!.cost} xu</button>`;
  const fx = trIt ? fxText(trIt) : "";
  return `<div class="scr decor4">
    ${pageHead("Trang trí tiệm", "")}
    <p class="dsub">Đã có ${decorCount()} món · hiện ở màn chính</p>
    <div class="droom">${room3dHTML(room, { hl: tr ? roomCat(tr.k).hl : C.hl, recipes: unlocked().length, event: todayEvents().length > 0, guests: Math.min(2, S.served ? 2 : 1), tables: tableLvs().join(","), wide: S.venue.wide, floors: S.venue.floors }, true)}
      ${tr && S.room[tr.k] !== tr.v ? `<div class="trying">Đang thử: ${esc(trIt!.n)}${fx ? ` · ${esc(fx)}` : ""}</div>` : ""}</div>
    <div class="dcats">${ROOM_CATS.map((c, i) => `<button class="${i === dcat ? "on" : ""}" data-dcat="${i}">${c.n}</button>`).join("")}</div>
    <div class="ditems">${items}</div>
    <div class="dfoot"><button class="b3 w" data-act="dcancel" ${tr ? "" : "disabled"}>Bỏ thử</button>${act}</div>
  </div>`;
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
  const tier = st.hired ? st.lv : 1, food = FOODS[tier - 1], meal = st.hired ? plannedMeal(id) : null, eat = foodDef(meal ?? mealOf(id));
  const act = !canHire(id) ? `<div class="rb lock"><b>Lv ${d.unlock}</b><small>mới mở</small></div>`
    : !st.hired ? `<button class="rb hire" data-hire="${id}"><b>Nhận</b><small>vào làm</small></button>`
    : `<button class="rb ${fed ? "done" : ""}" data-treat="${id}:${food.id}" ${fed || (!foodOf(food.id) && S.coins < food.cost) ? "disabled" : ""}>${foodSVG(food.id, 28)}<small>${fed ? "Đã thưởng" : "Thưởng"}</small></button>`;
  const train = st.hired && trainCost(id) ? `<button class="up" data-train="${id}" ${S.coins < trainCost(id) ? "disabled" : ""}>Lên bậc ${st.lv + 1} · ${fmtN(trainCost(id))} xu</button>` : "";
  return `<div class="prow"><div class="pav ${on ? "on" : ""}">${petSVG({ ...PETS[id], mood: on ? "happy" : "open", ledge: false }, 70)}</div>
    <div class="pin"><div class="pn"><b>${esc(petName(id))}</b><span class="ptg t">Bậc ${tier}</span>${on ? `<span class="ptg w">Đi làm</span>` : st.hired ? `<span class="ptg o">Nghỉ</span>` : ""}</div>
      <div class="pw">${foodSVG(eat.id, 20)}Lương: 1 ${eat.n}/ca${st.hired && on && !meal ? ` <em>· hết đồ ăn</em>` : ""}</div>
      <div class="ph2"><span data-hearts="${id}">${heartRow(S.pets[id].aff)}</span><small>thân thiết</small></div>${train}</div>${act}</div>`;
}
export function petsHTML() {
  const id = sel, fed = S.pets[id].fedDay === S.daily.day, k = FOODS[0];
  return `<div class="scr pets2">
    ${pageHead("Nhân viên nhỏ")}
    <div class="hero">
      <div class="hn"><b>${esc(petName(id))}</b><small>${BREED[id]}</small></div><span class="hint">Chạm để vuốt ve</span>
      <button class="pet" data-pet="${id}" aria-label="Vuốt ve ${esc(petName(id))}">${petSVG({ ...PETS[id], mood: fed ? "love" : "happy", wave: id === "white" && !fed, ledge: false }, 150)}</button>
      <div class="hb"><button class="feed" data-treat="${id}:${k.id}" ${fed || (!foodOf(k.id) && S.coins < k.cost) ? "disabled" : ""}>${foodSVG(k.id, 26)}${fed ? "Hôm nay ăn rồi ♥" : foodOf(k.id) ? `Cho ăn · 1 ${k.n}` : `Cho ăn · ${k.cost} xu`}</button>
        <div class="hh" data-hearts="${id}">${heartRow(S.pets[id].aff)}</div></div>
    </div>
    <div class="ptabs">${CFG.pets.map(p => `<button class="${p.id === id ? "on" : ""}" data-sel-pet="${p.id}">${petSVG({ ...PETS[p.id], paws: false, ledge: false }, 52)}<span>${esc(petName(p.id))}</span></button>`).join("")}</div>
    <div class="sh2"><b>Ca làm việc</b><span class="lav">đi làm / nghỉ ở màn Chuẩn bị</span></div>
    <div class="prows">${CFG.pets.map(p => petRowHTML(p.id)).join("")}</div>
    <div class="sh2"><b>Tủ đồ ăn</b><span class="lav">lương & quà thưởng</span></div>
    ${pantryHTML()}
    <p class="phint">Mỗi ngày thưởng một lần. Cho ăn để bé thân thiết hơn.</p>
  </div>`;
}
export function giftBody() {
  const L2 = S.letters.slice().reverse();
  return `<div class="list">
    <div class="card"><h3>Quà hôm nay</h3><div class="gl">${goalsList()}</div>${claimBtn("Xong cả 3 mục tiêu để nhận quà")}</div>
    <div class="card"><h3>Hộp thư <small>${S.letters.length} lá</small></h3>
      ${L2.length ? L2.map(l => `<div class="lt"><small>${fmtD(parse(l.day))}/${l.day.slice(0, 4)}${l.tag ? " · " + esc(l.tag) : ""}</small><p>${esc(l.txt)}</p></div>`).join("")
        : '<p class="empty">Chưa có thư nào. Mở thư hôm nay ở màn chính nha.</p>'}
    </div></div>`;
}

export function shopHTML(tab: ShopTab) {
  if (tab === "pets") return petsHTML();
  if (tab === "decor") return decorHTML();
  return `<div class="scr gift4">${pageHead("Quà tặng")}${giftBody()}</div>`;
}
