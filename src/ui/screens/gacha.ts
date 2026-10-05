/* Màn Gacha: triệu hồi (1 hoặc 10 lần), vé, bảo hiểm, bộ sưu tập. Lợi ích của từng loại đồ nằm ở engine/gacha.ts */
import { sfx } from "../../audio/sound";
import { DUST_PER_TICKET, GACHA_ITEMS, itemsOf, KIND_NAME, MASTERY_MAX, MASTERY_STEP, PACK10_COST, PITY_RARE, PITY_ULTRA, RARITIES, RARITY, TICKET_COST, gachaItem, type GachaKind, type Rarity } from "../../content/gacha";
import { buyTickets, claimFreeTicket, countOf, exchangeDust, freeTicketReady, hasItem, masteryOf, ownedCount, pull, setMascot, untilRare, untilUltra } from "../../engine/gacha";
import { S } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { render } from "../app";
import { coinPill, esc, modal, toast } from "../dom";
import { gachaArt, playReveal } from "../gachafx";
import { hydratePortraits } from "../portrait";

let tab: "summon" | "bag" = "summon", filter: GachaKind | "all" = "all", busy = false, poolR: Rarity = "common";
const BACK = `<button class="rbtn back" data-go="/" aria-label="Về tiệm"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" stroke="#C07A8C" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;

function summonHTML() {
  const g = S.gacha, t = g.tickets, rare = untilRare(), ultra = untilUltra();
  const bar = (label: string, left: number, max: number, c: string) => `<div class="gp"><span>${label}</span><div class="gpb"><i style="width:${Math.round((max - left) / max * 100)}%;background:${c}"></i></div><b>còn ${left} lần</b></div>`;
  return `<div class="gsum">
    <div class="gtix"><div><b>🎟 ${fmtN(t)} vé</b><small>✦ ${fmtN(g.dust)} Bụi sao</small></div>
      <button class="mini-g" data-gact="dust" ${g.dust < DUST_PER_TICKET ? "disabled" : ""}>Đổi ${DUST_PER_TICKET} Bụi → 1 vé</button></div>
    <div class="grates">${RARITIES.map(r => `<span style="--rc:${RARITY[r].c};--rc2:${RARITY[r].c2}">${RARITY[r].n} ${RARITY[r].w}%</span>`).join("")}</div>
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
  const kinds: (GachaKind | "all")[] = ["all", "recipe", "decor", "char", "mascot"], items = GACHA_ITEMS.filter(i => filter === "all" || i.kind === filter);
  return `<div class="gbag"><div class="gfil">${kinds.map(k => `<button class="${filter === k ? "on" : ""}" data-gact="filter:${k}">${k === "all" ? `Tất cả ${ownedCount()}/${GACHA_ITEMS.length}` : KIND_NAME[k]}</button>`).join("")}</div>
    <div class="gitems">${items.map(it => {
      const own = hasItem(it.id), R = RARITY[it.rarity], eq = S.gacha.mascot === it.id;
      return `<button class="gi r-${it.rarity} ${own ? "own" : "lock"}" style="--rc:${R.c};--rc2:${R.c2}" data-gact="card:${it.id}">
        <div class="gimg ${own ? "" : "dim"}">${gachaArt(it, 56)}</div><b>${esc(it.n)}</b>
        <small>${own ? (it.recipe ? `thành thạo ${masteryOf(it.id)}/${MASTERY_MAX}` : eq ? "Đang đồng hành" : `x${countOf(it.id)}`) : "Chưa có"}</small><i class="gdot">${R.n}</i></button>`;
    }).join("")}</div></div>`;
}
export function gachaHTML() {
  return `<div class="scr gacha6"><div class="phead">${BACK}<div class="pt"><small>Gacha Summon</small><h2>Triệu hồi</h2></div><span class="pill tk" aria-label="${S.gacha.tickets} vé">🎟 ${fmtN(S.gacha.tickets)}</span>${coinPill()}</div>
    <div class="ghero" role="img" aria-label="Gacha Summon"></div>
    <div class="gtabs"><button class="${tab === "summon" ? "on" : ""}" data-gact="tab:summon">Triệu hồi</button><button class="${tab === "bag" ? "on" : ""}" data-gact="tab:bag">Bộ sưu tập · ${ownedCount()}/${GACHA_ITEMS.length}</button></div>
    ${tab === "summon" ? summonHTML() : bagHTML()}</div>`;
}

function detail(id: string) {
  const it = gachaItem(id); if (!it) return;
  const own = hasItem(id), R = RARITY[it.rarity];
  modal(`<div class="gdet r-${it.rarity}" style="--rc:${R.c};--rc2:${R.c2}"><span class="gtag">${R.n}</span><div class="gimg big ${own ? "" : "dim"}">${gachaArt(it, 130, true)}</div></div>
    <h2>${esc(it.n)}</h2><p class="sub">${KIND_NAME[it.kind]} · ${R.n} · ${own ? `đã có x${countOf(id)}` : "chưa có"}</p>
    <p class="gdesc">${esc(it.desc)}${it.recipe ? ` Trùng thêm thì thành thạo (tối đa +${Math.round(MASTERY_STEP * MASTERY_MAX * 100)}% giá).` : ""}${it.decor ? " Dùng ở Cửa hàng, mục Trang trí." : ""}${own && it.recipe ? ` Thành thạo ${masteryOf(id)}/${MASTERY_MAX}.` : ""}</p>
    <div class="mbtns">${own && it.mascot ? (S.gacha.mascot === id ? `<button class="b3" disabled>Đang đồng hành</button>` : `<button class="b3" data-gact="mascot:${id}">Cho đồng hành</button>`) : ""}<button class="b3 w" data-close>Đóng</button></div>`);
  hydratePortraits();
}

/** xem trước toàn bộ vật phẩm theo độ hiếm: tên, lợi ích và tỷ lệ trúng từng món */
function poolSheet() {
  const R = RARITY[poolR], list = itemsOf(poolR), each = R.w / list.length;
  modal(`<h2>Có thể trúng gì?</h2><p class="sub">Tỷ lệ ${R.w}% cho nhóm ${R.n} · mỗi món khoảng ${each.toFixed(1)}%</p>
    <div class="seg rseg">${RARITIES.map(r => `<button class="${r === poolR ? "on" : ""}" data-gact="pool:${r}">${RARITY[r].n}</button>`).join("")}</div>
    <div class="gpl">${list.map(it => `<div class="gpr r-${poolR}" style="--rc:${R.c};--rc2:${R.c2}" data-gact="card:${it.id}"><div class="gimg">${gachaArt(it, 50)}</div>
      <div class="gpi"><b>${esc(it.n)}</b><small>${KIND_NAME[it.kind]} · ${esc(it.desc)}</small></div><em>${hasItem(it.id) ? `x${countOf(it.id)}` : "mới"}</em></div>`).join("")}</div>
    <p class="phint">Bảo hiểm: ${PITY_RARE} lần chắc chắn có Hiếm trở lên, ${PITY_ULTRA} lần chắc chắn có Cực hiếm.</p>
    <div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
  hydratePortraits();
}

/** xử lý mọi nút trên màn Gacha (data-gact) */
export async function gachaAct(act: string) {
  const [a, v] = act.split(":");
  if (a === "tab") { tab = v as typeof tab; sfx("click"); return render(); }
  if (a === "filter") { filter = v as typeof filter; sfx("click"); return render(); }
  if (a === "pool") { poolR = (v as Rarity) || poolR; sfx("click"); return poolSheet(); }
  if (a === "card") { sfx("click"); return detail(v!); }
  if (a === "mascot") { if (setMascot(v!)) { sfx("level"); toast("Đã cho đồng hành"); } render(); return detail(v!); }
  if (a === "free") { if (claimFreeTicket()) { sfx("coin"); toast("+1 vé triệu hồi"); } return render(); }
  if (a === "buy1" || a === "buy10") { if (buyTickets(a === "buy1" ? 1 : 10)) { sfx("coin"); toast(`+${a === "buy1" ? 1 : 10} vé`); } else toast("Không đủ xu"); return render(); }
  if (a === "dust") { if (exchangeDust()) { sfx("coin"); toast("+1 vé"); } return render(); }
  if (a === "pull1" || a === "pull10") {
    if (busy) return; const n = a === "pull1" ? 1 : 10, res = pull(n);
    if (!res) return toast("Chưa đủ vé");
    busy = true; render();                                             // số vé giảm ngay phía sau hiệu ứng
    playReveal(res, () => { busy = false; render(); });
  }
}
