/* Màn Chuẩn bị ca (PrepScreen của Claude Design): ai đi làm, mục tiêu ca, kho trước ca */
import { ic } from "../icons";
import { CATS, STOCK_KEYS, partsOfRecipe } from "../../content/game";
import { canHire, hireFee, staffIds, capacity, demand, needUpgrade, spareSeats, crewPlan, estCostRows, estProfit, expectedCustomers, foodDef, mealOf, plannedMeal, onDuty, packPrice, staffDef, stockOf, suggestion } from "../../engine/economy";
import { MAX_PINS, featured, isPinned, lvl, unlocked } from "../../engine/progress";
import { goalText, shiftGoals } from "../../engine/shift";
import { availableIdx } from "../../engine/suppliers";
import { entityInfo, entityRow } from "../components/entity";
import { S, petName } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { cakeAnySVG, foodSVG, ingSVG } from "../art";
import { coinPill, esc } from "../dom";

const BACK = `<button class="rbtn back" data-go="/" aria-label="Về tiệm">${ic.chevL(18, 2.8, "none", "rose")}</button>`;
export const pageHead = (title: string, sub = "") =>
  `<div class="phead">${BACK}<div class="pt">${sub ? `<small>${sub}</small>` : ""}<h2>${title}</h2></div>${coinPill()}</div>`;

/* thẻ bé chưa nhận vào làm: chạm để nhận (hoặc báo mở ở cấp nào), dùng thành phần chung */
function lockedCard(id: string) {
  const i = entityInfo(id)!, can = canHire(id), fee = hireFee(id), unlock = staffDef(id).unlock;
  return entityRow(i, {
    attrs: can ? `data-hire="${id}"` : "disabled", cls: "crew", px: 52,
    meta: can ? `Chạm để nhận vào làm${fee ? ` · ${fmtN(fee)} xu` : ""}` : `Mở ở Lv ${unlock}`,
    trail: `<em class="er-st er-st-${can ? "work" : "lock"}">${can ? "Nhận" : "Khoá"}</em>`
  });
}

export type PrepTab = "crew" | "cakes" | "stock" | "goals";
let prepTab: PrepTab = "crew";
export const setPrepTab = (t: PrepTab) => { prepTab = t; };
/* lọc danh sách bánh: tất cả, món ruột (ghim), mới mở (trong 5 cấp gần đây), thiếu nguyên liệu */
export type CakeFil = "all" | "pin" | "new" | "low";
const CAKE_FILS: [CakeFil, string][] = [["all", "Tất cả"], ["pin", "Ruột"], ["new", "Mới"], ["low", "Thiếu"]];
/* biểu tượng cùng một nét cho từng bộ lọc */
const FIL_IC: Record<CakeFil, string> = {
  all: "",
  pin: ic.star(14, 2.4, "none", "gold"),
  new: ic.sparkle(14, 2.4, "none", "violet"),
  low: ic.warn(14, 2.4, "none", "red")
};
let cakeFil: CakeFil = "all";
export const setCakeFil = (f: CakeFil) => { cakeFil = f; };

/* thẻ gọn của một bé: chạm cả thẻ để chọn/bỏ chọn đi làm (dùng thành phần chung entityRow) */
function crewCard(id: string) {
  const st = S.staff[id];
  if (!st.hired) return lockedCard(id);
  const i = entityInfo(id)!, on = onDuty(id), need = foodDef(mealOf(id)), meal = plannedMeal(id), hungry = on && !meal, eat = meal ? foodDef(meal) : need;
  const line = hungry ? `<span class="bad">Đói · hết ${need.n}</span>` : `${foodSVG(eat.id, 16)}Bậc ${st.lv} · ${eat.n}`;
  const row = entityRow(i, {
    attrs: `data-duty="${id}" role="switch" aria-checked="${on}"`, cls: `crew ${on ? "on" : ""} ${hungry ? "hun" : ""}`, px: 52, mood: on && !hungry ? "happy" : hungry ? "impatient" : "open",
    meta: line, trail: `<i class="pc-chk" aria-hidden="true">${on ? "✓" : ""}</i>`
  });
  return hungry ? `<div class="pcwrap">${row}<button class="pc-buy" data-food-buy="${need.id}:1" data-for="${id}" ${S.coins < need.cost ? "disabled" : ""}>Mua ${need.n} · ${need.cost} xu</button></div>` : row;
}

export function prepHTML() {
  const feat = featured(), plan = crewPlan(), est = estProfit(), n = expectedCustomers();
  const sug = suggestion(), sugCost = sug.reduce((a, x) => a + x.cost, 0), goals = shiftGoals(n);
  const needPrep = sug.length > 0 || plan.some(x => !x.meal);
  const hungry = plan.filter(x => !x.meal).map(x => petName(x.id));
  const low = STOCK_KEYS.flatMap(k => availableIdx(k).map(i => ({ k, i }))).filter(x => stockOf(x.k, x.i) <= 2);
  const tab = (id: PrepTab, label: string, badge = "") => `<button class="${prepTab === id ? "on" : ""}" data-ptab="${id}" role="tab" aria-selected="${prepTab === id}">${label}${badge}</button>`;
  const ic = [["#FFE9EF", "#E0567A"], ["#E3F6EC", "#3F9C78"], ["#FFF0C9", "#A77A0E"]];
  const rows = estCostRows();
  let body = "";
  if (prepTab === "crew") {
    const ids = staffIds();
    body = `<div class="sh2"><b>Chọn người đi làm</b><span class="lav">${plan.filter(x => x.meal).length}/${ids.length} đi làm</span></div>
      <div class="pcrews">${ids.map(crewCard).join("")}</div>
      <p class="phint">Chạm vào thẻ để chọn hoặc bỏ chọn đi làm.${hungry.length ? ` <b>${esc(hungry.join(", "))} đói, sẽ nghỉ nếu không mua đồ ăn.</b>` : ""}</p>`;
  } else if (prepTab === "cakes") {
    const all = unlocked(), L = lvl(), lacks = (r: (typeof all)[number]) => partsOfRecipe(r).some(p => stockOf(p.k, p.i) === 0);
    const test: Record<CakeFil, (r: (typeof all)[number]) => boolean> = { all: () => true, pin: r => isPinned(r.id), new: r => r.lv > L - 5 && r.lv <= L, low: lacks };
    const rs = all.filter(test[cakeFil]).sort((x, y) => +isPinned(y.id) - +isPinned(x.id));
    const nPin = all.filter(r => isPinned(r.id)).length;
    body = `<div class="pfil">${CAKE_FILS.map(([k, n]) => { const cnt = all.filter(test[k]).length; return `<button class="${cakeFil === k ? "on" : ""} ${k === "low" && cnt ? "alert" : ""}" data-pfil="${k}">${FIL_IC[k]}${n}<em>${cnt}</em></button>`; }).join("")}</div>
      <div class="sh2"><b>Bánh</b><span class="lav">${rs.length}/${all.length} món · ★ ${nPin}/${MAX_PINS}</span></div>
      <div class="pcakes">${rs.map(r => {
      const viral = r.id === feat.id, pin = isPinned(r.id);
      return `<div class="pcake ${viral ? "viral" : ""}"><div class="pck">${cakeAnySVG({ base: r.base, cream: r.cream, top: r.top, up: r.up }, { size: 54, still: true })}</div>
        <div class="pi"><b>${esc(r.n)}</b><small class="pprice">${fmtN(r.price)} xu${viral ? ` <span class="vtag">✦ Viral hôm nay</span>` : ""}</small>
        <div class="pings">${partsOfRecipe(r).map(p => `<span title="${CATS[p.k][p.i][0]}" class="${stockOf(p.k, p.i) === 0 ? "out" : ""}">${ingSVG(p.k, p.i, 16)}</span>`).join("")}</div></div>
        <button class="pinbtn ${pin ? "on" : ""}" data-rpin="${r.id}" aria-pressed="${pin}" aria-label="${pin ? "Bỏ ghim" : "Ghim"} ${esc(r.n)}">${pin ? "★" : "☆"}</button></div>`;
    }).join("") || `<p class="pempty">${cakeFil === "low" ? "Chưa có món nào thiếu hàng.<br>Kho đang đủ cho cả ca." : cakeFil === "pin" ? "Chưa ghim món ruột nào.<br>Bấm ngôi sao ở món để ghim." : "Chưa có món nào trong mục này."}</p>`}</div>
      <p class="phint">Ghim tối đa ${MAX_PINS} món ruột: khách gọi các món này nhiều hơn (khoảng một nửa số khách) để bạn dễ tự nhớ công thức và nhận thưởng +50%.</p>`;
  } else if (prepTab === "stock") {
    const stock = STOCK_KEYS.map(k => availableIdx(k).map(i => {
      const nm = CATS[k][i][0], v = stockOf(k, i), p = packPrice(k, i, 5);
      return `<button class="stile ${v === 0 ? "out" : v <= 2 ? "low" : ""}" data-ing-buy="${k}:${i}:5" ${S.coins < p ? "disabled" : ""} aria-label="Nhập 5 ${nm}, ${p} xu">${ingSVG(k, i, 22)}<span>${nm}</span><b>${v === 0 ? "Hết" : v}</b></button>`;
    }).join("")).join("");
    body = `<div class="sh2"><b>Kho trước ca</b><span class="${low.length ? "red" : "lav"}">${low.length ? `${low.length} món sắp hết` : "Đủ hàng"}</span></div>
      <div class="stiles">${stock}</div>
      <p class="phint">Chạm một món để nhập thêm 5 phần (giá ${low.length ? "hiện khi chạm" : "theo nhà cung cấp"}).</p>`;
  } else {
    body = `<div class="custcnt"><span class="cntico">👥</span><div><b>Dự đoán khách hàng ca này: ${n}</b><small>Ghế dư: ${spareSeats()}${spareSeats() ? ` <span class="gh">🌟 Có thể gặp giờ vàng</span>` : ""}</small></div></div>
      ${needUpgrade() ? `<button class="vwarn" data-act="venue"><span>🪑</span><div><b>Khách đông hơn chỗ ngồi</b><small>Giờ cao điểm ${demand()} khách, tiệm có ${capacity()} ghế. Chạm để nâng cấp.</small></div></button>` : ""}
      <div class="sh2"><b>Mục tiêu ca này</b><span class="gold">thưởng lúc hết ca</span></div>
      <div class="goals">${goals.map((g, i) => `<div class="goal"><i style="background:${ic[i][0]};color:${ic[i][1]}">${g.n}</i><span>${goalText(g)}</span><b>+${g.reward} xu</b></div>`).join("")}</div>
      <div class="pfin"><div><small>Tổng thu dự tính</small><b>${fmtN(est.revenue)} xu</b></div><div><small>Tổng chi dự tính</small><b class="m">${fmtN(est.cost)} xu</b></div></div>
      <div class="pcost"><h4>Khoản chi gồm</h4>${rows.length ? rows.map(r => `<div><span>${r.kind === "food" ? "🍖" : "🧺"} ${esc(r.label)}</span><b>${fmtN(r.cost)} xu</b></div>`).join("") : `<p>Chưa cần chi gì thêm: kho và đồ ăn đã đủ.</p>`}</div>
      <div class="pprofit ${est.profit >= 0 ? "p" : "m"}"><span>Lãi ước tính</span><b>${est.profit >= 0 ? "+" : "−"}${fmtN(Math.abs(est.profit))} xu</b></div>`;
  }
  return `<div class="scr prep2">
    <div class="pfix">${pageHead("Chuẩn bị mở tiệm", `Ca ${S.shifts + 1}`)}
      <div class="feat">${cakeAnySVG({ base: feat.base, cream: feat.cream, top: feat.top }, { size: 34, still: true })}<div><small>Món Viral hôm nay</small><b>${esc(feat.n)}</b></div></div>
      <div class="prtabs" role="tablist">${tab("crew", "Nhân viên")}${tab("cakes", "Bánh")}${tab("stock", "Nguyên liệu", low.length ? `<i class="dot"></i>` : "")}${tab("goals", "Mục tiêu")}</div></div>
    ${body}
    <div class="pfoot"><button class="b3 w" data-act="quickprep" ${needPrep && S.coins > 0 ? "" : "disabled"}>${needPrep ? `Chuẩn bị nhanh${sugCost ? ` · ${fmtN(sugCost)} xu` : ""}` : "Đã sẵn sàng"}</button>
      <button class="b3" data-act="start">Bắt đầu ca</button></div>
  </div>`;
}
