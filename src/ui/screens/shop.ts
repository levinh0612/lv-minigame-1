import type { PetId } from "../../content/couple";
import { BAKE_TIME, FOODS, PETS } from "../../content/game";
import { staffAvatar } from "../staffav";
import { tierBadge } from "../badges";
import { staffBodyHTML, staffCount, teamTab } from "../staff";
import { KIND_NAME, gachaItem } from "../../content/gacha";
import { ROOM_CATS, fxText, isDefault, roomCat, roomItem, type RoomKey } from "../../content/room";
import { tableLvs, staffIds, canHire, foodOf, foodDef, mealOf, plannedMeal, onDuty, staffDef, trainCost, isMascotStaff, hireFee, mascotBonus } from "../../engine/economy";
import { decorCount, unlocked } from "../../engine/progress";
import { S, petName, save } from "../../engine/state";
import { spend } from "../../engine/wallet";
import { fmtD, fmtN, parse, roman } from "../../engine/util";
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
  if (!own) { if (it.gacha || S.coins < it.cost) return ""; spend("decor", it.cost, `Mua ${it.n}`); S.owned.push(id); }
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
      <span class="dn">${esc(it.n)}</span><span class="tg ${eq ? "use" : own ? "own" : it.gacha ? "gacha" : "buy"}">${eq ? "Đang dùng" : own ? "Đã có" : it.gacha ? "Gacha" : `${it.cost} xu`}</span></button>`;
  }).join("");
  const act = !tr ? `<button class="b3 off" disabled>Chạm món để thử</button>`
    : trOwn ? `<button class="b3 use" data-act="dbuy">Dùng món này</button>`
    : trIt!.gacha ? `<button class="b3 off" disabled>Chỉ quay được từ Gacha</button>`
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
let sel = "dog";
export const selectPet = (id: string) => { sel = id; };

/* Tủ đồ ăn: mua bằng xu, dùng làm lương và để thưởng */
export function pantryHTML() {
  return `<div class="pantry">${FOODS.map(f => `<div class="ftile">${foodSVG(f.id, 36)}<b>${f.n}</b><small>còn ${foodOf(f.id)}</small>
    <button class="pk" data-food-buy="${f.id}:5" ${S.coins < f.cost * 5 ? "disabled" : ""}>+5 · ${f.cost * 5} xu</button></div>`).join("")}</div>`;
}
/* một thẻ nhân viên: ảnh + huy hiệu bậc | tên, vai, dòng thông tin | nút chính; dưới cùng nút lên bậc kèm tốc độ làm bánh mới */
export function petRowHTML(id: string) {
  const mas = isMascotStaff(id), d = staffDef(id), st = S.staff[id]!, on = onDuty(id), tier = st.hired ? st.lv : 1, picked = id === sel;
  const bake = (n: number) => `${String(BAKE_TIME[n - 1]).replace(".", ",")} giây/bánh`;
  const status = on ? `<span class="ptg w">Đi làm</span>` : st.hired ? `<span class="ptg o">Nghỉ</span>` : "";
  const foot = st.hired && trainCost(id) ? `<div class="pr2-foot"><span>${bake(st.lv)} <i>→</i> <b>${bake(st.lv + 1)}</b></span><button class="up" data-train="${id}" ${S.coins < trainCost(id) ? "disabled" : ""}>Lên bậc ${roman(st.lv + 1)} · ${fmtN(trainCost(id))} xu</button></div>` : st.hired ? `<div class="pr2-foot max"><span>Bậc tối đa · ${bake(st.lv)}</span></div>` : "";
  const av = `<button class="pr2-av ${on ? "on" : ""} ${picked ? "pick" : ""}" data-sel-pet="${id}" aria-label="Chọn ${esc(petName(id))}">${staffAvatar(id, 58, on ? "happy" : "open")}${st.hired ? tierBadge(tier, 30) : ""}</button>`;
  if (mas) {
    const mb = mascotBonus(id), fee = hireFee(id);
    const act = !st.hired ? `<button class="rb hire" data-hire="${id}" ${S.coins < fee ? "disabled" : ""}><b>Thuê</b><small>${fmtN(fee)} xu</small></button>` : "";
    return `<div class="pr2 mas"><div class="pr2-top">${av}<div class="pr2-main"><div class="pr2-name"><b>${esc(petName(id))}</b><span class="ptg g">Linh thú</span>${status}</div>
      <div class="pr2-meta">Không cần ăn · ${bake(tier)}</div><div class="pr2-chips"><span>+${Math.round(mb.price * 100)}% giá bánh</span><span>+${Math.round(mb.tip * 100)}% tip</span></div></div>${act}</div>${foot}</div>`;
  }
  const fed = S.pets[id as PetId].fedDay === S.daily.day, food = FOODS[tier - 1]!, meal = st.hired ? plannedMeal(id) : null, eat = foodDef(meal ?? mealOf(id));
  const act = !canHire(id) ? `<div class="rb lock"><b>Lv ${d.unlock}</b><small>mới mở</small></div>`
    : !st.hired ? `<button class="rb hire" data-hire="${id}"><b>Nhận</b><small>vào làm</small></button>`
    : `<button class="rb ${fed ? "done" : ""}" data-treat="${id}:${food.id}" ${fed || (!foodOf(food.id) && S.coins < food.cost) ? "disabled" : ""}>${foodSVG(food.id, 26)}<small>${fed ? "Đã thưởng" : "Thưởng"}</small></button>`;
  return `<div class="pr2"><div class="pr2-top">${av}<div class="pr2-main"><div class="pr2-name"><b>${esc(petName(id))}</b><span class="ptg t">Thợ bánh</span>${status}</div>
    <div class="pr2-meta">${foodSVG(eat.id, 18)}Lương 1 ${eat.n}/ca${st.hired && on && !meal ? ` <em>· hết đồ ăn</em>` : ""}</div>
    <div class="pr2-hearts"><span data-hearts="${id}">${heartRow(S.pets[id as PetId].aff)}</span></div></div>${act}</div>${foot}</div>`;
}
/* ===== Đội ngũ: một màn cho thợ bánh, quản lý, linh thú (thay cho Nhân viên nhỏ và hộp thoại Quản lý) ===== */
export function petsHTML() {
  const team = teamTab(), qm = staffCount("mgr"), qa = staffCount("mascot"), ids = staffIds(), pets = ids.filter(i => !isMascotStaff(i)), gachas = ids.filter(isMascotStaff);
  const tabs = `<div class="gtabs stf-tabs team-tabs"><button class="${team === "bake" ? "on" : ""}" data-team="bake">Thợ bánh · ${ids.length}</button><button class="${team === "mgr" ? "on" : ""}" data-team="mgr">Quản lý · ${qm.own}/${qm.all}</button><button class="${team === "mascot" ? "on" : ""}" data-team="mascot">Linh thú · ${qa.own}/${qa.all}</button></div>`;
  if (team !== "bake") return `<div class="scr pets2">${pageHead("Đội ngũ")}${tabs}<p class="hint5">${team === "mgr" ? "Mỗi tầng một quản lý, cộng chỉ số cho cả tiệm. Khách quen Hiếm trở lên cũng làm được quản lý." : "Mỗi tầng một linh thú đứng cộng chỉ số. Linh thú đã thuê ở tab Thợ bánh vừa đứng tầng vừa làm bánh."}</p>${staffBodyHTML()}</div>`;
  if (!ids.includes(sel)) sel = "dog";
  const id = sel, mas = isMascotStaff(id), it = gachaItem(id), fed = !mas && S.pets[id as PetId].fedDay === S.daily.day, k = FOODS[0]!;
  const hero = mas
    ? `<div class="hero mini"><div class="hn"><b>${esc(petName(id))}</b><small>Linh thú Gacha · ${it ? esc(KIND_NAME[it.kind]) : ""}</small></div><div class="pet mascot">${staffAvatar(id, 118, "happy")}</div></div>`
    : `<div class="hero mini"><div class="hn"><b>${esc(petName(id))}</b><small>${BREED[id as PetId]}</small></div><span class="hint">Chạm để vuốt ve</span>
        <button class="pet" data-pet="${id}" aria-label="Vuốt ve ${esc(petName(id))}">${petSVG({ ...PETS[id as PetId], mood: fed ? "love" : "happy", wave: id === "white" && !fed, ledge: false }, 112)}</button>
        <div class="hb"><button class="feed" data-treat="${id}:${k.id}" ${fed || (!foodOf(k.id) && S.coins < k.cost) ? "disabled" : ""}>${foodSVG(k.id, 24)}${fed ? "Hôm nay ăn rồi ♥" : foodOf(k.id) ? `Cho ăn · 1 ${k.n}` : `Cho ăn · ${k.cost} xu`}</button>
        <div class="hh" data-hearts="${id}">${heartRow(S.pets[id as PetId].aff)}</div></div></div>`;
  return `<div class="scr pets2">
    ${pageHead("Đội ngũ")}${tabs}${hero}
    <div class="sh2"><b>Thợ bánh</b><span class="lav">đi làm hay nghỉ chọn ở màn Chuẩn bị</span></div>
    <div class="prows">${pets.map(sid => petRowHTML(sid)).join("")}</div>
    ${gachas.length ? `<div class="sh2"><b>Linh thú Gacha</b><span class="lav">không cần ăn · bánh bán được giá hơn</span></div><div class="prows">${gachas.map(sid => petRowHTML(sid)).join("")}</div>` : `<p class="hint5">Triệu hồi linh thú ở Gacha, rồi thuê về làm bánh ở đây.</p>`}
    <div class="sh2"><b>Tủ đồ ăn</b><span class="lav">lương và quà thưởng cho 3 bé</span></div>
    ${pantryHTML()}
    <p class="phint">Mỗi ngày thưởng một lần, cho ăn để bé thân thiết hơn.</p>
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
