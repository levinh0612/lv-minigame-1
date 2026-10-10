/* Hộp thoại "Chỉ số": mọi chỉ số của một tiệm, chia nhóm, nhóm và dòng xếp theo độ quan trọng. Dùng cho tiệm của mình (thêm nhóm Cá nhân) và tiệm hàng xóm. */
import { statGroups, type ShopStats } from "../engine/stats";
import { esc, modal } from "./dom";

export function statsDialog(title: string, s: ShopStats, self: boolean) {
  const groups = statGroups(s, self).map(g => `<section class="grid gap-1.5">
    <h3 class="px-1 text-[12px] font-extrabold uppercase tracking-wide text-soft">${esc(g.title)}</h3>
    <div class="grid grid-cols-2 gap-2">${g.rows.map(r => `<div class="flex min-w-0 items-center gap-2 rounded-2xl bg-white p-2.5 shadow-[0_2px_0_var(--color-line)]">
      <span class="text-xl" aria-hidden="true">${r.icon}</span>
      <div class="min-w-0"><b class="block truncate font-display text-[16px] leading-tight text-ink">${esc(r.value)}</b>
      <small class="block text-[11px] leading-tight text-soft">${esc(r.label)}</small></div></div>`).join("")}</div></section>`).join("");
  modal(`<h2>Chỉ số</h2><p class="sub">${esc(title)}</p><div class="grid max-h-[62vh] text-left gap-4 overflow-y-auto pb-1">${groups}</div>
    <div class="mbtns"><button class="b3 w" data-close>Đóng</button></div>`);
}
