/* Quản lý: hộp thoại gom quản lý (Nhân vật) và linh thú, đặt theo từng tầng.
   Món đã có: chạm để đặt vào tầng đang chọn (chạm lại để cất). Món chưa có: hiện mờ, chạm để sang Gacha đúng món đó. */
import { sfx } from "../audio/sound";
import { GACHA_ITEMS, RARITY, type GachaItem } from "../content/gacha";
import { clearStaff, floorCount, floorOfStaff, hasItem, placeStaff, staffAt, type StaffKind } from "../engine/gacha";
import { render } from "./app";
import { $, esc, modal, toast } from "./dom";
import { gachaArt } from "./gachafx";
import { openInGacha } from "./screens/gacha";

let tab: StaffKind = "mgr", floor = 0;
const KIND = { mgr: "manager", mascot: "mascot" } as const;
const itemsOf = (k: StaffKind) => GACHA_ITEMS.filter(i => i.kind === KIND[k]);
const effect = (it: GachaItem) => it.desc.replace(/^[^:]+: /, "");

function current(k: StaffKind, title: string) {
  const it = staffAt(k, floor);
  return `<div class="${k === tab ? "on" : ""}"><small>${title} · Tầng ${floor + 1}</small>${it ? `${gachaArt(it, 52)}<b>${esc(it.n)}</b><i>${esc(effect(it))}</i>` : `<b class="none">Chưa đặt</b><i>Chọn bên dưới</i>`}</div>`;
}

function body() {
  floor = Math.max(0, Math.min(floor, floorCount() - 1));
  const own = (k: StaffKind) => itemsOf(k).filter(i => hasItem(i.id)).length;
  const cards = itemsOf(tab).map(it => {
    const has = hasItem(it.id), R = RARITY[it.rarity], at = floorOfStaff(tab, it.id);
    return `<button class="gi r-${it.rarity} ${has ? "own" : "lock"} ${at === floor ? "here" : ""}" style="--rc:${R.c};--rc2:${R.c2}" data-sact="${has ? "put" : "gacha"}:${it.id}">
      <div class="gimg ${has ? "" : "dim"}">${gachaArt(it, 56)}</div><b>${esc(it.n)}</b>
      <small>${has ? (at >= 0 ? `Đang ở tầng ${at + 1}` : `Chạm để đặt vào tầng ${floor + 1}`) : "Chưa có · Triệu hồi ›"}</small><i class="gdot">${R.n}</i></button>`;
  }).join("");
  return `<div class="gtabs stf-tabs"><button class="${tab === "mgr" ? "on" : ""}" data-sact="tab:mgr">Nhân vật · ${own("mgr")}/${itemsOf("mgr").length}</button><button class="${tab === "mascot" ? "on" : ""}" data-sact="tab:mascot">Linh thú · ${own("mascot")}/${itemsOf("mascot").length}</button></div>
    <div class="stf-floors">${Array.from({ length: floorCount() }, (_, f) => `<button class="${f === floor ? "on" : ""}" data-sact="floor:${f}">Tầng ${f + 1}</button>`).join("")}</div>
    <div class="stf-cur">${current("mgr", "Quản lý")}${current("mascot", "Linh thú")}</div>
    <div class="gitems stf-grid">${cards}</div>`;
}

export function staffSheet(k?: StaffKind) {
  if (k) tab = k;
  modal(`<h2>Quản lý</h2><p class="sub">Mỗi tầng một quản lý và một linh thú</p><div id="stfBody">${body()}</div><div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
}

/** xử lý mọi nút trong hộp thoại (data-sact) */
export function staffAct(act: string) {
  const [a, v] = act.split(":");
  if (a === "tab") tab = v as StaffKind;
  else if (a === "floor") floor = +v!;
  else if (a === "gacha") { sfx("click"); return openInGacha(v!); }
  else if (a === "put") {
    const it = GACHA_ITEMS.find(i => i.id === v); if (!it) return;
    if (floorOfStaff(tab, it.id) === floor) { clearStaff(tab, floor); sfx("click"); toast(`Đã cất ${it.n}`); }
    else if (placeStaff(tab, it.id, floor)) { sfx("level"); toast(`${it.n} đã vào tầng ${floor + 1}`); }
    render(true);                                              // vẽ lại cảnh 3D phía sau, giữ hộp thoại
  }
  const host = $("#stfBody"); if (host) host.innerHTML = body();
}
