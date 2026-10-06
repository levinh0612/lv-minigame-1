/* Màn Chính (HomeScreen của Claude Design): mái hiên, cảnh tiệm, thư hôm nay, Mở tiệm, 4 nút dưới */
import { capacity, demand, expectedCustomers, tableLvs } from "../../engine/economy";
import { daysTogether, eventNote, todayEvents } from "../../engine/dates";
import { fx, giftReady, goals, letterNew, lvl, unlocked, xpFor } from "../../engine/progress";
import { S, meLook } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { mouseTitle } from "../../engine/mouse";
import { coinPill, esc, shopStatsHTML } from "../dom";
import { ic } from "../icons";
import { guestSVG } from "../art";
import { levelBadge, levelFrame } from "../badges";
import { room3dHTML } from "../room3d";
import { account, savedAgo } from "../../net/cloud";

export const cloudLine = () => { const a = savedAgo(); return a ? `☁︎ đã lưu ${a}` : "☁︎ chưa lưu"; };
addEventListener("cloud:saved", () => { const e = document.getElementById("cloudAt"); if (e) e.textContent = cloudLine(); });

const HEART = `<svg width="16" height="15" viewBox="0 0 16 14" aria-hidden="true"><path d="M8 13 C4 10 1 7.5 1 4.5 C1 2 3 1 4.7 1 C6.2 1 7.4 2 8 3 C8.6 2 9.8 1 11.3 1 C13 1 15 2 15 4.5 C15 7.5 12 10 8 13 Z" fill="#FF6F91" stroke="#4A3438" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const MUSIC = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--pink-d)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 14 V3 L15 1.5 V12"/><circle cx="5" cy="14" r="2.4" fill="var(--pink-d)"/><circle cx="13" cy="12" r="2.4" fill="var(--pink-d)"/></svg>`;
const GEAR = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--pink-d)" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M10 1.8 L12 4.2 L15.1 3.8 L15.5 6.9 L18 8.8 L16.4 11.5 L17.2 14.5 L14.2 15.4 L12.9 18.2 L10 17 L7.1 18.2 L5.8 15.4 L2.8 14.5 L3.6 11.5 L2 8.8 L4.5 6.9 L4.9 3.8 L8 4.2 Z"/><circle cx="10" cy="10.3" r="2.8"/></svg>`;
const PEN = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--pink-d)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3 L17 7 L8 16 L3.5 16.5 L4 12 Z" fill="var(--pink-l)"/><path d="M11 5 L15 9"/></svg>`;
const ENV = `<svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="#4A3438" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="26" height="18" rx="3" fill="var(--pink-m)"/><path d="M2.5 3.5 L15 12 L27.5 3.5" fill="var(--pink)"/><circle cx="15" cy="12" r="3.2" fill="var(--pink-d)" stroke-width="1.8"/></svg>`;
const CAKE = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#4A3438" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="13" width="20" height="11" rx="3" fill="#FFB3C7"/><path d="M4 17 C8 19 10 15 14 17 C18 19 20 15 24 17" stroke-width="1.8"/><rect x="12.5" y="6" width="3" height="7" fill="#fff"/><path d="M14 2 C12 4 12 6 14 6 C16 6 16 4 14 2 Z" fill="#FF8F4D" stroke-width="1.6"/></svg>`;
/* icon thanh dưới: nét đầy, trắng trên nền gradient, cùng một cỡ nét */
const GL = (body: string) => `<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">${body}</svg>`;
const NAV_IC = {
  goal: GL('<rect x="4.8" y="4.2" width="14.4" height="17" rx="3.2"/><rect x="8.8" y="2.3" width="6.4" height="4" rx="1.7"/><path d="M8.6 13.4l2.4 2.4 4.4-4.8" fill="none" stroke="var(--dk)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  gacha: GL('<path d="M12 2.4l2.3 5.6 6 .5-4.6 3.9 1.4 5.9L12 15l-5.1 3.3 1.4-5.9L3.7 8.5l6-.5z"/><circle cx="19" cy="18.5" r="2.2"/><circle cx="5" cy="19" r="1.5"/>'),
  gift: GL('<rect x="4.6" y="10.2" width="14.8" height="10.6" rx="2.2"/><rect x="3.4" y="7.2" width="17.2" height="4.6" rx="1.8"/><path d="M12 7.2v13.6" stroke="var(--dk)" stroke-width="2.4"/><path d="M12 7.2C9.4 7.2 7.9 6 7.9 4.7S9.3 3 10.4 3.5 12 5.6 12 7.2zM12 7.2c2.6 0 4.1-1.2 4.1-2.5S14.7 3 13.6 3.5 12 5.6 12 7.2z"/>'),
  shop: GL('<path d="M3.4 9.6 5 4.4h14l1.6 5.2c0 1.5-1.1 2.5-2.4 2.5s-2.4-1-2.4-2.5c0 1.5-1.1 2.5-2.3 2.5s-2.3-1-2.3-2.5c0 1.5-1.1 2.5-2.4 2.5S3.4 11.1 3.4 9.6z"/><path d="M5.4 13.4v7.2h13.2v-7.2z"/><rect x="10" y="15.4" width="4" height="5.2" rx="1" fill="var(--dk)"/>')
};

const BUFFS = [["price", ic.coins, "Giá bánh"], ["tip", ic.heart, "Tip"], ["pat", ic.hourglass, "Khách chờ lâu"], ["cust", ic.userPlus, "Thêm khách mỗi ca"]] as const;
export const buffText = (k: (typeof BUFFS)[number][0]) => k === "cust" ? `+${fx(k)}` : `+${Math.round(fx(k) * 100)}%`;
export const BUFF_LABEL = Object.fromEntries(BUFFS.map(b => [b[0], b[2]])) as Record<(typeof BUFFS)[number][0], string>;
export const buffIcon = (k: (typeof BUFFS)[number][0], size: number, fill = "none") => BUFFS.find(b => b[0] === k)![1](size, 2.4, fill);

/* Thẻ hồ sơ: avatar có vòng kinh nghiệm, tên tiệm, danh hiệu, sức chứa / độ viral, hàng buff */
function profileCard(L: number, cur: number, need: number) {
  const nm = S.shop.trim() || account(), len = [...nm || "Matcha"].length, fs = len <= 8 ? 28 : len <= 12 ? 24 : len <= 16 ? 21 : 18, pct = Math.min(100, cur / need * 100), title = mouseTitle();
  return `<div class="pcard5">
    <div class="pc-top">
      <button class="pc-av" style="--p:${pct}" data-act="profile" aria-label="Hồ sơ của bạn, cấp ${L}, ${cur}/${need} kinh nghiệm">${guestSVG({ ...meLook(), mood: "happy", ledge: false }, 72)}${levelFrame(L)}<span class="pc-lv bdg">${levelBadge(L, 34)}</span></button>
      <div class="pc-t">
        <small>${ic.sprout(16, 2.2)}${nm ? "Tiệm Bánh của" : "Tiệm Bánh"}</small>
        <b style="font-size:${fs}px">${esc(nm || "Matcha")}</b>
        ${title ? `<em class="pc-title">${ic.crown(13, 2.4)}${esc(title)}</em>` : ""}
        <div class="pc-stats"><span>${ic.seat(20, 2)}<i><small>Sức chứa</small><b>${capacity()} ghế</b></i></span><span>${ic.fire(20, 2)}<i><small>Độ viral</small><b>${demand()} khách</b></i></span></div>
      </div>
    </div>
    <button class="pc-buffs" data-act="buff" aria-label="Buff đang có">${BUFFS.map(([k, f]) => `<span class="bf ${k} ${fx(k) ? "" : "zero"}">${f(15, 2.4)}${buffText(k)}</span>`).join("")}<i>${ic.chevron(18, 2.6)}</i></button>
    ${shopStatsHTML(S.earned, S.served, unlocked().length)}
  </div>`;
}

export function homeHTML() {
  const te = todayEvents(), ln = letterNew(), gift = giftReady(), L = lvl(), cur = S.xp - xpFor(L), need = xpFor(L + 1) - xpFor(L);
  const left = goals().filter(g => g.cur < g.need).length, rk = S.cloud.rank;
  const card = te.length
    ? `<button class="hcard ev" data-act="letter"><span class="ic">${CAKE}</span><span class="tx"><b>${esc(te[0].t)} · xu ×2</b><small>${esc(eventNote(te[0]))}</small></span><i class="dot"></i></button>`
    : "";
  const nav = [
    { n: "Mục tiêu", ic: NAV_IC.goal, c1: "#FFD66B", c2: "#F2A41F", go: "/muc-tieu", dot: left ? String(left) : "" },
    { n: "Quà tặng", ic: NAV_IC.gift, c1: "#FF9DB6", c2: "#EE5A83", go: "/cua-hang/qua-tang", dot: gift ? "1" : "" },
    { n: "Triệu hồi", ic: NAV_IC.gacha, c1: "#8EC5FF", c2: "#4C8DF0", go: "/gacha", dot: "" },
    { n: "Cửa hàng", ic: NAV_IC.shop, c1: "#C2B0FA", c2: "#8B6FE6", go: "/cua-hang", dot: "" },
    { n: "Menu", ic: ic.menu(26, 3), c1: "#B9C6E6", c2: "#6B7BA6", act: "more", dot: "" }
  ];
  /* 3D chiếm cả màn hình; mọi thứ khác (thanh trên, hồ sơ, thư, nút Mở tiệm, thanh dưới) là lớp phủ trên và dưới */
  return `<div class="scr home5">
    <div class="h5-room">${room3dHTML(S.room, { event: te.length > 0, recipes: unlocked().length, giftDot: gift, guests: Math.min(2, S.served ? 2 : 1), tables: tableLvs().join(","), wide: S.venue.wide, floors: S.venue.floors }, false, true)}</div>
    <div class="h5-top">
      <div class="hrow5">
        <div class="duo5">
          <button class="love5" data-act="days" aria-label="Ngày kỷ niệm, ${fmtN(daysTogether())} ngày yêu"><span>${HEART}</span><b>${fmtN(daysTogether())}</b><i class="plus5">${ic.plus(13, 3.2)}</i></button>
          <button class="rk5" data-act="rank" aria-label="Bảng xếp hạng">${ic.trophy(18, 2)}<b id="rk5n">${rk ? "#" + fmtN(rk) : "Hạng"}</b></button>
        </div>
        <div class="sp"></div>
        <button class="rbtn" data-act="music" aria-label="Nhạc nền" style="${S.music ? "" : "opacity:.45"}">${MUSIC}</button>
        <button class="rbtn" data-act="settings" aria-label="Cài đặt">${GEAR}</button>
        ${coinPill(false, "", true)}
      </div>
      ${profileCard(L, cur, need)}
    </div>
    <div class="h5-bottom">
      ${card}
      <div class="h5-row">
        ${te.length ? "" : `<button class="h5-mail" data-act="letter" aria-label="${ln ? "Thư hôm nay đã đến, chạm để mở" : "Đọc lại thư hôm nay"}">${ENV}${ln ? `<i class="dot"></i>` : ""}</button>`}
        <button class="b3 h5-open" data-go="/chuan-bi"><span>${ic.store(26, 2.4)}Mở tiệm</span><small>Ca ${S.shifts + 1} · dự kiến ${expectedCustomers()} khách</small></button>
        <button class="h5-fix2" data-go="/cua-hang" aria-label="Sửa tiệm">${PEN}</button>
      </div>
      <nav class="dock">${nav.map(x => `<button ${"go" in x ? `data-go="${x.go}"` : `data-act="${x.act}"`} style="--c1:${x.c1};--c2:${x.c2};--dk:${x.c2}"><span class="ic">${x.ic}</span>${x.dot ? `<span class="nd">${x.dot}</span>` : ""}<b>${x.n}</b></button>`).join("")}</nav>
    </div>
  </div>`;
}
