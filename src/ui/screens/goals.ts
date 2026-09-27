import { RECIPES } from "../../content/game";
import { events } from "../../engine/dates";
import { giftReady, goals, lvl, xpFor } from "../../engine/progress";
import { S } from "../../engine/state";
import { fmtD } from "../../engine/util";
import { cakeSVG, charSVG } from "../art";
import { backBtn, coinPill, esc } from "../dom";

export const goalsList = () => goals().map(g => `<div class="gi ${g.cur >= g.need ? "done" : ""}"><span class="ck">${g.cur >= g.need ? "✓" : ""}</span>${esc(g.t)}${
  g.bool ? (g.fail ? '<span class="gv" style="color:var(--red)">có khách giận</span>' : "") : `<span class="gv">${Math.min(g.cur, g.need)}/${g.need}</span>`}</div>`).join("");

export const claimBtn = (idle: string) =>
  `<button class="b3 claim" data-act="claim" ${giftReady() ? "" : "disabled"}>${S.daily.claimed ? "Đã nhận quà hôm nay" : giftReady() ? "Nhận quà: 60 xu + thư bí mật" : idle}</button>`;

export function goalsHTML() {
  const L = lvl(), cur = S.xp - xpFor(L), need = xpFor(L + 1) - xpFor(L);
  const up = events().filter(e => e.in > 0).slice(0, 5), r = S.reviews;
  return `<div class="scr">
    <div class="shead">${backBtn}<h2>Mục tiêu</h2>${coinPill()}</div>
    <div class="list">
      <div class="card"><h3>Hôm nay <small>Lv ${L} · ${cur}/${need} kinh nghiệm</small></h3><div class="gl">${goalsList()}</div>${claimBtn("Xong cả 3 để nhận quà")}</div>
      <div class="card"><h3>Sắp tới</h3><ul class="evl">${up.map(e => `<li><span>${esc(e.t)} · ${fmtD(e.date)}</span><b>còn ${e.in} ngày</b></li>`).join("")}</ul></div>
      <div class="card"><h3>Công thức <small>mở theo cấp</small></h3>
        <div class="rgrid">${RECIPES.map(x => `<div class="${x.lv > L ? "lock" : ""}">${cakeSVG({ base: x.base, cream: x.cream, top: x.top, sweet: 1 }, { size: 84, still: true })}<b>${esc(x.n)}</b><span>${x.lv > L ? "Mở ở Lv " + x.lv : "Lv " + x.lv}</span></div>`).join("")}</div>
      </div>
      <div class="card"><h3>Đánh giá <small>${r.length ? r.length + " gần nhất" : ""}</small></h3>
        ${r.length ? r.map(x => `<div class="rev ${x.love ? "love" : ""}">${charSVG(x.look, x.s < 1 ? "impatient" : "happy", 52)}<div><div class="top">${esc(x.who)}<span>${"★".repeat(x.s)}${"☆".repeat(3 - x.s)}</span></div><p>${esc(x.txt)}</p></div></div>`).join("")
          : '<p class="empty">Chưa có đánh giá nào. Mở tiệm bán vài ca là có ngay.</p>'}
      </div>
    </div>
  </div>`;
}
