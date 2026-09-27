/* Màn Chuẩn bị ca: đi chợ mua nguyên liệu và sắp xếp nhân viên trước khi mở cửa */
import { CATS, LABELS, PACKS, PETS, STAFF, STOCK_KEYS } from "../../content/game";
import {
  canHire, dutyWages, expectedCustomers, onDuty, outOfStock, packPrice, stockOf, suggestion, trainCost, wageOf
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

function staffCard() {
  return `<div class="card"><h3>Nhân viên <small>lương trả khi hết ca</small></h3>
    ${STAFF.map(d => {
      const st = S.staff[d.id], can = canHire(d.id), on = onDuty(d.id), tc = trainCost(d.id);
      const action = !can ? `<span class="tag lk">Mở ở Lv ${d.unlock}</span>`
        : !st.hired ? `<button class="mini pk" data-hire="${d.id}">Thuê · ${d.wage[0]} xu/ca</button>`
        : `<button class="duty ${on ? "on" : ""}" data-duty="${d.id}" aria-pressed="${on}">${on ? "Đi làm" : "Nghỉ"}</button>
           ${tc ? `<button class="mini" data-train="${d.id}" ${S.coins < tc ? "disabled" : ""}>Huấn luyện · ${fmtN(tc)} xu</button>` : '<span class="tag use">Bậc tối đa</span>'}`;
      return `<div class="staff ${can ? "" : "lock"} ${st.hired && !on ? "off" : ""}">
        <div class="av">${critterSVG({ ...PETS[d.id], mood: on ? "happy" : "open" }, 64)}</div>
        <div class="inf"><b>${esc(petName(d.id))} <em>${d.role}${st.hired ? ` · bậc ${st.lv}` : ""}</em></b>
          <small>${d.effect[st.hired ? st.lv - 1 : 0]}</small>
          ${st.hired ? `<small class="wg">Lương ${wageOf(d.id)} xu/ca</small>` : ""}
          <div class="acts">${action}</div></div></div>`;
    }).join("")}
  </div>`;
}

export function prepHTML() {
  const feat = featured(), out = outOfStock(), wages = dutyWages();
  return `<div class="scr prep">
    <div class="shead">${backBtn}<h2>Chuẩn bị ca</h2>${coinPill()}</div>
    <div class="list">
      <div class="card today">
        ${cakeSVG({ base: feat.base, cream: feat.cream, top: feat.top, sweet: 1 }, { size: 92, still: true })}
        <div><small>Món nổi bật hôm nay</small><b>${esc(feat.n)}</b><span>Dự kiến ${expectedCustomers()} khách · Ca ${S.shifts + 1}</span></div>
      </div>
      ${out.length ? `<p class="warnbox">Đang hết ${out.map(x => CATS[x.k][x.i][0]).join(", ")}. Khách gọi món có nguyên liệu này sẽ phải nhập nhanh, giá cao hơn 50%.</p>` : ""}
      ${stockCard()}
      ${staffCard()}
    </div>
    <div class="startbar"><button class="b3" data-act="start">Mở cửa<small>${wages ? `Lương ca này: ${wages} xu` : "Chưa có nhân viên đi làm"}</small></button></div>
  </div>`;
}
