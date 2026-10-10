/* Màn Chính (HomeScreen của Claude Design): mái hiên, cảnh tiệm, thư hôm nay, Mở tiệm, 4 nút dưới */
import { achPending } from "../../engine/achievements";
import { weeklyPending } from "../../engine/weekly";
import { capacity, demand, expectedCustomers, tableLvs } from "../../engine/economy";
import { daysTogether, eventNote, todayEvents } from "../../engine/dates";
import { fx, giftReady, goals, letterNew, lvl, unlocked, xpFor } from "../../engine/progress";
import { S, meLook } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { mouseTitle } from "../../engine/mouse";
import { coinPill, esc, shopStatsHTML } from "../dom";
import { ic } from "../icons";
import { guestSVG } from "../art";
import { levelFrame, levelMedal } from "../badges";
import { room3dHTML } from "../room3d";
import { account, savedAgo } from "../../net/cloud";

export const cloudLine = () => { const a = savedAgo(); return a ? `☁︎ đã lưu ${a}` : "☁︎ chưa lưu"; };
addEventListener("cloud:saved", () => { const e = document.getElementById("cloudAt"); if (e) e.textContent = cloudLine(); });

const HEART = ic.heart(18, 2.2, "#FF7FA1", "pink");
const MUSIC = ic.music(20, 2.3, "none", "pink");
const GEAR = ic.gear(20, 2.1, "none", "violet");
const PEN = ic.pen(20, 2.2, "none", "violet");
const ENV = `<svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="#4A3438" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="26" height="18" rx="3" fill="var(--pink-m)"/><path d="M2.5 3.5 L15 12 L27.5 3.5" fill="var(--pink)"/><circle cx="15" cy="12" r="3.2" fill="var(--pink-d)" stroke-width="1.8"/></svg>`;
const CAKE = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#4A3438" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="13" width="20" height="11" rx="3" fill="#FFB3C7"/><path d="M4 17 C8 19 10 15 14 17 C18 19 20 15 24 17" stroke-width="1.8"/><rect x="12.5" y="6" width="3" height="7" fill="#fff"/><path d="M14 2 C12 4 12 6 14 6 C16 6 16 4 14 2 Z" fill="#FF8F4D" stroke-width="1.6"/></svg>`;
/* icon thanh dưới: Lucide trắng trên nền gradient, cùng một cỡ nét */
const NAV_IC = {
  goal: ic.target(26, 2.4, "none", ""), gacha: ic.sparkle(26, 2.4, "none", ""),
  gift: ic.gift(26, 2.4, "none", ""), shop: ic.store(26, 2.4, "none", "")
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
      <button class="pc-av" style="--p:${pct}" data-act="profile" aria-label="Hồ sơ của bạn, cấp ${L}, ${cur}/${need} kinh nghiệm">${guestSVG({ ...meLook(), mood: "happy", ledge: false }, 72)}${levelFrame(L)}<span class="pc-lv bdg">${levelMedal(L, 34)}</span></button>
      <div class="pc-t">
        <small>${ic.sprout(16, 2.2)}${nm ? "Tiệm Bánh của" : "Tiệm Bánh"}</small>
        <b style="font-size:${fs}px">${esc(nm || "Matcha")}</b>
        ${title ? `<em class="pc-title">${ic.crown(13, 2.4)}${esc(title)}</em>` : ""}
        <div class="pc-stats"><span>${ic.seat(20, 2)}<i><small>Sức chứa</small><b>${capacity()} ghế</b></i></span><span>${ic.fire(20, 2)}<i><small>Độ viral</small><b>${demand()} khách</b></i></span></div>
      </div>
    </div>
    <button class="pc-buffs" data-act="buff" aria-label="Buff đang có">${BUFFS.map(([k, f]) => `<span class="bf ${k} ${fx(k) ? "" : "zero"}">${f(15, 2.4)}${buffText(k)}</span>`).join("")}<i>${ic.chevron(18, 2.6)}</i></button>
    ${shopStatsHTML()}
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
    { n: "Nhiệm vụ", ic: ic.trophy(26, 2.4), c1: "#FFB27A", c2: "#E5622E", go: "/thanh-tich", dot: weeklyPending() + achPending() ? String(weeklyPending() + achPending()) : "" },
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
      <nav class="dock" style="grid-template-columns:repeat(6,minmax(0,1fr))">${nav.map(x => `<button ${"go" in x ? `data-go="${x.go}"` : `data-act="${x.act}"`} style="--c1:${x.c1};--c2:${x.c2};--dk:${x.c2}"><span class="ic">${x.ic}</span>${x.dot ? `<span class="nd">${x.dot}</span>` : ""}<b>${x.n}</b></button>`).join("")}</nav>
    </div>
  </div>`;
}
