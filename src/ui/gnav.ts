/* Thanh dưới kiểu kính lỏng dùng chung cho Tiệm, Triệu hồi, Cửa hàng: luôn nằm dưới, mục của màn hiện tại sáng lên.
   Mục tiêu, Nhiệm vụ, Quà tặng nằm trong Xem thêm (số chấm đỏ cộng dồn lên nút Xem thêm). */
import { achPending } from "../engine/achievements";
import { giftReady, goals } from "../engine/progress";
import { weeklyPending } from "../engine/weekly";
import { ic } from "./icons";

export type NavKey = "home" | "gacha" | "shop";
const ROUTE_NAV: Record<string, NavKey> = { home: "home", rank: "home", gacha: "gacha", shop: "shop" };

export function navHTML(active: NavKey | "") {
  const left = goals().filter(g => g.cur < g.need).length, more = left + weeklyPending() + achPending() + (giftReady() ? 1 : 0);
  const items = [
    { k: "home", n: "Tiệm", i: ic.home, go: "/" }, { k: "gacha", n: "Triệu hồi", i: ic.sparkle, go: "/gacha" },
    { k: "shop", n: "Cửa hàng", i: ic.store, go: "/cua-hang" }, { k: "more", n: "Xem thêm", i: ic.menu, act: "more" }
  ] as const;
  return `<nav class="glass5" aria-label="Điều hướng chính">${items.map(x => {
    const on = x.k === active;
    return `<button class="${on ? "on" : ""}" ${"go" in x ? `data-go="${x.go}"` : `data-act="${x.act}"`}${on ? ' aria-current="page"' : ""}>${x.i(26, on ? 2.4 : 2.1, "none", "")}${x.k === "more" && more ? `<span class="nd">${more}</span>` : ""}<b>${x.n}</b></button>`;
  }).join("")}</nav>`;
}

/** Gọi sau mỗi lần vẽ màn: hiện thanh dưới ở 3 màn chính, ẩn ở màn khác */
export function syncNav(route: string) {
  const key = ROUTE_NAV[route]; let el = document.getElementById("gnav");
  document.body.classList.toggle("has-gnav", !!key);
  if (!key) { el?.remove(); return; }
  if (!el) { el = document.createElement("div"); el.id = "gnav"; document.body.appendChild(el); }
  el.innerHTML = navHTML(key);
}
