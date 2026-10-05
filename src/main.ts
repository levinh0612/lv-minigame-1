import "./styles/main.css";
import "./styles/themes.css";
import { registerSW } from "virtual:pwa-register";
import { Sound, sfx } from "./audio/sound";
import type { PetId } from "./content/couple";
import { CATS, type PartKey, type StockKey } from "./content/game";
import type { RoomKey } from "./content/room";
import { buy, buyFood, canAffordUpgrade, needUpgrade, buySuggested, quickPrep, foodDef, hire, packPrice, setMeal, toggleDuty, train, treat } from "./engine/economy";
import type { FoodId } from "./content/game";
import { S, petName, save } from "./engine/state";
import { tickIncident } from "./engine/incident";
import { earn } from "./engine/wallet";
import { claimPassive } from "./engine/passive";
import { render } from "./ui/app";
import { loadSprites } from "./ui/sprite";
import { profileSheet } from "./ui/profile";
import { $, bump, closeModal, dropModal, esc, floatHearts, hasModal, heartRow, modalLocked, toast } from "./ui/dom";
import { askVisit } from "./ui/screens/visit";
import { gachaAct } from "./ui/screens/gacha";
import { accountPanel, claimGoals, giftSheet, goalsSheet, coinModal, openLetter, pauseMenu, rewardModal, settings, tutorial, upgradeModal, refundModal, venueBuy, visitGiftModal, wallet, welcome, whatsNew } from "./ui/modals";
import { flushSave, isLocked, loggedIn, pull, setInShift, startAutoSave, trackHidden, visitClaim, visitPending } from "./net/cloud";
import { navigate } from "./ui/router";
import { buffSheet, cakesSheet, daysSheet, menuSheet, moreSheet, musicSheet, photoSheet } from "./ui/sheets";
import { rankSheet } from "./ui/screens/rank";
import { applyUpdate, checkVersion, hardReload, justUpdated, newVersion, setRegistration, triedRecently } from "./net/update";
import { CHANGELOG } from "./content/roadmap";
import { applyDecor, cancelDecor, selectPet, setDecorCat, tryDecor } from "./ui/screens/shop";
import { SH, pause, resume, doMousePay, openMouseDlg, doPeek, doRefill, doServe, openStock, pickIngredient, selectSeat, startShift, tickAll, tickStock, toggleAuto, toggleSheet, watchBaker } from "./ui/screens/play";

/* Chọn nguyên liệu: xử lý lúc nhả tay (không cần chờ click) để không mất cú bấm khi giao diện vẽ lại hoặc ngón tay trượt nhẹ */
let ingDown: { id: string; x: number; y: number; t: number } | null = null, ingAt = 0;
document.addEventListener("pointerdown", e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-ing]");
  ingDown = b && SH && (e.pointerType !== "mouse" || e.button === 0) ? { id: b.dataset.ing!, x: e.clientX, y: e.clientY, t: performance.now() } : null;
});
document.addEventListener("pointercancel", () => { ingDown = null; });
document.addEventListener("pointerup", e => {
  const d = ingDown; ingDown = null;
  if (!d || !SH || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12 || performance.now() - d.t > 800) return;
  ingAt = performance.now(); const [k, i] = d.id.split(":"); pickIngredient(k as PartKey, +i);
});
/* Một bộ xử lý chạm cho cả app (event delegation) */
document.addEventListener("click", e => {
  const t = (e.target as HTMLElement).closest<HTMLElement>("button, .modal"); if (!t) return;
  if (t.id === "modal") { if (e.target === t && !SH && !modalLocked()) closeModal(); return; }
  if (t.hasAttribute("data-close")) return closeModal();
  if (t.hasAttribute("data-music")) { Sound.setMusic(!S.music); if (!SH) render(); return; }
  const d = t.dataset;
  if (d.go === "/muc-tieu" && !SH) { sfx("click"); return goalsSheet(); }                    // Mục tiêu, Quà tặng: hộp thoại từ dưới lên
  if (d.go === "/cua-hang/qua-tang" && !SH) { sfx("click"); return giftSheet(); }
  if (d.go) { sfx("click"); return navigate(d.go, t.hasAttribute("data-replace")); }
  switch (d.act) {
    case "start":
      if (needUpgrade() && canAffordUpgrade()) { sfx("click"); return upgradeModal(true); }
      dropModal(); return startShift();
    case "start-anyway": dropModal(); return startShift();
    case "venue": sfx("click"); return upgradeModal(false);
    case "quickprep": { const r = quickPrep(); if (r.stock + r.food) { sfx("coin"); toast(`Đã chuẩn bị · ${r.stock + r.food} xu${r.food ? ` (có đồ ăn cho các bé)` : ""}`); } else toast("Không đủ xu để chuẩn bị"); return render(); }
    case "suggest": { const sp = buySuggested(); if (sp) { sfx("coin"); toast(`Đã nhập hàng · ${sp} xu`); } else toast("Không đủ xu để nhập theo gợi ý"); return render(); }
    case "tutorial": return tutorial();
    case "letter": return openLetter();
    case "claim": return claimGoals();
    case "settings": return settings();
    case "profile": return profileSheet();
    case "account": return accountPanel();
    case "menu": return menuSheet();
    case "more": return moreSheet();
    case "buff": return buffSheet();
    case "rank": return rankSheet();
    case "music": return musicSheet();
    case "cakes": return cakesSheet();
    case "days": return daysSheet();
    case "photo": return photoSheet();
    case "wallet": if (!SH) wallet(); return;
    case "update": return void applyUpdate();
    case "checkver": return void checkVersion(true).then(r => { if (r) void applyUpdate(); else toast(`Đang là bản mới nhất (${__APP_VERSION__}) ✓`); });
    case "hardreload": return void hardReload();
    case "pause": return pauseMenu();
    case "serve": return doServe();
    case "mouseopen": return openMouseDlg();
    case "mousepay": return doMousePay();
    case "peek": return doPeek();
    case "auto": return toggleAuto();
    case "sheet": return toggleSheet();
    case "stock": return openStock(!document.querySelector("#ssheet.on"));
    case "tickall": return tickAll();
    case "refill": return doRefill();
    case "dcancel": cancelDecor(); return render();
    case "dbuy": { const m = applyDecor(); if (m) { sfx("level"); toast(m); } return render(); }
  }
  if (d.dcat) { setDecorCat(+d.dcat); sfx("tap"); return render(); }
  if (d.dtry) { const [k, v] = d.dtry.split(":"); tryDecor(k as RoomKey, v); sfx("tap"); return render(); }
  if (d.ingBuy) {
    const [k, i, n] = d.ingBuy.split(":"), key = k as StockKey;
    if (buy(key, +i, +n)) { sfx("tap"); toast(`+${n} ${CATS[key][+i][0]} · ${packPrice(key, +i, +n)} xu`); } else toast("Không đủ xu");
    return render();
  }
  if (d.hire) { if (hire(d.hire as PetId)) { sfx("level"); toast(`${petName(d.hire as PetId)} đã vào làm!`); } return render(); }
  if (d.gact) return void gachaAct(d.gact);
  if (d.visit) { sfx("click"); return void askVisit(d.visit); }
  if (d.venue) { const [vid, f] = d.venue.split(":"); return venueBuy(vid, f === "1"); }
  if (d.meal) { const [pid, fid] = d.meal.split(":"); setMeal(pid as PetId, fid as FoodId); sfx("click"); return render(); }
  if (d.duty) { toggleDuty(d.duty as PetId); sfx("click"); return render(); }
  if (d.train) { if (train(d.train as PetId)) { sfx("level"); toast(`${petName(d.train as PetId)} lên bậc ${S.staff[d.train as PetId].lv}!`); } return render(); }
  if (d.pet) {
    const id = d.pet as keyof typeof S.pets, st = S.pets[id], r = t.getBoundingClientRect();
    if (st.petDay !== S.daily.day) { st.petDay = S.daily.day; st.pets = 0; }
    if (st.pets < 10) { st.pets++; st.aff++; save(); }
    floatHearts(r.left + r.width / 2, r.top + r.height / 3, 3); sfx("boop"); bump(t, "squish");
    document.querySelectorAll(`[data-hearts="${id}"]`).forEach(h => { h.innerHTML = heartRow(st.aff); });
    return;
  }
  if (d.foodBuy) {
    const [id, n] = d.foodBuy.split(":"), f = foodDef(id as FoodId);
    if (buyFood(f.id, +n)) { if (d.for) { S.staff[d.for as PetId].prio = Date.now(); save(); } sfx("tap"); toast(`+${n} ${f.n} · ${f.cost * +n} xu`); } else toast("Không đủ xu");
    return render();
  }
  if (d.treat) {
    const [pet, food] = d.treat.split(":") as [PetId, FoodId];
    if (!treat(pet, food)) return toast("Không đủ xu để mua đồ ăn");
    const r = t.getBoundingClientRect(); floatHearts(r.left + r.width / 2, r.top, 6); sfx("boop");
    toast(`${petName(pet)} ăn ${foodDef(food).n} ngon lành! +${foodDef(food).aff} ♥`); return render();
  }
  if (d.selPet) { selectPet(d.selPet as PetId); sfx("tap"); return render(); }
  if (d.ing) { if (performance.now() - ingAt < 700) return; const [k, i] = d.ing.split(":"); return pickIngredient(k as PartKey, +i); }
  if (d.seat) return selectSeat(+d.seat);
  if (d.tick) return tickStock(d.tick);
  if (d.watch) return watchBaker(d.watch as PetId);
});

// rời app giữa ca: tự tạm dừng
document.addEventListener("visibilitychange", () => {
  if (document.hidden && SH && !SH.paused && !hasModal()) pauseMenu();
  if (document.hidden && import.meta.env.PROD) flushSave();   // rời app: lưu lên mây ngay
  trackHidden(document.hidden);
  if (!document.hidden) { if (!SH) void autoUpdate(); if (!SH && isLocked()) render(); else if (loggedIn() && !SH) void pull(); }
});
/* đồng bộ giữa các máy: app đang mở (không trong ca) thì 20 giây hỏi server một lần xem có bản mới hơn không */
setInShift(() => !!SH);
/* sự cố bất ngờ: đồng hồ chạy khi app đang hiện và không có hộp thoại nào mở. Tới giờ thì hiện đồng xu cho người chơi tự bấm;
   đang trong ca thì tạm dừng ca khi hộp thoại hiện, đóng xong chơi tiếp */
setInterval(() => {
  if (document.hidden || isLocked() || hasModal()) return;
  if (!tickIncident(1)) return;
  const inShift = !!SH; if (inShift) pause();
  sfx("bell"); coinModal(() => { if (inShift) resume(); else render(); });
}, 1000);
/* thưởng thụ động: đền bù một lần và 10% số xu cho lần đăng nhập đầu tiên mỗi ngày (qua ngày mới giữa lúc đang mở app cũng nhận) */
function passive() {
  if (document.hidden || isLocked() || SH || hasModal() || !S.tut || !S.welcome) return;     // người mới: xem hướng dẫn và quà khai trương trước
  const c = claimPassive(); if (!c.daily && !c.comp) return;
  save(); sfx("level"); rewardModal(c); render();
}
setInterval(passive, 20000);
/* tiền mừng của khách ghé thăm tiệm mình: nhận rồi báo bằng hộp thoại */
let giftBusy = false;
async function visitGifts() {
  if (giftBusy || document.hidden || isLocked() || SH || hasModal() || !loggedIn() || !S.tut || !S.welcome) return;
  giftBusy = true;
  try {
    if (!(await visitPending()).pending) return;
    if (SH || hasModal()) return;                         // đang bận: lần sau
    const { gifts } = await visitClaim(); if (!gifts.length) return;
    earn("visit", gifts.reduce((a, g) => a + g.gift, 0), "Tiền mừng khách ghé thăm"); save(); sfx("level"); render(true); visitGiftModal(gifts);
  } catch { /* không có mạng: lần sau */ } finally { giftBusy = false; }
}
setInterval(() => void visitGifts(), 45000); setTimeout(() => void visitGifts(), 4000);
setInterval(() => { if (!document.hidden && loggedIn() && !isLocked() && !SH) void pull(); }, 20000);
addEventListener("cloud:pulled", () => { if (!SH && !hasModal()) render(); });
window.addEventListener("hashchange", () => render());

render();
Sound.play("home");
/* vào tiệm (mở khoá / đăng nhập xong): tải bản mới nhất, rồi hướng dẫn và quà khai trương nếu là lần đầu */
async function enter() {
  await pull();
  setTimeout(() => { if (hasModal() || SH) return; if (S.gacha.refund) refundModal(); else if (!S.tut) tutorial(); else if (!S.welcome) welcome(); else passive(); }, 300);
}
addEventListener("auth:in", () => void enter());
addEventListener("cloud:logout", () => { if (!SH) { toast("Phiên đăng nhập đã hết, đăng nhập lại nha"); render(); } });
startAutoSave();
if (loggedIn() && !isLocked()) void enter();
if (S.refund) { const r = S.refund; delete S.refund; save(); setTimeout(() => toast(`Tiệm đổi giao diện mới! Hoàn lại ${r} xu cho đồ trang trí cũ`), 600); }

// PWA: chơi offline. Có bản mới: mở app / quay lại app mà không đang trong ca thì tự cập nhật;
// đang trong ca thì hiện banner, hết ca mới cập nhật (xem net/update.ts)
function showUpdateBanner() {
  const r = newVersion(); if (!r || SH || document.querySelector(".upd")) return;
  const note = CHANGELOG.find(c => c.v === r.v)?.notes[0];
  document.body.insertAdjacentHTML("beforeend", `<button class="upd" data-act="update"><b>✨ Có bản ${esc(r.v)} · Cập nhật</b>${note ? `<small>${esc(note)}</small>` : ""}</button>`);
}
async function autoUpdate() {
  const r = await checkVersion(true);
  if (!r) return;
  if (!SH && !triedRecently()) void applyUpdate(); else showUpdateBanner();
}
void loadSprites();   // ảnh khách nam: tải sẵn để tô màu từng khách
if (import.meta.env.PROD) registerSW({
  immediate: true,
  onNeedRefresh() { void autoUpdate(); },
  onOfflineReady() { $("#app") && toast("Tiệm đã sẵn sàng chơi offline"); },
  onRegisteredSW(_url, reg) { setRegistration(reg); setInterval(() => void checkVersion().then(showUpdateBanner), 900000); }
});
if (import.meta.env.PROD) setTimeout(() => void autoUpdate(), 800);
addEventListener("hashchange", () => { if (!SH) showUpdateBanner(); });
// tải lại để cập nhật (?v=...) xong thì dọn địa chỉ cho gọn
if (location.search) history.replaceState(null, "", location.pathname + location.hash);
// vừa cập nhật xong: cho xem có gì mới (một lần)
const prevVer = justUpdated();
if (prevVer) setTimeout(() => { if (!hasModal() && !isLocked() && loggedIn()) whatsNew(prevVer); }, 1200);
