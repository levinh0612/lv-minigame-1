/* Màn "Thành tích" (#/thanh-tich): nội dung để cày sau Lv 24 gồm Nhiệm vụ tuần, Danh hiệu, Tay nghề công thức, Nâng cấp tiệm.
   Màn đầu tiên viết bằng Tailwind (màu lấy từ biến theme nên đổi theo theme hồng/xanh). */
import { RECIPES } from "../../content/game";
import { ACHIEVEMENTS, ACH_TIER, CRAFT_AT, CRAFT_MAX, CRAFT_STEP, SHOP_UPGRADES, WEEKLY_CHEST, WEEKLY_TICKETS, upgradeCost, type Reward } from "../../content/progression";
import { achClaimed, achPending, achReached, claimAch, statValue } from "../../engine/achievements";
import { craftStars, madeOf, nextCraft } from "../../engine/craft";
import { lvl } from "../../engine/progress";
import { buyUpgrade, upgradeLv, upgradeState } from "../../engine/upgrades";
import { fmtN } from "../../engine/util";
import { claimChest, claimWeekly, ensureWeek, weekId, weeklyAllClaimed, weeklyDef, weeklyDone, weeklyPending, weeklyProg } from "../../engine/weekly";
import { sfx } from "../../audio/sound";
import { render } from "../app";
import { cakeAnySVG } from "../art";
import { backBtn, coinPill, confirmSpend, esc, toast } from "../dom";

export type ProgTab = "weekly" | "ach" | "craft" | "shop";
let tab: ProgTab = "weekly";
export const setProgTab = (t: ProgTab) => { tab = t; };

/* ---------- Thành phần nhỏ dùng lại ---------- */
const bar = (cur: number, need: number, color = "bg-pink") =>
  `<div class="h-2.5 rounded-full bg-pink-l overflow-hidden"><i class="block h-full rounded-full ${color}" style="width:${Math.min(100, cur / need * 100)}%"></i></div>`;
const card = (inner: string, extra = "") => `<div class="rounded-3xl bg-white p-3.5 shadow-[0_3px_0_var(--color-line)] ${extra}">${inner}</div>`;
const rewardText = (r: Reward) => [r.coins ? `${fmtN(r.coins)} xu` : "", r.tickets ? `${r.tickets} vé` : ""].filter(Boolean).join(" + ");
/** nút nhận thưởng: bật khi `on`, chữ xám khi chưa đủ */
const claimBtn = (act: string, label: string, on: boolean) =>
  `<button class="shrink-0 rounded-2xl px-3 py-2 text-sm font-extrabold ${on ? "bg-pink text-white shadow-[0_3px_0_var(--color-pink-d)] active:translate-y-0.5" : "bg-pink-l text-soft opacity-60"}" ${on ? `data-pact="${act}"` : "disabled"}>${label}</button>`;

/* ---------- Tab: Nhiệm vụ tuần ---------- */
function weeklyTab() {
  const w = ensureWeek(lvl()), chestReady = weeklyAllClaimed() && !w.chest;
  const rows = w.missions.map(m => {
    const def = weeklyDef(m.key), done = weeklyDone(m.key), got = w.claimed.includes(m.key), cur = Math.min(weeklyProg(m.key), m.n);
    return card(`<div class="flex items-center gap-3"><div class="min-w-0 flex-1">
      <b class="block text-[15px] ${got ? "text-soft line-through" : "text-ink"}">${esc(def.text(m.n))}</b>
      <small class="text-[12px] text-soft">${fmtN(cur)}/${fmtN(m.n)} · thưởng ${fmtN(m.coins)} xu + ${WEEKLY_TICKETS} vé</small>
      <div class="mt-1.5">${bar(cur, m.n, done ? "bg-mint-d" : "bg-pink")}</div></div>
      ${got ? `<span class="shrink-0 text-lg text-mint-d">✓</span>` : claimBtn("wk:" + m.key, "Nhận", done)}</div>`);
  }).join("");
  return `<p class="px-1 text-[13px] text-soft">Làm mới mỗi thứ Hai (tuần từ ${weekId().split("-").reverse().slice(0, 2).join("/")}). Xong cả ${w.missions.length} nhiệm vụ để mở rương.</p>
    <div class="grid gap-2.5">${rows}</div>
    ${card(`<div class="flex items-center gap-3"><span class="text-3xl">🎁</span><div class="min-w-0 flex-1"><b class="block text-[15px]">Rương cả tuần</b>
      <small class="text-[12px] text-soft">${fmtN(WEEKLY_CHEST.coins ?? 0)} xu + ${WEEKLY_CHEST.tickets} vé triệu hồi</small></div>
      ${w.chest ? `<span class="text-lg text-mint-d">✓</span>` : claimBtn("chest", "Mở", chestReady)}</div>`, "bg-gradient-to-r from-cream to-lav")}`;
}

/* ---------- Tab: Danh hiệu ---------- */
function achTab() {
  return `<div class="grid gap-2.5">${ACHIEVEMENTS.map(a => {
    const val = statValue(a.stat), got = achClaimed(a), reached = achReached(a), maxed = got >= a.need.length, next = a.need[Math.min(got, a.need.length - 1)];
    const title = got ? ACH_TIER[got - 1] : "Chưa có", canClaim = reached > got;
    return card(`<div class="flex items-start gap-3"><div class="min-w-0 flex-1">
      <div class="flex items-center gap-2"><b class="text-[15px]">${esc(a.n)}</b><span class="rounded-full bg-lav px-2 py-0.5 text-[11px] font-bold text-lav-d">${title}</span></div>
      <small class="text-[12px] text-soft">${esc(a.desc)}: ${fmtN(val)}${maxed ? "" : ` / ${fmtN(next)}`}</small>
      <div class="mt-1.5">${bar(maxed ? 1 : val, maxed ? 1 : next, maxed ? "bg-gold-d" : "bg-pink")}</div>
      <div class="mt-1.5 flex gap-1">${a.need.map((_, i) => `<i class="h-1.5 flex-1 rounded-full ${i < got ? "bg-gold-d" : i < reached ? "bg-pink" : "bg-pink-l"}"></i>`).join("")}</div></div>
      ${maxed ? `<span class="shrink-0 text-lg text-gold-d">★</span>` : claimBtn("ach:" + a.id, canClaim ? rewardText(a.reward[got]) : "Nhận", canClaim)}</div>`);
  }).join("")}</div>`;
}

/* ---------- Tab: Tay nghề công thức ---------- */
function craftTab() {
  const L = lvl(), list = RECIPES.filter(r => r.lv <= L);
  const rows = list.map(r => {
    const st = craftStars(r.id), made = madeOf(r.id), next = nextCraft(r.id), stars = "★".repeat(st) + "☆".repeat(CRAFT_MAX - st);
    return card(`<div class="flex items-center gap-3"><div class="h-14 w-14 shrink-0">${cakeAnySVG({ base: r.base, cream: r.cream, top: r.top, up: r.up, sweet: 1 }, { size: 56, still: true })}</div>
      <div class="min-w-0 flex-1"><b class="block truncate text-[14px]">${esc(r.n)}</b>
      <small class="text-[12px] text-gold-t">${stars} · giá +${Math.round(st * CRAFT_STEP * 100)}%</small>
      <div class="mt-1">${bar(next ? made : 1, next ?? 1, next ? "bg-pink" : "bg-gold-d")}</div>
      <small class="text-[11px] text-soft">${next ? `${fmtN(made)}/${fmtN(next)} bánh để lên ${st + 1} sao` : `Đủ 5 sao · ${fmtN(made)} bánh`}</small></div></div>`, "p-3");
  }).join("");
  return `<p class="px-1 text-[13px] text-soft">Làm đủ ${CRAFT_AT.join(" / ")} bánh một món để lên 1..5 sao: mỗi sao +${Math.round(CRAFT_STEP * 100)}% giá bán và nhận xu thưởng.</p><div class="grid gap-2.5">${rows}</div>`;
}

/* ---------- Tab: Nâng cấp tiệm cao cấp ---------- */
function shopTab() {
  const L = lvl();
  return `<p class="px-1 text-[13px] text-soft">Chỗ tiêu xu cuối game: mỗi cấp cộng buff cố định cho cả tiệm.</p><div class="grid gap-2.5">${SHOP_UPGRADES.map(u => {
    const lv = upgradeLv(u.id), st = upgradeState(u, L), cost = upgradeCost(u, lv), val = (n: number) => u.fx === "cust" ? `+${n} khách` : `+${Math.round(n * 100)}%`;
    const label = st === "max" ? "Tối đa" : st === "lv" ? `Lv ${u.lv}` : `${fmtN(cost)} xu`;
    return card(`<div class="flex items-center gap-3"><span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lav text-2xl">${u.icon}</span>
      <div class="min-w-0 flex-1"><b class="block text-[15px]">${esc(u.n)} <small class="font-bold text-lav-d">cấp ${lv}/${u.max}</small></b>
      <small class="text-[12px] text-soft">${esc(u.desc)}</small>
      <small class="block text-[12px] font-bold text-mint-d">Đang có ${val(u.per * lv)}${lv < u.max ? ` → ${val(u.per * (lv + 1))}` : ""}</small></div>
      ${claimBtn("up:" + u.id, label, st === "ok")}</div>`);
  }).join("")}</div>`;
}

/* ---------- Khung màn ---------- */
const TABS: [ProgTab, string, number][] = [["weekly", "Nhiệm vụ", weeklyPending()], ["ach", "Danh hiệu", achPending()], ["craft", "Tay nghề", 0], ["shop", "Nâng cấp", 0]];
export function progressHTML() {
  const body = { weekly: weeklyTab, ach: achTab, craft: craftTab, shop: shopTab }[tab]();
  return `<div class="scr"><div class="shead">${backBtn}<h2>Thành tích</h2>${coinPill()}</div>
    <div class="grid gap-3 px-4 pb-8">
      <div class="grid grid-cols-4 gap-1.5 rounded-2xl bg-white p-1 shadow-[0_3px_0_var(--color-line)]">${TABS.map(([id, n, dot]) =>
        `<button class="relative rounded-xl py-2 text-[13px] font-extrabold ${id === tab ? "bg-pink text-white" : "text-soft"}" data-progtab="${id}">${n}${dot ? `<i class="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-[10px] not-italic text-white">${dot}</i>` : ""}</button>`).join("")}</div>
      ${body}</div></div>`;
}

/** xử lý chạm trong màn: data-ptab (đổi tab) và data-pact (nhận thưởng, nâng cấp) */
export function progressAct(kind: "tab" | "act", v: string) {
  if (kind === "tab") { setProgTab(v as ProgTab); sfx("click"); return render(); }
  const [what, id] = v.split(":");
  if (what === "wk" && claimWeekly(id)) { sfx("coin"); toast("Đã nhận thưởng nhiệm vụ tuần"); }
  else if (what === "chest" && claimChest()) { sfx("level"); toast(`Rương tuần: ${rewardText(WEEKLY_CHEST)}`); }
  else if (what === "ach") { const r = claimAch(id); if (r) { sfx("level"); toast(`Danh hiệu mới! +${rewardText(r)}`); } }
  else if (what === "up") {
    const u = SHOP_UPGRADES.find(x => x.id === id)!, cost = upgradeCost(u, upgradeLv(id));
    return confirmSpend(cost, `Nâng ${u.n} lên cấp ${upgradeLv(id) + 1}?`, () => { if (buyUpgrade(id, lvl()) === "ok") { sfx("level"); toast(`${u.n} lên cấp ${upgradeLv(id)}!`); } render(); });
  }
  render();
}
