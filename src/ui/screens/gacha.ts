/* Màn Gacha: triệu hồi (1 hoặc 10 lần), vé, bảo hiểm, bộ sưu tập. Lợi ích của từng loại đồ nằm ở engine/gacha.ts */
import { sfx } from "../../audio/sound";
import { DUST_PER_TICKET, GACHA_ITEMS, itemsOf, KIND_NAME, MASTERY_MAX, MASTERY_STEP, PACK10_COST, PITY_RARE, PITY_ULTRA, RARITIES, RARITY, TICKET_COST, asManager, gachaItem, roleOf, type GachaItem, type GachaKind, type Rarity } from "../../content/gacha";
import { BOND_AT, BOND_STEP, packCost, bondLevel, bondOf, buyTickets, claimFreeTicket, countOf, exchangeDust, freeTicketReady, hasItem, masteryOf, ownedCount, pull, floorCount, floorOfStaff, placeStaff, clearStaff, untilRare, untilUltra } from "../../engine/gacha";
import { S } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { render } from "../app";
import { navigate } from "../router";
import { coinPill, confirmSpend, esc, modal, toast } from "../dom";
import { rarityIcon, rarityText } from "../badges";
import { gachaArt, playReveal, LOOK } from "../gachafx";
import { hydratePortraits } from "../portrait";
import { mountTurntable } from "../../scene/glbview";

let unmount = () => { }, fromPool = false;
let tab: "summon" | "bag" = "summon", filter: GachaKind | "all" = "all", busy = false, poolR: Rarity = "common";
const BACK = `<button class="rbtn back" data-go="/" aria-label="Về tiệm"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" stroke="#C07A8C" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;

function summonHTML() {
  const g = S.gacha, t = g.tickets, rare = untilRare(), ultra = untilUltra();
  const bar = (label: string, left: number, max: number, c: string) => `<div class="gp"><span>${label}</span><div class="gpb"><i style="width:${Math.round((max - left) / max * 100)}%;background:${c}"></i></div><b>còn ${left} lần</b></div>`;
  return `<div class="gsum">
    <div class="gtix"><div><b>🎟 ${fmtN(t)} vé</b><small>✦ ${fmtN(g.dust)} Bụi sao</small></div>
      <button class="mini-g" data-gact="dust" ${g.dust < DUST_PER_TICKET ? "disabled" : ""}>Đổi ${DUST_PER_TICKET} Bụi → 1 vé</button></div>
    <div class="grates">${RARITIES.map(r => `<span style="--rc:${RARITY[r].c};--rc2:${RARITY[r].c2}">${rarityIcon(r, 16)}${RARITY[r].n} ${RARITY[r].w}%</span>`).join("")}</div>
    <button class="gpool" data-gact="pool:common">🔍 Xem vật phẩm có thể trúng</button>
    <div class="gpity">${bar(`Hiếm chắc chắn`, rare, PITY_RARE, RARITY.rare.c)}${bar(`Cực hiếm chắc chắn`, ultra, PITY_ULTRA, RARITY.ultra.c)}</div>
    <div class="gpull"><button class="b3 gbtn" data-gact="pull1" ${t < 1 ? "disabled" : ""}><span>Quay 1 lần</span><small>1 vé</small></button>
      <button class="b3 gbtn big" data-gact="pull10" ${t < 10 ? "disabled" : ""}><span>Quay 10 lần</span><small>10 vé</small></button></div>
    <div class="gshop"><button data-gact="free" ${freeTicketReady() ? "" : "disabled"}><b>🎁 Vé miễn phí</b><small>${freeTicketReady() ? "Nhận 1 vé hôm nay" : "Đã nhận, mai quay lại"}</small></button>
      <button data-gact="buy1" ${S.coins < TICKET_COST ? "disabled" : ""}><b>Mua 1 vé</b><small>${fmtN(TICKET_COST)} xu</small></button>
      <button data-gact="buy10" ${S.coins < PACK10_COST ? "disabled" : ""}><b>Mua 10 vé</b><small>${fmtN(PACK10_COST)} xu · giảm 10%</small></button></div>
    <div class="gwhat"><h4>Quay được gì, dùng làm gì</h4>
      <div><b>🍰 Công thức</b><span>Món mới giá cao; trùng thì thành thạo, tối đa +${Math.round(MASTERY_STEP * MASTERY_MAX * 100)}% giá</span></div>
      <div><b>🛋 Trang trí</b><span>Tường, sàn, quầy riêng cộng tip, giá, độ kiên nhẫn</span></div>
      <div><b>🧑 Khách quen</b><span>Nhân vật 3D ghé tiệm, tip nhiều và kiên nhẫn; Cực hiếm là VIP</span></div>
      <div><b>🐾 Linh vật</b><span>Chọn một bé đồng hành để hưởng lợi ích</span></div></div>
    <p class="phint">Kiếm vé: vé miễn phí mỗi ngày, đạt hết mục tiêu ca, nhận quà mục tiêu ngày. Đồ trùng đổi Bụi sao nên quay nào cũng có ích.</p></div>`;
}
function bagHTML() {
  const kinds: (GachaKind | "all")[] = ["all", "recipe", "decor", "char", "mascot", "manager"], items = GACHA_ITEMS.filter(i => filter === "all" || i.kind === filter);
  return `<div class="gbag"><div class="gfil">${kinds.map(k => `<button class="${filter === k ? "on" : ""}" data-gact="filter:${k}">${k === "all" ? `Tất cả ${ownedCount()}/${GACHA_ITEMS.length}` : KIND_NAME[k]}</button>`).join("")}</div>
    <div class="gitems">${items.map(it => {
      const own = hasItem(it.id), R = RARITY[it.rarity], fl = asManager(it) ? floorOfStaff("mgr", it.id) : it.mascot ? floorOfStaff("mascot", it.id) : -1;
      return `<button class="gi r-${it.rarity} ${own ? "own" : "lock"}" style="--rc:${R.c};--rc2:${R.c2}" data-gact="card:${it.id}">
        <div class="gimg ${own ? "" : "dim"}">${gachaArt(it, 56)}</div><b>${esc(it.n)}</b>
        <small>${roleTag(it)}${own ? (it.recipe ? `thành thạo ${masteryOf(it.id)}/${MASTERY_MAX}` : fl >= 0 ? `${it.char ? "Quản lý " : ""}tầng ${fl + 1}` : `x${countOf(it.id)}`) : "Chưa có"}</small><i class="gdot">${R.n}</i></button>`;
    }).join("")}</div></div>`;
}
export function gachaHTML() {
  return `<div class="scr gacha6"><div class="phead">${BACK}<div class="pt"><small>Gacha Summon</small><h2>Triệu hồi</h2></div><span class="pill tk" aria-label="${S.gacha.tickets} vé">🎟 ${fmtN(S.gacha.tickets)}</span>${coinPill()}</div>
    <div class="ghero" role="img" aria-label="Gacha Summon"></div>
    <div class="gtabs"><button class="${tab === "summon" ? "on" : ""}" data-gact="tab:summon">Triệu hồi</button><button class="${tab === "bag" ? "on" : ""}" data-gact="tab:bag">Bộ sưu tập · ${ownedCount()}/${GACHA_ITEMS.length}</button></div>
    ${tab === "summon" ? summonHTML() : bagHTML()}</div>`;
}

/** thanh thân thiết của linh vật: cấp hiện tại, tiến độ tới cấp sau và phần chỉ số tăng thêm */
function bondHTML(id: string) {
  const lv = bondLevel(id), n = bondOf(id), next = BOND_AT[lv + 1], from = BOND_AT[lv]!;
  const pct = next === undefined ? 100 : Math.round((n - from) / (next - from) * 100);
  return `<div class="gbond"><div><b>💞 Thân thiết cấp ${lv}/${BOND_AT.length - 1}</b><small>${lv ? `chỉ số +${Math.round(lv * BOND_STEP * 100)}%` : "hoàn thành ca cùng bé để tăng"}</small></div>
    <div class="gbar"><i style="width:${pct}%"></i></div><small>${next === undefined ? "Đã đạt cấp tối đa" : `${n}/${next} ca để lên cấp ${lv + 1}`}</small></div>`;
}
/** nút đặt quản lý / linh vật vào từng tầng (mỗi tầng một người mỗi loại); đang đứng thì thêm nút Cất */
function staffBtns(it: GachaItem) {
  const k = asManager(it) ? "mgr" : it.mascot ? "mascot" : null; if (!k) return "";
  const at = floorOfStaff(k, it.id), n = floorCount();
  return `<div class="gfl"><small>${k === "mgr" ? (it.char ? "Cho làm quản lý" : "Quản lý") : "Linh vật"} tầng nào?</small><div>${Array.from({ length: n }, (_, f) => `<button class="${f === at ? "on" : ""}" data-gact="place:${k}:${it.id}:${f}">Tầng ${f + 1}</button>`).join("")}${at >= 0 ? `<button class="off" data-gact="clear:${k}:${it.id}:${at}">Cất</button>` : ""}</div>${n === 1 ? `<small>Xây thêm lầu để có thêm chỗ đứng.</small>` : ""}</div>`;
}
/** nhãn vai nhỏ trên thẻ: khách quen hay quản lý */
const roleTag = (it: GachaItem) => { const r = roleOf(it); return r ? `<u class="role ${r.c}">${r.n}</u> ` : ""; };
/** hàng nhãn ở chi tiết: vai, giới tính, nghề (quản lý), và ghi chú khách quen Hiếm trở lên làm được quản lý */
function roleTags(it: GachaItem) {
  const r = roleOf(it); if (!r) return "";
  const gender = (it.mgr?.gender ?? it.char!.gender) === "girl" ? "♀ Nữ" : "♂ Nam";
  return `<div class="gtags"><span class="role ${r.c}">${r.n}</span><span>${gender}</span>${(it.mgr?.tags ?? []).map(t => `<span>${esc(t)}</span>`).join("")}${it.char && asManager(it) ? `<span class="role mgr">Làm được quản lý</span>` : ""}</div>`;
}
function detail(id: string) {
  const it = gachaItem(id); if (!it) return;
  unmount();
  const own = hasItem(id), R = RARITY[it.rarity], model = it.mascot?.model ?? it.mgr?.model, live = model && !it.mascot?.art, both = !!(it.full && model);       // có tranh full thì hiện tranh, không thì model 3D xoay
  modal(`<div class="gdet r-${it.rarity}" style="--rc:${R.c};--rc2:${R.c2}"><span class="gtag rlock">${rarityText(it.rarity, 112)}</span>${it.full ? `<img class="gfull" src="/gacha/full-${it.full}.webp" alt="" draggable="false">` : `<div class="gimg big ${own ? "" : "dim"}" ${live ? `style="position:relative;width:200px;height:200px;margin:auto"` : ""}>${live ? gachaArt(it, 200, true) : gachaArt(it, 130, true)}</div>`}</div>
    <h2>${esc(it.n)}</h2><p class="sub">${KIND_NAME[it.kind]} · ${R.n} · ${own ? `đã có x${countOf(id)}` : "chưa có"}</p>
    ${own && it.mascot ? bondHTML(it.id) : ""}${roleTags(it)}<p class="gdesc">${esc(it.desc)}${it.recipe ? ` Trùng thêm thì thành thạo (tối đa +${Math.round(MASTERY_STEP * MASTERY_MAX * 100)}% giá).` : ""}${it.decor ? " Dùng ở Cửa hàng, mục Trang trí." : ""}${own && it.recipe ? ` Thành thạo ${masteryOf(id)}/${MASTERY_MAX}.` : ""}</p>
    <div class="mbtns">${own ? staffBtns(it) : ""}${fromPool ? `<button class="b3" data-gact="pool:${it.rarity}">← Danh sách</button>` : ""}${it.char && !it.full ? `<button class="b3" data-gact="view3d:${id}">🔄 Xem model 3D</button>` : ""}<button class="b3" data-gact="try:${id}">▶ Xem hiệu ứng triệu hồi</button><button class="b3 w" data-close>Đóng</button></div>`);
  hydratePortraits();
  let host = live ? document.querySelector<HTMLElement>(".gdet .gimg.big") : null;
  if (both) { const row = document.createElement("div"); row.style.cssText = "flex:0 0 100%;width:100%;display:flex;justify-content:center;margin-top:8px"; const d = document.createElement("div"); d.style.cssText = "position:relative;width:180px;height:180px"; row.appendChild(d); document.querySelector(".gdet")?.appendChild(row); host = d; }
  if (host && model) { host.querySelector<HTMLElement>(".gart")?.style.setProperty("opacity", ".0"); unmount = mountTurntable(host, model, live ? 200 : 180); }
  if (it.char && it.full) {      // nhân vật có tranh toàn thân (như Lynae): dưới tranh là model 3D đang đứng, để thấy cả hai
    const row = document.createElement("div"); row.style.cssText = "flex:0 0 100%;width:100%;display:flex;flex-direction:column;align-items:center;margin-top:8px";
    const cap = document.createElement("small"); cap.textContent = "Model 3D trong tiệm"; cap.style.cssText = "font:800 12px var(--body);color:var(--soft2)";
    const d = document.createElement("div"); d.style.cssText = "position:relative;width:240px;height:240px"; row.append(cap, d); document.querySelector(".gdet")?.appendChild(row);
    void import("../../scene/portrait3d").then(m => m.liveFullBody(d, it.char!.sprite, LOOK, 240));
  }
}

/** xem trước toàn bộ vật phẩm theo độ hiếm: tên, lợi ích và tỷ lệ trúng từng món */
function poolSheet() {
  unmount(); fromPool = true;
  const R = RARITY[poolR], list = itemsOf(poolR), each = R.w / list.length;
  modal(`<h2>Có thể trúng gì?</h2><p class="sub">Tỷ lệ ${R.w}% cho nhóm ${R.n} · mỗi món khoảng ${each.toFixed(1)}%</p>
    <div class="seg rseg">${RARITIES.map(r => `<button class="${r === poolR ? "on" : ""}" data-gact="pool:${r}">${RARITY[r].n}</button>`).join("")}</div>
    <div class="gpl">${list.map(it => `<div class="gpr r-${poolR}" style="--rc:${R.c};--rc2:${R.c2}" data-gact="card:${it.id}"><div class="gimg">${gachaArt(it, 50)}</div>
      <div class="gpi"><b>${esc(it.n)}</b><small>${KIND_NAME[it.kind]} · ${esc(it.desc)}</small></div><em>${hasItem(it.id) ? `x${countOf(it.id)}` : "mới"}</em></div>`).join("")}</div>
    <p class="phint">Chạm vào một món để xem trước (tranh/3D, chỉ số). Bảo hiểm: ${PITY_RARE} lần chắc chắn có Hiếm trở lên, ${PITY_ULTRA} lần chắc chắn có Cực hiếm.</p>
    <div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
  hydratePortraits();
}

/** mở màn Gacha ở bộ sưu tập, đúng nhóm của món rồi hiện chi tiết món đó (dùng từ Quản lý, Công thức khi món chưa có) */
export function openInGacha(id: string) {
  const it = gachaItem(id); if (!it) return;
  tab = "bag"; filter = it.kind; fromPool = false;
  navigate("/gacha");
  setTimeout(() => detail(id), 60);
}

/** xử lý mọi nút trên màn Gacha (data-gact) */
export async function gachaAct(act: string) {
  const [a, v] = act.split(":");
  if (a === "tab") { tab = v as typeof tab; sfx("click"); return render(); }
  if (a === "filter") { filter = v as typeof filter; sfx("click"); return render(); }
  if (a === "pool") { poolR = (v as Rarity) || poolR; sfx("click"); return poolSheet(); }
  if (a === "try") { const it = gachaItem(v!); if (!it) return; unmount(); document.querySelector<HTMLElement>("[data-close]")?.click(); sfx("click"); return void playReveal([{ item: it, isNew: !hasItem(it.id), dust: 0, count: 1 }], () => detail(it.id), true); }
  if (a === "view3d") {
    const it = gachaItem(v!); const host = document.querySelector<HTMLElement>(".gdet .gimg.big"); if (!it?.char || !host) return;
    sfx("click"); host.style.cssText = "width:100%;height:auto;margin:auto"; host.classList.remove("dim");
    void import("../../scene/portrait3d").then(m => m.liveFullBody(host, it.char!.sprite, LOOK, Math.min(300, Math.round(innerWidth * .7))));
    return;
  }
  if (a === "card") { sfx("click"); fromPool = !!document.querySelector(".gpl .gpr[data-gact=\"card:" + v + "\"]"); return detail(v!); }
  if (a === "place") { const [, k, id, f] = act.split(":"); if (placeStaff(k as "mgr" | "mascot", id!, +f!)) { sfx("level"); toast(`Đã đặt ở tầng ${+f! + 1}`); } render(); return detail(id!); }
  if (a === "clear") { const [, k, id, f] = act.split(":"); clearStaff(k as "mgr" | "mascot", +f!); sfx("click"); toast("Đã cất"); render(); return detail(id!); }
  if (a === "free") { if (claimFreeTicket()) { sfx("coin"); toast("+1 vé triệu hồi"); } return render(); }
  if (a === "buy1" || a === "buy10") { const n = a === "buy1" ? 1 : 10; return confirmSpend(packCost(n), `Mua ${n} vé triệu hồi?`, () => { if (buyTickets(n)) { sfx("coin"); toast(`+${n} vé`); } else toast("Không đủ xu"); render(); }); }
  if (a === "dust") { if (exchangeDust()) { sfx("coin"); toast("+1 vé"); } return render(); }
  if (a === "pull1" || a === "pull10") {
    if (busy) return; const n = a === "pull1" ? 1 : 10, res = pull(n);
    if (!res) return toast("Chưa đủ vé");
    busy = true; render();                                             // số vé giảm ngay phía sau hiệu ứng
    playReveal(res, () => { busy = false; render(); });
  }
}
