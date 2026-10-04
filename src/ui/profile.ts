/* Hồ sơ của bạn: chọn nhân vật (kiểu + màu tóc/mắt/áo/da), tên tiệm, theme màu.
   Lưu vào S.me / S.shop / S.theme nên tự đồng bộ theo tài khoản như phần còn lại của tiến trình. */
import { COAT, EYES, HAIR, PANTS, SHIRT, SHOES, SKIN, STYLES, STYLE_NAME, styleOf } from "../content/game";
import { hydratePortraits, portraitHTML } from "./portrait";
import { THEMES, applyTheme } from "../content/theme";
import { S, save, type Avatar } from "../engine/state";
import { guestSVG } from "./art";
import { $, closeModal, esc, modal, toast } from "./dom";
import { render } from "./app";
import { account } from "../net/cloud";

const COLOR_ROWS: [keyof Avatar, string, string[]][] = [
  ["hair", "Màu tóc", HAIR], ["eye", "Màu mắt", EYES], ["coat", "Áo khoác", COAT], ["shirt", "Áo trong", SHIRT], ["pants", "Quần", PANTS], ["shoes", "Giày", SHOES], ["skin", "Màu da", SKIN]
];

export function profileSheet() {
  const d = { me: { ...S.me }, shop: S.shop, theme: S.theme };
  d.me.style = styleOf(d.me);                                  // người chơi cũ: đổi mã nhân vật cũ thành kiểu đầu tương ứng
  const girl = () => d.me.sprite[0] === "g";
  const look = () => ({ gender: girl() ? "girl" as const : "boy" as const, ...d.me });
  const fb = (px: number) => guestSVG({ ...look(), mood: "happy", ledge: false }, px);
  const genders = () => ([["g1", "Nữ"], ["b1", "Nam"]] as const).map(([id, n]) => `<button type="button" class="pf-gd${id[0] === d.me.sprite[0] ? " on" : ""}" data-pf="gender" data-v="${id}">${portraitHTML(id, { ...d.me, style: d.me.style }, 46, guestSVG({ ...look(), sprite: id, gender: id[0] === "g" ? "girl" : "boy", ledge: false, mood: "happy" }, 46))}<b>${n}</b></button>`).join("");
  const styles = () => STYLES.map(([id, n]) => `<button type="button" class="pf-sp${id === (d.me.style ?? "") ? " on" : ""}" data-pf="style" data-v="${id}" aria-label="Kiểu ${n}" title="${n}">${portraitHTML(d.me.sprite, { ...d.me, style: id }, 56, fb(56))}</button>`).join("");
  modal(`<h2>Hồ sơ của bạn</h2>
    <form id="pfForm">
      <div class="pf-prev" id="pfPrev">${portraitHTML(d.me.sprite, d.me, 150, fb(150))}</div>
      <div class="pf-cap" id="pfCap">Kiểu: ${STYLE_NAME[d.me.style ?? ""] ?? "Gốc"}</div>
      <label class="field">Tên tiệm (hiện ở màn chính)<input id="pfShop" value="${esc(d.shop)}" maxlength="16" placeholder="${esc(account() || "Matcha")}"></label>
      <div class="pf-h">Nhân vật</div>
      <div class="pf-gds" id="pfGenders">${genders()}</div>
      <div class="pf-h">Kiểu tóc / phụ kiện đầu</div>
      <div class="pf-grid" id="pfSprites">${styles()}</div>
      ${COLOR_ROWS.map(([k, n, list]) => `<div class="pf-h">${n}</div><div class="pf-sw" data-row="${k}">${list.map(c => `<button type="button" class="pf-dot${d.me[k] === c ? " on" : ""}" data-pf="${k}" data-v="${c}" style="background:${c}" aria-label="${n} ${c}"></button>`).join("")}</div>`).join("")}
      <div class="pf-h">Màu giao diện</div>
      <div class="pf-themes">${THEMES.map(t => `<button type="button" class="pf-th${t.id === d.theme ? " on" : ""}" data-pf="theme" data-v="${t.id}"><i style="background:${t.dot}"></i>${t.name}</button>`).join("")}</div>
      <div class="mbtns"><button class="b3" type="submit">Lưu</button></div>
    </form>`, () => applyTheme(S.theme));   // đóng mà chưa lưu thì trả theme cũ

  const mark = (sel: string, v: string) => document.querySelectorAll<HTMLElement>(sel).forEach(b => b.classList.toggle("on", b.dataset.v === v));
  const redraw = () => {
    $("#pfCap")!.textContent = "Kiểu: " + (STYLE_NAME[d.me.style ?? ""] ?? "Gốc");
    $("#pfPrev")!.innerHTML = portraitHTML(d.me.sprite, d.me, 150, fb(150));
    // ảnh nhỏ của từng kiểu vẽ lại theo giới tính và màu đang chọn
    $("#pfGenders")!.innerHTML = genders(); $("#pfSprites")!.innerHTML = styles();
    hydratePortraits($("#pfForm")!);
  };
  hydratePortraits($("#pfForm")!);
  $("#pfForm")!.addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-pf]"); if (!b) return;
    const k = b.dataset.pf!, v = b.dataset.v!;
    if (k === "theme") { d.theme = v; applyTheme(v); mark(".pf-th", v); return; }
    if (k === "gender") { if (v[0] !== d.me.sprite[0]) d.me.sprite = v; }
    else if (k === "style") d.me.style = v;
    else { (d.me as Record<string, string>)[k] = v; mark(`[data-row="${k}"] .pf-dot`, v); }
    redraw();
  });
  $("#pfForm")!.addEventListener("submit", e => {
    e.preventDefault();
    S.me = d.me; S.shop = $<HTMLInputElement>("#pfShop")!.value.trim(); S.theme = d.theme;
    save();
    applyTheme(S.theme); closeModal(); toast("Đã lưu hồ sơ"); render();
  });
}
