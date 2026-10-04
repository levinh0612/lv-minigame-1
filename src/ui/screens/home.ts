/* Màn Chính (HomeScreen của Claude Design): mái hiên, cảnh tiệm, thư hôm nay, Mở tiệm, 4 nút dưới */
import { portraitHTML } from "../portrait";
import { capacity, demand, expectedCustomers, needUpgrade, tableLvs } from "../../engine/economy";
import { STAFF } from "../../content/game";
import { daysTogether, eventNote, todayEvents } from "../../engine/dates";
import { decorCount, giftReady, goals, letterNew, lvl, unlocked, xpFor } from "../../engine/progress";
import { S, meLook } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { coinPill, esc } from "../dom";
import { guestSVG } from "../art";
import { room3dHTML } from "../room3d";
import { account, savedAgo } from "../../net/cloud";

/* Thẻ hồ sơ ở đầu màn chính: chân dung nhân vật của bạn (nửa người sau quầy), tên tiệm, cấp và kinh nghiệm */
export function profileCard(L: number, cur: number, need: number) {
  const n = S.shop.trim() || account(), len = [...n || "Matcha"].length, fs = len <= 8 ? 38 : len <= 12 ? 31 : len <= 16 ? 25 : 21;
  return `<div class="prof">
    <button class="pf-av" data-act="profile" aria-label="Hồ sơ của bạn: nhân vật, tên tiệm, màu giao diện">${portraitHTML(S.me.sprite, S.me, 104, guestSVG({ ...meLook(), mood: "happy" }, 104))}<span class="pf-ed" aria-hidden="true">✎</span></button>
    <div class="pf-main">
      <small class="pf-sub">${n ? "Tiệm Bánh của" : "Tiệm Bánh"}</small>
      <b class="pf-name" style="font-size:${fs}px">${esc(n || "Matcha")}</b>
      <button class="lvp wide" data-go="/muc-tieu" aria-label="Cấp ${L}, ${cur}/${need} kinh nghiệm"><span class="lb">Lv ${L}</span><span class="tr"><i style="width:${Math.min(100, cur / need * 100)}%"></i></span><small>${cur}/${need}</small></button>
    </div>
  </div>`;
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
/* icon thanh dưới: nét đầy, trắng trên nền gradient, cùng một cỡ nét */
const GL = (body: string) => `<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">${body}</svg>`;
const NAV_IC = {
  paw: GL('<ellipse cx="6.3" cy="10.2" rx="2" ry="2.6"/><ellipse cx="9.9" cy="6.1" rx="2" ry="2.7"/><ellipse cx="14.1" cy="6.1" rx="2" ry="2.7"/><ellipse cx="17.7" cy="10.2" rx="2" ry="2.6"/><path d="M12 11c-3 0-5.6 2.8-5.6 5 0 1.6 1.3 2.4 2.7 2.4 1 0 1.8-.5 2.9-.5s1.9.5 2.9.5c1.4 0 2.7-.8 2.7-2.4 0-2.2-2.6-5-5.6-5z"/>'),
  goal: GL('<rect x="4.8" y="4.2" width="14.4" height="17" rx="3.2"/><rect x="8.8" y="2.3" width="6.4" height="4" rx="1.7"/><path d="M8.6 13.4l2.4 2.4 4.4-4.8" fill="none" stroke="var(--dk)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  gift: GL('<rect x="4.6" y="10.2" width="14.8" height="10.6" rx="2.2"/><rect x="3.4" y="7.2" width="17.2" height="4.6" rx="1.8"/><path d="M12 7.2v13.6" stroke="var(--dk)" stroke-width="2.4"/><path d="M12 7.2C9.4 7.2 7.9 6 7.9 4.7S9.3 3 10.4 3.5 12 5.6 12 7.2zM12 7.2c2.6 0 4.1-1.2 4.1-2.5S14.7 3 13.6 3.5 12 5.6 12 7.2z"/>'),
  shop: GL('<path d="M3.4 9.6 5 4.4h14l1.6 5.2c0 1.5-1.1 2.5-2.4 2.5s-2.4-1-2.4-2.5c0 1.5-1.1 2.5-2.3 2.5s-2.3-1-2.3-2.5c0 1.5-1.1 2.5-2.4 2.5S3.4 11.1 3.4 9.6z"/><path d="M5.4 13.4v7.2h13.2v-7.2z"/><rect x="10" y="15.4" width="4" height="5.2" rx="1" fill="var(--dk)"/>')
};

export function homeHTML() {
  const te = todayEvents(), ln = letterNew(), gift = giftReady(), L = lvl(), cur = S.xp - xpFor(L), need = xpFor(L + 1) - xpFor(L);
  const left = goals().filter(g => g.cur < g.need).length, hired = STAFF.filter(d => S.staff[d.id].hired).length;
  const card = te.length
    ? `<button class="hcard ev" data-act="letter"><span class="ic">${CAKE}</span><span class="tx"><b>${esc(te[0].t)} · xu ×2</b><small>${esc(eventNote(te[0]))}</small></span><i class="dot"></i></button>`
    : `<button class="hcard" data-act="letter"><span class="ic">${ENV}</span><span class="tx"><b>${ln ? "Thư hôm nay đã đến" : "Đã đọc thư hôm nay"}</b><small>${ln ? "Chạm để mở thư" : `Chuỗi ${S.streak} ngày · chạm để đọc lại`}</small></span>${ln ? `<i class="dot"></i>` : ""}</button>`;
  const nav = [
    { n: "Thú cưng", ic: NAV_IC.paw, c1: "#8EE0BC", c2: "#3FB68A", dk: "#3FB68A", go: "/cua-hang/thu-cung", dot: "" },
    { n: "Mục tiêu", ic: NAV_IC.goal, c1: "#FFD66B", c2: "#F2A41F", dk: "#F2A41F", go: "/muc-tieu", dot: left ? String(left) : "" },
    { n: "Quà tặng", ic: NAV_IC.gift, c1: "#FF9DB6", c2: "#EE5A83", dk: "#EE5A83", go: "/cua-hang/qua-tang", dot: gift ? "1" : "" },
    { n: "Cửa hàng", ic: NAV_IC.shop, c1: "#C2B0FA", c2: "#8B6FE6", dk: "#8B6FE6", go: "/cua-hang", dot: "" }
  ];
  const nm = S.shop.trim() || account(), nlen = [...nm || "Matcha"].length, fs = nlen <= 8 ? 22 : nlen <= 12 ? 19 : nlen <= 16 ? 17 : 15, pct = Math.min(100, cur / need * 100);
  const prof = `<div class="prof6">
      <button class="pf-av6" data-act="profile" aria-label="Hồ sơ của bạn: nhân vật, tên tiệm, màu giao diện">${portraitHTML(S.me.sprite, S.me, 58, guestSVG({ ...meLook(), mood: "happy" }, 58), "", true)}<span class="pf-lv6">${L}</span></button>
      <div class="pf-main6">
        <div class="pf-t6"><small>${nm ? "Tiệm Bánh của" : "Tiệm Bánh"}</small><b style="font-size:${fs}px">${esc(nm || "Matcha")}</b></div>
        <button class="xp6" data-go="/muc-tieu" aria-label="Cấp ${L}, ${cur}/${need} kinh nghiệm, mở Mục tiêu"><span class="xt"><i style="width:${pct}%"></i></span><em>${cur}/${need}</em></button>
      </div>
    </div>`;
  /* 3D chiếm cả màn hình; mọi thứ khác (thanh trên, hồ sơ, thư, nút Mở tiệm, 4 nút) là lớp phủ trên và dưới */
  return `<div class="scr home5">
    <div class="h5-room">${room3dHTML(S.room, { event: te.length > 0, recipes: unlocked().length, giftDot: gift, guests: Math.min(2, S.served ? 2 : 1), tables: tableLvs().join(","), wide: S.venue.wide, floors: S.venue.floors }, false, true)}</div>
    <div class="h5-top">
      <div class="hrow4">
        <button class="pill love4" data-act="days" aria-label="Ngày kỷ niệm"><span>${HEART}</span>${fmtN(daysTogether())} ngày<em> yêu</em></button>
        <div class="sp"></div>
        <button class="rbtn" data-act="rank" aria-label="Bảng xếp hạng">${CUP}</button>
        <button class="rbtn" data-act="music" aria-label="Nhạc nền" style="${S.music ? "" : "opacity:.45"}">${MUSIC}</button>
        <button class="rbtn" data-act="settings" aria-label="Cài đặt">${GEAR}</button>
        ${coinPill()}
      </div>
      ${prof}
      <div class="h5-chips"><span class="pchip lav">🛍 ${decorCount()} đồ trang trí</span><span class="pchip lav">🐾 ${hired} nhân viên</span><button class="pchip ${needUpgrade() ? "warn" : "lav"}" data-act="venue">🪑 ${capacity()}/${demand()} ghế${needUpgrade() ? " · cần nâng cấp" : ""}</button><button class="pchip mint" data-act="account" id="cloudAt">${cloudLine()}</button><button class="pchip" data-go="/sap-ra-mat">✦ Sắp ra mắt</button></div>
    </div>
    <div class="h5-bottom">
      ${te.length ? card : ""}
      <div class="h5-row">
        ${te.length ? "" : `<button class="h5-mail" data-act="letter" aria-label="${ln ? "Thư hôm nay đã đến, chạm để mở" : "Đọc lại thư hôm nay"}">${ENV}${ln ? `<i class="dot"></i>` : ""}</button>`}
        <button class="b3 h5-open" data-go="/chuan-bi"><span>Mở tiệm</span><small>Ca ${S.shifts + 1} · dự kiến ${expectedCustomers()} khách</small></button>
        <button class="h5-fix2" data-go="/cua-hang" aria-label="Sửa tiệm">${PEN}</button>
      </div>
      <nav class="dock">${nav.map(x => `<button data-go="${x.go}" style="--c1:${x.c1};--c2:${x.c2};--dk:${x.dk}"><span class="ic">${x.ic}</span>${x.dot ? `<span class="nd">${x.dot}</span>` : ""}<b>${x.n}</b></button>`).join("")}</nav>
    </div>
  </div>`;
}
