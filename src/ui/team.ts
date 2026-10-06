/* Đội ngũ: một màn, hai tab.
   - Thợ bánh: "Thú cưng" (3 bé) và "Linh thú" (chỉ những bé đã thuê làm thợ). Chạm một thẻ để mở hộp thoại chi tiết
     (thông tin, nút thưởng/lên bậc/đi làm, đồ ăn đề xuất và tủ đồ ăn).
   - Quản lý & Linh thú: chọn tầng ở cột bên trái (giống màn chính), chọn quản lý và linh thú của tầng đó bằng ô chọn
     hoặc kéo một dòng trong danh sách thả vào ô. Chạm một dòng để xem chi tiết và nguồn (Gacha...). */
import { sfx } from "../audio/sound";
import type { PetId } from "../content/couple";
import { BAKE_TIME, FOODS, MAX_STAFF_LV, PETS } from "../content/game";
import { GACHA_ITEMS, KIND_NAME, RARITY, asManager, fxLine, gachaItem, mgrFx, roleOf, type GachaItem } from "../content/gacha";
import { buyFood, foodDef, foodOf, hire, hireFee, isMascotStaff, mascotBonus, mealChoices, mealOf, onDuty, plannedMeal, setMeal, staffIds, staffState, toggleDuty, train, trainCost, treat } from "../engine/economy";
import { clearStaff, floorCount, floorOfStaff, hasItem, placeStaff, staffAt, type StaffKind } from "../engine/gacha";
import { S, petName, petState, save } from "../engine/state";
import { fmtN, roman } from "../engine/util";
import { render } from "./app";
import { tierBadge } from "./badges";
import { petSVG, foodSVG } from "./art";
import { bump, dropModal, esc, floatHearts, heartRow, modal, toast } from "./dom";
import { gachaArt } from "./gachafx";
import { navigate } from "./router";
import { openInGacha } from "./screens/gacha";
import { staffAvatar } from "./staffav";

export type TeamTab = "bake" | "place";
let team: TeamTab = "bake", floor = 0, listKind: StaffKind = "mgr", dlg = "";
export const teamTab = () => team;
export const setTeamTab = (t: TeamTab) => { team = t; };
const BREED: Record<PetId, string> = { dog: "Cún trắng xù", gold: "Mèo Anh golden", white: "Mèo trắng" };
const bake = (lv: number) => `${String(BAKE_TIME[Math.min(BAKE_TIME.length, Math.max(1, lv)) - 1]).replace(".", ",")} giây/bánh`;
const itemsOf = (k: StaffKind) => GACHA_ITEMS.filter(i => k === "mgr" ? asManager(i) : i.kind === "mascot").sort((a, b) => +!!b.mgr - +!!a.mgr || (b.rarity > a.rarity ? 1 : b.rarity < a.rarity ? -1 : 0));
const fxOf = (it: GachaItem) => it.mascot ? fxLine(it.mascot.fx) : fxLine(mgrFx(it));
const roleTag = (it: GachaItem) => { const r = roleOf(it); return r ? `<u class="role ${r.c}">${r.n}</u>` : ""; };

/** mở màn Đội ngũ (từ Menu hoặc từ nơi khác) */
export function openTeam(tab: TeamTab = "bake", kind?: StaffKind) { team = tab; if (kind) listKind = kind; navigate("/cua-hang/thu-cung"); }
export const staffSheet = (k?: StaffKind) => openTeam("place", k);

/* ============ thẻ thợ bánh ============ */
function staffCard(id: string) {
  const st = staffState(id), on = onDuty(id), mas = isMascotStaff(id), tier = st.lv, meal = on ? plannedMeal(id) : null, hungry = on && !meal;
  const eat = foodDef(mealOf(id)), mb = mascotBonus(id);
  const status = hungry ? `<span class="ptg bad">Đói</span>` : on ? `<span class="ptg w">Đi làm</span>` : `<span class="ptg o">Nghỉ</span>`;
  return `<button class="tm-card ${on ? "on" : ""}" data-sd="open:${id}"><span class="tm-av">${staffAvatar(id, 54, on ? "happy" : "open")}${tierBadge(tier, 28)}</span>
    <span class="tm-main"><span class="tm-name"><b>${esc(petName(id))}</b>${status}</span>
      <span class="tm-meta">${bake(tier)} · ${foodSVG(eat.id, 15)}${eat.n}</span>
      ${mas ? `<span class="tm-chips"><i>+${Math.round(mb.price * 100)}% giá</i><i>+${Math.round(mb.tip * 100)}% tip</i></span>` : ""}</span><span class="tm-go" aria-hidden="true">›</span></button>`;
}
const section = (title: string, n: string) => `<div class="tm-sec"><b>${title}</b><i></i><span>${n}</span></div>`;

function bakeTab() {
  const ids = staffIds(), pets = ids.filter(i => !isMascotStaff(i)), mas = ids.filter(isMascotStaff);
  return `${section("Thú cưng", `${pets.length} bé`)}<div class="tm-list">${pets.map(staffCard).join("")}</div>
    ${section("Linh thú", String(mas.length))}
    ${mas.length ? `<div class="tm-list">${mas.map(staffCard).join("")}</div>` : `<p class="hint5">Linh thú chỉ hiện ở đây khi bạn thuê làm thợ bánh. Mở tab <b>Quản lý và Linh thú</b>, chạm một linh thú rồi chọn <b>Thuê làm thợ bánh</b>.</p>`}
    <p class="phint">Chạm một thẻ để xem chi tiết, thưởng đồ ăn và lên bậc.</p>`;
}

/* ============ tab Quản lý và Linh thú ============ */
const slotInfo = (k: StaffKind) => {
  const it = staffAt(k, floor);
  return { it, art: it ? gachaArt(it, 46) : `<span class="tp-empty">+</span>`, name: it ? esc(it.n) : "Chưa đặt", fx: it ? esc(fxOf(it)) : "Chọn ở ô bên phải hoặc kéo từ danh sách" };
};
function slotRow(k: StaffKind) {
  const { it, art, name, fx } = slotInfo(k), own = itemsOf(k).filter(i => hasItem(i.id));
  const opts = own.map(i => { const at = floorOfStaff(k, i.id); return `<option value="${i.id}" ${it?.id === i.id ? "selected" : ""}>${esc(i.n)}${at >= 0 && at !== floor ? ` (tầng ${at + 1})` : ""}</option>`; }).join("");
  return `<div class="tp-row" data-drop="${k}"><div class="tp-art">${art}</div><div class="tp-info"><small>${k === "mgr" ? "Quản lý" : "Linh thú"}</small><b>${name}</b><em>${fx}</em></div>
    <select class="tp-sel" data-tsel="${k}" aria-label="${k === "mgr" ? "Chọn quản lý" : "Chọn linh thú"} tầng ${floor + 1}"><option value="">— Trống —</option>${opts}</select></div>`;
}
function placeTab() {
  floor = Math.max(0, Math.min(floor, floorCount() - 1));
  const n = floorCount(), col = Array.from({ length: n }, (_, i) => n - 1 - i).map(f => `<button class="${f === floor ? "on" : ""}" data-tm="floor:${f}">T${f + 1}</button>`).join("");
  const own = (k: StaffKind) => itemsOf(k).filter(i => hasItem(i.id)).length;
  const rows = itemsOf(listKind).map(it => {
    const has = hasItem(it.id), R = RARITY[it.rarity], at = floorOfStaff(listKind, it.id), hired = it.mascot && staffState(it.id).hired;
    return `<button class="tm-item r-${it.rarity} ${has ? "own" : "lock"}" style="--rc:${R.c}" data-tm="item:${it.id}" ${has ? `draggable="true" data-drag="${it.id}"` : ""}>
      <span class="tm-iart ${has ? "" : "dim"}">${gachaArt(it, 46)}</span>
      <span class="tm-imain"><span class="tm-iname"><b>${esc(it.n)}</b><i class="gdot" style="--rc:${R.c}">${R.n}</i></span><span class="tm-imeta">${roleTag(it)}${esc(fxOf(it))}</span></span>
      <span class="tm-istat ${at >= 0 ? "on" : ""}">${has ? (hired ? "Thợ bánh" : at >= 0 ? `Tầng ${at + 1}` : "Rảnh") : "Chưa có"}</span></button>`;
  }).join("");
  return `<div class="tp-wrap"><div class="tf-col" role="group" aria-label="Chọn tầng"><small>TẦNG</small>${col}</div>
      <div class="tp-card"><div class="tp-h">Tầng ${floor + 1}</div>${slotRow("mgr")}${slotRow("mascot")}</div></div>
    <p class="hint5">Chọn trong ô bên phải, hoặc kéo một dòng ở danh sách thả vào ô. Chạm một dòng để xem chi tiết.</p>
    <div class="gtabs stf-tabs tm-kind"><button class="${listKind === "mgr" ? "on" : ""}" data-tm="kind:mgr">Quản lý · ${own("mgr")}/${itemsOf("mgr").length}</button><button class="${listKind === "mascot" ? "on" : ""}" data-tm="kind:mascot">Linh thú · ${own("mascot")}/${itemsOf("mascot").length}</button></div>
    <div class="tm-items">${rows}</div>`;
}

/** nội dung màn Đội ngũ (shop.ts gọi) */
export function teamHTML(pageHead: (t: string) => string) {
  const nBake = staffIds().length;
  const tabs = `<div class="gtabs stf-tabs team-tabs"><button class="${team === "bake" ? "on" : ""}" data-team="bake">Thợ bánh · ${nBake}</button><button class="${team === "place" ? "on" : ""}" data-team="place">Quản lý và Linh thú</button></div>`;
  return `<div class="scr pets2 team">${pageHead("Đội ngũ")}${tabs}${team === "bake" ? bakeTab() : placeTab()}</div>`;
}

/* ============ hộp thoại chi tiết thợ bánh ============ */
function foodTiles(id: string) {
  const rec = mealOf(id), fedToday = petState(id).fedDay === S.daily.day, choices = mealChoices(id).map(f => f.id);
  return FOODS.map(f => {
    const can = choices.includes(f.id), n = foodOf(f.id), isRec = f.id === rec;
    return `<div class="sd-food ${isRec ? "rec" : ""} ${can ? "" : "lock"}">${isRec ? `<em>Đề xuất</em>` : ""}${foodSVG(f.id, 34)}<b>${f.n}</b><small>còn ${n}</small>
      <button class="pk" data-sd="buy:${f.id}:5" ${S.coins < f.cost * 5 ? "disabled" : ""}>+5 · ${fmtN(f.cost * 5)} xu</button>
      <button class="pk give" data-sd="treat:${id}:${f.id}" ${fedToday || !can || (!n && S.coins < f.cost) ? "disabled" : ""}>${fedToday ? "Đã thưởng" : can ? "Cho ăn" : "Chưa ăn được"}</button></div>`;
  }).join("");
}
function staffBody(id: string) {
  const st = staffState(id), on = onDuty(id), mas = isMascotStaff(id), tier = st.lv, meal = on ? plannedMeal(id) : null, eat = foodDef(mealOf(id));
  const fed = petState(id).fedDay === S.daily.day, mb = mascotBonus(id), it = gachaItem(id), fee = hireFee(id);
  const art = mas ? staffAvatar(id, 112, on ? "happy" : "open") : `<button class="sd-pet" data-sd="pet:${id}" aria-label="Vuốt ve ${esc(petName(id))}">${petSVG({ ...PETS[id as PetId], mood: fed ? "love" : "happy", ledge: false }, 118)}</button>`;
  const stat = (k: string, v: string) => `<div><small>${k}</small><b>${v}</b></div>`;
  const meals = mealChoices(id);
  const pick = meals.length > 1 ? `<div class="sd-pick"><small>Bữa ăn mỗi ca</small><div>${meals.map(f => `<button class="${f.id === eat.id ? "on" : ""}" data-sd="meal:${id}:${f.id}">${foodSVG(f.id, 18)}${f.n}</button>`).join("")}</div></div>` : "";
  const act = !st.hired ? `<button class="b3" data-sd="hire:${id}" ${S.coins < fee ? "disabled" : ""}>${mas ? `Thuê · ${fmtN(fee)} xu` : "Nhận vào làm"}</button>` :
    `<button class="b3 ${on ? "w" : ""}" data-sd="duty:${id}">${on ? "Cho nghỉ ca này" : "Cho đi làm"}</button>${trainCost(id) ? `<button class="b3 up2" data-sd="train:${id}" ${S.coins < trainCost(id) ? "disabled" : ""}>Lên bậc ${roman(tier + 1)} · ${fmtN(trainCost(id))} xu<small>${bake(tier)} → ${bake(tier + 1)}</small></button>` : `<div class="sd-max">Đã đạt bậc tối đa</div>`}`;
  return `<div class="sd"><div class="sd-top"><div class="sd-art">${art}${st.hired ? tierBadge(tier, 34) : ""}</div>
    <div class="sd-id"><b>${esc(petName(id))}</b><span>${mas ? `Linh thú · ${it ? RARITY[it.rarity].n : ""}` : BREED[id as PetId]}</span>${on ? `<span class="ptg w">Đi làm</span>` : st.hired ? `<span class="ptg o">Nghỉ</span>` : ""}
      ${!mas ? `<small>Chạm vào bé để vuốt ve</small>` : ""}</div></div>
    <div class="sd-stats">${stat("Tốc độ", bake(tier))}${stat("Bữa ăn", `${foodSVG(eat.id, 16)} ${eat.n}`)}${stat("Thân thiết", heartRow(petState(id).aff, 13))}${mas ? stat("Buff", `+${Math.round(mb.price * 100)}% giá · +${Math.round(mb.tip * 100)}% tip`) : stat("Bậc", `${roman(tier)} / ${roman(MAX_STAFF_LV)}`)}</div>
    ${on && !meal ? `<p class="sd-warn">Hết đồ ăn cho bữa này, bé sẽ nghỉ ca. Mua thêm ở tủ bên dưới.</p>` : ""}
    <div class="sd-acts">${act}</div>${pick}
    <div class="sh2"><b>Đồ ăn đề xuất</b><span class="lav">hợp bậc ${roman(tier)}</span></div>
    <div class="sd-rec">${(() => { const f = eat, n = foodOf(f.id); return `<div>${foodSVG(f.id, 40)}<span><b>${f.n}</b><small>${n ? `còn ${n} phần` : "đã hết, nên mua thêm"}</small></span></div><button class="pk" data-sd="buy:${f.id}:5" ${S.coins < f.cost * 5 ? "disabled" : ""}>Mua 5 · ${fmtN(f.cost * 5)} xu</button>`; })()}</div>
    <div class="sh2"><b>Tủ đồ ăn</b><span class="lav">thưởng mỗi ngày một lần</span></div><div class="sd-food-grid">${foodTiles(id)}</div></div>`;
}
export function openStaffDialog(id: string) {
  dlg = id;
  modal(`<h2>${esc(petName(id))}</h2><p class="sub">Thợ bánh${isMascotStaff(id) ? " · Linh thú" : ""}</p><div id="sdBody">${staffBody(id)}</div><div class="mbtns"><button class="b3 w" data-close>Đóng</button></div>`, () => { dlg = ""; });
}
const refreshStaff = () => { const b = document.getElementById("sdBody"); if (b && dlg) b.innerHTML = staffBody(dlg); render(true); };

/* ============ hộp thoại chi tiết quản lý / linh thú ============ */
function itemBody(id: string) {
  const it = gachaItem(id)!, R = RARITY[it.rarity], has = hasItem(id), at = floorOfStaff(it.mascot ? "mascot" : "mgr", id), n = floorCount();
  const kind: StaffKind = it.mascot ? "mascot" : "mgr", hired = !!it.mascot && staffState(id).hired;
  const gender = it.mgr ? (it.mgr.gender === "girl" ? "♀ Nữ" : "♂ Nam") : it.char ? (it.char.gender === "girl" ? "♀ Nữ" : "♂ Nam") : "";
  const tags = [gender, ...(it.mgr?.tags ?? [])].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join("");
  const place = has ? `<div class="sd-floors"><small>Đặt vào tầng</small><div>${Array.from({ length: n }, (_, f) => `<button class="${f === at ? "on" : ""}" data-tm="put:${id}:${f}">Tầng ${f + 1}</button>`).join("")}${at >= 0 ? `<button class="off" data-tm="clear:${id}">Cất</button>` : ""}</div></div>` : "";
  const hire = it.mascot && has ? (hired ? `<div class="sd-note ok">Đang làm thợ bánh · bậc ${roman(staffState(id).lv)}. Xem ở tab Thợ bánh.</div>` : `<button class="b3" data-tm="hire:${id}" ${S.coins < hireFee(id) ? "disabled" : ""}>Thuê làm thợ bánh · ${fmtN(hireFee(id))} xu<small>không bắt buộc, bé vẫn đứng tầng được</small></button>`) : "";
  return `<div class="sd"><div class="sd-top"><div class="sd-art" style="--rc:${R.c}">${gachaArt(it, 104)}</div><div class="sd-id"><b>${esc(it.n)}</b><span>${KIND_NAME[it.kind]} · ${R.n}</span><div class="gtags">${roleTag(it)}${tags}</div></div></div>
    <div class="sd-stats one"><div><small>Chỉ số khi đứng tầng</small><b>${esc(fxOf(it))}</b></div></div>
    <div class="sd-src"><small>Nguồn</small><b>Triệu hồi Gacha</b><span>Nhóm ${R.n} · ${has ? `đã có x${S.gacha.owned[id] ?? 1}` : "chưa có"}</span>
      <button class="b3 ${has ? "w" : ""}" data-tm="gacha:${id}">${has ? "Xem trong Gacha" : "Đi triệu hồi"}</button></div>
    ${place}${hire}${kind === "mgr" && it.char ? `<p class="phint">Khách quen Hiếm trở lên làm được quản lý, cộng chỉ số nhẹ hơn quản lý thật.</p>` : ""}</div>`;
}
function openItemDialog(id: string) {
  const it = gachaItem(id); if (!it) return;
  modal(`<h2>${esc(it.n)}</h2><p class="sub">${it.mascot ? "Linh thú" : asManager(it) ? "Quản lý" : KIND_NAME[it.kind]}</p><div id="tdBody">${itemBody(id)}</div><div class="mbtns"><button class="b3 w" data-close>Đóng</button></div>`);
  dlg = "";
  (document.getElementById("modal") as HTMLElement | null)!.dataset.item = id;
}
const refreshItem = (id: string) => { const b = document.getElementById("tdBody"); if (b) b.innerHTML = itemBody(id); render(true); };

/* ============ xử lý nút ============ */
/** data-sd: thao tác trong hộp thoại thợ bánh; el là phần tử vừa chạm (để bay tim) */
export function staffDialogAct(act: string, el: HTMLElement) {
  const [a, x, y] = act.split(":");
  if (a === "open") { sfx("click"); return openStaffDialog(x!); }
  if (a === "buy") { const f = foodDef(x as never); if (buyFood(f.id, +y!)) { sfx("tap"); toast(`+${y} ${f.n} · ${fmtN(f.cost * +y!)} xu`); } else toast("Không đủ xu"); return refreshStaff(); }
  if (a === "treat") { const id = x!, f = foodDef(y as never); if (treat(id, f.id)) { const r = el.getBoundingClientRect(); floatHearts(r.left + r.width / 2, r.top, 6); sfx("boop"); toast(`${petName(id)} ăn ${f.n} ngon lành! +${f.aff} ♥`); } else toast("Không đủ xu để mua đồ ăn"); return refreshStaff(); }
  if (a === "meal") { setMeal(x!, y as never); sfx("click"); return refreshStaff(); }
  if (a === "duty") { toggleDuty(x!); sfx("click"); return refreshStaff(); }
  if (a === "train") { if (train(x!)) { sfx("level"); toast(`${petName(x!)} lên bậc ${roman(staffState(x!).lv)}!`); } return refreshStaff(); }
  if (a === "hire") { if (hire(x!)) { sfx("level"); toast(`${petName(x!)} đã vào làm!`); } else if (hireFee(x!)) toast(`Cần ${fmtN(hireFee(x!))} xu để thuê ${petName(x!)}`); return refreshStaff(); }
  if (a === "pet") {
    const st = petState(x!), r = el.getBoundingClientRect();
    if (st.petDay !== S.daily.day) { st.petDay = S.daily.day; st.pets = 0; }
    if (st.pets < 10) { st.pets++; st.aff++; save(); }
    floatHearts(r.left + r.width / 2, r.top + r.height / 3, 3); sfx("boop"); bump(el, "squish");
    const stats = document.querySelector<HTMLElement>(".sd-stats div:nth-child(3) b"); if (stats) stats.innerHTML = heartRow(st.aff, 13);
  }
}
/** data-tm: thao tác ở tab Quản lý và Linh thú */
export function teamAct(act: string) {
  const [a, x, y] = act.split(":");
  if (a === "floor") { floor = +x!; sfx("click"); return render(); }
  if (a === "kind") { listKind = x as StaffKind; sfx("click"); return render(); }
  if (a === "item") { sfx("click"); return openItemDialog(x!); }
  if (a === "gacha") { sfx("click"); dropModal(); return openInGacha(x!); }
  if (a === "put") { const it = gachaItem(x!)!; const k: StaffKind = it.mascot ? "mascot" : "mgr"; if (placeStaff(k, x!, +y!)) { sfx("level"); toast(`${it.n} đã vào tầng ${+y! + 1}`); } return refreshItem(x!); }
  if (a === "clear") { const it = gachaItem(x!)!; const k: StaffKind = it.mascot ? "mascot" : "mgr"; const f = floorOfStaff(k, x!); if (f >= 0) { clearStaff(k, f); sfx("click"); toast(`Đã cất ${it.n}`); } return refreshItem(x!); }
  if (a === "hire") { if (hire(x!)) { sfx("level"); toast(`${petName(x!)} đã vào làm thợ bánh!`); } else toast(`Cần ${fmtN(hireFee(x!))} xu để thuê`); return refreshItem(x!); }
}
/** đặt bằng ô chọn hoặc kéo thả vào ô của tầng đang xem */
function assign(k: StaffKind, id: string) {
  if (!id) { clearStaff(k, floor); sfx("click"); return render(); }
  const it = gachaItem(id); if (!it) return;
  if (placeStaff(k, id, floor)) { sfx("level"); toast(`${it.n} đã vào tầng ${floor + 1}`); }
  render();
}
/** đăng ký sự kiện ô chọn và kéo thả (gọi một lần ở main.ts) */
export function initTeam() {
  document.addEventListener("change", e => { const t = e.target as HTMLSelectElement; if (t.matches?.("select[data-tsel]")) assign(t.dataset.tsel as StaffKind, t.value); });
  document.addEventListener("dragstart", e => { const t = (e.target as HTMLElement).closest<HTMLElement>("[data-drag]"); if (!t) return; e.dataTransfer?.setData("text/plain", t.dataset.drag!); e.dataTransfer!.effectAllowed = "move"; t.classList.add("dragging"); });
  document.addEventListener("dragend", e => { (e.target as HTMLElement).classList?.remove("dragging"); document.querySelectorAll(".tp-row.over").forEach(r => r.classList.remove("over")); });
  document.addEventListener("dragover", e => { const r = (e.target as HTMLElement).closest<HTMLElement>("[data-drop]"); if (r) { e.preventDefault(); r.classList.add("over"); } });
  document.addEventListener("dragleave", e => { (e.target as HTMLElement).closest?.("[data-drop]")?.classList.remove("over"); });
  document.addEventListener("drop", e => {
    const r = (e.target as HTMLElement).closest<HTMLElement>("[data-drop]"); if (!r) return; e.preventDefault(); r.classList.remove("over");
    const id = e.dataTransfer?.getData("text/plain"), it = id ? gachaItem(id) : null; if (!it) return;
    const k = r.dataset.drop as StaffKind;
    if ((k === "mascot") !== !!it.mascot) { toast(k === "mgr" ? "Ô này dành cho quản lý" : "Ô này dành cho linh thú"); return; }
    assign(k, it.id);
  });
}
