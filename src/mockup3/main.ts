/* Mock v3: màn hình MỚI dựng bằng chính CSS + hình + 3D của game (main.css, cakeSVG, ingSVG, gachaArt, homeHTML, phòng 3D).
   Chỉ phần chưa có trong game mới nằm ở m3.css. Mở /mockup-v3.html (npm run dev). Không ghi vào tiến trình thật. */
import "../styles/main.css";
import "../styles/themes.css";
import "../storybook/sb.css";
import "./m3.css";
import { CATS, RECIPES, STOCK_KEYS, UNIT_COST, type PartKey } from "../content/game";
import { GACHA_ITEMS, RARITY, type GachaItem } from "../content/gacha";
import { applyTheme, THEMES } from "../content/theme";
import { placeStaff, floorOfStaff, staffAt, hasItem, masteryOf } from "../engine/gacha";
import { stockOf } from "../engine/economy";
import { fx, rollDay, xpFor } from "../engine/progress";
import { ROOM_CATS, roomItem } from "../content/room";
import { S, resetState, setPersist } from "../engine/state";
import { cakeSVG, guestSVG, ingSVG } from "../ui/art";
import { esc, coinPill } from "../ui/dom";
import { modal } from "../ui/dom";
import { gachaArt } from "../ui/gachafx";
import { hydratePortraits, portraitHTML } from "../ui/portrait";
import { mountRooms } from "../ui/room3d";
import { fitRooms } from "../ui/room";
import { homeHTML } from "../ui/screens/home";
import { pageHead } from "../ui/screens/prep";
import { loadSprites } from "../ui/sprite";
import { meLook } from "../engine/state";

setPersist(false);

/* ================= Dữ liệu mẫu ================= */
resetState(); S.tut = true; S.coins = 13725; S.streak = 5; S.shifts = 42; S.shop = "Lê Vĩnh"; S.theme = "blue"; S.venue.floors = 3;
rollDay();
{ const L = 13; S.xp = xpFor(L) + Math.floor((xpFor(L + 1) - xpFor(L)) * 0.9); }
const mgrs = GACHA_ITEMS.filter(i => i.kind === "manager"), pets = GACHA_ITEMS.filter(i => i.kind === "mascot"), cakes = GACHA_ITEMS.filter(i => i.kind === "recipe");
[...mgrs.slice(0, 4), ...pets.slice(0, 4), ...cakes.slice(0, 2)].forEach(i => { S.gacha.owned[i.id] = 1; });
S.gacha.owned[cakes[0].id] = 3;
([0, 1, 2] as const).forEach(f => { placeStaff("mgr", mgrs[f].id, f); placeStaff("mascot", pets[f].id, f); });
S.room.wall = "starry"; S.room.counter = "gold"; S.room.floor = "sakura";
applyTheme(new URLSearchParams(location.search).get("theme") || "blue");

/* ================= Tiện ích dựng giao diện ================= */
const GL = (body: string, c = "#fff") => `<svg width="28" height="28" viewBox="0 0 24 24" fill="${c}" aria-hidden="true">${body}</svg>`;
const IC = {
  book: GL('<path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v13H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M8.5 8.5h6M8.5 12h4" stroke="var(--dk)" stroke-width="1.9" stroke-linecap="round"/>'),
  basket: GL('<path d="M3 9.5h18l-2 10a2 2 0 0 1-2 1.6H7a2 2 0 0 1-2-1.6z"/><path d="M8 9.5l3-5.5M16 9.5l-3-5.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  boss: GL('<circle cx="12" cy="7.4" r="3.8"/><path d="M4.4 20.5c0-4.3 3.3-6.8 7.6-6.8s7.6 2.5 7.6 6.8z"/><path d="M12 14.4l-1.3 2.2 1.3 2.4 1.3-2.4z" fill="var(--dk)"/>'),
  paw: GL('<ellipse cx="6.3" cy="10.2" rx="2" ry="2.6"/><ellipse cx="9.9" cy="6.1" rx="2" ry="2.7"/><ellipse cx="14.1" cy="6.1" rx="2" ry="2.7"/><ellipse cx="17.7" cy="10.2" rx="2" ry="2.6"/><path d="M12 11c-3 0-5.6 2.8-5.6 5 0 1.6 1.3 2.4 2.7 2.4 1 0 1.8-.5 2.9-.5s1.9.5 2.9.5c1.4 0 2.7-.8 2.7-2.4 0-2.200-2.600-5-5.600-5z"/>'),
  user: GL('<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="9.6" r="3.1" fill="var(--dk)"/><path d="M6.2 18c1.200-3.100 3.400-4.200 5.800-4.200s4.600 1.100 5.800 4.200" fill="var(--dk)"/>'),
  cup: GL('<path d="M7 3h10v6a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" fill="none" stroke="#fff" stroke-width="1.9"/><rect x="10.5" y="13.8" width="3" height="4"/><rect x="7.5" y="17.6" width="9" height="3" rx="1"/>'),
  star: GL('<path d="M12 2.4l2.300 5.600 6 .5-4.600 3.900 1.400 5.900L12 15l-5.100 3.300 1.400-5.900L3.700 8.500l6-.5z"/>'),
  cal: GL('<rect x="4" y="5.500" width="16" height="15" rx="3"/><rect x="7.500" y="3" width="2.200" height="5" rx="1"/><rect x="14.300" y="3" width="2.200" height="5" rx="1"/><path d="M4 10.500h16" stroke="var(--dk)" stroke-width="1.900"/>'),
  menu: GL('<path d="M5 7h14M5 12h14M5 17h14" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>')
};
const modalOver = (html: string) => {
  const layer = document.createElement("div"); layer.id = "layer"; document.body.appendChild(layer);
  modal(html);
  const out = layer.innerHTML; layer.remove();
  document.documentElement.classList.remove("mlock");
  return out;
};

/* ================= 1. Màn chính ================= */
const CUP_SM = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#C99A1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3 H14 V8 C14 11 12 12.500 10 12.500 C8 12.500 6 11 6 8 Z" fill="#FFE3A0"/><path d="M6 5 H3.500 C3.500 8 5 9 6.500 9 M14 5 H16.500 C16.500 8 15 9 13.500 9 M10 12.500 V15.500 M7 17 H13"/></svg>`;
const SKY = `<div class="m3sky"><div class="moon"></div>
  <span class="dt" style="left:8%;top:14%"></span><span class="dt" style="left:40%;top:9%"></span><span class="dt" style="left:62%;top:30%"></span><span class="dt" style="left:90%;top:44%"></span><span class="dt" style="left:6%;top:48%"></span><span class="dt" style="left:30%;top:60%"></span><span class="dt" style="left:76%;top:68%"></span>
  <span class="st" style="left:46%;top:22%;font-size:20px">✦</span><span class="st" style="left:78%;top:36%;font-size:16px">✦</span><span class="st" style="left:12%;top:36%;font-size:12px">✦</span><span class="st" style="left:56%;top:62%;font-size:18px">✦</span><span class="st" style="left:16%;top:72%;font-size:22px">✦</span><span class="st" style="left:88%;top:78%;font-size:14px">✦</span>
  <div class="cl" style="left:-60px;top:40%;width:190px;height:70px"></div><div class="cl" style="right:-70px;top:58%;width:220px;height:80px"></div>
  <div class="cl" style="left:-40px;bottom:14%;width:260px;height:100px"></div><div class="cl" style="right:-50px;bottom:-14px;width:300px;height:120px"></div></div>`;
const SVGI = (body: string) => `<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const I_SEAT = SVGI('<path d="M7 3.5h8.5a1.5 1.5 0 0 1 1.500 1.500v7H6.500V4A.5.5 0 0 1 7 3.500z" fill="var(--pink-m)"/><rect x="5" y="12" width="13" height="3.200" rx="1.400" fill="var(--pink)"/><path d="M7 15.200V20M16 15.200V20" stroke="var(--pink-d)" stroke-width="2" stroke-linecap="round"/>');
const I_FIRE = SVGI('<path d="M12 2.500c.500 3-1.300 4.300-2.600 6C8.200 10 7 11.300 7 13.800A5 5 0 0 0 12 19a5 5 0 0 0 5-5.200c0-2.300-1.200-3.600-2.100-5-.500 1.100-1 1.700-1.800 2C13.600 8 13.400 4.800 12 2.500z" fill="var(--pink)"/><path d="M12 19a2.700 2.700 0 0 1-2.700-2.700c0-1.700 1.400-2.400 2.700-4 1.300 1.600 2.700 2.300 2.700 4A2.700 2.700 0 0 1 12 19z" fill="var(--gold)"/>');
const I_CROWN = SVGI('<path d="M3.500 8l4.500 4 4-6.500 4 6.500 4.500-4-1.500 10h-14z" fill="var(--gold)"/><rect x="5" y="18.500" width="14" height="2.500" rx="1.200" fill="var(--gold-d)"/>');
const I_STORE = `<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M3.400 9.600 5 4.400h14l1.600 5.200c0 1.500-1.100 2.500-2.400 2.500s-2.400-1-2.400-2.500c0 1.500-1.100 2.500-2.300 2.500s-2.300-1-2.300-2.500c0 1.500-1.100 2.500-2.400 2.500S3.400 11.100 3.400 9.600z"/><path d="M5.400 13.400v7.200h13.200v-7.200z"/></svg>`;
const I_SPROUT = `<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17V9" stroke="var(--mint-d)" stroke-width="2" stroke-linecap="round"/><path d="M10 10C10 6 7 4 3.500 4.500 3.500 8 6 10.500 10 10z" fill="var(--mint)"/><path d="M10 8.500C10 5.500 12.500 3.500 16 4c0 3-2.500 5-6 4.500z" fill="var(--mint-d)"/></svg>`;
const HEART_SVG = `<svg width="24" height="22" viewBox="0 0 16 14" aria-hidden="true"><path d="M8 13 C4 10 1 7.500 1 4.500 C1 2 3 1 4.700 1 C6.200 1 7.400 2 8 3 C8.600 2 9.800 1 11.300 1 C13 1 15 2 15 4.500 C15 7.500 12 10 8 13 Z" fill="#FF6F91"/></svg>`;
const BFI = {
  price: SVGI('<circle cx="12" cy="12" r="9" fill="var(--gold)"/><circle cx="12" cy="12" r="5.800" fill="none" stroke="var(--gold-d)" stroke-width="1.700"/>'),
  tip: SVGI('<path d="M12 21C6 16.500 2.500 13 2.500 8.800 2.500 5.800 4.800 4 7.200 4c1.900 0 3.700 1 4.800 2.800C13.100 5 14.900 4 16.800 4c2.400 0 4.700 1.800 4.700 4.800C21.500 13 18 16.500 12 21z" fill="var(--pink)"/>'),
  pat: SVGI('<path d="M7 3h10M7 21h10M8 3c0 5 4 6 4 9s-4 4-4 9M16 3c0 5-4 6-4 9s4 4 4 9" stroke="var(--mint-d)" fill="none" stroke-width="2.200" stroke-linecap="round"/>'),
  cust: SVGI('<circle cx="9.500" cy="8" r="3.600" fill="var(--lav-d)"/><path d="M3 20c0-4 3-6.300 6.500-6.300S16 16 16 20z" fill="var(--lav-d)"/><path d="M19 6v6M16 9h6" stroke="var(--lav-d)" stroke-width="2.200" stroke-linecap="round"/>')
};
const pct = (v: number) => `+${Math.round(v * 100)}%`;
const BUFF_TXT = { price: "Giá bánh", tip: "Tip", pat: "Khách chờ lâu", cust: "Thêm khách mỗi ca" } as const;
const buffVal = (k: keyof typeof BUFF_TXT) => k === "cust" ? `+${fx(k)}` : pct(fx(k));
function homeFrame(mode: "live" | "menu" | "bare") {
  const wrap = document.createElement("div"); wrap.innerHTML = homeHTML();
  const scr = wrap.firstElementChild as HTMLElement; scr.classList.add("m3home");
  scr.insertAdjacentHTML("afterbegin", SKY);
  /* hàng trên cùng: tim + hạng gộp một viên; xu có dấu + */
  const row = wrap.querySelector(".hrow4")!, love = row.querySelector(".love4")!, cup = row.querySelector('[data-act="rank"]')!;
  love.innerHTML = `${HEART_SVG}<b>1.153</b><i class="plus">＋</i>`;
  const duo = document.createElement("div"); duo.className = "duo4";
  const rk = document.createElement("span"); rk.className = "rk4"; rk.innerHTML = `${CUP_SM}#256`;
  love.before(duo); duo.append(love, rk); cup.remove();
  row.querySelector(".coin")?.insertAdjacentHTML("beforeend", `<i class="plus">＋</i>`);
  /* hồ sơ + thanh thông tin: một thẻ */
  const prof = wrap.querySelector(".prof6")!, chips = wrap.querySelector(".h5-chips")!;
  const card = document.createElement("div"); card.className = "m3pcard"; prof.before(card); card.append(prof, chips);
  prof.querySelector(".pf-t6 small")?.insertAdjacentHTML("afterbegin", I_SPROUT);
  chips.innerHTML = `
    <button class="m3buffs" data-buff aria-label="Buff đang có">${(["price", "tip", "pat", "cust"] as const).map(k => `<span class="bf ${k}">${BFI[k]}${buffVal(k)}</span>`).join("")}<i>›</i></button>`;
  /* bỏ thanh XP ngang: tiến trình chạy thành vòng quanh khung avatar */
  const xpPct = parseFloat((prof.querySelector(".xp6 .xt i") as HTMLElement | null)?.style.width || "0");
  prof.querySelector(".xp6")?.remove();
  (prof.querySelector(".pf-av6") as HTMLElement | null)?.style.setProperty("--p", String(xpPct));
  prof.querySelector(".pf-t6")?.insertAdjacentHTML("beforeend", `<div class="m3stats"><span class="m3st">${I_SEAT}<span><small>Sức chứa</small><b>10 ghế</b></span></span><span class="m3st">${I_FIRE}<span><small>Độ viral</small><b>8 khách</b></span></span></div>`);
  prof.querySelector(".pf-t6 b")?.insertAdjacentHTML("afterend", `<em class="m3title">${I_CROWN.replace('width="26" height="26"', 'width="14" height="14"')}Vua diệt chuột hạng E</em>`);
  /* nút Mở tiệm có icon cửa hàng */
  const open = wrap.querySelector(".h5-open span"); if (open) open.insertAdjacentHTML("afterbegin", I_STORE);
  /* thanh dưới: bỏ Thú cưng (vào Menu), Gacha đổi tên Triệu hồi, thêm nút Menu */
  const dock = wrap.querySelector(".dock")!;
  dock.querySelector('[data-go="/cua-hang/thu-cung"]')?.remove();
  dock.querySelectorAll("b").forEach(b => { if (b.textContent === "Gacha") b.textContent = "Triệu hồi"; });
  dock.insertAdjacentHTML("beforeend", `<button data-act="menu" style="--c1:#B9C6E6;--c2:#6B7BA6;--dk:#6B7BA6"><span class="ic">${IC.menu}</span><b>Menu</b></button>`);
  /* trục tầng: luôn hiện đủ mọi tầng người chơi có */
  const n = S.venue.floors;
  scr.insertAdjacentHTML("beforeend", `<div class="m3floor"><small>TẦNG</small>${Array.from({ length: n }, (_, i) => n - i).map(f => `<button data-f="${f - 1}" class="${f === 1 ? "on" : ""}">T${f}</button>`).join("")}</div>`);
  const tile = (nm: string, ic: string, c1: string, c2: string, dot = "") => `<button style="--c1:${c1};--c2:${c2};--dk:${c2}"><span class="ic">${ic}</span>${dot ? `<span class="nd">${dot}</span>` : ""}<b>${nm}</b></button>`;
  if (mode !== "live") { wrap.querySelector(".h5-room")?.remove(); scr.classList.add("bare"); }   // khung tĩnh: phòng 3D chỉ chạy được một cảnh
  if (mode !== "bare") {
    const menuDlg = modalOver(`<h2>Menu</h2><p class="sub">Công thức, nguyên liệu, quản lý…</p><div class="m3dlg"><div class="m3menu">
      ${tile("Công thức", IC.book, "#FFB27A", "#EE7A2E", "2")}${tile("Nguyên liệu", IC.basket, "#8EE0BC", "#3FB68A")}${tile("Quản lý", IC.boss, "#C2B0FA", "#8B6FE6")}${tile("Thú cưng", IC.paw, "#FF9DB6", "#EE5A83")}
      ${tile("Hồ sơ", IC.user, "#8EC5FF", "#4C8DF0")}${tile("Xếp hạng", IC.cup, "#FFD66B", "#F2A41F")}${tile("Đánh giá", IC.star, "#FF9DB6", "#E0567A")}${tile("Sự kiện", IC.cal, "#8EE0BC", "#2FA67C")}
    </div></div>`).replace('class="modal" id="modal"', `class="modal m3menu-dlg${mode === "menu" ? "" : " m3hide"}"`);
    scr.insertAdjacentHTML("beforeend", menuDlg);
  }
  return wrap.innerHTML;
}

/* ================= Buff đang có ================= */
const FXT: Record<string, (n: number) => string> = { price: n => `Giá +${Math.round(n * 100)}%`, tip: n => `Tip +${Math.round(n * 100)}%`, pat: n => `Chờ +${Math.round(n * 100)}%`, cust: n => `+${n} khách` };
const fxLine = (o: Partial<Record<string, number>>) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => FXT[k](v!)).join(" · ");
function buffScreen() {
  const row = (art: string, name: string, sub: string, eff: string) => `<div class="m3bfr"><span class="a">${art}</span><div><b>${esc(name)}</b><small>${esc(sub)}</small></div><em>${esc(eff)}</em></div>`;
  const rows: string[] = [], pets2: string[] = [], dec: string[] = [];
  for (let f = 0; f < S.venue.floors; f++) {
    const m = staffAt("mgr", f), a = staffAt("mascot", f);
    if (m) rows.push(row(gachaArt(m, 40), m.n, `Quản lý · Tầng ${f + 1}`, fxLine(m.mgr!.fx)));
    if (a) pets2.push(row(gachaArt(a, 40), a.n, `Linh thú · Tầng ${f + 1}`, fxLine(a.mascot!.fx)));
  }
  ROOM_CATS.forEach(c => { const it = roomItem(c.k, S.room[c.k]); if (it.fx && Object.keys(it.fx).length) dec.push(row(`<span class="sw" style="background:${it.sw};background-size:${it.sws || "auto"}"></span>`, it.n, c.n, fxLine(it.fx))); });
  return `<div class="scr"><div class="m3bft">${(["price", "tip", "pat", "cust"] as const).map(k => `<div class="${k}">${BFI[k]}<b>${buffVal(k)}</b><small>${BUFF_TXT[k]}</small></div>`).join("")}</div>
    <div class="sh2"><b>Quản lý</b><span class="lav">${rows.length}/${S.venue.floors} tầng</span></div>${rows.join("")}
    <div class="sh2"><b>Linh thú</b><span class="lav">${pets2.length}/${S.venue.floors} tầng</span></div>${pets2.join("")}
    <div class="sh2"><b>Trang trí</b><span class="lav">${dec.length} món có buff</span></div>${dec.join("")}</div>`;
}

/* ================= 2. Hồ sơ (đơn giản) ================= */
const MAIN_COLORS = [
  { id: "pink", name: "Hồng", dot: "#FF7FA1" }, { id: "red", name: "Đỏ", dot: "#F05A5A" }, { id: "orange", name: "Cam", dot: "#F29A4A" }, { id: "gold", name: "Vàng", dot: "#EDB631" }, { id: "green", name: "Xanh lá", dot: "#4FB27E" },
  { id: "teal", name: "Xanh ngọc", dot: "#2FB5B0" }, { id: "blue", name: "Xanh dương", dot: "#5D9AD9" }, { id: "purple", name: "Tím", dot: "#8F72D9" }, { id: "magenta", name: "Hồng tím", dot: "#D45AB5" }, { id: "slate", name: "Xám than", dot: "#6B7C8F" }, { id: "black", name: "Đen", dot: "#2B2F3A" }
];
function profileModal() {
  const me = S.me, girl = true;
  const gd = (id: string, n: string, on: boolean) => `<button type="button" class="pf-gd${on ? " on" : ""}">${portraitHTML(id, me, 46, guestSVG({ gender: id[0] === "g" ? "girl" : "boy", sprite: id, mood: "happy", ledge: false }, 46), "", true)}<span>${n}</span></button>`;
  void girl; void THEMES;
  return modalOver(`<h2>Hồ sơ của bạn</h2>
    <form id="pfForm">
      <div class="pf-prev">${portraitHTML("b1", me, 150, guestSVG({ ...meLook(), mood: "happy" }, 150), "", true)}</div>
      <label class="field">Tên tiệm (hiện ở màn chính)<input value="Lê Vĩnh" maxlength="16"></label>
      <div class="pf-h">Nhân vật</div>
      <div class="pf-gds">${gd("g1", "Nữ", false)}${gd("b1", "Nam", true)}</div>
      <div class="pf-h">Màu chính <small style="font-weight:700">· màu giao diện và áo của bạn</small></div>
      <div class="m3sw">${MAIN_COLORS.map(t => `<button type="button" data-th="${t.id}" class="${t.id === "blue" ? "on" : ""}"><i style="background:${t.dot}"></i><span>${t.name}</span></button>`).join("")}</div>
      <div class="mbtns"><button class="b3" type="submit">Lưu</button></div>
    </form>`);
}

/* ================= 3. Mục tiêu ================= */
const G3 = [["Phục vụ 18 khách", 18, 18, false], ["Làm 3 bánh Bông lan Matcha Dâu tây", 3, 3, false], ["Không để khách nào giận", 1, 1, true]] as const;
function goalsScreen() {
  const row = (g: (typeof G3)[number], i: number) => { const [t, c, n, b] = g, done = c >= n;
    return `<div class="g3 ${done ? "done" : ""} ${i ? "" : "f"}"><span class="ck">${done ? "✓" : ""}</span><span class="tx">${t}</span><span class="nv">${b ? "✓" : `${c}/${n}`}</span>${b ? "" : `<span class="pb"><i style="width:${Math.min(100, c / n * 100)}%"></i></span>`}</div>`; };
  return `<div class="scr"><div class="shead"><button class="rbtn back" aria-label="Về tiệm">←</button><h2>Mục tiêu</h2>${coinPill()}</div>
    <div class="list">
      <div class="card"><div class="m3lv"><span class="lb">Lv 13</span><span class="tr"><i style="width:90%"></i></span><small>896/1000</small></div></div>
      <div class="card"><h3>Quà hôm nay <span class="tg3">3/3 xong</span></h3>${G3.map(row).join("")}
        <button class="b3 claim" disabled>Đã nhận quà hôm nay</button></div>
      <div class="card"><h3>Sắp tới</h3><ul class="evl"><li><span>Sinh nhật Em · 28/12</span><b>còn 83 ngày</b></li><li><span>Kỷ niệm · 20/01</span><b>còn 116 ngày</b></li></ul></div>
    </div></div>`;
}

/* ================= 4. Công thức ================= */
const RAR_C: Record<string, string> = { common: "#8FB4D9", rare: "#7A8CFF", ultra: "#F2B84B" };
function recipesScreen() {
  const ready = RECIPES.map(r => `<div class="rc3"><span class="pr">${r.price} xu</span><div class="art">${cakeSVG({ base: r.base, cream: r.cream, top: r.top, sweet: 1 }, { size: 78, still: true })}</div><b>${esc(r.n)}</b><span class="st ok">Sẵn sàng</span></div>`);
  const g = (it: GachaItem) => { const own = hasItem(it.id), r = it.recipe!;
    return `<div class="rc3 ${own ? "" : "dim"}"><span class="rar" style="background:${RAR_C[it.rarity]}">${RARITY[it.rarity].n}</span><span class="pr">${r.price} xu</span><div class="art">${cakeSVG({ base: r.base, cream: r.cream, top: r.top, sweet: 1 }, { size: 78, still: true })}</div><b>${esc(it.n)}</b>
      ${own ? `<span class="st ok">Thành thạo ${masteryOf(it.id)}/5</span>` : `<span class="st gacha">Gacha ›</span>`}</div>`; };
  /* món mới (chưa có hình riêng: dùng tạm hình hiện có) */
  const nw = (n: string, b: number, c: number, t: number) => `<div class="rc3"><span class="pr">34 xu</span><div class="art">${cakeSVG({ base: b, cream: c, top: t, sweet: 1 }, { size: 78, still: true })}</div><b>${n}</b><span class="st need">Thiếu nguyên liệu ›</span></div>`;
  const custom = `<div class="rc3"><span class="pr">46 xu</span><div class="art">${tierCake([[0, 1], [2, 0]], 0, 84)}</div><b>Tháp Dâu Sữa</b><span class="st ok">2 tầng</span></div>
    <div class="rc3 add"><span class="plus">+</span><b>Tạo mẫu mới</b></div><div class="rc3 add off"><span class="plus">+</span><b>Còn trống</b></div>`;
  return `<div class="scr">${pageHead("Công thức", "Sổ bánh của tiệm")}
    <div class="m3gl"><div class="gfil"><button class="on">Tất cả</button><button>Đang bán</button><button>Gacha</button><button>Tuỳ chỉnh</button></div></div>
    <p class="m3hint"><i>Bán được bánh</i> = có công thức + có nguyên liệu. Món mờ chưa có: chạm để sang Triệu hồi.</p>
    <div class="sh2"><b>Công thức của tiệm</b><span class="lav">${ready.length + 2} món</span></div>
    <div class="rb3">${ready.join("")}${nw("Croissant Kem Vani", 0, 2, 2)}${nw("Cheesecake Việt quất", 2, 1, 0)}</div>
    <div class="sh2"><b>Công thức Gacha</b><span class="lav">${cakes.filter(c => hasItem(c.id)).length}/${cakes.length} đã có</span></div>
    <div class="rb3">${cakes.map(g).join("")}</div>
    <div class="sh2"><b>Bánh tuỳ chỉnh</b><span class="lav">1/3 mẫu</span></div>
    <div class="rb3" style="padding-bottom:24px">${custom}</div></div>`;
}

/* bánh nhiều tầng (chỉ để xem thử: bản thật sẽ vẽ trong scene/cake.ts) */
function tierCake(L: number[][], top: number, px = 150) {
  const INK = "#4A3438", n = L.length, h = 30, W0 = 112, step = 24, H = n * h + 56;
  let g = `<ellipse cx="70" cy="${H - 6}" rx="62" ry="8" fill="#fff" stroke="none"/>`;
  for (let i = 0; i < n; i++) {
    const w = W0 - i * step, x = 70 - w / 2, y = H - 12 - (i + 1) * h, [b, c] = L[i], bc = CATS.base[b][1], cc = CATS.cream[c][1];
    g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${bc}"/>`;
    g += `<path d="M${x} ${y + 8} q${w / 8} -12 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0 V${y + 3} q0 -3 -3 -3 H${x + 3} q-3 0 -3 3 Z" fill="${cc}"/>`;
    if (i === 0) g += `<ellipse cx="${x + w * .28}" cy="${y + h * .72}" rx="4.400" ry="2.500" fill="#FF9FB6" stroke="none" opacity=".8"/><ellipse cx="${x + w * .72}" cy="${y + h * .72}" rx="4.400" ry="2.500" fill="#FF9FB6" stroke="none" opacity=".8"/>
      <circle cx="${x + w * .38}" cy="${y + h * .62}" r="3" fill="${INK}" stroke="none"/><circle cx="${x + w * .62}" cy="${y + h * .62}" r="3" fill="${INK}" stroke="none"/><path d="M${70 - 4} ${y + h * .7} Q70 ${y + h * .86} ${74} ${y + h * .7}" stroke-width="2.200"/>`;
  }
  const ty = H - 12 - n * h - 2, tw = W0 - (n - 1) * step;
  if (top === 0) g += `<path d="M70 ${ty + 2} C54 ${ty - 4} 58 ${ty - 20} 70 ${ty - 20} C82 ${ty - 20} 86 ${ty - 4} 70 ${ty + 2} Z" fill="#F0506E"/><path d="M62 ${ty - 20} l8 -6 l8 6 l-8 -2 z" fill="#7BC47F"/>`;
  if (top === 1) g += `<g fill="#8E3B46"><ellipse cx="${70 - tw * .18}" cy="${ty - 3}" rx="6" ry="4.500"/><ellipse cx="70" cy="${ty - 9}" rx="6" ry="4.500"/><ellipse cx="${70 + tw * .18}" cy="${ty - 3}" rx="6" ry="4.500"/></g>`;
  if (top === 2) g += `<path d="M58 ${ty + 2} C56 ${ty - 14} 84 ${ty - 14} 82 ${ty + 2} Z" fill="#B07A4A"/>`;
  return `<svg width="${px}" height="${Math.round(px * (H + 2) / 140)}" viewBox="0 0 140 ${H + 2}" style="display:block;overflow:visible" fill="none" stroke="${INK}" stroke-width="2.600" stroke-linejoin="round" stroke-linecap="round">${g}</svg>`;
}

/* ================= 5. Tự làm bánh (bấm được) ================= */
const bd = { n: 2, b: [0, 2, 1], c: [0, 1, 2], t: 0 };
const val = (k: PartKey, i: number) => Math.round((UNIT_COST[k as "base"][i]) * 3.2);
function builderScreen() {
  const chip = (k: PartKey, i: number, on: boolean, act: string) => `<button class="ing ${on ? "on" : ""}" data-bd="${act}">${ingSVG(k, i, 24)}<span class="cn">${CATS[k][i][0]}</span><b class="q ${stockOf(k as "base", i) <= 2 ? "low" : ""}">${stockOf(k as "base", i)}</b></button>`;
  let cost = UNIT_COST.top[bd.t], v = val("top", bd.t);
  for (let i = 0; i < bd.n; i++) { cost += UNIT_COST.base[bd.b[i]] + UNIT_COST.cream[bd.c[i]]; v += val("base", bd.b[i]) + val("cream", bd.c[i]); }
  const mult = 1 + 0.1 * (bd.n - 1), price = Math.round(v * mult), secs = (2 + 1.5 * (bd.n - 1)).toFixed(1);
  const tiers = Array.from({ length: bd.n }, (_, i) => `<div class="m3tt"><b>Tầng ${i + 1}${i === 0 ? " · dưới cùng" : ""}</b><span>${CATS.base[bd.b[i]][0]} + ${CATS.cream[bd.c[i]][0]}</span></div>
    <div class="m3ings">${CATS.base.map((_, j) => chip("base", j, bd.b[i] === j, `b${i}:${j}`)).join("")}</div>
    <div class="m3ings">${CATS.cream.map((_, j) => chip("cream", j, bd.c[i] === j, `c${i}:${j}`)).join("")}</div>`).join("");
  return `<div class="scr">${pageHead("Tự làm bánh", "Mẫu 2/3")}
    <div class="m3stage"><div class="tt">Tên bánh<b>Tháp Dâu Sữa</b></div><div class="badge">Giá bán<b>${price} xu</b></div>${tierCake(bd.b.slice(0, bd.n).map((b, i) => [b, bd.c[i]]), bd.t, 170)}</div>
    <div class="m3gl"><div class="gfil" style="justify-content:center">${[1, 2, 3].map(n => `<button class="${bd.n === n ? "on" : ""}" data-bd="n:${n}">${n} tầng${n === 2 ? " · Lv 10" : n === 3 ? " · Lv 20" : ""}</button>`).join("")}</div></div>
    ${tiers}
    <div class="m3tt"><b>Topping trên cùng</b><span>${CATS.top[bd.t][0]}</span></div>
    <div class="m3ings">${CATS.top.map((_, j) => chip("top", j, bd.t === j, `t:${j}`)).join("")}</div>
    <div class="m3card"><div class="ledger">
      <div class="lg"><span>Nguyên liệu mỗi bánh</span><b>−${cost} xu</b></div>
      <div class="lg"><span>Giá trị các tầng và topping</span><b>${v} xu</b></div>
      <div class="lg"><span>Thưởng ${bd.n} tầng</span><b>×${mult.toFixed(1)}</b></div>
      <div class="lg"><span>Thời gian làm</span><b>${secs} giây</b></div>
      <div class="lg tot"><span>Giá bán · lãi ${price - cost} xu</span><b>${price} xu</b></div></div></div>
    <div class="m3foot"><label class="field">Tên bánh<input value="Tháp Dâu Sữa" maxlength="20"></label><button class="b3">Lưu vào menu · khách sẽ gọi món này</button></div></div>`;
}

/* ================= 6. Nguyên liệu + nhà cung cấp ================= */
function ingredientsScreen() {
  const tiles = STOCK_KEYS.map(k => CATS[k].map(([n], i) => { const v = stockOf(k, i);
    return `<button class="stile ${v === 0 ? "out" : v <= 2 ? "low" : ""}">${ingSVG(k, i, 22)}<span>${n}</span><b>${v === 0 ? "Hết" : v}</b></button>`; }).join("")).join("");
  const chips = (k: PartKey) => CATS[k].map(([n], i) => `<span class="c">${ingSVG(k, i, 18)}${n}</span>`).join("");
  const nw = (n: string) => `<span class="c new">${n}<em>MỚI</em></span>`;
  return `<div class="scr">${pageHead("Nguyên liệu", "Kho và nhà cung cấp")}
    <div class="m3steps"><div><b>BƯỚC 1</b>Có công thức (lên cấp hoặc Gacha)</div><div><b>BƯỚC 2</b>Có nguyên liệu (ký nhà cung cấp)</div></div>
    <div class="sh2"><b>Kho hôm nay</b><span class="lav">chạm để nhập thêm 5 phần</span></div>
    <div class="stiles">${tiles}</div>
    <div class="sh2"><b>Nhà cung cấp</b><span class="gold">mở nguyên liệu mới</span></div>
    <div class="m3sup"><div class="hd"><span class="av">${ingSVG("base", 0, 30)}</span><div><b>Xưởng bột Matcha Home</b><small>Đang hợp tác từ đầu</small></div><span class="mini" style="background:var(--mint-d)">Đang dùng</span></div>
      <div class="chips">${chips("base")}${chips("cream")}${chips("top")}</div></div>
    <div class="m3sup"><div class="hd"><span class="av">${ingSVG("cream", 2, 30)}</span><div><b>Lò sữa Alpine</b><small>Bơ, sữa và bột nướng cao cấp</small></div><button class="mini gold">Ký hợp đồng<br>2.000 xu</button></div>
      <div class="chips">${nw("Croissant")}${nw("Kem phô mai")}${nw("Bơ lạt")}</div></div>
    <div class="m3sup lock"><div class="hd"><span class="av">${ingSVG("top", 0, 30)}</span><div><b>Vườn Berry Hồng</b><small>Quả mọng tươi theo mùa</small></div><button class="mini lk">Mở ở Lv 18</button></div>
      <div class="chips">${nw("Việt quất")}${nw("Mâm xôi")}</div></div>
    <div class="m3sup lock" style="margin-bottom:24px"><div class="hd"><span class="av">${ingSVG("top", 2, 30)}</span><div><b>Cacao Đà Lạt</b><small>Socola nguyên chất</small></div><button class="mini lk">Mở ở Lv 25</button></div>
      <div class="chips">${nw("Socola")}${nw("Ca cao")}</div></div></div>`;
}

/* ================= 7. Quản lý (nhân vật + linh thú) ================= */
function managerScreen(tab: "mgr" | "mascot") {
  const list = tab === "mgr" ? mgrs : pets, fl = 1;
  const cur = (k: "mgr" | "mascot", title: string) => { const it = staffAt(k, fl), on = k === tab;
    return `<div class="${on ? "on" : ""}"><small>${title} · Tầng ${fl + 1}</small>${it ? `${gachaArt(it, 52)}<b>${esc(it.n)}</b><i>${esc(it.desc.replace(/^[^:]+: /, ""))}</i>` : "<b>Chưa đặt</b>"}</div>`; };
  const cards = list.map(it => { const own = hasItem(it.id), R = RARITY[it.rarity], f = floorOfStaff(tab, it.id);
    return `<button class="gi r-${it.rarity} ${own ? "own" : "lock"}" style="--rc:${R.c};--rc2:${R.c2}"><div class="gimg ${own ? "" : "dim"}">${gachaArt(it, 56)}</div><b>${esc(it.n)}</b>
      <small>${own ? (f >= 0 ? `Đang ở tầng ${f + 1}` : "Chạm để đặt vào tầng này") : "Chưa có · Triệu hồi ›"}</small><i class="gdot">${R.n}</i></button>`; }).join("");
  return `<div class="scr gacha6 m3pg">${pageHead("Quản lý", "Đặt theo từng tầng")}
    <div class="gtabs"><button class="${tab === "mgr" ? "on" : ""}">Nhân vật · ${mgrs.filter(i => hasItem(i.id)).length}/${mgrs.length}</button><button class="${tab === "mascot" ? "on" : ""}">Linh thú · ${pets.filter(i => hasItem(i.id)).length}/${pets.length}</button></div>
    <div class="m3floors"><button>Tầng 1</button><button class="on">Tầng 2</button><button>Tầng 3</button></div>
    <div class="m3cur">${cur("mgr", "Quản lý")}${cur("mascot", "Linh thú")}</div>
    <div class="gbag"><div class="gitems" style="padding-bottom:24px">${cards}</div></div></div>`;
}

/* ================= Khung hiển thị ================= */
/* 5 màn thành dialog (cùng kiểu Hồ sơ) đè lên màn chính */
const inner = (html: string, drop = ".shead,.phead,.pfoot") => { const d = document.createElement("div"); d.innerHTML = html; d.querySelectorAll(drop).forEach(x => x.remove()); return (d.firstElementChild as HTMLElement).innerHTML; };
const BUILD_DROP = ".shead,.phead,.m3foot .b3";
const dlg = (title: string, sub: string, body: string, foot = "Đóng", drop?: string, cls = "") =>
  homeFrame("bare") + modalOver(`<h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ""}<div class="m3dlg ${cls}">${inner(body, drop)}</div>${foot ? `<div class="mbtns"><button class="b3" data-close>${foot}</button></div>` : ""}`);

interface Story { id: string; title: string; desc: string; note?: string; long?: boolean; html: () => string }
const STORIES: Story[] = [
  { id: "home", title: "Màn chính", desc: "Header + dock cố định, tiệm 3D ở giữa.", note: "Bấm nút Menu ở dock để mở Menu; bấm T1/T2/T3 để đổi tầng.", html: () => homeFrame("live") },
  { id: "menu", title: "Màn chính · Menu", desc: "Dialog: Công thức, Nguyên liệu, Quản lý, Thú cưng, Hồ sơ…", html: () => homeFrame("menu") },
  { id: "buff", title: "Buff đang có", desc: "Bấm hàng chip buff ở thẻ hồ sơ để mở.", note: "Tổng từ quản lý, linh thú và trang trí; dưới là nguồn của từng buff.", html: () => dlg("Buff đang có", "Tổng hợp từ quản lý, linh thú và trang trí", buffScreen()) },
  { id: "profile", title: "Hồ sơ", desc: "Chỉ còn tên tiệm, Nam/Nữ và một màu chính.", note: "Bỏ: kiểu tóc, màu tóc, mắt, áo khoác, áo trong, quần, giày, da.", html: () => homeFrame("bare") + profileModal() },
  { id: "goals", title: "Mục tiêu", desc: "Mỗi mục một hàng có thanh tiến độ; XP tách thẻ riêng.", html: () => dlg("Mục tiêu", "Quà hôm nay và sự kiện sắp tới", goalsScreen()) },
  { id: "recipes", title: "Công thức", desc: "Ra khỏi Mục tiêu, thành dialog riêng trong Menu.", note: "Hình bánh Croissant / Cheesecake đang dùng tạm hình cũ; bánh nhiều tầng là hình vẽ thử.", html: () => dlg("Công thức", "Sổ bánh của tiệm", recipesScreen()) },
  { id: "builder", title: "Tự làm bánh (bấm được)", desc: "Chọn số tầng, đế + kem từng tầng, topping; giá tính trực tiếp.", html: () => dlg("Tự làm bánh", "Mẫu 2/3", builderScreen(), "Lưu vào menu · khách sẽ gọi món này", BUILD_DROP) },
  { id: "ing", title: "Nguyên liệu và nhà cung cấp", desc: "Nguyên liệu mới phải ký nhà cung cấp (xu hoặc cấp).", html: () => dlg("Nguyên liệu", "Kho và nhà cung cấp", ingredientsScreen()) },
  { id: "mgr", title: "Quản lý · Nhân vật", desc: "Hiện tất cả, món chưa có thì mờ và dẫn sang Triệu hồi.", html: () => dlg("Quản lý", "Đặt theo từng tầng", managerScreen("mgr"), "Đóng", undefined, "m3pg") },
  { id: "pet", title: "Quản lý · Linh thú", desc: "Chọn tầng ở trên, rồi chạm linh thú để đặt vào tầng đó.", html: () => dlg("Quản lý", "Đặt theo từng tầng", managerScreen("mascot"), "Đóng", undefined, "m3pg") }
];

await loadSprites();
const root = document.getElementById("sb")!;
const wrap = (s: Story) => `<div class="story" id="st-${s.id}"><div class="cap">${esc(s.title)}<small>${esc(s.desc)}</small>${s.note ? `<em>${esc(s.note)}</em>` : ""}</div><div class="frame ${s.long ? "long" : ""}" data-story="${s.id}">${s.html()}</div></div>`;
root.innerHTML = `<div class="sbw"><div class="m3-top"><h1>Mock v3 · giao diện mới</h1>
  <p>Mọi màn dưới đây vẽ bằng chính code và hình của game (<code>main.css</code>, bánh, nguyên liệu, nhân vật, phòng 3D), không phải hình minh hoạ riêng. Phần chưa có trong game nằm ở <code>m3.css</code>.</p></div>
  <div class="m3hours"><b>Giờ trong ngày:</b>${[["Sáng", 9], ["Trưa", 13], ["Chiều", 17.5], ["Hoàng hôn", 19], ["Tối", 22]].map(([n, h]) => `<button data-hour="${h}">${n}</button>`).join("")}</div>
  <nav class="sbnav">${STORIES.map(s => `<a href="#st-${s.id}">${esc(s.title.replace(/ \(.*/, ""))}</a>`).join("")}</nav>
  <div class="sbgrid" style="margin-top:14px">${STORIES.map(wrap).join("")}</div></div>`;
fitRooms(); hydratePortraits();
try { await mountRooms(); } catch { /* không có WebGL thì giữ ảnh tĩnh */ }

/* Menu: bấm nút Menu để mở, bấm nền tối hoặc ✕ để đóng */
document.addEventListener("click", e => {
  const t = e.target as HTMLElement, open = t.closest<HTMLElement>('[data-act="menu"]');
  const fr = (open ?? t.closest<HTMLElement>(".m3menu-dlg"))?.closest<HTMLElement>(".home5"); if (!fr) return;
  const d = fr.querySelector<HTMLElement>(".m3menu-dlg"); if (!d) return;
  if (open) d.classList.remove("m3hide"); else if (t === d || t.closest(".mx")) d.classList.add("m3hide");
});
/* đổi màu chính: cả trang đổi theo ngay */
document.addEventListener("click", e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-th]"); if (!b) return;
  const id = b.dataset.th!, root = document.documentElement;
  if (id === "pink") root.removeAttribute("data-theme"); else root.dataset.theme = id;
  b.parentElement!.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
});
/* trục tầng: bấm tầng nào thì chuyển cảnh 3D sang tầng đó */
document.addEventListener("click", e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>(".m3floor [data-f]"); if (!b) return;
  const fr = b.closest<HTMLElement>(".home5")!, btn = fr.querySelector<HTMLElement>("[data-floor]"), strip = b.parentElement!;
  const cur = +(strip.querySelector(".on") as HTMLElement).dataset.f!, to = +b.dataset.f!, n = strip.querySelectorAll("[data-f]").length;
  for (let i = 0; i < (to - cur + n) % n; i++) btn?.click();
  strip.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
});
/* chỉ màn Tự làm bánh bấm được */
document.addEventListener("click", e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-bd]"); if (!b) return;
  const [k, v] = b.dataset.bd!.split(":"), j = +v;
  if (k === "n") bd.n = j; else if (k === "t") bd.t = j; else if (k[0] === "b") bd.b[+k.slice(1)] = j; else bd.c[+k.slice(1)] = j;
  const f = document.querySelector<HTMLElement>('[data-story="builder"]')!, sc = f.querySelector<HTMLElement>(".mscroll"), y = sc?.scrollTop ?? 0;
  f.querySelector(".m3dlg")!.innerHTML = inner(builderScreen(), BUILD_DROP); if (sc) sc.scrollTop = y;
});

/* thử các giờ khác nhau cho cảnh 3D (cũng dùng được ?hour=21 trên địa chỉ) */
document.addEventListener("click", e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-hour]"); if (!b) return;
  (window as unknown as { __live?: { scene: { setHour(h: number): void } } }).__live?.scene.setHour(+b.dataset.hour!);
});
