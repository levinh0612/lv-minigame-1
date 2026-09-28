import "./styles/main.css";
import { registerSW } from "virtual:pwa-register";
import { Sound, sfx } from "./audio/sound";
import type { PetId } from "./content/couple";
import { CATS, DECOR, type PartKey, type StockKey } from "./content/game";
import { buy, buyFood, buySuggested, foodDef, hire, packPrice, toggleDuty, train, treat } from "./engine/economy";
import type { FoodId } from "./content/game";
import { lvl } from "./engine/progress";
import { S, petName, save } from "./engine/state";
import { render } from "./ui/app";
import { $, bump, closeModal, dropModal, floatHearts, hasModal, heartRow, toast } from "./ui/dom";
import { backup, claimGoals, openLetter, pauseMenu, restore, settings, tutorial, welcome } from "./ui/modals";
import { navigate } from "./ui/router";
import { selectPet } from "./ui/screens/shop";
import { SH, doPeek, doRefill, doServe, openStock, pickIngredient, selectSeat, startShift, tickAll, tickStock, toggleAuto, toggleSheet } from "./ui/screens/play";

/* Một bộ xử lý chạm cho cả app (event delegation) */
document.addEventListener("click", e => {
  const t = (e.target as HTMLElement).closest<HTMLElement>("button, .modal"); if (!t) return;
  if (t.id === "modal") { if (e.target === t && !SH) closeModal(); return; }
  if (t.hasAttribute("data-close")) return closeModal();
  if (t.hasAttribute("data-music")) { Sound.setMusic(!S.music); if (!SH) render(); return; }
  const d = t.dataset;
  if (d.go) { sfx("click"); return navigate(d.go, t.hasAttribute("data-replace")); }
  switch (d.act) {
    case "start": dropModal(); return startShift();
    case "suggest": { const sp = buySuggested(); if (sp) { sfx("coin"); toast(`Đã nhập hàng · ${sp} xu`); } else toast("Không đủ xu để nhập theo gợi ý"); return render(); }
    case "tutorial": return tutorial();
    case "backup": return backup();
    case "restore": return restore();
    case "letter": return openLetter();
    case "claim": return claimGoals();
    case "settings": return settings();
    case "pause": return pauseMenu();
    case "serve": return doServe();
    case "peek": return doPeek();
    case "auto": return toggleAuto();
    case "sheet": return toggleSheet();
    case "stock": return openStock(!document.querySelector("#ssheet.on"));
    case "tickall": return tickAll();
    case "refill": return doRefill();
  }
  if (d.buy) {
    const x = DECOR.find(v => v.id === d.buy)!;
    if (S.coins < x.cost || S.decor.includes(x.id) || x.lv > lvl()) return;
    S.coins -= x.cost; S.decor.push(x.id); save(); render(); sfx("level"); toast("Đã mua " + x.n);
    return;
  }
  if (d.ingBuy) {
    const [k, i, n] = d.ingBuy.split(":"), key = k as StockKey;
    if (buy(key, +i, +n)) { sfx("tap"); toast(`+${n} ${CATS[key][+i][0]} · ${packPrice(key, +i, +n)} xu`); } else toast("Không đủ xu");
    return render();
  }
  if (d.hire) { if (hire(d.hire as PetId)) { sfx("level"); toast(`${petName(d.hire as PetId)} đã vào làm!`); } return render(); }
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
    if (buyFood(f.id, +n)) { sfx("tap"); toast(`+${n} ${f.n} · ${f.cost * +n} xu`); } else toast("Không đủ xu");
    return render();
  }
  if (d.treat) {
    const [pet, food] = d.treat.split(":") as [PetId, FoodId];
    if (!treat(pet, food)) return toast("Không đủ xu để mua đồ ăn");
    const r = t.getBoundingClientRect(); floatHearts(r.left + r.width / 2, r.top, 6); sfx("boop");
    toast(`${petName(pet)} ăn ${foodDef(food).n} ngon lành! +${foodDef(food).aff} ♥`); return render();
  }
  if (d.selPet) { selectPet(d.selPet as PetId); sfx("tap"); return render(); }
  if (d.ing) { const [k, i] = d.ing.split(":"); return pickIngredient(k as PartKey, +i); }
  if (d.seat) return selectSeat(+d.seat);
  if (d.tick) return tickStock(d.tick);
});

// rời app giữa ca: tự tạm dừng
document.addEventListener("visibilitychange", () => { if (document.hidden && SH && !SH.paused && !hasModal()) pauseMenu(); });
window.addEventListener("hashchange", render);

render();
Sound.play("home");
// lần đầu: hướng dẫn rồi quà khai trương; người chơi cũ chưa nhận quà thì tặng luôn
setTimeout(() => { if (hasModal()) return; if (!S.tut) tutorial(); else welcome(); }, 400);
if (S.refund) { const r = S.refund; delete S.refund; save(); setTimeout(() => toast(`Tiệm đổi giao diện mới! Hoàn lại ${r} xu cho đồ trang trí cũ`), 600); }

// PWA: chơi offline, có bản mới thì tự cập nhật lần mở sau
if (import.meta.env.PROD) registerSW({ immediate: true, onOfflineReady() { $("#app") && toast("Tiệm đã sẵn sàng chơi offline"); } });
