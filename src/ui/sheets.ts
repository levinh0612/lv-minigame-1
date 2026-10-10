/* Các bảng trượt lên từ cảnh tiệm ở màn chính: Menu, Tủ bánh (carousel), Ngày kỷ niệm, Ảnh treo tường */
import { CFG } from "../content/couple";
import { CATS, CUSTOM_LV, MAX_CUSTOM, RECIPES, SEASON_LV, customRecipe, seasonalNow, partsOfRecipe, tiersOf } from "../content/game";
import { GACHA_ITEMS, MASTERY_MAX, RARITY } from "../content/gacha";
import { daysTogether, events } from "../engine/dates";
import { hasItem, masteryOf, specialRecipes } from "../engine/gacha";
import { recipeReady } from "../engine/suppliers";
import { featured, lvl, unlocked } from "../engine/progress";
import { S, save } from "../engine/state";
import { flushSave } from "../net/cloud";
import { fmtD, fmtN, parse } from "../engine/util";
import { SONGS, Sound } from "../audio/sound";
import { render } from "./app";
import { cakeAnySVG, ingSVG } from "./art";
import { $, closeModal, esc, modal, toast } from "./dom";
import { FX_CAP, buffSources, fx, fxRaw } from "../engine/progress";
import { gachaArt } from "./gachafx";
import { byNum, byText } from "../engine/listview";
import { listHTML, registerList } from "./components/listtools";
import { ic } from "./icons";
import { giftReady, goals } from "../engine/progress";
import { weeklyPending } from "../engine/weekly";
import { achPending } from "../engine/achievements";
import { BUFF_LABEL, buffIcon, buffText } from "./screens/home";

const ingChips = (r: (typeof RECIPES)[number]) => partsOfRecipe(r).map(p => `<span>${ingSVG(p.k, p.i, 18)}${CATS[p.k][p.i][0]}</span>`).join("");

/* Công thức (mở từ Menu hoặc chạm bảng Menu trong tiệm): công thức của tiệm, công thức Gacha (mờ nếu chưa có, chạm để sang Gacha) */
const RAR_C: Record<string, string> = { common: "#8FB4D9", rare: "#7A8CFF", ultra: "#F2B84B" };
type RSec = "shop" | "season" | "gacha" | "custom";
interface RItem { sec: RSec; n: string; price: number; lv: number; st: "ok" | "need" | "lock"; html: string }
const tile = (r: { base: number; cream: number; top: number; up?: [number, number][] }, name: string, price: number | null, tag: string, cls: string, extra = "", attr = "") =>
  `<${attr ? "button" : "div"} class="rc5 ${cls}" ${attr}>${extra}${price ? `<span class="pr">${price} xu</span>` : ""}<div class="art">${cakeAnySVG({ base: r.base, cream: r.cream, top: r.top, up: r.up, sweet: 1 }, { size: 78, still: true })}</div><b>${esc(name)}</b>${tag}</${attr ? "button" : "div"}>`;

/* mọi công thức (của tiệm, theo mùa, Gacha, tuỳ chỉnh) thành một danh sách phẳng để tìm, lọc, sắp xếp chung */
function recipeItems(): RItem[] {
  const L = lvl(), f = featured(), se = seasonalNow(), star = (id: string) => id === f.id ? `<em class="rstar">★ nổi bật</em>` : "";
  const shop = RECIPES.map((r): RItem => r.lv > L
    ? { sec: "shop", n: r.n, price: r.price, lv: r.lv, st: "lock", html: tile(r, r.n, r.price, `<span class="st soon">Mở ở Lv ${r.lv}</span>`, "dim") }
    : !recipeReady(r) ? { sec: "shop", n: r.n, price: r.price, lv: r.lv, st: "need", html: tile(r, r.n, r.price, `<span class="st need">Thiếu nguyên liệu ›</span>`, "", "", `data-act="ings"`) }
    : { sec: "shop", n: r.n, price: r.price, lv: r.lv, st: "ok", html: tile(r, r.n, r.price, `<span class="st ok">Sẵn sàng</span>`, r.id === f.id ? "star" : "", star(r.id)) });
  const seasonSt = L < SEASON_LV ? "lock" : recipeReady(se) ? "ok" : "need";
  const season: RItem = { sec: "season", n: se.n, price: se.price, lv: SEASON_LV, st: seasonSt, html: tile(se, se.n, se.price,
    seasonSt === "lock" ? `<span class="st soon">Mở ở Lv ${SEASON_LV}</span>` : seasonSt === "ok" ? `<span class="st ok">Chỉ bán tháng ${se.month}</span>` : `<span class="st need">Thiếu nguyên liệu ›</span>`,
    seasonSt === "lock" ? "dim" : se.id === f.id ? "star" : "", star(se.id), seasonSt === "need" ? `data-act="ings"` : "") };
  const sp = new Map(specialRecipes().map(r => [r.id, r]));
  const gacha = GACHA_ITEMS.filter(i => i.recipe).map((i): RItem => {
    const rar = `<em class="rar" style="background:${RAR_C[i.rarity]}">${RARITY[i.rarity].n}</em>`;
    return hasItem(i.id)
      ? { sec: "gacha", n: i.n, price: sp.get(i.id)!.price, lv: 0, st: "ok", html: tile(i.recipe!, i.n, sp.get(i.id)!.price, `<span class="st ok">Thành thạo ${masteryOf(i.id)}/${MASTERY_MAX}</span>`, "", rar) }
      : { sec: "gacha", n: i.n, price: i.recipe!.price, lv: 0, st: "lock", html: tile(i.recipe!, i.n, i.recipe!.price, `<span class="st gacha">Gacha ›</span>`, "dim", rar, `data-rgacha="${i.id}"`) };
  });
  const custom = S.custom.map((c): RItem => { const r = customRecipe(c), ok = recipeReady(r);
    return { sec: "custom", n: r.n, price: r.price, lv: 0, st: ok ? "ok" : "need", html: tile(r, r.n, r.price, ok ? `<span class="st ok">${tiersOf(r)} tầng</span>` : `<span class="st need">Thiếu nguyên liệu</span>`, "", "", `data-cedit="${c.id}"`) }; });
  return [...shop, season, ...gacha, ...custom];
}
registerList<RItem>("recipes", {
  placeholder: "Tìm công thức",
  items: recipeItems,
  cfg: {
    text: r => [r.n],
    groups: {
      sec: { shop: r => r.sec === "shop" || r.sec === "season", gacha: r => r.sec === "gacha", custom: r => r.sec === "custom" },
      st: { ok: r => r.st === "ok", need: r => r.st === "need", lock: r => r.st === "lock" }
    },
    sorts: { price: byNum(r => r.price), lv: byNum(r => r.lv), name: byText(r => r.n) }
  },
  groups: [
    { id: "sec", opts: [{ id: "all", label: "Tất cả" }, { id: "shop", label: "Của tiệm" }, { id: "gacha", label: "Gacha" }, { id: "custom", label: "Tuỳ chỉnh" }] },
    { id: "st", opts: [{ id: "all", label: "Tất cả" }, { id: "ok", label: "Sẵn sàng" }, { id: "need", label: "Thiếu hàng", alert: true }, { id: "lock", label: "Chưa mở" }] }
  ],
  sorts: [{ id: "", label: "Mặc định" }, { id: "price", label: "Giá" }, { id: "lv", label: "Cấp mở" }, { id: "name", label: "Tên" }],
  body: (rows, _all, v) => {
    const L = lvl(), se = seasonalNow(), of = (s: RSec) => rows.filter(r => r.sec === s).map(r => r.html).join("");
    const filtered = !!v.q || !!v.f.st, secF = v.f.sec ?? "all";
    const nShop = RECIPES.filter(r => r.lv <= L && recipeReady(r)).length, nG = GACHA_ITEMS.filter(i => i.recipe && hasItem(i.id)).length, tG = GACHA_ITEMS.filter(i => i.recipe).length;
    const sec = (title: string, note: string, tiles: string, show: boolean) => show && tiles ? `<div class="sh2"><b>${title}</b><span class="lav">${note}</span></div><div class="rb5">${tiles}</div>` : "";
    const add = !filtered && (secF === "all" || secF === "custom") ? (S.custom.length < MAX_CUSTOM ? (L >= CUSTOM_LV
      ? `<button class="rc5 add" data-act="custom"><span class="plus">+</span><b>Tạo mẫu mới</b></button>`
      : `<div class="rc5 add off"><span class="plus">+</span><b>Mở ở Lv ${CUSTOM_LV}</b></div>`) : "") : "";
    const out = sec("Công thức của tiệm", `${nShop}/${RECIPES.length} bán được`, of("shop"), true) + sec("Bánh theo mùa", `Tháng ${se.month} · ${se.season}`, of("season"), true)
      + sec("Công thức Gacha", `${nG}/${tG} đã có`, of("gacha"), true) + sec("Bánh tuỳ chỉnh", `${S.custom.length}/${MAX_CUSTOM} mẫu`, of("custom") + add, true);
    return `${out || `<p class="pempty">Không tìm thấy công thức nào.<br>Thử gõ tên khác hoặc bỏ bớt bộ lọc.</p>`}
    <p class="phint">Món mờ chưa có: chạm để sang Gacha và xem món đó.</p>`;
  }
});
export function menuSheet() {
  modal(`<h2>Công thức</h2><p class="sub">${unlocked().length} món đang bán · khách chọn độ ngọt riêng</p><div id="rcpBody">${listHTML("recipes")}</div><div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
}

/* Tủ bánh: carousel các bánh đang bán, vuốt ngang */
export function cakesSheet() {
  const f = featured(), list = unlocked();
  modal(`<h2>Tủ bánh</h2><p class="sub">Vuốt để xem ${list.length} món đang bán</p>
    <div class="carow"><button class="cnav l" data-cn="-1" aria-label="Món trước">‹</button><button class="cnav r" data-cn="1" aria-label="Món sau">›</button>
    <div class="caro" id="caro">${list.map(r => `<div class="cc ${r.id === f.id ? "star" : ""}">
      ${r.id === f.id ? `<span class="tagf">★ Món nổi bật hôm nay</span>` : ""}
      <div class="ck">${cakeAnySVG({ base: r.base, cream: r.cream, top: r.top, up: r.up, sweet: 1 }, { size: 170 })}</div>
      <b>${esc(r.n)}</b><div class="ichips">${ingChips(r)}</div><span class="cp">${r.price} xu / bánh</span></div>`).join("")}</div></div>
    <div class="cdots" id="cdots">${list.map((_, i) => `<i class="${i ? "" : "on"}" data-i="${i}"></i>`).join("")}</div>
    <div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
  const c = $("#caro")!, page = () => Math.round(c.scrollLeft / c.clientWidth), last = list.length - 1;
  const goto = (i: number) => c.scrollTo({ left: Math.max(0, Math.min(last, i)) * c.clientWidth, behavior: "smooth" });
  c.addEventListener("scroll", () => {
    const i = page();
    $("#cdots")!.querySelectorAll("i").forEach((d, j) => d.classList.toggle("on", j === i));
  }, { passive: true });
  /* máy tính: nút ‹ ›, bấm chấm, phím mũi tên, lăn chuột, kéo chuột (điện thoại vẫn vuốt ngang như cũ) */
  document.querySelectorAll<HTMLElement>("[data-cn]").forEach(b => b.addEventListener("click", () => goto(page() + +b.dataset.cn!)));
  $("#cdots")!.addEventListener("click", e => { const d = (e.target as HTMLElement).closest<HTMLElement>("[data-i]"); if (d) goto(+d.dataset.i!); });
  const key = (e: KeyboardEvent) => { if (!document.getElementById("caro")) return removeEventListener("keydown", key); if (e.key === "ArrowRight") goto(page() + 1); else if (e.key === "ArrowLeft") goto(page() - 1); };
  addEventListener("keydown", key);
  let wheelAt = 0;
  c.addEventListener("wheel", e => { const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!d) return; e.preventDefault(); if (e.timeStamp - wheelAt < 380) return; wheelAt = e.timeStamp; goto(page() + (d > 0 ? 1 : -1)); }, { passive: false });
  let x0 = 0, s0 = 0, drag = false;
  c.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; drag = true; x0 = e.clientX; s0 = c.scrollLeft; c.style.scrollSnapType = "none"; c.setPointerCapture(e.pointerId); });
  c.addEventListener("pointermove", e => { if (drag) c.scrollLeft = s0 - (e.clientX - x0); });
  const end = () => { if (!drag) return; drag = false; c.style.scrollSnapType = ""; goto(page()); };
  c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end);
}

/* Ngày kỷ niệm & ngày quan trọng */
export function daysSheet() {
  const met = parse(CFG.metDate), d = daysTogether(), ev = events();
  const icon: Record<string, string> = { anniversary: "💞", monthly: "🌙", herBirthday: "🎂", hisBirthday: "🎁", milestone: "💯", valentine: "💝", women83: "🌷", women2010: "🌸" };
  const past: { t: string; date: Date }[] = [];
  for (let y = 1; new Date(met.getFullYear() + y, met.getMonth(), met.getDate()) <= new Date(); y++) past.push({ t: `Kỷ niệm ${y} năm`, date: new Date(met.getFullYear() + y, met.getMonth(), met.getDate()) });
  for (let h = 100; h <= d; h += 100) past.push({ t: `Ngày thứ ${h}`, date: new Date(met.getFullYear(), met.getMonth(), met.getDate() + h - 1) });
  past.sort((a, b) => +b.date - +a.date);
  const full = (x: Date) => `${fmtD(x)}/${x.getFullYear()}`;
  modal(`<div class="dhero"><small>Bên nhau</small><b>${fmtN(d)}</b><span>ngày · từ ${full(met)}</span></div>
    <h3 class="csec">Sắp tới</h3>
    <div class="dlist">${ev.map(e => `<div class="drow ${e.in === 0 ? "today" : ""}"><span class="di">${icon[e.key] || "✨"}</span><div><b>${esc(e.t)}</b><small>${full(e.date)}</small></div><em>${e.in === 0 ? "Hôm nay 🎉" : `còn ${e.in} ngày`}</em></div>`).join("")}</div>
    <h3 class="csec">Đã cùng nhau đi qua</h3>
    <div class="dlist">${past.slice(0, 8).map(p => `<div class="drow past"><span class="di">💗</span><div><b>${esc(p.t)}</b><small>${full(p.date)}</small></div></div>`).join("") || `<p class="sub small">Mốc đầu tiên sắp tới rồi đó!</p>`}</div>
    <p class="sub small">Sinh nhật ${esc(S.names.her)}: ${fmtD(parse(CFG.herBirthday))} · Sinh nhật ${esc(CFG.hisName)}: ${fmtD(parse(CFG.hisBirthday))}</p>
    <div class="mbtns"><button class="b3" data-close>Thương ghê</button></div>`);
}

/* ===== Ảnh treo tường: chọn ảnh, thu nhỏ trên máy rồi lưu cùng tiến trình ===== */
function pickPhoto() {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*";
  inp.addEventListener("change", async () => {
    const f = inp.files?.[0]; if (!f) return;
    try { S.photo = await shrink(f, 360); save(); flushSave(true); closeModal(); render(); toast("Đã treo ảnh lên tường tiệm 🖼️"); }
    catch { toast("Không đọc được ảnh này, thử ảnh khác nha"); }
  });
  inp.click();
}
async function shrink(file: File, max: number) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally { URL.revokeObjectURL(url); }
}
export function photoSheet() {
  if (!S.photo) return pickPhoto();
  modal(`<h2>Ảnh trên tường</h2><div class="pframe"><img src="${S.photo}" alt="Ảnh treo tường"></div>
    <div class="mbtns"><button class="b3" id="phNew">Đổi ảnh khác</button><button class="b3 w" id="phDel">Gỡ ảnh xuống</button></div>`);
  $("#phNew")!.addEventListener("click", pickPhoto);
  $("#phDel")!.addEventListener("click", () => { S.photo = ""; save(); flushSave(true); closeModal(); render(); toast("Đã gỡ ảnh"); });
}

/* Nhạc nền: bật/tắt và chọn bài; chạm bài nào là nghe thử ngay */
const NOTE = ic.music(18, 2.2, "none", "");
export function musicSheet() {
  const cur = S.song && SONGS[S.song] ? S.song : "auto";
  const item = (id: string, n: string, d: string) => `<button class="song ${cur === id ? "on" : ""}" data-song="${id}"><span class="si">${NOTE}</span><span class="sn"><b>${esc(n)}</b><small>${esc(d)}</small></span><span class="sc">${cur === id ? (S.music ? "Đang phát" : "Đã chọn") : ""}</span></button>`;
  modal(`<h2>Nhạc nền</h2><p class="sub">Chạm một bài để nghe thử ngay</p>
    <label class="tg"><input type="checkbox" id="muOn" ${S.music ? "checked" : ""}>Bật nhạc nền</label>
    <div class="songs">${item("auto", "Tự đổi theo lúc", "Ở tiệm: Sáng ở tiệm · Trong ca: Giờ cao điểm")}
      ${Object.entries(SONGS).map(([id, t]) => item(id, t.name, t.desc)).join("")}</div>
    <div class="mbtns"><button class="b3" data-close>Xong</button></div>`, render);
  // cập nhật tại chỗ (không mở lại hộp thoại, giữ vị trí cuộn)
  const btns = [...document.querySelectorAll<HTMLButtonElement>("#modal [data-song]")], on = $<HTMLInputElement>("#muOn")!;
  const mark = () => { const c = S.song && SONGS[S.song] ? S.song : "auto"; on.checked = S.music; btns.forEach(b => { const me = b.dataset.song === c; b.classList.toggle("on", me); b.querySelector(".sc")!.textContent = me ? (S.music ? "Đang phát" : "Đã chọn") : ""; }); };
  on.addEventListener("change", () => { Sound.setMusic(on.checked); mark(); });
  btns.forEach(b => b.addEventListener("click", () => { Sound.setSong(b.dataset.song!); mark(); }));
}

/* Nút Menu ở thanh dưới: những thứ không cần luôn hiện ở màn chính */
export function moreSheet() {
  const T = (n: string, icon: string, c1: string, c2: string, attr: string) => `<button ${attr} style="--c1:${c1};--c2:${c2};--dk:${c2}"><span class="ic">${icon}</span><b>${n}</b></button>`;
  const left = goals().filter(g => g.cur < g.need).length, pend = weeklyPending() + achPending(), gift = giftReady();
  const nd = (n: number) => n ? `<i class="nd">${n}</i>` : "";
  modal(`<h2>Menu</h2><p class="sub">Những thứ khác của tiệm</p><div class="more5">
    ${T("Mục tiêu", ic.target(28, 2.2) + nd(left), "#FFD66B", "#F2A41F", 'data-go="/muc-tieu"')}
    ${T("Nhiệm vụ", ic.mission(28, 2.2) + nd(pend), "#9BE0B4", "#35B07A", 'data-go="/thanh-tich"')}
    ${T("Quà tặng", ic.gift(28, 2.2) + nd(gift ? 1 : 0), "#FF9DB6", "#EE5A83", 'data-go="/cua-hang/qua-tang"')}
    ${T("Công thức", ic.book(28, 2.2), "#FFB27A", "#EE7A2E", 'data-act="menu"')}
    ${T("Nguyên liệu", ic.basket(28, 2.2), "#8EE0BC", "#3FB68A", 'data-act="ings"')}
    ${T("Đội ngũ", ic.users(28, 2.2), "#C2B0FA", "#8B6FE6", 'data-go="/cua-hang/thu-cung"')}
    ${T("Hồ sơ", ic.user(28, 2.2), "#8EC5FF", "#4C8DF0", 'data-act="profile"')}
    ${T("Xếp hạng", ic.trophy(28, 2.2), "#FFD66B", "#F2A41F", 'data-act="rank"')}
    ${T("Sự kiện", ic.cal(28, 2.2), "#8EE0BC", "#2FA67C", 'data-act="days"')}
    ${T("Thành tích", ic.award(28, 2.2), "#FFB27A", "#E5622E", 'data-go="/thanh-tich"')}
  </div>`);
}

/* Buff đang có: tổng ở trên, nguồn của từng buff ở dưới (quản lý, linh thú, trang trí) */
const BUFF_SHORT = { price: "Giá", tip: "Tip", pat: "Chờ", cust: "" } as const;
export function buffSheet() {
  const rows = buffSources(), line = (f: Partial<Record<keyof typeof BUFF_SHORT, number>>) => (Object.entries(f) as [keyof typeof BUFF_SHORT, number][]).filter(([, v]) => v)
    .map(([k, v]) => k === "cust" ? `+${v} khách` : `${BUFF_SHORT[k]} +${Math.round(v * 100)}%`).join(" · ");
  const art = (r: (typeof rows)[number]) => r.item ? gachaArt(r.item, 40) : !r.decor ? `<span class="sw" style="display:grid;place-items:center;background:var(--lav)">🏪</span>` : `<span class="sw" style="background:${r.decor!.sw};background-size:${r.decor!.sws || "auto"}"></span>`;
  const group = (src: "mgr" | "mascot" | "decor" | "shop", title: string) => { const g = rows.filter(r => r.src === src);
    return g.length ? `<div class="sh2"><b>${title}</b><span class="lav">${g.length} nguồn</span></div>${g.map(r => `<div class="bfrow"><span class="a">${art(r)}</span><div><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></div><em>${esc(line(r.fx))}</em></div>`).join("")}` : ""; };
  modal(`<h2>Buff đang có</h2><p class="sub">Tổng hợp từ quản lý, linh thú và trang trí</p>
    <div class="bftot">${(["price", "tip", "pat", "cust"] as const).map(k => `<div class="${k}">${buffIcon(k, 24)}<b>${buffText(k)}</b><small>${BUFF_LABEL[k]}</small></div>`).join("")}</div>
    ${group("mgr", "Quản lý")}${group("mascot", "Linh thú")}${group("decor", "Trang trí")}${group("shop", "Nâng cấp tiệm")}
    ${(["price", "tip", "pat"] as const).some(k => fxRaw(k) > fx(k)) ? `<p class="phint">Trần buff: ${(["price", "tip", "pat"] as const).map(k => `${BUFF_SHORT[k]} +${Math.round(FX_CAP[k]! * 100)}%`).join(" · ")}. Phần vượt trần không được tính.</p>` : ""}
    ${rows.length ? "" : `<p class="phint">Chưa có buff nào. Đặt quản lý, linh thú hoặc dùng đồ trang trí có buff để tăng.</p>`}
    <div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
}
