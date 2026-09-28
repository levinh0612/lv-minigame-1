/* Bảng xếp hạng: mọi tiệm, theo tài sản (xu + đồ đang có). Tải từ /api/leaderboard sau khi vẽ khung. */
import { netWorth } from "../../engine/economy";
import { S } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { leaderboard, savedAgo, type Board, type Rank } from "../../net/cloud";
import { $, esc } from "../dom";
import { nameShop } from "../modals";
import { pageHead } from "./prep";

const MEDAL = ["#FFC53D", "#C9CCD6", "#E3A06B"];
const HEART = `<svg width="22" height="20" viewBox="0 0 16 14" aria-hidden="true"><path d="M8 13 C4 10 1 7.5 1 4.5 C1 2 3 1 4.7 1 C6.2 1 7.4 2 8 3 C8.6 2 9.8 1 11.3 1 C13 1 15 2 15 4.5 C15 7.5 12 10 8 13 Z" fill="#FF6F91" stroke="#4A3438" stroke-width="1.4"/></svg>`;
const row = (r: Rank) => `<div class="rk ${r.me ? "me" : ""}"><span class="no" ${r.rank <= 3 ? `style="background:${MEDAL[r.rank - 1]};color:#4A3438"` : ""}>${r.rank}</span>
  <span class="nm"><span class="n1">${esc(r.name)}${r.me ? " <em>bạn</em>" : ""}</span><small>Lv ${r.lv} · kiếm ${fmtN(r.earned)} xu</small></span><b>${fmtN(r.assets)}</b></div>`;
const ago = (iso?: string) => { if (!iso) return ""; const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 1 ? "vừa chơi" : m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`; };

function coupleHTML(d: Board) {
  if (!d.me) return "";
  if (!d.partner) return `<button class="couple empty" data-act="cloud"><span>${HEART}</span><div><b>Ghép đôi với người ấy</b><small>Hai tiệm hiện cạnh nhau · mã của bạn: <b>${esc(d.me.pairCode || "")}</b></small></div></button>`;
  const a = d.me, b = d.partner, lead = a.assets === b.assets ? "Hoà nhau" : a.assets > b.assets ? `${esc(a.name)} dẫn trước ${fmtN(a.assets - b.assets)}` : `${esc(b.name)} dẫn trước ${fmtN(b.assets - a.assets)}`;
  const side = (x: Omit<Rank, "rank">, me: boolean) => `<div class="cs ${me ? "me" : ""}"><small>${me ? "Bạn" : "Người ấy"}</small><b>${esc(x.name)}</b><span>${fmtN(x.assets)}</span><em>Lv ${x.lv}${me ? "" : ` · ${ago(x.savedAt)}`}</em></div>`;
  return `<div class="couple"><div class="ch">Hai đứa mình</div><div class="cr">${side(a, true)}<span class="hv">${HEART}</span>${side(b, false)}</div><div class="cl">${lead}</div></div>`;
}

export function rankHTML() {
  setTimeout(load, 0);
  if (!S.cloud.named) setTimeout(() => nameShop(), 300);
  const w = netWorth(), a = savedAgo();
  return `<div class="scr rank4">${pageHead("Bảng xếp hạng", "Tài sản = xu + đồ đang có")}
    <div class="rkme" id="rkMe"><span>Tiệm của bạn</span><b>${fmtN(w.total)}</b></div>
    <p class="rksub">💰 ${fmtN(w.coins)} xu · 🎀 ${fmtN(w.goods)} đồ${a ? ` · ☁︎ đã lưu ${a}` : ""}</p>
    <div id="rkCouple"></div>
    <div class="rkl" id="rkList"><p class="phint">Đang tải bảng xếp hạng…</p></div>
    <p class="phint">Đổi tên, ẩn tiệm hoặc ghép đôi trong ⚙️ Cài đặt → Lưu trên mây.</p></div>`;
}
async function load() {
  const box = $("#rkList"); if (!box) return;
  try {
    const d = await leaderboard();
    if (!$("#rkList")) return;
    const mine = d.me, inTop = d.top.some(r => r.me);
    box.innerHTML = (d.top.length ? d.top.map(row).join("") : `<p class="phint">Chưa có tiệm nào trên bảng.</p>`)
      + (mine && mine.rank && !inTop ? `<div class="rkgap">…</div>${row({ ...mine, rank: mine.rank, me: true })}` : "");
    $("#rkCouple")!.innerHTML = coupleHTML(d);
    const me = $("#rkMe");
    if (me && mine) me.innerHTML = `<span>${mine.rank ? `Hạng <b>${mine.rank}</b>` : "Tiệm đang ẩn khỏi bảng"}</span><b>${fmtN(netWorth().total)}</b>`;
  } catch {
    box.innerHTML = `<p class="phint">Không tải được bảng xếp hạng. Kiểm tra mạng rồi mở lại nha.</p>`;
  }
}
