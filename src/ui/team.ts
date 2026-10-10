/* Đội ngũ: một màn, hai tab.
   - Thợ bánh: "Thú cưng" (3 bé) và "Linh thú" (chỉ những bé đã thuê làm thợ). Chạm một thẻ để mở hộp thoại chi tiết
     (thông tin, nút thưởng/lên bậc/đi làm, đồ ăn đề xuất và tủ đồ ăn).
   - Quản lý & Linh thú: chọn tầng ở cột bên trái (giống màn chính), chọn quản lý và linh thú của tầng đó bằng ô chọn
     hoặc kéo một dòng trong danh sách thả vào ô. Chạm một dòng để xem chi tiết và nguồn (Gacha...). */
import { sfx } from "../audio/sound";
import type { PetId } from "../content/couple";
import { BAKE_TIME, FOODS, MAX_STAFF_LV, PETS } from "../content/game";
import { GACHA_ITEMS, KIND_NAME, RARITIES, RARITY, asManager, fxLine, gachaItem, mgrFx, type GachaItem } from "../content/gacha";
import { buyFood, foodDef, foodOf, hire, hireFee, isMascotStaff, mascotBonus, mealChoices, mealOf, mealOutlook, mealSlow, onDuty, setMeal, staffIds, staffState, toggleDuty, train, trainCost, treat } from "../engine/economy";
import { BOND_AT, bondLevel, bondOf, clearStaff, floorCount, floorOfStaff, hasItem, placeStaff, staffAt, type StaffKind } from "../engine/gacha";
import { SKILLS, SKILL_FEE, SKILL_NAME, SKILL_SHIFTS, canTeach, knows, progressOf, teach } from "../engine/skills";
import { S, petName, petState, save } from "../engine/state";
import { fmtN, roman } from "../engine/util";
import { render } from "./app";
import { entityHero, entityInfo, entityRow } from "./components/entity";
import { petSVG, foodSVG } from "./art";
import { bump, confirmSpend, dropModal, esc, floatHearts, heartRow, modal, toast } from "./dom";
import { gachaArt } from "./gachafx";
import { navigate } from "./router";
import { openInGacha } from "./screens/gacha";
import { byNum, byText } from "../engine/listview";
import { listHTML, registerList } from "./components/listtools";

export type TeamTab = "bake" | "place";
let team: TeamTab = "bake", floor = 0, listKind: StaffKind = "mgr", dlg = "";
export const teamTab = () => team;
export const setTeamTab = (t: TeamTab) => { team = t; };
const BREED: Record<PetId, string> = { dog: "Cún trắng xù", gold: "Mèo Anh golden", white: "Mèo trắng" };
const bake = (lv: number) => `${String(BAKE_TIME[Math.min(BAKE_TIME.length, Math.max(1, lv)) - 1]).replace(".", ",")} giây/bánh`;
const itemsOf = (k: StaffKind) => GACHA_ITEMS.filter(i => k === "mgr" ? asManager(i) : i.kind === "mascot").sort((a, b) => +!!b.mgr - +!!a.mgr || (b.rarity > a.rarity ? 1 : b.rarity < a.rarity ? -1 : 0));
const fxOf = (it: GachaItem) => it.mascot ? fxLine(it.mascot.fx) : fxLine(mgrFx(it));

/* danh sách quản lý / linh thú bên dưới: tìm, lọc theo độ hiếm và đã có, sắp xếp */
registerList<GachaItem>("team-items", {
  placeholder: "Tìm quản lý hoặc linh thú",
  items: () => itemsOf(listKind),
  cfg: {
    text: i => [i.n, i.desc, fxOf(i), ...(i.mgr?.tags ?? [])],
    groups: {
      own: { yes: i => hasItem(i.id), no: i => !hasItem(i.id), on: i => floorOfStaff(i.mascot ? "mascot" : "mgr", i.id) >= 0 },
      rar: { common: i => i.rarity === "common", rare: i => i.rarity === "rare", ultra: i => i.rarity === "ultra" }
    },
    sorts: { rarity: byNum(i => RARITIES.indexOf(i.rarity)), name: byText(i => i.n) }
  },
  groups: [
    { id: "own", opts: [{ id: "all", label: "Tất cả" }, { id: "yes", label: "Đã có" }, { id: "on", label: "Đang đứng" }, { id: "no", label: "Chưa có" }] },
    { id: "rar", opts: [{ id: "all", label: "Tất cả" }, ...RARITIES.map(r => ({ id: r, label: RARITY[r].n }))] }
  ],
  sorts: [{ id: "", label: "Mặc định" }, { id: "rarity", label: "Độ hiếm" }, { id: "name", label: "Tên" }],
  body: rows => `<div class="tm-items">${rows.map(it => {
    const i = entityInfo(it.id)!;
    return entityRow(i, { attrs: `data-tm="item:${it.id}" ${i.owned ? `draggable="true" data-drag="${it.id}"` : ""}`, px: 48, meta: "", chips: i.fxChips });
  }).join("") || `<p class="pempty">Không tìm thấy ai.<br>Thử gõ tên khác hoặc bỏ bớt bộ lọc.</p>`}</div>`
});

/** mở màn Đội ngũ (từ Menu hoặc từ nơi khác) */
export function openTeam(tab: TeamTab = "bake", kind?: StaffKind) { team = tab; if (kind) listKind = kind; navigate("/cua-hang/thu-cung"); }
export const staffSheet = (k?: StaffKind) => openTeam("place", k);

/* ============ thẻ thợ bánh ============ */
function staffCard(id: string) {
  const i = entityInfo(id)!;
  return entityRow(i, { attrs: `data-sd="open:${id}"`, cls: i.onDuty ? "on" : "", px: 52, mood: i.onDuty ? "happy" : "open" });
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
/** kéo thả HTML5 chỉ chạy với chuột; màn cảm ứng dùng ô chọn và nút trong chi tiết */
const CAN_DRAG = typeof matchMedia === "function" && matchMedia("(hover:hover) and (pointer:fine)").matches;
let ddOpen: StaffKind | null = null;
export const setDDOpen = (k: StaffKind | null) => { ddOpen = k; };
const slotInfo = (k: StaffKind) => {
  const it = staffAt(k, floor);
  return { it, art: it ? gachaArt(it, 46) : `<span class="tp-empty">+</span>`, name: it ? esc(it.n) : "Chưa đặt", fx: it ? esc(fxOf(it)) : `Chọn ở ô bên dưới${CAN_DRAG ? " hoặc kéo từ danh sách" : ""}` };
};
function slotRow(k: StaffKind) {
  const { it, art, name, fx } = slotInfo(k), own = itemsOf(k).filter(i => hasItem(i.id));
  const isOpen = ddOpen === k, label = (i: { n: string; id: string }) => { const at = floorOfStaff(k, i.id); return `${esc(i.n)}${at >= 0 && at !== floor ? ` <em>tầng ${at + 1}</em>` : ""}`; };
  const opts = [`<button class="dd-o ${it ? "" : "on"}" data-ddv="${k}:" role="option" aria-selected="${!it}"><span class="dd-n">— Trống —</span></button>`,
    ...own.map(i => `<button class="dd-o ${it?.id === i.id ? "on" : ""}" data-ddv="${k}:${i.id}" role="option" aria-selected="${it?.id === i.id}">${gachaArt(i, 26)}<span class="dd-n">${label(i)}</span>${it?.id === i.id ? "<i>✓</i>" : ""}</button>`)].join("");
  return `<div class="tp-row" data-drop="${k}"><div class="tp-art">${art}</div><div class="tp-info"><small>${k === "mgr" ? "Quản lý" : "Linh thú"}</small><b>${name}</b><em>${fx}</em></div>
    <div class="dd"><button class="dd-btn ${isOpen ? "open" : ""}" data-dd="${k}" aria-haspopup="listbox" aria-expanded="${isOpen}" aria-label="${k === "mgr" ? "Chọn quản lý" : "Chọn linh thú"} tầng ${floor + 1}"><span>${it ? esc(it.n) : "— Trống —"}</span><i aria-hidden="true">▾</i></button>
    ${isOpen ? `<div class="dd-list" role="listbox">${opts}</div>` : ""}</div></div>`;
}
function placeTab() {
  floor = Math.max(0, Math.min(floor, floorCount() - 1));
  const n = floorCount(), col = Array.from({ length: n }, (_, i) => n - 1 - i).map(f => `<button class="${f === floor ? "on" : ""}" data-tm="floor:${f}">T${f + 1}</button>`).join("");
  const own = (k: StaffKind) => itemsOf(k).filter(i => hasItem(i.id)).length;
  return `<div class="tp-wrap"><div class="tf-col" role="group" aria-label="Chọn tầng"><small>TẦNG</small>${col}</div>
      <div class="tp-card"><div class="tp-h">Tầng ${floor + 1}</div>${slotRow("mgr")}${slotRow("mascot")}</div></div>
    <p class="hint5">${CAN_DRAG ? "Chọn trong ô trên, hoặc kéo một dòng ở danh sách thả vào ô." : "Chạm ô chọn để đổi quản lý hoặc linh thú."} Chạm một dòng trong danh sách để xem chi tiết và đặt vào tầng.</p>
    <div class="gtabs stf-tabs tm-kind"><button class="${listKind === "mgr" ? "on" : ""}" data-tm="kind:mgr">Quản lý · ${own("mgr")}/${itemsOf("mgr").length}</button><button class="${listKind === "mascot" ? "on" : ""}" data-tm="kind:mascot">Linh thú · ${own("mascot")}/${itemsOf("mascot").length}</button></div>
    ${listHTML("team-items")}`;
}

/** nội dung màn Đội ngũ (shop.ts gọi) */
export function teamHTML(pageHead: (t: string) => string) {
  const nBake = staffIds().length;
  const tabs = `<div class="gtabs stf-tabs team-tabs"><button class="${team === "bake" ? "on" : ""}" data-team="bake">Thợ bánh · ${nBake}</button><button class="${team === "place" ? "on" : ""}" data-team="place">Quản lý và Linh thú</button></div>`;
  return `<div class="scr pets2 team">${pageHead("Đội ngũ")}${tabs}${team === "bake" ? bakeTab() : placeTab()}</div>`;
}

/* ============ hộp thoại chi tiết thợ bánh ============ */
function foodTiles(id: string) {
  const fedToday = petState(id).fedDay === S.daily.day;
  return FOODS.map(f => {
    const n = foodOf(f.id), need = !n && S.coins < f.cost;
    return `<div class="sd-food"><span class="aff">+${f.aff} ♥</span>${foodSVG(f.id, 34)}<b>${f.n}</b><small>còn ${n}</small>
      <button class="pk" data-sd="buy:${f.id}:5" ${S.coins < f.cost * 5 ? "disabled" : ""}>+5 · ${fmtN(f.cost * 5)} xu</button>
      <button class="pk give" data-sd="treat:${id}:${f.id}" ${fedToday || need ? "disabled" : ""}>${fedToday ? "Mai tặng tiếp" : n ? "Tặng" : `Mua và tặng · ${fmtN(f.cost)}`}</button></div>`;
  }).join("");
}
/* bữa ăn mỗi ca: món đã chọn, món bé sẽ ăn thật ở ca tới và hệ quả (chậm hơn / đắt hơn / nghỉ ca) */
function mealHTML(id: string) {
  const meals = mealChoices(id), want = foodDef(mealOf(id)), o = mealOutlook(id), on = onDuty(id);
  const pick = meals.length > 1 ? `<div class="sd-pick"><div>${meals.map(f => { const sl = mealSlow(id, f.id); return `<button class="${f.id === want.id ? "on" : ""}" data-sd="meal:${id}:${f.id}">${foodSVG(f.id, 18)}<span>${f.n}<small>${fmtN(f.cost)} xu${sl > 1 ? ` · chậm +${Math.round((sl - 1) * 100)}%` : ""}</small></span></button>`; }).join("")}</div></div>` : "";
  const a = o.actual ? foodDef(o.actual) : null;
  const msg = o.kind === "none" ? `<p class="sd-warn">Kho hết đồ ăn nên ${on ? "bé sẽ nghỉ ca tới" : "bé sẽ không đi làm được"}. Mua thêm bên dưới.</p>`
    : o.kind === "same" ? `<p class="sd-meal">Ca tới ăn <b>${a!.n}</b>${o.slow > 1 ? `, làm chậm +${Math.round((o.slow - 1) * 100)}% vì thấp hơn bậc` : ", tốc độ bình thường"}.</p>`
    : o.kind === "lower" ? `<p class="sd-warn">Hết ${want.n}, ca tới bé ăn ${a!.n} nên làm chậm +${Math.round((o.slow - 1) * 100)}%.</p>`
    : `<p class="sd-warn">Hết ${want.n} và các món kém hơn, ca tới bé phải ăn ${a!.n} (đắt hơn ${fmtN(o.extra)} xu). Nên mua thêm ${want.n}.</p>`;
  return `<div class="sh2"><b>Bữa ăn mỗi ca (lương)</b><span class="lav">ăn lúc mở ca, trừ vào kho</span></div>${pick}${msg}
    <div class="sd-rec"><div>${foodSVG(want.id, 40)}<span><b>${want.n}</b><small>còn ${foodOf(want.id)} phần trong kho</small></span></div><button class="pk" data-sd="buy:${want.id}:5" ${S.coins < want.cost * 5 ? "disabled" : ""}>Mua 5 · ${fmtN(want.cost * 5)} xu</button></div>`;
}
/* Thân thiết: linh thú tính theo cấp thân thiết (đi làm thêm ca + tặng quà), thú cưng tính theo điểm vuốt ve và quà; cùng một cách hiển thị với thẻ phía trên */
function bondStat(id: string) {
  if (!isMascotStaff(id)) return heartRow(petState(id).aff, 13);
  const lv = bondLevel(id), max = BOND_AT.length - 1, nxt = lv < max ? BOND_AT[lv + 1]! - bondOf(id) : 0;
  return `${heartRow(lv, 13, 1, max)}<small>${lv >= max ? "Tối đa" : `còn ${nxt} điểm lên cấp ${lv + 1}`}</small>`;
}
function staffBody(id: string) {
  const st = staffState(id), on = onDuty(id), mas = isMascotStaff(id), tier = st.lv, eat = foodDef(mealOf(id));
  const fed = petState(id).fedDay === S.daily.day, mb = mascotBonus(id), fee = hireFee(id);
  const ei = entityInfo(id)!;
  const petArt = mas ? undefined : `<button class="sd-pet" data-sd="pet:${id}" aria-label="Vuốt ve ${esc(petName(id))}">${petSVG({ ...PETS[id as PetId], mood: fed ? "love" : "happy", ledge: false }, 118)}</button>`;
  const stat = (k: string, v: string, go = "") => `<div${go ? ` role="button" tabindex="0" data-sd="goto:${go}" class="go"` : ""}><small>${k}</small><b>${v}</b>${go ? `<i class="gt">chạm để tặng quà ↓</i>` : ""}</div>`;
  const act = !st.hired ? `<button class="b3" data-sd="hire:${id}" ${S.coins < fee ? "disabled" : ""}>${mas ? `Thuê · ${fmtN(fee)} xu` : "Nhận vào làm"}</button>` :
    `<button class="b3 ${on ? "w" : ""}" data-sd="duty:${id}">${on ? "Cho nghỉ ca này" : "Cho đi làm"}</button>${trainCost(id) ? `<button class="b3 up2" data-sd="train:${id}" ${S.coins < trainCost(id) ? "disabled" : ""}>Lên bậc ${roman(tier + 1)} · ${fmtN(trainCost(id))} xu<small>${bake(tier)} → ${bake(tier + 1)}</small></button>` : `<div class="sd-max">Đã đạt bậc tối đa</div>`}`;
  return `<div class="sd">${entityHero(ei, { px: 104, art: petArt, extra: mas ? `<span class="eh-sub">Linh thú · thuê một lần, đứng tầng được</span>` : `<span class="eh-sub">${BREED[id as PetId]} · chạm vào bé để vuốt ve</span>` })}
    <div class="sd-stats">${stat("Tốc độ", bake(tier))}${stat("Bữa ăn", `${foodSVG(eat.id, 16)} ${eat.n}`)}${stat("Thân thiết", bondStat(id), st.hired ? "gift" : "")}${mas ? stat("Buff", `+${Math.round(mb.price * 100)}% giá · +${Math.round(mb.tip * 100)}% tip`) : stat("Bậc", `${roman(tier)} / ${roman(MAX_STAFF_LV)}`)}</div>
    <div class="sd-acts">${act}</div>${st.hired ? skillsHTML(id) : ""}
    ${mealHTML(id)}
    <div class="sh2" id="sdGift"><b>Quà thân thiết</b><span class="lav">mỗi ngày tặng 1 món · lấy từ cùng kho</span></div><div class="sd-food-grid">${foodTiles(id)}</div>`;
}
/* kỹ năng gói quà / giao hàng: dạy được khi chủ tiệm đạt SSS, bé đi làm vài ca là tự làm được */
function skillsHTML(id: string) {
  const row = (k: typeof SKILLS[number]) => {
    const p = progressOf(id, k);
    const st = knows(id, k) ? `<b class="ok">Đã thạo · tự làm khi khách xin</b>`
      : p !== undefined ? `<b>Đang học ${p}/${SKILL_SHIFTS} ca (cần đi làm)</b>`
      : canTeach(k) ? `<button class="b3" data-sd="skill:${id}:${k}" ${S.coins < SKILL_FEE ? "disabled" : ""}>Dạy · ${fmtN(SKILL_FEE)} xu</button>`
      : `<small>Cần đạt hạng SSS để dạy</small>`;
    return `<div class="sd-skill"><span>${SKILL_NAME[k]}</span>${st}</div>`;
  };
  return `<div class="sh2"><b>Kỹ năng đặc biệt</b><span class="lav">bé làm hộ được 80% thưởng</span></div>${SKILLS.map(row).join("")}`;
}
export function openStaffDialog(id: string) {
  dlg = id;
  modal(`<h2>Thợ bánh</h2><p class="sub">${isMascotStaff(id) ? "Linh thú đồng hành" : "Thú cưng của tiệm"}</p><div id="sdBody">${staffBody(id)}</div><div class="mbtns"><button class="b3 w" data-close>Đóng</button></div>`, () => { dlg = ""; });
}
const refreshStaff = () => { const b = document.getElementById("sdBody"); if (b && dlg) b.innerHTML = staffBody(dlg); render(true); };

/* ============ hộp thoại chi tiết quản lý / linh thú ============ */
function itemBody(id: string) {
  const it = gachaItem(id)!, R = RARITY[it.rarity], has = hasItem(id), at = floorOfStaff(it.mascot ? "mascot" : "mgr", id), n = floorCount();
  const kind: StaffKind = it.mascot ? "mascot" : "mgr", hired = !!it.mascot && staffState(id).hired;
  const gender = it.mgr ? (it.mgr.gender === "girl" ? "♀ Nữ" : "♂ Nam") : it.char ? (it.char.gender === "girl" ? "♀ Nữ" : "♂ Nam") : "";
  const tags = [gender, ...(it.mgr?.tags ?? [])].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join("");
  const place = has ? `<div class="itm-sec"><h4>Đặt vào tầng</h4><div class="itm-floors">${Array.from({ length: n }, (_, f) => `<button class="${f === at ? "on" : ""}" data-tm="put:${id}:${f}">Tầng ${f + 1}</button>`).join("")}${at >= 0 ? `<button class="off" data-tm="clear:${id}">Cất</button>` : ""}</div></div>` : "";
  const hire = it.mascot && has ? (hired ? `<div class="itm-ok"><b>✓ Đang làm thợ bánh</b><span>Bậc ${roman(staffState(id).lv)} · xem ở tab Thợ bánh</span></div>` : `<button class="b3 itm-hire" data-tm="hire:${id}" ${S.coins < hireFee(id) ? "disabled" : ""}>Thuê làm thợ bánh · ${fmtN(hireFee(id))} xu<small>không bắt buộc, bé vẫn đứng tầng được</small></button>`) : "";
  return `<div class="itm" style="--rc:${R.c}">${entityHero(entityInfo(id)!, { px: 100, extra: tags ? `<span class="eh-tags">${tags}</span>` : "" })}
    <div class="itm-buff"><i aria-hidden="true">✦</i><div><small>Chỉ số khi đứng tầng</small><b>${esc(fxOf(it))}</b></div></div>
    <div class="itm-src"><i aria-hidden="true">🎁</i><div><small>Nguồn</small><b>Triệu hồi Gacha</b><span>Nhóm ${R.n} · ${has ? `đã có x${S.gacha.owned[id] ?? 1}` : "chưa có"}</span></div>
      <button data-tm="gacha:${id}">${has ? "Xem" : "Triệu hồi"}</button></div>
    ${place}${hire}${kind === "mgr" && it.char ? `<p class="phint">Khách quen Hiếm trở lên làm được quản lý, cộng chỉ số nhẹ hơn quản lý thật.</p>` : ""}</div>`;
}
export function openItemDialog(id: string) {
  const it = gachaItem(id); if (!it) return;
  modal(`<h2>${it.mascot ? "Linh thú" : asManager(it) ? "Quản lý" : KIND_NAME[it.kind]}</h2><div id="tdBody">${itemBody(id)}</div><div class="mbtns"><button class="b3 w" data-close>Đóng</button></div>`);
  dlg = "";
  (document.getElementById("modal") as HTMLElement | null)!.dataset.item = id;
}
const refreshItem = (id: string) => { const b = document.getElementById("tdBody"); if (b) b.innerHTML = itemBody(id); render(true); };

/** cuộn khung của hộp thoại tới phần tử; tự tween bằng scrollTop vì scrollIntoView smooth không chạy ổn trong khung cuộn trên vài trình duyệt (iOS) */
function scrollToIn(id: string) {
  const el = document.getElementById(id), box = el?.closest<HTMLElement>(".mscroll"); if (!el || !box) return;
  const from = box.scrollTop, to = Math.max(0, from + el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8), t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / 350);
    box.scrollTop = from + (to - from) * (1 - (1 - k) ** 3);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ============ xử lý nút ============ */
/** data-sd: thao tác trong hộp thoại thợ bánh; el là phần tử vừa chạm (để bay tim) */
export function staffDialogAct(act: string, el: HTMLElement) {
  const [a, x, y] = act.split(":");
  if (a === "goto") { sfx("click"); return scrollToIn("sd" + x![0]!.toUpperCase() + x!.slice(1)); }
  if (a === "open") { sfx("click"); return openStaffDialog(x!); }
  if (a === "buy") { const f = foodDef(x as never); if (buyFood(f.id, +y!)) { if (dlg && S.staff[dlg]) S.staff[dlg].prio = Date.now(); save(); sfx("tap"); toast(`+${y} ${f.n} · ${fmtN(f.cost * +y!)} xu`); } else toast("Không đủ xu"); return refreshStaff(); }
  if (a === "treat") { const id = x!, f = foodDef(y as never); if (treat(id, f.id)) { const r = el.getBoundingClientRect(); floatHearts(r.left + r.width / 2, r.top, 6); sfx("boop"); toast(`${petName(id)} ăn ${f.n} ngon lành! +${f.aff} ♥`); } else toast("Không đủ xu để mua đồ ăn"); return refreshStaff(); }
  if (a === "meal") { setMeal(x!, y as never); sfx("click"); return refreshStaff(); }
  if (a === "duty") { toggleDuty(x!); sfx("click"); return refreshStaff(); }
  if (a === "skill") return confirmSpend(SKILL_FEE, `Dạy ${SKILL_NAME[y as "gift" | "ship"].toLowerCase()} cho ${petName(x!)}?`, () => { if (teach(x!, y as "gift" | "ship")) { sfx("level"); toast(`${petName(x!)} bắt đầu học, đi làm ${SKILL_SHIFTS} ca là thạo`); } refreshStaff(); });
  if (a === "train") return confirmSpend(trainCost(x!), `Lên bậc cho ${petName(x!)}?`, () => { if (train(x!)) { sfx("level"); toast(`${petName(x!)} lên bậc ${roman(staffState(x!).lv)}!`); } refreshStaff(); });
  if (a === "hire") return confirmSpend(hireFee(x!), `Thuê ${petName(x!)} làm thợ bánh?`, () => { if (hire(x!)) { sfx("level"); toast(`${petName(x!)} đã vào làm!`); } else if (hireFee(x!)) toast(`Cần ${fmtN(hireFee(x!))} xu để thuê ${petName(x!)}`); refreshStaff(); });
  if (a === "pet") {
    const st = petState(x!), r = el.getBoundingClientRect();
    if (st.petDay !== S.daily.day) { st.petDay = S.daily.day; st.pets = 0; }
    if (st.pets < 10) { st.pets++; st.aff++; save(); }
    floatHearts(r.left + r.width / 2, r.top + r.height / 3, 3); sfx("boop"); bump(el, "squish");
    const stats = document.querySelector<HTMLElement>(".sd-stats div:nth-child(3) b"); if (stats) stats.innerHTML = bondStat(x!);
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
  if (a === "hire") return confirmSpend(hireFee(x!), `Thuê ${petName(x!)} làm thợ bánh?`, () => { if (hire(x!)) { sfx("level"); toast(`${petName(x!)} đã vào làm thợ bánh!`); } else toast(`Cần ${fmtN(hireFee(x!))} xu để thuê`); refreshItem(x!); });
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
  /* ô chọn tự vẽ (không dùng <select> mặc định): bấm để mở danh sách, chọn một dòng, bấm ra ngoài để đóng */
  document.addEventListener("click", e => {
    const t = e.target as HTMLElement, v = t.closest<HTMLElement>("[data-ddv]"), b = t.closest<HTMLElement>("[data-dd]");
    if (v) { const [k, id] = v.dataset.ddv!.split(":"); ddOpen = null; return assign(k as StaffKind, id); }
    if (b) { const k = b.dataset.dd as StaffKind; ddOpen = ddOpen === k ? null : k; sfx("click"); return render(); }
    if (ddOpen) { ddOpen = null; render(); }
  });
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
