/* Hộp thoại "Nâng cấp tiệm": mua/nâng nhiều bàn một lần, xem trước kết quả, lộ trình lên bậc danh tiếng kế.
   forced = khách đông hơn số bàn: không đóng được, phải nâng cấp (trừ khi không đủ xu cho cách nào) */
import { sfx } from "../audio/sound";
import { SHOP } from "../content/game";
import { FAME_GAIN, buyTables, buyUps, buyVenue, canAffordUpgrade, capacity, demand, fameParts, maxTables, maxUps, needUpgrade, planToNext, quoteTables, quoteUps, recommendUpgrade, runPlan, seatsNow, spots, tableLvs, tablesAt, upgradeOptions } from "../engine/economy";
import { S } from "../engine/state";
import { fmtN } from "../engine/util";
import { closeModal, confirmSpend, modal, toast } from "./dom";
import { render } from "./app";

const VENUE_OPT = {
  floor: { ic: "🏢", n: "Xây thêm lầu", d: () => `Thêm ${SHOP.perFloor + SHOP.perWide * S.venue.wide} chỗ đặt bàn · lầu ${S.venue.floors + 1}`, pts: FAME_GAIN.floor },
  wide: { ic: "↔️", n: "Mở rộng cửa hàng", d: () => `Rộng và sâu thêm, mỗi lầu +${SHOP.perWide} chỗ đặt bàn · lần ${S.venue.wide + 1}`, pts: FAME_GAIN.wide }
} as const;
const SPOT_FULL = "Hết chỗ đặt bàn, hãy xây lầu hoặc mở rộng";
const NAMES = { table: "Mua bàn", up: "Nâng bàn", floor: "Xây thêm lầu", wide: "Mở rộng cửa hàng" } as const;
const vn = (x: number) => x.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");

/* lựa chọn đang chọn trong hộp thoại (n = 0 nghĩa là "tối đa theo xu") */
let sel = { tLv: 1, tN: 1, uFrom: 1, uN: 1 };
let ctx = { forced: false, hint: false };
let last = "", flashLv = 0;                                   // dòng báo "vừa làm gì" và cấp bàn vừa đổi (nhấp nháy ở bảng bàn)

/** dòng xem trước: ghế, điểm danh tiếng và còn thiếu bao nhiêu để lên bậc kế */
function preview(seats: number, pts: number) {
  const f = fameParts(), after = f.score + pts;
  const rank = f.next && f.nextAt != null ? (after >= f.nextAt ? ` · <b>lên bậc ${f.next.n}!</b>` : ` · còn ${vn(f.nextAt - after)} điểm lên ${f.next.n}`) : "";
  return `🪑 ${capacity()} → <b>${capacity() + seats}</b> ghế · ⭐ +${vn(pts)} điểm${rank}`;
}
const pills = (key: string, items: [string, string, boolean][], cur: string) =>
  `<div class="vpills">${items.map(([v, label, off]) => `<button class="vpill${v === cur ? " on" : ""}" data-vsel="${key}:${v}" ${off ? "disabled" : ""}>${label}</button>`).join("")}</div>`;
const qtyPills = (key: string, cur: number, max: number) =>
  pills(key, ([["1", "1"], ["5", "5"], ["10", "10"], ["0", "Tối đa"]] as const).map(([v, l]) => [v, l, v !== "0" && +v > max] as [string, string, boolean]), String(cur));
const eff = (n: number, max: number) => (n === 0 ? max : Math.min(n, max));

function mapHTML() {
  const rows = [3, 2, 1].map(lv =>
    `<span class="vlv l${lv}${flashLv === lv ? " flash" : ""}"><b>${tablesAt(lv)}</b>bàn cấp ${lv}<small>${SHOP.seatsOf(lv)} ghế/bàn</small></span>`).join("");
  return `<div class="vmap">${rows}</div>`;
}
function planHTML() {
  const rec = recommendUpgrade(), plan = planToNext(), lines: string[] = [];
  lines.push(rec ? `💡 <b>Nên chọn: ${NAMES[rec.id]}.</b> ${rec.why}${rec.short ? ` Cần thêm ${fmtN(rec.short)} xu.` : ""}` : "💡 Tiệm đã nâng cấp tối đa, chưa cần đầu tư thêm.");
  if (plan) {
    lines.push(`🗺️ <b>Lộ trình${plan.to ? ` lên ${plan.to}` : ""}:</b> ${plan.steps.map(s => `${NAMES[s.id].toLowerCase()} ×${s.n}`).join(" → ")} · <b>${fmtN(plan.cost)} xu</b>`);
    lines.push(`<button class="vgo2" data-vgo="plan" ${S.coins < plan.cost ? "disabled" : ""}>${S.coins < plan.cost ? `Thiếu ${fmtN(plan.cost - S.coins)} xu` : "Làm theo lộ trình"}</button>`);
  }
  return `<div class="vhint">${lines.map(l => `<p>${l}</p>`).join("")}</div>`;
}
function buyPanel() {
  const free = spots() - tableLvs().length, lv = sel.tLv, max = Math.min(maxTables(lv), free), n = eff(sel.tN, max);
  const head = `<div class="vph"><span class="vi">🪑</span><b>Mua thêm bàn</b><small>còn ${free} chỗ đặt (${tableLvs().length}/${spots()})</small></div>`;
  if (free <= 0) return `<div class="vpanel">${head}<p class="vnote">${SPOT_FULL}</p></div>`;
  const opts = pills("tLv", [1, 2, 3].map(l => [String(l), `Cấp ${l} · ${SHOP.seatsOf(l)} ghế`, false] as [string, string, boolean]), String(lv));
  const go = n > 0 ? `Mua ${n} bàn cấp ${lv} · ${fmtN(quoteTables(n, lv))} xu` : `Chưa đủ xu (bàn tiếp ${fmtN(quoteTables(1, lv))} xu)`;
  return `<div class="vpanel">${head}<small class="vlbl">Mua bàn cấp nào?</small>${opts}<small class="vlbl">Số bàn</small>${qtyPills("tN", sel.tN, max)}
    ${n > 0 ? `<p class="vprev">${preview(n * SHOP.seatsOf(lv), n * FAME_GAIN.table(lv))}</p>` : ""}<button class="vgo" data-vgo="table" ${n > 0 ? "" : "disabled"}>${go}</button></div>`;
}
function upPanel() {
  const froms = [1, 2].filter(l => l < SHOP.maxLv && tablesAt(l) > 0);
  const head = `<div class="vph"><span class="vi">⭐</span><b>Nâng cấp bàn</b><small>${tablesAt(1)} bàn cấp 1 · ${tablesAt(2)} bàn cấp 2</small></div>`;
  if (!froms.length) return `<div class="vpanel">${head}<p class="vnote">Mọi bàn đã cấp cao nhất</p></div>`;
  if (!froms.includes(sel.uFrom)) sel.uFrom = froms[0]!;
  const from = sel.uFrom, max = maxUps(from), n = eff(sel.uN, max);
  const opts = pills("uFrom", froms.map(l => [String(l), `Cấp ${l} → ${l + 1} · ${tablesAt(l)} bàn · ${fmtN(SHOP.upCost(l))} xu/bàn`, false] as [string, string, boolean]), String(from));
  const go = n > 0 ? `Nâng ${n} bàn lên cấp ${from + 1} · ${fmtN(quoteUps(from, n))} xu` : `Chưa đủ xu (1 bàn ${fmtN(SHOP.upCost(from))} xu)`;
  return `<div class="vpanel">${head}<small class="vlbl">Nâng bàn nào?</small>${opts}<small class="vlbl">Số bàn</small>${qtyPills("uN", sel.uN, max)}
    ${n > 0 ? `<p class="vprev">${preview(n, n * FAME_GAIN.up)}</p>` : ""}<button class="vgo" data-vgo="up" ${n > 0 ? "" : "disabled"}>${go}</button></div>`;
}

export function upgradeModal(forced = false, hint = false, still = false) {
  if (!still) { sel = { tLv: 1, tN: 1, uFrom: 1, uN: 1 }; last = ""; flashLv = 0; }
  ctx = { forced, hint };
  const need = needUpgrade(), stuck = forced && !canAffordUpgrade();
  const opts = upgradeOptions().filter(o => o.id === "floor" || o.id === "wide").map(o => {
    const v = VENUE_OPT[o.id as "floor" | "wide"];
    return `<button class="vopt" data-venue="${o.id}" ${S.coins < o.cost ? "disabled" : ""}><span class="vi">${v.ic}</span><span class="vt"><b>${v.n}</b><small>${v.d()}</small><small class="vpv">${preview(0, v.pts)}</small></span><em>${fmtN(o.cost)} xu</em></button>`;
  }).join("");
  const foot = forced && !stuck ? "" : `<div class="mbtns">${stuck ? `<button class="b3" data-act="start-anyway">Chơi với ${seatsNow()} ghế</button>` : `<button class="b3" data-close>Đóng</button>`}</div>`;
  modal(`<h2>${forced ? "Tiệm đông quá rồi!" : "Nâng cấp tiệm"}</h2><p class="sub">${need ? `Giờ cao điểm có ${demand()} khách mà tiệm chỉ có ${capacity()} ghế. ${forced ? "Phải nâng cấp mới mở cửa được." : "Nâng cấp để đón đủ khách."}` : `Tiệm có ${tableLvs().length} bàn · ${S.venue.floors} lầu · mở rộng ${S.venue.wide} lần.`}</p>
    <div class="vstat"><span>🪑 Sức chứa ${capacity()} ghế</span><span>👥 Cao điểm ${demand()} khách</span><span>🏢 ${S.venue.floors} lầu</span><span>${tableLvs().length}/${spots()} chỗ đặt bàn</span></div>
    ${mapHTML()}${last ? `<p class="vdone">✓ ${last}</p>` : ""}
    ${hint ? planHTML() : `<button class="vsug" data-act="venue-hint" data-forced="${forced ? 1 : 0}">💡 Đề xuất</button>`}
    <div class="vopts">${buyPanel()}${upPanel()}${opts}</div>${stuck ? `<p class="sub">Chưa đủ xu cho cách nào. Bán thêm bánh rồi quay lại nhé.</p>` : ""}${foot}`, undefined, forced && !stuck, still);
}

/** chạm nút chọn (cấp bàn, số lượng): vẽ lại tại chỗ */
export function venueSel(v: string) {
  const [k, x] = v.split(":"), n = +x!;
  if (k === "tLv") sel.tLv = n; else if (k === "tN") sel.tN = n; else if (k === "uFrom") { sel.uFrom = n; sel.uN = 1; } else if (k === "uN") sel.uN = n;
  sfx("tap"); upgradeModal(ctx.forced, ctx.hint, true);
}
/** mua xong: báo kết quả, dựng lại cảnh tiệm, giữ hộp thoại (hoặc đóng nếu đã đủ bàn khi bị buộc nâng) */
function after(msg: string, lv = 0) {
  sfx("level"); render(true); toast(msg); last = msg; flashLv = lv;
  if (ctx.forced && needUpgrade()) return upgradeModal(true, false, true);
  if (ctx.forced) { closeModal(); toast("Đủ bàn rồi, bắt đầu ca thôi!"); return; }
  upgradeModal(false, ctx.hint, true);
}
/** chạm nút mua: hỏi lại nếu khoản lớn rồi mới trừ xu */
export function venueGo(what: string) {
  if (what === "table") {
    const lv = sel.tLv, n = eff(sel.tN, Math.min(maxTables(lv), spots() - tableLvs().length)); if (n < 1) return;
    return confirmSpend(quoteTables(n, lv), `Mua ${n} bàn cấp ${lv}?`, () => {
      if (!buyTables(n, lv)) return void toast("Không đủ xu");
      const now = tableLvs().length; after(`Đã mua ${n} bàn cấp ${lv} (bàn số ${now - n + 1}${n > 1 ? `–${now}` : ""})`, lv);
    });
  }
  if (what === "up") {
    const from = sel.uFrom, n = eff(sel.uN, maxUps(from)); if (n < 1) return;
    return confirmSpend(quoteUps(from, n), `Nâng ${n} bàn lên cấp ${from + 1}?`, () => {
      if (!buyUps(from, n)) return void toast("Không đủ xu");
      after(`Đã nâng ${n} bàn từ cấp ${from} lên cấp ${from + 1}`, from + 1);
    });
  }
  if (what === "plan") {
    const plan = planToNext(); if (!plan) return;
    confirmSpend(plan.cost, "Làm theo lộ trình?", () => { const ok = runPlan(plan.steps); after(ok ? "Đã làm theo lộ trình" : "Không đủ xu, mới làm được một phần"); });
  }
}
/** mua một lần: xây lầu, mở rộng */
export function venueBuy(id: string) {
  const o = upgradeOptions().find(x => x.id === id), v = VENUE_OPT[id as "floor" | "wide"];
  if (!o || !v) return;
  confirmSpend(o.cost, `${v.n}?`, () => {
    if (!buyVenue(id as "floor" | "wide")) return void toast("Không đủ xu");
    after(id === "floor" ? "Đã xây thêm lầu" : "Đã mở rộng cửa hàng");
  });
}
