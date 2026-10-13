import { ROOM_CATS, fxDiff, fxText, setStates, isDefault, roomCat, roomItem, type RoomItem } from "../../content/room";
import { tableLvs } from "../../engine/economy";
import { dcat, ownsDecor, trial } from "../../engine/decor";
import { decorCount, lvl, unlocked } from "../../engine/progress";
import { S } from "../../engine/state";
import { fmtD, parse } from "../../engine/util";
import { esc } from "../dom";
import { room3dHTML } from "../room3d";
import { todayEvents } from "../../engine/dates";
import { pageHead } from "./prep";
import { teamHTML } from "../team";
import type { ShopTab } from "../router";
import { claimBtn, goalsList } from "./goals";

/* ===== Trang trí tiệm (DecorScreen của Claude Design): chạm để thử, rồi mua hoặc dùng. Logic ở engine/decor.ts ===== */
export { applyDecor, cancelDecor, pickDecorCat, setDecorCat, stashDecor, tryDecor } from "../../engine/decor";
/* tiến độ các bộ trang trí theo phòng đang xem (gồm món đang thử): "🍓 Hồng ngọt 2/3 · còn 1 món để tip +3%" */
const setLine = (room: Record<string, string>) => setStates(room).map(st => {
  const t = st.set.tiers, cur = t.filter(([n]) => st.count >= n).pop(), nxt = t.find(([n]) => st.count < n);
  const got = cur ? fxText({ fx: cur[1] } as RoomItem) : "";
  return `<span class="dset ${cur ? "on" : ""}">${st.set.icon} ${esc(st.set.n)} ${st.count}/${nxt ? nxt[0] : t[t.length - 1]![0]}${got ? ` · ${esc(got)}` : nxt ? ` · còn ${nxt[0] - st.count} món để ${esc(fxText({ fx: nxt[1] } as RoomItem))}` : ""}</span>`;
}).join("");
/** edit = vào từ nút Sửa tiệm: chỉ hiện đồ đã có, chỉ thử / dùng / cất, không mua */
export function decorHTML(edit = false) {
  const C = ROOM_CATS[dcat], room = { ...S.room }, tr = trial && (!edit || ownsDecor(trial.k, trial.v)) ? trial : null;
  if (tr) room[tr.k] = tr.v;
  const trIt = tr ? roomItem(tr.k, tr.v) : null, trOwn = tr ? ownsDecor(tr.k, tr.v) : false;
  const items = C.items.filter(it => !edit || ownsDecor(C.k, it.v)).map(it => {
    const own = ownsDecor(C.k, it.v), eq = S.room[C.k] === it.v, sel = tr?.k === C.k && tr.v === it.v;
    return `<button class="ditem ${sel ? "sel" : eq ? "eq" : ""}" data-dtry="${C.k}:${it.v}"><span class="sw" style="background:${it.sw};background-size:${it.sws || "auto"}">${it.glyph || ""}</span>
      <span class="dn">${esc(it.n)}</span><span class="tg ${eq ? "use" : own ? "own" : it.gacha ? "gacha" : "buy"}">${eq ? "Đang dùng" : own ? "Đã có" : it.gacha ? "Gacha" : lvl() < (it.lv ?? 0) ? `Cấp ${it.lv}` : `${it.cost} xu`}</span></button>`;
  }).join("");
  const act = !tr ? `<button class="b3 off" disabled>Chạm món để thử</button>`
    : trOwn ? `<button class="b3 use" data-act="dbuy">Dùng món này</button>`
    : trIt!.gacha ? `<button class="b3 off" disabled>Chỉ quay được từ Gacha</button>`
    : lvl() < (trIt!.lv ?? 0) ? `<button class="b3 off" disabled>Mở khoá ở cấp ${trIt!.lv}</button>`
    : S.coins >= trIt!.cost ? `<button class="b3" data-act="dbuy">Mua · ${trIt!.cost} xu</button>` : `<button class="b3 off" disabled>Chưa đủ xu · ${trIt!.cost} xu</button>`;
  const fx = trIt ? fxText(trIt) : "", diff = tr && trIt ? fxDiff(roomItem(tr.k, S.room[tr.k]), trIt) : "";
  return `<div class="scr decor4">
    ${pageHead(edit ? "Sửa tiệm" : "Trang trí tiệm", "")}
    <p class="dsub">Đã có ${decorCount()} món · ${edit ? "chọn đồ đã có để thử, dùng hoặc cất. Muốn mua thêm, vào Cửa hàng" : "chạm chấm trên đồ để chỉnh"}</p>
    <div class="droom">${room3dHTML(room, { hl: tr ? roomCat(tr.k).hl : C.hl, ext: !!(tr ? roomCat(tr.k) : C).ext, edit: true, recipes: unlocked().length, event: todayEvents().length > 0, guests: Math.min(2, S.served ? 2 : 1), tables: tableLvs().join(","), wide: S.venue.wide, floors: S.venue.floors }, true)}
      ${tr && S.room[tr.k] !== tr.v ? `<div class="trying">Đang thử: ${esc(trIt!.n)}${fx ? ` · ${esc(fx)}` : ""}</div>` : ""}</div>
    ${tr && S.room[tr.k] !== tr.v ? `<p class="dsub dd">So với đang dùng: ${diff ? esc(diff) : "chỉ số không đổi"}</p>` : ""}
    ${(sl => sl ? `<div class="dsets">${sl}</div>` : "")(setLine(room))}
    <div class="dcats">${ROOM_CATS.map((c, i) => `<button class="${i === dcat ? "on" : ""}" data-dcat="${i}">${c.n}</button>`).join("")}</div>
    <div class="ditems">${items}</div>
    <div class="dfoot">${!tr && !isDefault(C.k, S.room[C.k]) ? `<button class="b3 w" data-act="dstash">Cất đồ này</button>` : `<button class="b3 w" data-act="dcancel" ${tr ? "" : "disabled"}>Bỏ thử</button>`}${act}</div>
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
  if (tab === "edit") return decorHTML(true);
  if (tab === "pets") return teamHTML(pageHead);
  if (tab === "decor") return decorHTML();
  return `<div class="scr gift4">${pageHead("Quà & thư")}${giftBody()}</div>`;
}
