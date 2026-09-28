/* Bảng xếp hạng: mọi tiệm, theo tổng xu kiếm được. Tải từ /api/leaderboard sau khi vẽ khung. */
import { S } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { leaderboard, type Rank } from "../../net/cloud";
import { $, esc } from "../dom";
import { pageHead } from "./prep";

const MEDAL = ["#FFC53D", "#C9CCD6", "#E3A06B"];
const row = (r: Rank) => `<div class="rk ${r.me ? "me" : ""}"><span class="no" ${r.rank <= 3 ? `style="background:${MEDAL[r.rank - 1]};color:#4A3438"` : ""}>${r.rank}</span>
  <span class="nm">${esc(r.name)}${r.me ? " <em>bạn</em>" : ""}</span><span class="lv">Lv ${r.lv}</span><b>${fmtN(r.earned)} xu</b></div>`;

export function rankHTML() {
  setTimeout(load, 0);
  return `<div class="scr rank4">${pageHead("Bảng xếp hạng", "Tổng xu kiếm được")}
    <div class="rkme" id="rkMe"><span>Tiệm của bạn</span><b>${fmtN(S.earned)} xu</b></div>
    <div class="rkl" id="rkList"><p class="phint">Đang tải bảng xếp hạng…</p></div>
    <p class="phint">Đổi tên hoặc ẩn tiệm khỏi bảng trong ⚙️ Cài đặt → Lưu trên mây.</p></div>`;
}
async function load() {
  const box = $("#rkList"); if (!box) return;
  try {
    const d = await leaderboard();
    if (!$("#rkList")) return;
    const mine = d.me, inTop = d.top.some(r => r.me);
    box.innerHTML = (d.top.length ? d.top.map(row).join("") : `<p class="phint">Chưa có tiệm nào. Bán một ca để lên bảng nha!</p>`)
      + (mine && mine.rank && !inTop ? `<div class="rkgap">…</div>${row({ ...mine, rank: mine.rank, me: true })}` : "");
    const me = $("#rkMe");
    if (me) me.innerHTML = mine
      ? `<span>${mine.rank ? `Hạng <b>${mine.rank}</b>` : "Tiệm đang ẩn khỏi bảng"}</span><b>${fmtN(mine.earned)} xu</b>`
      : `<span>Chưa lưu lên mây · bán xong một ca là có hạng</span><b>${fmtN(S.earned)} xu</b>`;
  } catch {
    box.innerHTML = `<p class="phint">Không tải được bảng xếp hạng. Kiểm tra mạng rồi mở lại nha.</p>`;
  }
}
