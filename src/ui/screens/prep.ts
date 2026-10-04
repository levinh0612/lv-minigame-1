/* Màn Chuẩn bị ca (PrepScreen của Claude Design): ai đi làm, mục tiêu ca, kho trước ca */
import type { PetId } from "../../content/couple";
import { CATS, FOODS, PETS, STAFF, STOCK_KEYS } from "../../content/game";
import { canHire, demand, needUpgrade, tables, foodOf, crewPlan, expectedCustomers, fame, foodDef, mealChoices, mealFor, mealOf, mealSlow, onDuty, packPrice, staffDef, stockOf, suggestion } from "../../engine/economy";
import { featured } from "../../engine/progress";
import { goalText, shiftGoals } from "../../engine/shift";
import { S, petName } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { petSVG, foodSVG, ingSVG } from "../art";
import { coinPill, esc } from "../dom";

const BACK = `<button class="rbtn back" data-go="/" aria-label="Về tiệm"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" stroke="#C07A8C" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
export const pageHead = (title: string, sub = "") =>
  `<div class="phead">${BACK}<div class="pt">${sub ? `<small>${sub}</small>` : ""}<h2>${title}</h2></div>${coinPill()}</div>`;

/* thẻ một bé: đi làm / nghỉ / đói / chờ nhận / chưa mở */
export function bakerTile(id: PetId) {
  const d = staffDef(id), st = S.staff[id], on = onDuty(id);
  const tier = st.hired ? st.lv : 1, food = FOODS[tier - 1];
  const meal = st.hired ? mealFor(id) : null, hungry = on && !meal, need = st.hired ? foodDef(mealOf(id)) : food;
  const eat = meal ? foodDef(meal) : need, slow = meal && st.hired ? mealSlow(id, meal) : 1;
  const picks = st.hired && tier > 1 ? `<div class="mpick" role="radiogroup" aria-label="Món ăn của ${esc(petName(id))}">${mealChoices(id).map(f =>
    `<button class="${f.id === need.id ? "on" : ""}" data-meal="${id}:${f.id}" role="radio" aria-checked="${f.id === need.id}" aria-label="${f.n}, còn ${foodOf(f.id)}">${foodSVG(f.id, 16)}<small>${foodOf(f.id)}</small></button>`).join("")}</div>` : "";
  let btn: string, cls = "";
  if (!canHire(id)) { btn = `<button class="tb3 lock" disabled>Mở ở Lv ${d.unlock}</button>`; cls = "off"; }
  else if (!st.hired) { btn = `<button class="tb3 hire" data-hire="${id}">Nhận vào làm</button>`; cls = "off"; }
  else if (hungry) btn = `<button class="tb3 buy" data-food-buy="${need.id}:1" ${S.coins < need.cost ? "disabled" : ""}>Mua ${need.n} · ${need.cost} xu</button>`;
  else { btn = `<button class="duty2 ${on ? "on" : ""}" data-duty="${id}" role="switch" aria-checked="${on}"><span>Đi làm<br><small>${on ? "✓ ca này" : "đang nghỉ"}</small></span><i></i></button>`; if (!on) cls = "off"; }
  const sub = hungry ? `<span class="bad">Đói · hết ${need.n}</span>` : `${foodSVG(eat.id, 18)}Bậc ${tier} · ${eat.n}${slow > 1 ? ` <span class="bad">chậm +${Math.round((slow - 1) * 100)}%</span>` : ""}`;
  return `<div class="btile ${cls}"><div class="av">${petSVG({ ...PETS[id], mood: on && !hungry ? "happy" : hungry ? "impatient" : "open" }, 72)}</div>
    <b>${esc(petName(id))}</b><div class="bs">${sub}</div>${picks}${btn}</div>`;
}

export function prepHTML() {
  const feat = featured(), plan = crewPlan(), f = fame();
  const goals = shiftGoals(expectedCustomers());
  const sug = suggestion(), sugCost = sug.reduce((a, x) => a + x.cost, 0);
  const low = STOCK_KEYS.flatMap(k => CATS[k].map((_, i) => ({ k, i }))).filter(x => stockOf(x.k, x.i) <= 2);
  const stock = STOCK_KEYS.map(k => CATS[k].map(([n], i) => {
    const v = stockOf(k, i), p = packPrice(k, i, 5);
    return `<button class="stile ${v === 0 ? "out" : v <= 2 ? "low" : ""}" data-ing-buy="${k}:${i}:5" ${S.coins < p ? "disabled" : ""} aria-label="Nhập 5 ${n}, ${p} xu">${ingSVG(k, i, 22)}<span>${n}</span><b>${v === 0 ? "Hết" : v}</b></button>`;
  }).join("")).join("");
  const ic = [["#FFE9EF", "#E0567A"], ["#E3F6EC", "#3F9C78"], ["#FFF0C9", "#A77A0E"]];
  const hungry = plan.filter(x => !x.meal).map(x => petName(x.id));
  return `<div class="scr prep2">
    ${pageHead("Chuẩn bị mở tiệm", `Ca ${S.shifts + 1}`)}
    <div class="feat">${ingSVG("cream", feat.cream, 18)}Món nổi bật: <b>${esc(feat.n)}</b><span>✦ ${f.n}</span></div>
    ${needUpgrade() ? `<button class="vwarn" data-act="venue"><span>🪑</span><div><b>Khách đông hơn số bàn</b><small>Cần ${demand()} bàn, tiệm có ${tables()}. Chạm để nâng cấp.</small></div></button>` : ""}
    <div class="custcnt"><span class="cntico">👥</span><div><b>Hôm nay có ${expectedCustomers()} khách</b><small>Ca ${S.shifts + 1} · ${goals[0]?.n ?? 0} khách vui là đạt mục tiêu</small></div></div>
    <div class="sh2"><b>Ai đi làm hôm nay?</b><span class="lav">${plan.filter(x => x.meal).length}/${STAFF.length} bé</span></div>
    <div class="btiles">${STAFF.map(d => bakerTile(d.id)).join("")}</div>
    <div class="sh2"><b>Mục tiêu ca này</b><span class="gold">thưởng lúc hết ca</span></div>
    <div class="goals">${goals.map((g, i) => `<div class="goal"><i style="background:${ic[i][0]};color:${ic[i][1]}">${g.n}</i><span>${goalText(g)}</span><b>+${g.reward} xu</b></div>`).join("")}</div>
    <div class="sh2"><b>Kho trước ca</b><span class="${low.length ? "red" : "lav"}">${low.length ? `${low.length} món sắp hết` : "Đủ hàng"}</span></div>
    <div class="stiles">${stock}</div>
    <p class="phint">Chạm một món để nhập thêm 5 phần. ${hungry.length ? `<b>${esc(hungry.join(", "))} đói, sẽ nghỉ nếu không mua đồ ăn.</b>` : ""}</p>
    <div class="pfoot"><button class="b3 w" data-act="suggest" ${sug.length && S.coins >= Math.min(...sug.map(x => x.cost)) ? "" : "disabled"}>${sug.length ? `Nhập · ${fmtN(sugCost)} xu` : "Kho đủ"}</button>
      <button class="b3" data-act="start">Bắt đầu ca · ${expectedCustomers()} khách</button></div>
  </div>`;
}
