/* Màn Chính (HomeScreen của Claude Design): mái hiên, cảnh tiệm, thư hôm nay, Mở tiệm, 4 nút dưới */
import { STAFF } from "../../content/game";
import { daysTogether, eventNote, todayEvents } from "../../engine/dates";
import { decorCount, giftReady, goals, letterNew, lvl, unlocked, xpFor } from "../../engine/progress";
import { S } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { coinPill, esc } from "../dom";
import { roomHTML } from "../room";
import { account, savedAgo } from "../../net/cloud";

/* tiêu đề theo tên tiệm người chơi đặt: "Tiệm của Vinh" -> nhỏ "Tiệm Bánh của", to "Vinh" */
export function shopTitle() {
  const n = account();
  if (!n) return `<div><small>Tiệm Bánh</small><b>Matcha</b></div>`;
  const len = [...n].length, fs = len <= 8 ? 44 : len <= 12 ? 36 : len <= 16 ? 29 : 24;
  return `<div class="tname"><small>Tiệm Bánh của</small><b style="font-size:${fs}px">${esc(n)}</b></div>`;
}
export const cloudLine = () => { const a = savedAgo(); return a ? `☁︎ đã lưu ${a}` : "☁︎ chưa lưu"; };
addEventListener("cloud:saved", () => { const e = document.getElementById("cloudAt"); if (e) e.textContent = cloudLine(); });

const HEART = `<svg width="16" height="15" viewBox="0 0 16 14" aria-hidden="true"><path d="M8 13 C4 10 1 7.5 1 4.5 C1 2 3 1 4.7 1 C6.2 1 7.4 2 8 3 C8.6 2 9.8 1 11.3 1 C13 1 15 2 15 4.5 C15 7.5 12 10 8 13 Z" fill="#FF6F91" stroke="#4A3438" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const MUSIC = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#C07A8C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 14 V3 L15 1.5 V12"/><circle cx="5" cy="14" r="2.4" fill="#C07A8C"/><circle cx="13" cy="12" r="2.4" fill="#C07A8C"/></svg>`;
const GEAR = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#C07A8C" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M10 1.8 L12 4.2 L15.1 3.8 L15.5 6.9 L18 8.8 L16.4 11.5 L17.2 14.5 L14.2 15.4 L12.9 18.2 L10 17 L7.1 18.2 L5.8 15.4 L2.8 14.5 L3.6 11.5 L2 8.8 L4.5 6.9 L4.9 3.8 L8 4.2 Z"/><circle cx="10" cy="10.3" r="2.8"/></svg>`;
const PEN = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#C07A8C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3 L17 7 L8 16 L3.5 16.5 L4 12 Z" fill="#FFE3EA"/><path d="M11 5 L15 9"/></svg>`;
const ENV = `<svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="#4A3438" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="26" height="18" rx="3" fill="#FFB3C7"/><path d="M2.5 3.5 L15 12 L27.5 3.5" fill="#FF9FB6"/><circle cx="15" cy="12" r="3.2" fill="#E0567A" stroke-width="1.8"/></svg>`;
const CAKE = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#4A3438" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="13" width="20" height="11" rx="3" fill="#FFB3C7"/><path d="M4 17 C8 19 10 15 14 17 C18 19 20 15 24 17" stroke-width="1.8"/><rect x="12.5" y="6" width="3" height="7" fill="#fff"/><path d="M14 2 C12 4 12 6 14 6 C16 6 16 4 14 2 Z" fill="#FF8F4D" stroke-width="1.6"/></svg>`;
const CUP = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#C07A8C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3 H14 V8 C14 11 12 12.5 10 12.5 C8 12.5 6 11 6 8 Z" fill="#FFE3A0"/><path d="M6 5 H3.5 C3.5 8 5 9 6.5 9 M14 5 H16.5 C16.5 8 15 9 13.5 9 M10 12.5 V15.5 M6.5 17.5 H13.5 L12.5 15.5 H7.5 Z"/></svg>`;
const NAV_IC = {
  paw: `<svg width="30" height="30" viewBox="0 0 30 30" fill="#fff" stroke="#4A3438" stroke-width="2.2" stroke-linejoin="round"><ellipse cx="15" cy="20" rx="7.5" ry="6.5" fill="#7FD1AE"/><ellipse cx="7" cy="12.5" rx="3" ry="3.8"/><ellipse cx="12" cy="7.5" rx="3" ry="3.8"/><ellipse cx="18" cy="7.5" rx="3" ry="3.8"/><ellipse cx="23" cy="12.5" rx="3" ry="3.8"/></svg>`,
  goal: `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#4A3438" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><rect x="5" y="4" width="20" height="23" rx="4" fill="#fff"/><rect x="10" y="2" width="10" height="5" rx="2" fill="#FFD66B"/><path d="M9 13 L11 15 L14.5 11" stroke-width="2"/><path d="M17 13.5 H21" stroke-width="2"/><path d="M9 20.5 L11 22.5 L14.5 18.5" stroke-width="2"/><path d="M17 21 H21" stroke-width="2"/></svg>`,
  gift: `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#4A3438" stroke-width="2.2" stroke-linejoin="round"><rect x="5" y="13" width="20" height="14" rx="2.5" fill="#fff"/><rect x="3" y="9" width="24" height="6" rx="2" fill="#FF9FB6"/><path d="M15 9 V27" stroke="#FF6F91" stroke-width="4"/><path d="M15 9 C11 3 6 5 8.5 8.5 C10 9.5 13 9 15 9 C17 9 20 9.5 21.5 8.5 C24 5 19 3 15 9 Z" fill="#FF9FB6"/></svg>`,
  shop: `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#4A3438" stroke-width="2.2" stroke-linejoin="round"><rect x="5" y="13" width="20" height="14" rx="2" fill="#fff"/><rect x="12" y="18" width="6" height="9" fill="#C9B8F0"/><path d="M3 12 L5.5 4 H24.5 L27 12 C27 14.5 23.5 14.5 23 12 C22.5 14.5 18.5 14.5 18 12 C17.5 14.5 12.5 14.5 12 12 C11.5 14.5 7.5 14.5 7 12 C6.5 14.5 3 14.5 3 12 Z" fill="#B7A3EE"/></svg>`
};

export function homeHTML() {
  const te = todayEvents(), ln = letterNew(), gift = giftReady(), L = lvl(), cur = S.xp - xpFor(L), need = xpFor(L + 1) - xpFor(L);
  const left = goals().filter(g => g.cur < g.need).length, hired = STAFF.filter(d => S.staff[d.id].hired).length;
  const card = te.length
    ? `<button class="hcard ev" data-act="letter"><span class="ic">${CAKE}</span><span class="tx"><b>${esc(te[0].t)} · xu ×2</b><small>${esc(eventNote(te[0]))}</small></span><i class="dot"></i></button>`
    : `<button class="hcard" data-act="letter"><span class="ic">${ENV}</span><span class="tx"><b>${ln ? "Thư hôm nay đã đến" : "Đã đọc thư hôm nay"}</b><small>${ln ? "Chạm để mở thư" : `Chuỗi ${S.streak} ngày · chạm để đọc lại`}</small></span>${ln ? `<i class="dot"></i>` : ""}</button>`;
  const nav = [
    { n: "Thú cưng", ic: NAV_IC.paw, bg: "#DDF4E8", sh: "#BFE8D3", go: "/cua-hang/thu-cung", dot: "" },
    { n: "Mục tiêu", ic: NAV_IC.goal, bg: "#FFF0C9", sh: "#F6DB94", go: "/muc-tieu", dot: left ? String(left) : "" },
    { n: "Quà tặng", ic: NAV_IC.gift, bg: "#FFE3EA", sh: "#F6CBD7", go: "/cua-hang/qua-tang", dot: gift ? "1" : "" },
    { n: "Cửa hàng", ic: NAV_IC.shop, bg: "#EDE6FF", sh: "#D6CBF6", go: "/cua-hang", dot: "" }
  ];
  return `<div class="scr home4">
    <div class="awn4"></div><div class="awn4b"></div>
    <div class="hrow4">
      <div class="pill love4"><span>${HEART}</span>${fmtN(daysTogether())} ngày<em> yêu</em></div>
      <div class="sp"></div>
      <button class="rbtn" data-go="/xep-hang" aria-label="Bảng xếp hạng">${CUP}</button>
      <button class="rbtn" data-music aria-label="Bật/tắt nhạc" style="${S.music ? "" : "opacity:.45"}">${MUSIC}</button>
      <button class="rbtn" data-act="settings" aria-label="Cài đặt">${GEAR}</button>
      ${coinPill()}
    </div>
    <div class="htitle">${shopTitle()}
      <div class="hr"><button class="lvp" data-go="/muc-tieu" aria-label="Cấp ${L}, ${cur}/${need} kinh nghiệm"><span class="lb">Lv ${L}</span><span class="tr"><i style="width:${Math.min(100, cur / need * 100)}%"></i></span><small>${cur}/${need}</small></button>
        <span class="own">${decorCount()} đồ trang trí · ${hired} nhân viên</span><span class="hmeta"><button class="saved" data-act="account" id="cloudAt">${cloudLine()}</button> · <button class="soon4" data-go="/sap-ra-mat">✦ Sắp ra mắt</button></span></div></div>
    <div class="hroom">${roomHTML(S.room, { event: te.length > 0, recipes: unlocked().length, giftDot: gift, guests: Math.min(2, S.served ? 2 : 1) })}
      <button class="fix" data-go="/cua-hang">${PEN}Sửa tiệm</button></div>
    ${card}
    <div class="openw4"><button class="b3" data-go="/chuan-bi">Mở tiệm</button></div>
    <nav class="nav4">${nav.map(x => `<button data-go="${x.go}"><span class="ic" style="background:${x.bg};box-shadow:0 4px 0 ${x.sh}">${x.ic}</span>${x.dot ? `<span class="nd">${x.dot}</span>` : ""}${x.n}</button>`).join("")}</nav>
  </div>`;
}
