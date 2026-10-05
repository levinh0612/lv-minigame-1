import { events } from "../../engine/dates";
import { giftReady, goals, lvl, xpFor } from "../../engine/progress";
import { S } from "../../engine/state";
import { fmtD } from "../../engine/util";
import { charSVG } from "../art";
import { backBtn, coinPill, esc } from "../dom";

export const goalsList = () => goals().map(g => { const done = g.cur >= g.need;
  return `<div class="g3 ${done ? "done" : ""}"><span class="ck">${done ? "✓" : ""}</span><span class="tx">${esc(g.t)}</span><span class="nv">${
    g.bool ? (g.fail ? '<span style="color:var(--red)">có khách giận</span>' : done ? "✓" : "") : `${Math.min(g.cur, g.need)}/${g.need}`}</span>${
    g.bool ? "" : `<span class="pb"><i style="width:${Math.min(100, g.cur / g.need * 100)}%"></i></span>`}</div>`; }).join("");

export const claimBtn = (idle: string) =>
  `<button class="b3 claim" data-act="claim" ${giftReady() ? "" : "disabled"}>${S.daily.claimed ? "Đã nhận quà hôm nay" : giftReady() ? "Nhận quà: 60 xu + thư bí mật" : idle}</button>`;

/** nội dung Mục tiêu (dùng cho cả trang /muc-tieu và hộp thoại trượt từ dưới lên) */
export function goalsBody() {
  const L = lvl(), cur = S.xp - xpFor(L), need = xpFor(L + 1) - xpFor(L);
  const gl = goals(), up = events().filter(e => e.in > 0).slice(0, 5), r = S.reviews;
  return `<div class="list">
      <div class="card"><div class="lvrow5"><span class="lb">Lv ${L}</span><span class="tr"><i style="width:${Math.min(100, cur / need * 100)}%"></i></span><small>${cur}/${need}</small></div></div>
      <div class="card"><h3>Quà hôm nay <span class="tg3">${gl.filter(x => x.cur >= x.need).length}/${gl.length} xong</span></h3>${goalsList()}${claimBtn("Xong cả 3 để nhận quà")}</div>
      <div class="card"><h3>Sắp tới</h3><ul class="evl">${up.map(e => `<li><span>${esc(e.t)} · ${fmtD(e.date)}</span><b>còn ${e.in} ngày</b></li>`).join("")}</ul></div>
      <div class="card"><h3>Đánh giá <small>${r.length ? r.length + " gần nhất" : ""}</small></h3>
        ${r.length ? r.map(x => `<div class="rev ${x.love ? "love" : ""}">${charSVG(x.look, x.s < 1 ? "impatient" : "happy", 52)}<div><div class="top">${esc(x.who)}<span>${"★".repeat(x.s)}${"☆".repeat(3 - x.s)}</span></div><p>${esc(x.txt)}</p></div></div>`).join("")
          : '<p class="empty">Chưa có đánh giá nào. Mở tiệm bán vài ca là có ngay.</p>'}
      </div>
  </div>`;
}

export function goalsHTML() {
  return `<div class="scr">
    <div class="shead">${backBtn}<h2>Mục tiêu</h2>${coinPill()}</div>
    ${goalsBody()}
  </div>`;
}
