/* Nguyên liệu: kho hôm nay (chạm để nhập thêm 5 phần) và nhà cung cấp (ký hợp đồng để mở nguyên liệu mới).
   Món mới cần 2 bước: có công thức (cấp hoặc Gacha) và có nguyên liệu (ký nhà cung cấp). */
import { sfx } from "../audio/sound";
import { CATS, HOME_SUPPLIER, STOCK_KEYS, SUPPLIERS, type StockKey } from "../content/game";
import { buy, packPrice, stockOf } from "../engine/economy";
import { lvl } from "../engine/progress";
import { availableIdx, ingsOf, signState, signSupplier } from "../engine/suppliers";
import { fmtN } from "../engine/util";
import { render } from "./app";
import { $, esc, modal, toast } from "./dom";
import { ingSVG } from "./art";

function supplierCard(id: string, n: string, desc: string, cost: number, lv: number) {
  const ings = ingsOf(id), st = id === HOME_SUPPLIER.id ? "done" : signState({ id, n, desc, cost, lv }, lvl()), first = ings[0];
  const btn = st === "done" ? `<span class="tag use">Đang dùng</span>`
    : st === "lv" ? `<button class="mini lk" disabled>Mở ở Lv ${lv}</button>`
    : `<button class="mini gold ${st === "coin" ? "short" : ""}" data-iact="sign:${id}">Ký hợp đồng<br>${fmtN(cost)} xu</button>`;
  const chips = ings.map(x => st === "done" ? `<span class="c">${ingSVG(x.k, x.i, 18)}${esc(CATS[x.k][x.i][0])}</span>` : `<span class="c new">${esc(CATS[x.k][x.i][0])}<em>MỚI</em></span>`).join("");
  return `<div class="sup5 ${st === "lv" ? "lock" : ""}"><div class="hd"><span class="av">${ingSVG(first.k, first.i, 30)}</span><div><b>${esc(n)}</b><small>${esc(desc)}</small></div>${btn}</div><div class="chips">${chips}</div></div>`;
}

function body() {
  const tiles = STOCK_KEYS.map(k => availableIdx(k).map(i => {
    const n = CATS[k][i][0], v = stockOf(k, i), p = packPrice(k, i, 5);
    return `<button class="stile ${v === 0 ? "out" : v <= 2 ? "low" : ""}" data-iact="buy:${k}:${i}" aria-label="Nhập 5 ${n}, ${p} xu">${ingSVG(k, i, 22)}<span>${n}</span><b>${v === 0 ? "Hết" : v}</b></button>`;
  }).join("")).join("");
  return `<div class="steps5"><div><b>BƯỚC 1</b>Có công thức (lên cấp hoặc Gacha)</div><div><b>BƯỚC 2</b>Có nguyên liệu (ký nhà cung cấp)</div></div>
    <div class="sh2"><b>Kho hôm nay</b><span class="lav">chạm để nhập thêm 5 phần</span></div>
    <div class="stiles ing-stiles">${tiles}</div>
    <div class="sh2"><b>Nhà cung cấp</b><span class="gold">mở nguyên liệu mới</span></div>
    ${supplierCard(HOME_SUPPLIER.id, HOME_SUPPLIER.n, HOME_SUPPLIER.desc, 0, 1)}${SUPPLIERS.map(s => supplierCard(s.id, s.n, s.desc, s.cost, s.lv)).join("")}`;
}

export function ingredientSheet() {
  modal(`<h2>Nguyên liệu</h2><p class="sub">Kho và nhà cung cấp</p><div id="ingBody">${body()}</div><div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
}

/** xử lý nút trong hộp thoại (data-iact) */
export function ingAct(act: string) {
  const [a, v, w] = act.split(":");
  if (a === "buy") {
    const k = v as StockKey, i = +w!;
    if (buy(k, i, 5)) { sfx("tap"); toast(`+5 ${CATS[k][i][0]} · ${packPrice(k, i, 5)} xu`); } else toast("Không đủ xu");
    render(true);
  } else if (a === "sign") {
    const s = SUPPLIERS.find(x => x.id === v)!, r = signSupplier(v!, lvl());
    if (r === "ok") { sfx("level"); toast(`Đã ký hợp đồng ${s.n}`); render(true); }
    else if (r === "coin") toast(`Chưa đủ xu: cần ${fmtN(s.cost)} xu`);
    else if (r === "lv") toast(`Cần đạt Lv ${s.lv}`);
  }
  const h = $("#ingBody"); if (h) h.innerHTML = body();
}
