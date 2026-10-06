/* Đội ngũ: tab Quản lý và Linh thú đặt theo từng tầng (tab Thợ bánh nằm ở screens/shop.ts).
   Món đã có: chạm để đặt vào tầng đang chọn (chạm lại để cất). Món chưa có: hiện mờ, chạm để sang Gacha đúng món đó. */
import { sfx } from "../audio/sound";
import { GACHA_ITEMS, RARITY, asManager, fxLine, mgrFx, roleOf, type GachaItem } from "../content/gacha";
import { clearStaff, floorCount, floorOfStaff, hasItem, placeStaff, staffAt, type StaffKind } from "../engine/gacha";
import { render } from "./app";
import { esc, toast } from "./dom";
import { navigate } from "./router";
import { gachaArt } from "./gachafx";
import { openInGacha } from "./screens/gacha";

export type TeamTab = "bake" | StaffKind;
let team: TeamTab = "bake", floor = 0;
export const teamTab = () => team;
export const setTeamTab = (t: TeamTab) => { team = t; };
const tab = () => (team === "mascot" ? "mascot" : "mgr") as StaffKind;
const itemsOf = (k: StaffKind) => GACHA_ITEMS.filter(i => k === "mgr" ? asManager(i) : i.kind === "mascot").sort((a, b) => +!!b.mgr - +!!a.mgr);   // quản lý gồm cả khách quen Hiếm trở lên
const effect = (it: GachaItem) => it.mascot ? it.desc.replace(/^[^:]+: /, "") : fxLine(mgrFx(it));
const role = (it: GachaItem) => { const r = roleOf(it); return r ? `<u class="role ${r.c}">${r.n}</u> ` : ""; };

function current(k: StaffKind, title: string) {
  const it = staffAt(k, floor);
  return `<div class="${k === tab() ? "on" : ""}"><small>${title} · Tầng ${floor + 1}</small>${it ? `${gachaArt(it, 52)}<b>${esc(it.n)}</b><i>${esc(effect(it))}</i>` : `<b class="none">Chưa đặt</b><i>Chọn bên dưới</i>`}</div>`;
}

export function staffBodyHTML() {
  floor = Math.max(0, Math.min(floor, floorCount() - 1));
  const cards = itemsOf(tab()).map(it => {
    const has = hasItem(it.id), R = RARITY[it.rarity], at = floorOfStaff(tab(), it.id);
    return `<button class="gi r-${it.rarity} ${has ? "own" : "lock"} ${at === floor ? "here" : ""}" style="--rc:${R.c};--rc2:${R.c2}" data-sact="${has ? "put" : "gacha"}:${it.id}">
      <div class="gimg ${has ? "" : "dim"}">${gachaArt(it, 56)}</div><b>${esc(it.n)}</b>
      <small>${role(it)}${has ? (at >= 0 ? `Đang ở tầng ${at + 1}` : `Chạm để đặt vào tầng ${floor + 1}`) : "Chưa có · Triệu hồi ›"}</small><i class="gdot">${R.n}</i></button>`;
  }).join("");
  return `<div class="stf-floors">${Array.from({ length: floorCount() }, (_, f) => `<button class="${f === floor ? "on" : ""}" data-sact="floor:${f}">Tầng ${f + 1}</button>`).join("")}</div>
    <div class="stf-cur one">${current(tab(), tab() === "mgr" ? "Quản lý" : "Linh thú")}</div>
    <div class="gitems stf-grid">${cards}</div>`;
}

/** mở màn Đội ngũ ở tab Quản lý hoặc Linh thú */
export function staffSheet(k?: StaffKind) { setTeamTab(k ?? "mgr"); navigate("/cua-hang/thu-cung"); }
export const staffCount = (k: StaffKind) => ({ own: itemsOf(k).filter(i => hasItem(i.id)).length, all: itemsOf(k).length });

/** xử lý mọi nút trong hộp thoại (data-sact) */
export function staffAct(act: string) {
  const [a, v] = act.split(":");
  if (a === "floor") floor = +v!;
  else if (a === "gacha") { sfx("click"); return openInGacha(v!); }
  else if (a === "put") {
    const it = GACHA_ITEMS.find(i => i.id === v); if (!it) return;
    if (floorOfStaff(tab(), it.id) === floor) { clearStaff(tab(), floor); sfx("click"); toast(`Đã cất ${it.n}`); }
    else if (placeStaff(tab(), it.id, floor)) { sfx("level"); toast(`${it.n} đã vào tầng ${floor + 1}`); }
  }
  render();
}
