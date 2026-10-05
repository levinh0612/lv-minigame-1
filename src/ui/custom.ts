/* Tự làm bánh: người chơi ghép bánh 1-3 tầng (mỗi tầng một đế + một kem, topping trên cùng), đặt tên và lưu tối đa MAX_CUSTOM mẫu.
   Mẫu đã lưu vào danh sách món khách có thể gọi (engine/progress.ts: customRecipes). */
import { sfx } from "../audio/sound";
import { CATS, CUSTOM_LV, MAX_CUSTOM, TIER_HAND_BONUS, TIER_LV, customCost, customMult, customPrice, customValue, type CustomCake, type PartKey, type StockKey } from "../content/game";
import { stockOf } from "../engine/economy";
import { lvl } from "../engine/progress";
import { S, save } from "../engine/state";
import { availableIdx } from "../engine/suppliers";
import { ingSVG, cakeAnySVG } from "./art";
import { $, esc, modal, toast } from "./dom";
import { menuSheet } from "./sheets";

interface Draft { id: string | null; n: string; count: number; tiers: [number, number][]; top: number }
let d: Draft = { id: null, n: "", count: 1, tiers: [[0, 0]], top: 0 };

const firstOf = (k: StockKey) => availableIdx(k)[0] ?? 0;
function blank(): Draft { return { id: null, n: "", count: 1, tiers: [[firstOf("base"), firstOf("cream")]], top: firstOf("top") }; }
function fit(count: number) {             // đủ số tầng: tầng mới lấy theo tầng dưới nó
  d.count = count;
  while (d.tiers.length < count) d.tiers.push([...d.tiers[d.tiers.length - 1]] as [number, number]);
  d.tiers.length = Math.max(1, count);
}
const tiersOf = () => d.tiers.slice(0, d.count);

function chip(k: PartKey, i: number, on: boolean, act: string) {
  const q = stockOf(k as StockKey, i);
  return `<button class="ing ${on ? "on" : ""}" data-cact="${act}">${ingSVG(k, i, 24)}<span class="cn">${CATS[k][i][0]}</span><b class="q ${q <= 2 ? "low" : ""}">${q}</b></button>`;
}
/* một hàng nguyên liệu; hơn 3 món thì xếp gọn 4-5 cột như phiếu làm bánh */
const ings = (k: StockKey, cur: number, act: (j: number) => string) => { const l = availableIdx(k); return `<div class="cu-ings${l.length > 3 ? " many" : ""}" style="--n:${l.length}">${l.map(j => chip(k, j, cur === j, act(j))).join("")}</div>`; };
function body() {
  const t = tiersOf(), cost = customCost(t, d.top), value = customValue(t, d.top), mult = customMult(d.count), price = customPrice(t, d.top);
  const cake = cakeAnySVG({ base: t[0][0], cream: t[0][1], top: d.top, up: t.slice(1), sweet: 1 }, { size: 170, still: true });
  const L = lvl();
  const counts = [1, 2, 3].map(n => `<button class="${d.count === n ? "on" : ""} ${L < TIER_LV[n - 1] ? "lk" : ""}" data-cact="n:${n}">${n} tầng${n > 1 ? ` · Lv ${TIER_LV[n - 1]}` : ""}</button>`).join("");
  const tiers = t.map(([b, c], i) => `<div class="cu-t"><b>Tầng ${i + 1}${i === 0 ? " · dưới cùng" : ""}</b><span>${CATS.base[b][0]} + ${CATS.cream[c][0]}</span></div>
    ${ings("base", b, j => `b:${i}:${j}`)}
    ${ings("cream", c, j => `c:${i}:${j}`)}`).join("");
  return `<div class="cu-stage"><div class="cu-badge">Giá bán<b>${price} xu</b></div>${cake}</div>
    <div class="gfil cu-count">${counts}</div>
    ${tiers}
    <div class="cu-t"><b>Topping trên cùng</b><span>${CATS.top[d.top][0]}</span></div>
    ${ings("top", d.top, j => `t:${j}`)}
    <div class="ledger cu-led">
      <div class="lg"><span>Nguyên liệu mỗi bánh</span><b>−${cost} xu</b></div>
      <div class="lg"><span>Giá trị các tầng và topping</span><b>${value} xu</b></div>
      ${d.count > 1 ? `<div class="lg"><span>Thưởng ${d.count} tầng</span><b>×${mult.toFixed(1)}</b></div><div class="lg"><span>Tự tay làm: thưởng thêm</span><b>+${Math.round(price * TIER_HAND_BONUS * (d.count - 1))} xu</b></div>` : ""}
      <div class="lg tot"><span>Giá bán · lãi ${price - cost} xu</span><b>${price} xu</b></div></div>
    <label class="field cu-name">Tên bánh<input id="cName" value="${esc(d.n)}" maxlength="20" placeholder="Bánh của mình ${S.custom.length + (d.id ? 0 : 1)}"></label>`;
}

export function openCustom(id?: string) {
  const c = id ? S.custom.find(x => x.id === id) : null;
  if (!c && lvl() < CUSTOM_LV) return toast(`Mở ở Lv ${CUSTOM_LV}`);
  if (!c && S.custom.length >= MAX_CUSTOM) return toast(`Đã đủ ${MAX_CUSTOM} mẫu, sửa hoặc xoá một mẫu nha`);
  d = c ? { id: c.id, n: c.n, count: c.tiers.length, tiers: c.tiers.map(t => [...t] as [number, number]), top: c.top } : blank();
  modal(`<h2>${c ? "Sửa bánh" : "Tự làm bánh"}</h2><p class="sub">Mẫu ${c ? S.custom.indexOf(c) + 1 : S.custom.length + 1}/${MAX_CUSTOM} · khách sẽ gọi món này</p><div id="cuBody">${body()}</div>
    <div class="mbtns"><button class="b3" data-cact="save">Lưu vào menu</button>${c ? `<button class="b3 w" data-cact="del">Xoá mẫu này</button>` : `<button class="b3 w" data-cact="back">Quay lại</button>`}</div>`);
}
document.addEventListener("input", e => { const t = e.target as HTMLInputElement; if (t.id === "cName") d.n = t.value; });

/** xử lý mọi nút trong hộp thoại (data-cact) */
export function customAct(act: string) {
  const [a, x, y] = act.split(":");
  if (a === "back") { sfx("click"); return menuSheet(); }
  if (a === "n") { const n = +x!; if (lvl() < TIER_LV[n - 1]) { sfx("untap"); return toast(`${n} tầng mở ở Lv ${TIER_LV[n - 1]}`); } fit(n); }
  else if (a === "b" || a === "c") d.tiers[+x!][a === "b" ? 0 : 1] = +y!;
  else if (a === "t") d.top = +x!;
  else if (a === "del") {
    S.custom = S.custom.filter(c => c.id !== d.id); save(); sfx("click"); toast("Đã xoá mẫu bánh"); return menuSheet();
  } else if (a === "save") {
    const name = d.n.trim() || `Bánh của mình ${S.custom.length + (d.id ? 0 : 1)}`, tiers = tiersOf(), cake: CustomCake = { id: d.id ?? "c" + Date.now().toString(36), n: name, tiers, top: d.top };
    if (d.id) S.custom = S.custom.map(c => (c.id === d.id ? cake : c)); else S.custom.push(cake);
    save(); sfx("level"); toast(`Đã lưu "${name}" · ${customPrice(tiers, d.top)} xu`); return menuSheet();
  }
  if (a !== "save") { sfx("tap"); const h = $("#cuBody"), sc = document.querySelector<HTMLElement>("#modal .mscroll"), y0 = sc?.scrollTop ?? 0; if (h) h.innerHTML = body(); if (sc) sc.scrollTop = y0; }
}
