import { ROOM_CATS, fxText, isDefault, roomCat, roomItem, type RoomKey } from "../../content/room";
import { tableLvs } from "../../engine/economy";
import { decorCount, unlocked } from "../../engine/progress";
import { S, save } from "../../engine/state";
import { spend } from "../../engine/wallet";
import { fmtD, parse } from "../../engine/util";
import { esc } from "../dom";
import { room3dHTML } from "../room3d";
import { todayEvents } from "../../engine/dates";
import { pageHead } from "./prep";
import { teamHTML } from "../team";
import type { ShopTab } from "../router";
import { claimBtn, goalsList } from "./goals";

/* ===== Trang trí tiệm (DecorScreen của Claude Design): chạm để thử, rồi mua hoặc dùng ===== */
let dcat = 0, trial: { k: RoomKey; v: string } | null = null;
export const setDecorCat = (i: number) => { dcat = i; trial = null; };
export function tryDecor(k: RoomKey, v: string) { trial = S.room[k] === v ? null : { k, v }; }
export const cancelDecor = () => { trial = null; };
/* mua (nếu chưa có) và dùng món đang thử; trả về thông báo hoặc "" nếu không làm gì */
export function applyDecor(): string {
  if (!trial) return "";
  const { k, v } = trial, it = roomItem(k, v), id = k + ":" + v, own = isDefault(k, v) || S.owned.includes(id);
  if (!own) { if (it.gacha || S.coins < it.cost) return ""; spend("decor", it.cost, `Mua ${it.n}`); S.owned.push(id); }
  S.room[k] = v; trial = null; save();
  return own ? `Đã đổi sang ${it.n}` : `Đã mua ${it.n}`;
}
export function decorHTML() {
  const C = ROOM_CATS[dcat], room = { ...S.room }, tr = trial;
  if (tr) room[tr.k] = tr.v;
  const trIt = tr ? roomItem(tr.k, tr.v) : null, trOwn = tr ? isDefault(tr.k, tr.v) || S.owned.includes(tr.k + ":" + tr.v) : false;
  const items = C.items.map(it => {
    const own = isDefault(C.k, it.v) || S.owned.includes(C.k + ":" + it.v), eq = S.room[C.k] === it.v, sel = tr?.k === C.k && tr.v === it.v;
    return `<button class="ditem ${sel ? "sel" : eq ? "eq" : ""}" data-dtry="${C.k}:${it.v}"><span class="sw" style="background:${it.sw};background-size:${it.sws || "auto"}">${it.glyph || ""}</span>
      <span class="dn">${esc(it.n)}</span><span class="tg ${eq ? "use" : own ? "own" : it.gacha ? "gacha" : "buy"}">${eq ? "Đang dùng" : own ? "Đã có" : it.gacha ? "Gacha" : `${it.cost} xu`}</span></button>`;
  }).join("");
  const act = !tr ? `<button class="b3 off" disabled>Chạm món để thử</button>`
    : trOwn ? `<button class="b3 use" data-act="dbuy">Dùng món này</button>`
    : trIt!.gacha ? `<button class="b3 off" disabled>Chỉ quay được từ Gacha</button>`
    : S.coins >= trIt!.cost ? `<button class="b3" data-act="dbuy">Mua · ${trIt!.cost} xu</button>` : `<button class="b3 off" disabled>Chưa đủ xu · ${trIt!.cost} xu</button>`;
  const fx = trIt ? fxText(trIt) : "";
  return `<div class="scr decor4">
    ${pageHead("Trang trí tiệm", "")}
    <p class="dsub">Đã có ${decorCount()} món · hiện ở màn chính</p>
    <div class="droom">${room3dHTML(room, { hl: tr ? roomCat(tr.k).hl : C.hl, recipes: unlocked().length, event: todayEvents().length > 0, guests: Math.min(2, S.served ? 2 : 1), tables: tableLvs().join(","), wide: S.venue.wide, floors: S.venue.floors }, true)}
      ${tr && S.room[tr.k] !== tr.v ? `<div class="trying">Đang thử: ${esc(trIt!.n)}${fx ? ` · ${esc(fx)}` : ""}</div>` : ""}</div>
    <div class="dcats">${ROOM_CATS.map((c, i) => `<button class="${i === dcat ? "on" : ""}" data-dcat="${i}">${c.n}</button>`).join("")}</div>
    <div class="ditems">${items}</div>
    <div class="dfoot"><button class="b3 w" data-act="dcancel" ${tr ? "" : "disabled"}>Bỏ thử</button>${act}</div>
  </div>`;
}

export function giftBody() {
  const L2 = S.letters.slice().reverse();
  return `<div class="list">
    <div class="card"><h3>Quà hôm nay</h3><div class="gl">${goalsList()}</div>${claimBtn("Xong cả 3 mục tiêu để nhận quà")}</div>
    <div class="card"><h3>Hộp thư <small>${S.letters.length} lá</small></h3>
      ${L2.length ? L2.map(l => `<div class="lt"><small>${fmtD(parse(l.day))}/${l.day.slice(0, 4)}${l.tag ? " · " + esc(l.tag) : ""}</small><p>${esc(l.txt)}</p></div>`).join("")
        : '<p class="empty">Chưa có thư nào. Mở thư hôm nay ở màn chính nha.</p>'}
    </div></div>`;
}

export function shopHTML(tab: ShopTab) {
  if (tab === "pets") return teamHTML(pageHead);
  if (tab === "decor") return decorHTML();
  return `<div class="scr gift4">${pageHead("Quà tặng")}${giftBody()}</div>`;
}
