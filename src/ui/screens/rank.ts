/* Bảng xếp hạng: username + tiền bán hàng (tiền bánh + tip + thưởng trong ca). Tuần này / Tất cả.
   Theo dõi username người ấy để hai tiệm hiện cạnh nhau. */
import { ic } from "../icons";
import { S } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { account, follow, leaderboard, type Board, type Rank } from "../../net/cloud";
import { $, esc, modal, toast } from "../dom";

let period: "week" | "all" = "week";
const MEDAL = ["#FFC53D", "#C9CCD6", "#E3A06B"];
const HEART = ic.heart(20, 2.2, "#FF7FA1", "pink");
const row = (r: Rank) => `<div class="rk ${r.me ? "me" : ""}"><span class="no" ${r.rank <= 3 ? `style="background:${MEDAL[r.rank - 1]};color:#4A3438"` : ""}>${r.rank}</span>
  <span class="nm"><span class="n1">${esc(r.username)}${r.me ? " <em>bạn</em>" : ""}</span><small>Lv ${r.lv}</small></span><b>${fmtN(r.earned)} xu</b>${r.me ? "" : `<button class="vbtn" data-visit="${esc(r.username)}" aria-label="Ghé thăm tiệm ${esc(r.username)}">Ghé thăm</button>`}</div>`;
const ago = (iso?: string) => { if (!iso) return ""; const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 1 ? "vừa chơi" : m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`; };

function coupleHTML(d: Board) {
  if (!d.me) return "";
  if (!d.follow) return `<div class="couple empty"><span>${HEART}</span><div class="cf"><b>Theo dõi người ấy</b><small>Nhập tên tiệm của người ấy để hai tiệm hiện cạnh nhau</small>
    <div class="crow2"><input id="fwIn" placeholder="tên tiệm" autocapitalize="none" autocorrect="off" maxlength="20"><button class="mini" id="fwGo">Theo dõi</button></div></div></div>`;
  const a = d.me, b = d.follow, diff = a.earned - b.earned;
  const lead = !diff ? "Hoà nhau" : `${esc(diff > 0 ? a.username : b.username)} dẫn trước ${fmtN(Math.abs(diff))} xu`;
  const side = (n: string, e: number, lv: number, sub: string, me: boolean) => `<div class="cs ${me ? "me" : ""}"><small>${me ? "Bạn" : "Người ấy"}</small><b>${esc(n)}</b><span>${fmtN(e)}</span><em>Lv ${lv}${sub}</em></div>`;
  return `<div class="couple"><div class="ch">Hai đứa mình · ${period === "week" ? "tuần này" : "tất cả"}<button class="alink" id="fwOff">bỏ theo dõi</button></div>
    <div class="cr">${side(a.username, a.earned, a.lv, "", true)}<span class="hv">${HEART}</span>${side(b.username, b.earned, b.lv, ` · ${ago(b.savedAt)}`, false)}</div><div class="cl">${lead}</div><button class="vbtn cvisit" data-visit="${esc(b.username)}">🏪 Ghé thăm tiệm ${esc(b.username)}</button></div>`;
}

/* Bảng xếp hạng dạng hộp thoại trượt từ dưới lên (mở từ nút 🏆, không sang màn khác) */
export function rankSheet() {
  modal(`<h2>Bảng xếp hạng</h2><p class="sub">Tiền bán hàng: bánh + tip + thưởng trong ca</p>
    <div class="seg rseg"><button class="${period === "week" ? "on" : ""}" data-period="week">Tuần này</button><button class="${period === "all" ? "on" : ""}" data-period="all">Tất cả</button></div>
    <div class="rkme" id="rkMe"><span>${esc(account())}</span><b>${period === "all" ? fmtN(S.earned) + " xu" : "…"}</b></div>
    <div id="rkCouple"></div>
    <div class="rkl" id="rkList"><p class="phint">Đang tải bảng xếp hạng…</p></div>
    <p class="phint">${period === "week" ? "Bảng tuần tính lại từ thứ Hai. " : ""}Chỉ tính tiền bán hàng, không tính quà tặng.</p>
    <div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
  document.querySelectorAll<HTMLButtonElement>("#modal [data-period]").forEach(b => b.addEventListener("click", () => {
    if (period === b.dataset.period) return;
    period = b.dataset.period as "week" | "all"; rankSheet();
  }));
  void load();
}
async function load() {
  const box = $("#rkList"); if (!box) return;
  try {
    const d = await leaderboard(period);
    if (!$("#rkList") || d.period !== period) return;
    const mine = d.me, inTop = d.top.some(r => r.me);
    box.innerHTML = (d.top.length ? d.top.map(row).join("") : `<p class="phint">${period === "week" ? "Tuần này chưa ai bán bánh. Mở tiệm để lên top nha!" : "Chưa có tiệm nào."}</p>`)
      + (mine?.rank && !inTop ? `<div class="rkgap">…</div>${row({ ...mine, rank: mine.rank, me: true })}` : "");
    $("#rkCouple")!.innerHTML = coupleHTML(d);
    if (mine) $("#rkMe")!.innerHTML = `<span>${mine.rank ? `Hạng <b>${mine.rank}</b> · ` : ""}${esc(mine.username)}</span><b>${fmtN(mine.earned)} xu</b>`;
    $("#fwGo")?.addEventListener("click", async () => {
      try { const r = await follow($<HTMLInputElement>("#fwIn")!.value.trim().toLowerCase()); toast(`Đang theo dõi ${r.username} ♥`); void load(); } catch (e) { toast((e as Error).message); }
    });
    $("#fwOff")?.addEventListener("click", async () => { await follow("").catch(() => {}); void load(); });
  } catch (e) {
    box.innerHTML = `<p class="phint">${esc((e as Error).message)}</p>`;
  }
}
