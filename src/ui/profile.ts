/* Hồ sơ của bạn: chọn nhân vật (kiểu + màu tóc/mắt/áo/da), tên tiệm, theme màu.
   Lưu vào S.me / S.shop / S.theme nên tự đồng bộ theo tài khoản như phần còn lại của tiến trình. */
import { BOY_HAIR, FIXED_CHARS, isFixedChar, styleOf } from "../content/game";
import { hydratePortraits, portraitHTML } from "./portrait";
import { THEMES, applyTheme } from "../content/theme";
import { S, save } from "../engine/state";
import { guestSVG } from "./art";
import { $, closeModal, esc, modal, toast } from "./dom";
import { render } from "./app";
import { account } from "../net/cloud";

export function profileSheet() {
  const d = { me: { ...S.me }, shop: S.shop, theme: S.theme };
  d.me.style = styleOf(d.me);                                  // người chơi cũ: đổi mã nhân vật cũ thành kiểu đầu tương ứng
  const girl = () => d.me.sprite[0] !== "b" && d.me.sprite[0] !== "m";   // g, n là nữ; b, m là nam
  const anime = () => isFixedChar(d.me.sprite);                // nhân vật làm sẵn: giữ nguyên trang phục, không tuỳ chỉnh
  const look = () => ({ gender: girl() ? "girl" as const : "boy" as const, ...d.me });
  const fb = (px: number) => guestSVG({ ...look(), mood: "happy", ledge: false }, px);
  // nhân vật làm sẵn nay chỉ có trong gacha; ai đang dùng thì vẫn thấy để chọn lại
  const genders = () => ([["g1", "Nữ"], ["b1", "Nam"], ...FIXED_CHARS.filter(([id]) => id === d.me.sprite)] as [string, string][]).map(([id, n]) => `<button type="button" class="pf-gd${id === d.me.sprite || (id.length === 2 && !isFixedChar(id) && id[0] === d.me.sprite[0] && !isFixedChar(d.me.sprite)) ? " on" : ""}" data-pf="gender" data-v="${id}">${portraitHTML(id, { ...d.me, style: d.me.style }, 46, guestSVG({ ...look(), sprite: id, gender: id[0] === "b" || id[0] === "m" ? "boy" : "girl", ledge: false, mood: "happy" }, 46))}<b>${n}</b></button>`).join("");
  modal(`<h2>Hồ sơ của bạn</h2>
    <form id="pfForm"${anime() ? ' class="pf-anime"' : ""}>
      <div class="pf-prev" id="pfPrev">${portraitHTML(d.me.sprite, d.me, 150, fb(150), "", true)}</div>
      <label class="field">Tên tiệm (hiện ở màn chính)<input id="pfShop" value="${esc(d.shop)}" maxlength="16" placeholder="${esc(account() || "Matcha")}"></label>
      <div class="pf-h">Nhân vật</div>
      <div class="pf-gds" id="pfGenders">${genders()}</div>
      <div class="pf-h">Màu chính <small>· đổi màu cả giao diện</small></div>
      <div class="pf-sw5s" id="pfThemes">${THEMES.map(t => `<button type="button" class="pf-sw5${t.id === d.theme ? " on" : ""}" data-pf="theme" data-v="${t.id}"><i style="background:${t.dot}"></i><span>${t.name}</span></button>`).join("")}</div>
      <div class="mbtns"><button class="b3" type="submit">Lưu</button></div>
    </form>`, () => applyTheme(S.theme));   // đóng mà chưa lưu thì trả theme cũ

  const mark = (sel: string, v: string) => document.querySelectorAll<HTMLElement>(sel).forEach(b => b.classList.toggle("on", b.dataset.v === v));
  const redraw = () => {
    $("#pfForm")!.classList.toggle("pf-anime", anime());
    $("#pfPrev")!.innerHTML = portraitHTML(d.me.sprite, d.me, 150, fb(150), "", true);
    $("#pfGenders")!.innerHTML = genders();      // ảnh nhỏ Nam/Nữ vẽ lại theo giới tính đang chọn
    hydratePortraits($("#pfForm")!);
  };
  hydratePortraits($("#pfForm")!);
  $("#pfForm")!.addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-pf]"); if (!b) return;
    const k = b.dataset.pf!, v = b.dataset.v!;
    if (k === "theme") { d.theme = v; applyTheme(v); mark(".pf-sw5", v); return; }
    if (k === "gender") { if (v !== d.me.sprite && !(!isFixedChar(v) && !isFixedChar(d.me.sprite) && v[0] === d.me.sprite[0])) { d.me.sprite = v; if (v[0] !== "b" && BOY_HAIR.has(d.me.style ?? "")) d.me.style = ""; if (isFixedChar(v)) d.me.style = ""; } }
    redraw();
  });
  $("#pfForm")!.addEventListener("submit", e => {
    e.preventDefault();
    S.me = d.me; S.shop = $<HTMLInputElement>("#pfShop")!.value.trim(); S.theme = d.theme;
    save();
    applyTheme(S.theme); closeModal(); toast("Đã lưu hồ sơ"); render();
  });
}
