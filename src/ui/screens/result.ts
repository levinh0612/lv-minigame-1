/* Màn Kết quả sau mỗi ca: tấm bảng giơ lên, sao, sổ lãi. Hàm *HTML thuần để Storybook dùng lại.
   Kết quả ca được play.ts đặt vào bằng setResult() lúc hết ca. */
import { RECIPES, STAFF } from "../../content/game";
import { daysTogether } from "../../engine/dates";
import { giftReady, xpFor } from "../../engine/progress";
import { mouseRank } from "../../engine/mouse";
import { goalDone, summary, type ledger, type Shift } from "../../engine/shift";
import { S, petName } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { weeklyDef } from "../../engine/weekly";
import { esc } from "../dom";

export type Result = { sh: Shift; lv: number; led: ReturnType<typeof ledger> };
let result: Result | null = null;
export const hasResult = () => !!result;
export const getResult = () => result;
export const setResult = (r: Result | null) => { result = r; };
/** cho Storybook: đặt kết quả mẫu */
export const _setResult = setResult;

const STAR = (on: boolean, w: number, y: number, r: number, d: number) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 40 40" style="transform:translateY(${y}px) rotate(${r}deg);animation-delay:${d}s" aria-hidden="true"><path d="M20 3.5 L24.6 13.4 L35.5 14.7 L27.4 22.1 L29.6 32.9 L20 27.5 L10.4 32.9 L12.6 22.1 L4.5 14.7 L15.4 13.4 Z" fill="${on ? "#FFC53D" : "#FFFFFF"}" stroke="${on ? "#E08A1E" : "#3E3A4A"}" stroke-width="2.6" stroke-linejoin="round"/>${on ? `<path d="M20 9 L22.6 14.8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>` : ""}</svg>`;
const SIGN = [
  null,
  { bg: "#F58E8E", sh: "#D96A6A", r: 4, page: "#F2E9EC", t: "Cố lên nha!" },
  { bg: "#9FE0C0", sh: "#62BD93", r: -3, page: "#E3F6EC", t: "Giỏi lắm!" },
  { bg: "#8FCFF2", sh: "#5FAED8", r: -4, page: "#CFEAF2", t: "Tuyệt vời!" }
];
/** thanh tiến độ có hoạt ảnh chạy từ `from`% tới `to`% (keyframes prog-grow trong styles/tailwind.css) */
const growBar = (from: number, to: number, color: string) =>
  `<div class="mt-1.5 h-[7px] overflow-hidden rounded-full bg-pink-l"><i class="block h-full rounded-full ${color} animate-[prog-grow_1.2s_.35s_cubic-bezier(.22,1,.36,1)_both] motion-reduce:animate-none" style="--from:${from.toFixed(1)}%;--to:${to.toFixed(1)}%;width:${to.toFixed(1)}%"></i></div>`;
/** một dòng tiến độ: biểu tượng, tiêu đề + phụ đề, thanh, nhãn thưởng bên phải */
const progRow = (icon: string, title: string, sub: string, bar: string, tag: string) =>
  `<div class="grid grid-cols-[34px_1fr_auto] items-center gap-2.5"><span class="grid h-[34px] w-[34px] place-items-center rounded-xl bg-pink-l text-lg" aria-hidden="true">${icon}</span>
    <div class="min-w-0"><b class="block text-sm leading-tight">${title} <small class="font-extrabold text-soft">${sub}</small></b>${bar}</div>
    <em class="whitespace-nowrap rounded-full bg-mint-l px-2.5 py-0.5 text-xs font-extrabold not-italic text-mint-d">${tag}</em></div>`;
const ledgerRow = (n: string, v: number, plus: boolean, sub = false) => v ? `<div class="flex justify-between border-b border-dashed border-line py-2 text-sm font-extrabold ${sub ? "pl-3 text-[13px] text-soft" : ""}"><span>${n}</span><b class="${plus ? "text-mint-d" : "text-red"}">${plus ? "+" : "−"}${fmtN(v)}</b></div>` : "";

export function resultHTML(r: Result | null = result) {
  if (!r) return "";
  const { sh, lv, led } = r, { total, stars } = summary(sh), sg = SIGN[stars]!, good = stars >= 2;
  const newR = RECIPES.filter(x => x.lv > sh.lv0 && x.lv <= lv);
  const conf = good ? `<div class="conf" aria-hidden="true">${Array.from({ length: 34 }, (_, i) => {
    const d = 3.5 + Math.random() * 3;
    return `<i style="left:${Math.random() * 100}%;width:${7 + Math.random() * 6}px;height:${10 + Math.random() * 8}px;background:${["#FF8FAB", "#8FD9B6", "#FFD66B", "#FFFFFF", "#C9B8F0"][i % 5]};border-radius:${Math.random() > 0.6 ? "50%" : "3px"};animation-duration:${d}s;animation-delay:${Math.random() * 2}s"></i>`;
  }).join("")}</div>` : "";
  const done = sh.goals.filter(g => goalDone(sh, g)).length, profit = led.profit, thu = led.revenue, chi = led.ingUsed + led.quick + led.wages;
  /* tiến độ: kinh nghiệm (qua cấp thì thanh chạy từ 0), món lên sao, nhiệm vụ tuần tiến thêm */
  const pctOf = (xp: number, L: number) => Math.max(0, Math.min(100, (xp - xpFor(L)) / (xpFor(L + 1) - xpFor(L)) * 100));
  const from = lv > sh.lv0 ? 0 : pctOf(sh.xp0, sh.lv0), to = pctOf(S.xp, lv), gained = S.xp - sh.xp0;
  const rows = [progRow("⭐", lv > sh.lv0 ? `Lên cấp ${lv}!` : `Cấp ${lv}`, `${Math.round(from)}% → ${Math.round(to)}%`, growBar(from, to, "bg-pink"), `+${fmtN(gained)} XP`)];
  sh.ups.forEach(u => rows.push(progRow("🎂", esc(u.n), `${"★".repeat(u.star - 1)} → ${"★".repeat(u.star)}`, growBar(0, 100, "bg-gold-d"), "Lên sao")));
  S.prog.weekly.missions.forEach(m => {
    const a = sh.wk0[m.key] ?? 0, b = S.prog.weekly.prog[m.key] ?? 0; if (b <= a) return;
    rows.push(progRow("📅", esc(weeklyDef(m.key).text(m.n)), `${fmtN(Math.min(a, m.n))} → ${fmtN(Math.min(b, m.n))}`, growBar(Math.min(100, a / m.n * 100), Math.min(100, b / m.n * 100), "bg-mint-d"), b >= m.n ? "Xong!" : `+${fmtN(b - a)}`));
  });
  const extras = [
    sh.ticket ? "🎟 Đạt hết mục tiêu ca: +1 vé triệu hồi" : "",
    sh.ticketCapped ? "🎟 Hôm nay đã nhận đủ vé từ mục tiêu ca, mai nhận tiếp nha" : "",
    sh.shutdown ? `🚨 Sở y tế đóng cửa tiệm vì có chuột: phạt ${fmtN(sh.mouseFine)} xu. Lần sau nhớ bắt chuột sớm nha` : "",
    sh.mouseKills ? `🐭 Vua diệt chuột hạng ${mouseRank().name}: +${sh.mouseReward} xu${mouseRank().next ? ` · cần ${mouseRank().next} lần để lên hạng` : ""}` : "",
    sh.mousePaid ? `Đã chi ${fmtN(sh.mousePaid)} xu xử lý chuột nhanh` : "",
    sh.comboPaid ? `🔥 Combo dài nhất ×${sh.bestCombo}: +${fmtN(sh.comboPaid)} xu thưởng${sh.comboLost ? ` (mất ${fmtN(sh.comboLost)} xu vì đứt chuỗi)` : ""}` : sh.comboLost ? `Đứt combo: mất ${fmtN(sh.comboLost)} xu thưởng dồn, ca sau giữ chuỗi nha` : "",
    sh.bondUp ? `💞 Linh vật thân thiết cấp ${sh.bondUp}: chỉ số linh vật tăng thêm 12%` : ""
  ].filter(Boolean).map(t => `<p class="rounded-2xl bg-white/70 px-3 py-2 text-[13px] font-extrabold text-soft">${esc(t)}</p>`).join("");
  const note = giftReady() ? unlockCard()
    : lv > sh.lv0 ? `<div class="rnote"><span class="env"></span><div>Lên Lv ${lv}!${newR.length ? " Mở khoá: " + newR.map(x => esc(x.n)).join(", ") : ""}${STAFF.filter(d => d.unlock > sh.lv0 && d.unlock <= lv).map(d => ` · ${esc(petName(d.id))} xin vào làm`).join("")}</div></div>`
    : !good ? `<div class="rnote soft"><span class="env"></span><div>Mai thử bấm "Xem công thức" trước khi giao nhé, Milo tin em mà!</div></div>`
    : unlockCard() || `<div class="rnote"><span class="env"></span><div>Ngày ${fmtN(daysTogether())} bên nhau · tiệm vẫn đông khách nè</div></div>`;
  const kpi = (v: string, n: string) => `<div class="rounded-[18px] bg-white px-1.5 py-2.5 text-center shadow-[0_2px_0_var(--color-line)]"><b class="block font-display text-xl leading-none">${v}</b><small class="text-[11px] font-extrabold text-soft">${n}</small></div>`;
  return `<div class="scr res !block px-3.5 pb-[calc(104px+env(safe-area-inset-bottom,0px))] pt-[calc(14px+env(safe-area-inset-top,0px))] text-ink" style="--page:${sg.page}">
    ${conf}
    <div class="relative text-center"><small class="text-[13px] font-extrabold text-soft">Kết thúc ca ${S.shifts}</small>
      <div class="mx-auto mt-1.5 flex w-max max-w-full -rotate-1 items-center justify-center gap-3 rounded-[22px] px-5 pb-3 pt-2.5 text-white" style="background:${sg.bg};box-shadow:0 5px 0 ${sg.sh}">
        <div class="flex items-end gap-0.5" aria-label="${stars} sao">${[0, 1, 2].map(i => STAR(i < stars, i === 1 ? 40 : 32, i === 1 ? -4 : 0, (i - 1) * 10, 0.25 + i * 0.15)).join("")}</div>
        <b class="font-display text-2xl">${sg.t}</b></div></div>
    <section class="relative mt-3.5 rounded-3xl bg-white px-3.5 pb-3.5 pt-4 text-center shadow-[0_3px_0_var(--color-line)]" aria-label="Lãi ca này">
      <small class="text-[13px] font-extrabold text-soft">Lãi ca này</small>
      <div class="font-display text-[52px] leading-none tracking-tight ${profit >= 0 ? "text-mint-d" : "text-red"}"><span data-count="${profit}">${profit >= 0 ? "+" : "−"}${fmtN(Math.abs(profit))}</span><u class="ml-1.5 text-[22px] no-underline">xu</u></div>
      ${sh.record ? `<span class="mt-1 inline-flex items-center gap-1 rounded-full bg-gold px-3 py-0.5 text-xs font-black text-gold-t">🏆 Kỷ lục lãi mới</span>` : ""}
      <p class="mt-1.5 text-[12.5px] font-extrabold text-soft">${done}/${sh.goals.length} mục tiêu${sh.goalCoins ? ` · +${fmtN(sh.goalCoins)} xu thưởng` : ""}${sh.bestCombo >= 3 ? ` · 🔥 ×${sh.bestCombo}` : ""}</p>
    </section>
    <h4 class="mx-0.5 mb-2 mt-4 text-xs font-black uppercase tracking-wider text-soft">Tiến độ ca này</h4>
    <section class="grid gap-3.5 rounded-3xl bg-white p-3.5 shadow-[0_3px_0_var(--color-line)]">${rows.join("")}</section>
    <div class="mt-3 grid grid-cols-3 gap-2">${kpi(`${sh.served}/${total}`, "Khách vui")}${kpi(String(sh.memo), "Tự nhớ công thức")}${kpi(String(sh.helped), "Bé làm hộ")}</div>
    <details class="group mt-3 rounded-3xl bg-white px-3.5 shadow-[0_3px_0_var(--color-line)]">
      <summary class="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-extrabold [&::-webkit-details-marker]:hidden"><span>Sổ lãi hôm nay</span>
        <span class="flex items-center gap-2"><b class="${profit >= 0 ? "text-mint-d" : "text-red"}">${profit >= 0 ? "+" : "−"}${fmtN(Math.abs(profit))}</b><span class="text-xs text-pink-d group-open:hidden">Xem chi tiết ▾</span><span class="hidden text-xs text-pink-d group-open:inline">Thu gọn ▴</span></span></summary>
      ${ledgerRow("Thu", thu, true)}${ledgerRow("Tiền bánh", sh.coins, true, true)}${ledgerRow("Tip", sh.tips, true, true)}${ledgerRow("Thưởng tự nhớ (+50%)", sh.bonus, true, true)}${ledgerRow("Thưởng bánh nhiều tầng", sh.tierBonus, true, true)}${ledgerRow(`Gói quà, giao hàng (${sh.svcDone})`, sh.svcFee, true, true)}${ledgerRow(`Mục tiêu ca (${done}/${sh.goals.length})`, sh.goalCoins, true, true)}
      ${ledgerRow("Chi", chi, false)}${ledgerRow("Nhập nguyên liệu", led.ingUsed + led.quick, false, true)}${ledgerRow("Lương các bé", led.wages, false, true)}
    </details>
    <div class="mt-3 grid gap-2">${extras}${note}</div>
    <div class="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-[430px] gap-2.5 bg-gradient-to-t from-[var(--page)] from-65% to-transparent px-3.5 pb-[max(14px,env(safe-area-inset-bottom))] pt-6">
      <button class="b3 w" style="flex:1" data-go="/">Về tiệm</button><button class="b3" style="flex:1.6" data-go="/chuan-bi" data-replace>${good ? "Ca tiếp theo" : "Chơi lại ca"}</button></div>
  </div>`;
}
/** chạy số lãi từ 0 lên giá trị thật (gọi sau khi màn Kết quả đã vào DOM; tắt khi người dùng chọn giảm chuyển động) */
export function animateResult() {
  const el = document.querySelector<HTMLElement>("[data-count]"); if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const to = +el.dataset.count!, t0 = performance.now();
  const step = (t: number) => { const k = Math.min(1, (t - t0) / 1100), v = Math.round(to * (1 - (1 - k) ** 3)); el.textContent = (v >= 0 ? "+" : "−") + fmtN(Math.abs(v)); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
export const unlockCard = () => giftReady()
  ? `<button class="unlock" data-act="claim"><div class="env"></div><div><b>Mở khoá thư tình mới</b><small>Chạm để nhận quà hôm nay</small></div></button>`
  : S.daily.claimed ? `<div class="unlock"><div class="env"></div><div><b>Đã mở thư tình hôm nay</b><small>Đọc lại ở mục Quà tặng</small></div></div>` : "";
