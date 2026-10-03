/* Hồ sơ của bạn: chọn nhân vật (kiểu + màu tóc/mắt/áo/da), tên tiệm, theme màu.
   Lưu vào S.me / S.shop / S.theme nên tự đồng bộ theo tài khoản như phần còn lại của tiến trình. */
import { BOY_SPRITES, COAT, EYES, GIRL_SPRITES, HAIR, SHIRT, SKIN } from "../content/game";
import { THEMES, applyTheme } from "../content/theme";
import { S, save, type Avatar } from "../engine/state";
import { guestSVG } from "./art";
import { $, closeModal, esc, modal, toast } from "./dom";
import { render } from "./app";
import { account } from "../net/cloud";

const COLOR_ROWS: [keyof Avatar, string, string[]][] = [
  ["hair", "Màu tóc", HAIR], ["eye", "Màu mắt", EYES], ["coat", "Áo khoác", COAT], ["shirt", "Áo trong", SHIRT], ["skin", "Màu da", SKIN]
];

export function profileSheet() {
  const d = { me: { ...S.me }, shop: S.shop, theme: S.theme };
  const look = () => ({ gender: d.me.sprite[0] === "g" ? "girl" as const : "boy" as const, ...d.me });
  const sprites = (ids: string[]) => ids.map(id => `<button type="button" class="pf-sp${id === d.me.sprite ? " on" : ""}" data-pf="sprite" data-v="${id}" aria-label="Kiểu ${id}">${guestSVG({ ...look(), sprite: id, gender: id[0] === "g" ? "girl" : "boy", ledge: false, mood: "happy" }, 56)}</button>`).join("");
  modal(`<h2>Hồ sơ của bạn</h2>
    <form id="pfForm">
      <div class="pf-prev" id="pfPrev">${guestSVG({ ...look(), mood: "happy" }, 150)}</div>
      <label class="field">Tên tiệm (hiện ở màn chính)<input id="pfShop" value="${esc(d.shop)}" maxlength="16" placeholder="${esc(account() || "Matcha")}"></label>
      <div class="pf-h">Nhân vật</div>
      <div class="pf-grid" id="pfSprites">${sprites(GIRL_SPRITES)}${sprites(BOY_SPRITES)}</div>
      ${COLOR_ROWS.map(([k, n, list]) => `<div class="pf-h">${n}</div><div class="pf-sw" data-row="${k}">${list.map(c => `<button type="button" class="pf-dot${d.me[k] === c ? " on" : ""}" data-pf="${k}" data-v="${c}" style="background:${c}" aria-label="${n} ${c}"></button>`).join("")}</div>`).join("")}
      <div class="pf-h">Màu giao diện</div>
      <div class="pf-themes">${THEMES.map(t => `<button type="button" class="pf-th${t.id === d.theme ? " on" : ""}" data-pf="theme" data-v="${t.id}"><i style="background:${t.dot}"></i>${t.name}</button>`).join("")}</div>
      <div class="mbtns"><button class="b3" type="submit">Lưu</button></div>
    </form>`, () => applyTheme(S.theme));   // đóng mà chưa lưu thì trả theme cũ

  const mark = (sel: string, v: string) => document.querySelectorAll<HTMLElement>(sel).forEach(b => b.classList.toggle("on", b.dataset.v === v));
  const redraw = () => {
    $("#pfPrev")!.innerHTML = guestSVG({ ...look(), mood: "happy" }, 150);
    // ảnh nhỏ của từng kiểu vẽ lại theo màu đang chọn
    $("#pfSprites")!.innerHTML = sprites(GIRL_SPRITES) + sprites(BOY_SPRITES);
  };
  $("#pfForm")!.addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-pf]"); if (!b) return;
    const k = b.dataset.pf!, v = b.dataset.v!;
    if (k === "theme") { d.theme = v; applyTheme(v); mark(".pf-th", v); return; }
    (d.me as Record<string, string>)[k] = v;
    if (k !== "sprite") mark(`[data-row="${k}"] .pf-dot`, v);
    redraw();
  });
  $("#pfForm")!.addEventListener("submit", e => {
    e.preventDefault();
    S.me = d.me; S.shop = $<HTMLInputElement>("#pfShop")!.value.trim(); S.theme = d.theme;
    save();
    applyTheme(S.theme); closeModal(); toast("Đã lưu hồ sơ"); render();
  });
}
