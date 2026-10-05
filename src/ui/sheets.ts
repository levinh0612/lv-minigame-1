/* Các bảng trượt lên từ cảnh tiệm ở màn chính: Menu, Tủ bánh (carousel), Ngày kỷ niệm, Ảnh treo tường */
import { CFG } from "../content/couple";
import { CATS, RECIPES, STOCK_KEYS } from "../content/game";
import { GACHA_ITEMS, MASTERY_MAX, RARITY } from "../content/gacha";
import { daysTogether, events } from "../engine/dates";
import { hasItem, masteryOf, specialRecipes } from "../engine/gacha";
import { featured, lvl, unlocked } from "../engine/progress";
import { S, save } from "../engine/state";
import { flushSave } from "../net/cloud";
import { fmtD, fmtN, parse } from "../engine/util";
import { SONGS, Sound } from "../audio/sound";
import { render } from "./app";
import { cakeSVG, ingSVG } from "./art";
import { $, closeModal, esc, modal, toast } from "./dom";
import { buffSources } from "../engine/progress";
import { gachaArt } from "./gachafx";
import { ic } from "./icons";
import { BUFF_LABEL, buffIcon, buffText } from "./screens/home";

const ingChips = (r: (typeof RECIPES)[number]) => STOCK_KEYS.map(k => `<span>${ingSVG(k, r[k], 18)}${CATS[k][r[k]][0]}</span>`).join("");

/* Công thức (mở từ Menu hoặc chạm bảng Menu trong tiệm): công thức của tiệm, công thức Gacha (mờ nếu chưa có, chạm để sang Gacha) */
let rfil: "all" | "shop" | "gacha" = "all";
const RAR_C: Record<string, string> = { common: "#8FB4D9", rare: "#7A8CFF", ultra: "#F2B84B" };
function recipeBody() {
  const L = lvl(), f = featured();
  const tile = (r: { base: number; cream: number; top: number }, name: string, price: number | null, tag: string, cls: string, extra = "", attr = "") =>
    `<${attr ? "button" : "div"} class="rc5 ${cls}" ${attr}>${extra}${price ? `<span class="pr">${price} xu</span>` : ""}<div class="art">${cakeSVG({ base: r.base, cream: r.cream, top: r.top, sweet: 1 }, { size: 78, still: true })}</div><b>${esc(name)}</b>${tag}</${attr ? "button" : "div"}>`;
  const shop = RECIPES.map(r => r.lv > L
    ? tile(r, r.n, r.price, `<span class="st soon">Mở ở Lv ${r.lv}</span>`, "dim")
    : tile(r, r.n, r.price, `<span class="st ok">Sẵn sàng</span>`, r.id === f.id ? "star" : "", r.id === f.id ? `<em class="rstar">★ nổi bật</em>` : "")).join("");
  const sp = new Map(specialRecipes().map(r => [r.id, r]));
  const gacha = GACHA_ITEMS.filter(i => i.recipe).map(i => hasItem(i.id)
    ? tile(i.recipe!, i.n, sp.get(i.id)!.price, `<span class="st ok">Thành thạo ${masteryOf(i.id)}/${MASTERY_MAX}</span>`, "", `<em class="rar" style="background:${RAR_C[i.rarity]}">${RARITY[i.rarity].n}</em>`)
    : tile(i.recipe!, i.n, i.recipe!.price, `<span class="st gacha">Gacha ›</span>`, "dim", `<em class="rar" style="background:${RAR_C[i.rarity]}">${RARITY[i.rarity].n}</em>`, `data-rgacha="${i.id}"`)).join("");
  const nShop = RECIPES.filter(r => r.lv <= L).length, nG = GACHA_ITEMS.filter(i => i.recipe && hasItem(i.id)).length, tG = GACHA_ITEMS.filter(i => i.recipe).length;
  return `<div class="gfil rfil">${([["all", "Tất cả"], ["shop", "Của tiệm"], ["gacha", "Gacha"]] as const).map(([k, n]) => `<button class="${rfil === k ? "on" : ""}" data-rfil="${k}">${n}</button>`).join("")}</div>
    ${rfil !== "gacha" ? `<div class="sh2"><b>Công thức của tiệm</b><span class="lav">${nShop}/${RECIPES.length} đã mở</span></div><div class="rb5">${shop}</div>` : ""}
    ${rfil !== "shop" ? `<div class="sh2"><b>Công thức Gacha</b><span class="lav">${nG}/${tG} đã có</span></div><div class="rb5">${gacha}</div>` : ""}
    <p class="phint">Món mờ chưa có: chạm để sang Gacha và xem món đó.</p>`;
}
export function menuSheet() {
  modal(`<h2>Công thức</h2><p class="sub">${unlocked().length} món đang bán · khách chọn độ ngọt riêng</p><div id="rcpBody">${recipeBody()}</div><div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
}
export function recipeFilter(k: string) { rfil = k as typeof rfil; const h = $("#rcpBody"); if (h) h.innerHTML = recipeBody(); }

/* Tủ bánh: carousel các bánh đang bán, vuốt ngang */
export function cakesSheet() {
  const f = featured(), list = unlocked();
  modal(`<h2>Tủ bánh</h2><p class="sub">Vuốt để xem ${list.length} món đang bán</p>
    <div class="carow"><button class="cnav l" data-cn="-1" aria-label="Món trước">‹</button><button class="cnav r" data-cn="1" aria-label="Món sau">›</button>
    <div class="caro" id="caro">${list.map(r => `<div class="cc ${r.id === f.id ? "star" : ""}">
      ${r.id === f.id ? `<span class="tagf">★ Món nổi bật hôm nay</span>` : ""}
      <div class="ck">${cakeSVG({ base: r.base, cream: r.cream, top: r.top, sweet: 1 }, { size: 170 })}</div>
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
    <p class="sub small">Sinh nhật ${esc(S.names.her)}: ${fmtD(parse(CFG.herBirthday))} · Sinh nhật ${esc(S.names.his)}: ${fmtD(parse(CFG.hisBirthday))}</p>
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
const NOTE = `<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 12.5V3.5l7-1.5v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4.3" cy="12.5" r="2" fill="currentColor"/><circle cx="11.3" cy="11" r="2" fill="currentColor"/></svg>`;
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
  modal(`<h2>Menu</h2><p class="sub">Những thứ khác của tiệm</p><div class="more5">
    ${T("Công thức", ic.book(28, 2.2), "#FFB27A", "#EE7A2E", 'data-act="menu"')}
    ${T("Nguyên liệu", ic.basket(28, 2.2), "#8EE0BC", "#3FB68A", 'data-act="ings"')}
    ${T("Quản lý", ic.users(28, 2.2), "#C2B0FA", "#8B6FE6", 'data-act="staff"')}
    ${T("Thú cưng", ic.paw(28, 2.2), "#FF9DB6", "#EE5A83", 'data-go="/cua-hang/thu-cung"')}
    ${T("Hồ sơ", ic.user(28, 2.2), "#8EC5FF", "#4C8DF0", 'data-act="profile"')}
    ${T("Xếp hạng", ic.trophy(28, 2.2), "#FFD66B", "#F2A41F", 'data-act="rank"')}
    ${T("Sự kiện", ic.cal(28, 2.2), "#8EE0BC", "#2FA67C", 'data-act="days"')}
  </div>`);
}

/* Buff đang có: tổng ở trên, nguồn của từng buff ở dưới (quản lý, linh thú, trang trí) */
const BUFF_SHORT = { price: "Giá", tip: "Tip", pat: "Chờ", cust: "" } as const;
export function buffSheet() {
  const rows = buffSources(), line = (f: Partial<Record<keyof typeof BUFF_SHORT, number>>) => (Object.entries(f) as [keyof typeof BUFF_SHORT, number][]).filter(([, v]) => v)
    .map(([k, v]) => k === "cust" ? `+${v} khách` : `${BUFF_SHORT[k]} +${Math.round(v * 100)}%`).join(" · ");
  const art = (r: (typeof rows)[number]) => r.item ? gachaArt(r.item, 40) : `<span class="sw" style="background:${r.decor!.sw};background-size:${r.decor!.sws || "auto"}"></span>`;
  const group = (src: "mgr" | "mascot" | "decor", title: string) => { const g = rows.filter(r => r.src === src);
    return g.length ? `<div class="sh2"><b>${title}</b><span class="lav">${g.length} nguồn</span></div>${g.map(r => `<div class="bfrow"><span class="a">${art(r)}</span><div><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></div><em>${esc(line(r.fx))}</em></div>`).join("")}` : ""; };
  modal(`<h2>Buff đang có</h2><p class="sub">Tổng hợp từ quản lý, linh thú và trang trí</p>
    <div class="bftot">${(["price", "tip", "pat", "cust"] as const).map(k => `<div class="${k}">${buffIcon(k, 24)}<b>${buffText(k)}</b><small>${BUFF_LABEL[k]}</small></div>`).join("")}</div>
    ${group("mgr", "Quản lý")}${group("mascot", "Linh thú")}${group("decor", "Trang trí")}
    ${rows.length ? "" : `<p class="phint">Chưa có buff nào. Đặt quản lý, linh thú hoặc dùng đồ trang trí có buff để tăng.</p>`}
    <div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
}
