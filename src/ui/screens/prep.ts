/* Màn Chuẩn bị ca: đi chợ mua nguyên liệu và sắp xếp nhân viên trước khi mở cửa */
import { CATS, LABELS, PACKS, PETS, STAFF, STOCK_KEYS } from "../../content/game";
import {
  canHire, crewPlan, expectedCustomers, fame, foodDef, mealFor, mealOf, onDuty, outOfStock, packPrice, stockOf, suggestion
} from "../../engine/economy";
import { featured } from "../../engine/progress";
import { S, petName } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { cakeSVG, critterSVG } from "../art";
import { backBtn, coinPill, esc } from "../dom";

function stockCard() {
  const sug = suggestion(), sugCost = sug.reduce((a, x) => a + x.cost, 0);
  const low = new Set(sug.map(x => x.k + ":" + x.i));
  return `<div class="card"><h3>Kho nguyên liệu</h3><p class="cnote">Mỗi bánh dùng 1 đế, 1 kem, 1 topping. Số bên phải là số phần còn trong kho.</p>
    <button class="b3 sugg" data-act="suggest" ${sug.length && S.coins >= Math.min(...sug.map(x => x.cost)) ? "" : "disabled"}>
      ${sug.length ? `Nhập theo gợi ý · ${fmtN(sugCost)} xu` : "Kho đã đủ cho ca này"}</button>
    ${STOCK_KEYS.map(k => `<div class="sgrp"><h4>${LABELS[k]}</h4>${CATS[k].map(([n, c], i) => {
      const q = stockOf(k, i), warn = low.has(k + ":" + i);
      return `<div class="srow"><i style="background:${c}"></i><b>${n}</b><span class="sq ${q <= 0 ? "zero" : warn ? "warn" : ""}">${q}</span>
        ${PACKS.map(p => `<button class="pk" data-ing-buy="${k}:${i}:${p.n}" ${S.coins < packPrice(k, i, p.n) ? "disabled" : ""}>+${p.n}<small>${packPrice(k, i, p.n)} xu</small></button>`).join("")}</div>`;
    }).join("")}</div>`).join("")}
  </div>`;
}

/* Ca này ai đi làm, đã có đồ ăn (lương) chưa */
function crewCard() {
  const hired = STAFF.filter(d => S.staff[d.id].hired);
  const link = `<button class="mini pk" data-go="/cua-hang/thu-cung">Chăm thú cưng →</button>`;
  if (!hired.length) return `<div class="card"><h3>Thợ bánh ca này</h3><p class="cnote">${canHire("dog") ? `${esc(petName("dog"))} đang chờ được nhận vào làm thợ bánh.` : `Lên Lv 2 để ${esc(petName("dog"))} xin vào làm thợ bánh, tự làm bánh cho khách.`}</p>${link}</div>`;
  return `<div class="card"><h3>Thợ bánh ca này <small>ăn lương đầu ca</small></h3><p class="cnote">Các bé đi làm sẽ tự nhận đơn và làm bánh cho khách; đơn bé đã nhận thì chủ tiệm không cần làm.</p>
    ${hired.map(d => {
      const on = onDuty(d.id), meal = mealFor(d.id), need = foodDef(mealOf(d.id));
      const status = !on ? `<small>Nghỉ ca này</small>`
        : meal ? `<small class="okc">Đi làm · ăn 1 ${foodDef(meal).n}</small>`
        : `<small class="bad">Đói: cần 1 ${need.n}</small><button class="mini pk" data-food-buy="${need.id}:1" ${S.coins < need.cost ? "disabled" : ""}>Mua 1 ${need.n} · ${need.cost} xu</button>`;
      return `<div class="crewrow ${on ? "" : "off"}">${critterSVG({ ...PETS[d.id], mood: on && meal ? "happy" : "open", ledge: false }, 44)}
        <div class="inf"><b>${esc(petName(d.id))} <em>${d.role} · bậc ${S.staff[d.id].lv}</em></b>${status}</div>
        <button class="duty ${on ? "on" : ""}" data-duty="${d.id}" aria-pressed="${on}">${on ? "Đi làm" : "Nghỉ"}</button></div>`;
    }).join("")}
    ${link}
  </div>`;
}

export function prepHTML() {
  const feat = featured(), out = outOfStock(), plan = crewPlan();
  const fed = plan.filter(x => x.meal), hungry = plan.filter(x => !x.meal);
  const sub = !plan.length ? "Chưa có bé nào đi làm"
    : [fed.length ? "Lương: " + fed.map(x => `1 ${foodDef(x.meal!).n}`).join(", ") : "", hungry.length ? hungry.map(x => petName(x.id)).join(", ") + " đói, sẽ nghỉ" : ""].filter(Boolean).join(" · ");
  return `<div class="scr prep">
    <div class="shead">${backBtn}<h2>Chuẩn bị ca</h2>${coinPill()}</div>
    <div class="list">
      <div class="card today">
        ${cakeSVG({ base: feat.base, cream: feat.cream, top: feat.top, sweet: 1 }, { size: 92, still: true })}
        <div><small>Món nổi bật hôm nay</small><b>${esc(feat.n)}</b><span>Dự kiến ${expectedCustomers()} khách · Ca ${S.shifts + 1}</span><span class="famec">✦ ${fame().n} · ${fame().seats} bàn</span></div>
      </div>
      ${out.length ? `<p class="warnbox">Đang hết ${out.map(x => CATS[x.k][x.i][0]).join(", ")}. Khách gọi món có nguyên liệu này sẽ phải nhập nhanh, giá cao hơn 50%.</p>` : ""}
      ${stockCard()}
      ${crewCard()}
    </div>
    <div class="startbar"><button class="b3" data-act="start">Mở cửa<small>${esc(sub)}</small></button></div>
  </div>`;
}
