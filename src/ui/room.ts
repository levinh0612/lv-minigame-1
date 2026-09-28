/* Cảnh tiệm (ShopRoom của Claude Design): khung 361×340, co giãn theo bề ngang bằng fitRooms() */
import type { PetId } from "../content/couple";
import { PETS } from "../content/game";
import type { Room } from "../content/room";
import { S, petName } from "../engine/state";
import { cakeSVG, critterSVG, guestSVG } from "./art";
import { esc } from "./dom";

const WALLS: Record<string, [string, string]> = {
  pink: ["repeating-linear-gradient(90deg,#FFE6EC 0 18px,#FFDDE5 18px 36px)", "auto"],
  mint: ["repeating-linear-gradient(90deg,#E4F6EC 0 18px,#D8F0E3 18px 36px)", "auto"],
  cream: ["radial-gradient(#FFD9A8 3px,transparent 3.5px) #FFF6E3", "22px 22px"],
  lavender: ["linear-gradient(90deg,#E4DBFF 1.5px,transparent 1.5px) 0 0,linear-gradient(#E4DBFF 1.5px,transparent 1.5px) 0 0,#F4F0FF", "24px 24px"],
  party: ["repeating-linear-gradient(90deg,#FFF0C9 0 18px,#FFE7AE 18px 36px)", "auto"]
};
const FLOORS: Record<string, [string, string]> = {
  check: ["repeating-conic-gradient(#DDF4E8 0 25%,#CBEDDB 0 50%)", "34px 34px"],
  wood: ["repeating-linear-gradient(90deg,#EFCB9E 0 38px,#E7BD8B 38px 40px,#F2D2AA 40px 78px,#E7BD8B 78px 80px)", "auto"],
  tile: ["repeating-conic-gradient(#FFE3EA 0 25%,#FFFFFF 0 50%)", "26px 26px"]
};
const COUNTERS: Record<string, string> = {
  pink: "repeating-linear-gradient(90deg,#FFB3C7 0 22px,#FFC7D5 22px 44px)",
  mint: "repeating-linear-gradient(90deg,#9FDCC0 0 22px,#B6E6CF 22px 44px)",
  wood: "repeating-linear-gradient(90deg,#D9A66B 0 22px,#E3B47D 22px 44px)"
};
const B = "border:2.5px solid #4A3438";
const HEART = `<svg width="18" height="16" viewBox="0 0 16 14"><path d="M8 13 C4 10 1 7.5 1 4.5 C1 2 3 1 4.7 1 C6.2 1 7.4 2 8 3 C8.6 2 9.8 1 11.3 1 C13 1 15 2 15 4.5 C15 7.5 12 10 8 13 Z" fill="#FF6F91" stroke="#4A3438" stroke-width="1.4"/></svg>`;
const PET_MOOD: Record<PetId, "happy" | "wink" | "open"> = { dog: "happy", gold: "wink", white: "open" };

export interface RoomOpts { hl?: string; event?: boolean; guests?: number; recipes?: number; giftDot?: boolean; love?: PetId | null }

export function roomHTML(r: Room, o: RoomOpts = {}) {
  const ev = !!o.event, g = o.guests ?? 2, glow = (k: string) => (o.hl === k ? " glow" : "");
  const wall = WALLS[ev ? "party" : r.wall] || WALLS.pink, floor = FLOORS[r.floor] || FLOORS.check;
  const tableC = r.floor === "wood" ? "#C98E5A" : "#E9B98A", tableTop = r.counter === "mint" ? "#E4F6EC" : "#fff";
  const more = (o.recipes ?? 4) > 4;
  let h = `<div class="rm-wall" style="background:${wall[0]};background-size:${wall[1]}"></div>
    <div class="rm-rail"></div>
    <div class="rm-floor" style="background:${floor[0]};background-size:${floor[1]}"></div>`;
  // thảm
  h += `<div class="rm-slot${glow("rug")}" style="left:10px;top:278px;width:224px;height:52px;border-radius:50%">${
    r.rug === "1" ? `<div style="width:100%;height:100%;border-radius:50%;background:#FFD1DC;${B};box-shadow:inset 0 0 0 6px #FFD1DC,inset 0 0 0 8.5px #fff"></div>`
    : r.rug === "2" ? `<div style="width:100%;height:100%;border-radius:50% 50% 44% 44%;background:#FF8FAB;${B};background-image:radial-gradient(#FFF1A8 2px,transparent 2.5px);background-size:16px 12px;position:relative"><div style="position:absolute;left:50%;top:-10px;margin-left:-22px;width:44px;height:14px;border-radius:50%;background:#7FB77E;${B}"></div></div>` : ""}</div>`;
  // cửa sổ
  h += `<div class="rm-win"><i style="left:14px;top:40px;width:40px;height:14px;border-radius:7px;background:#fff"></i><i style="left:26px;top:32px;width:22px;height:18px;border-radius:50%;background:#fff"></i><i style="left:42px;top:0;bottom:0;width:2.5px;background:#4A3438"></i><i style="left:0;right:0;top:44px;height:2.5px;background:#4A3438"></i></div>`;
  // rèm
  h += `<div class="rm-slot${glow("curtain")}" style="left:6px;top:10px;width:112px;height:102px;border-radius:16px">${
    r.curtain === "1" ? `<i style="left:2px;top:2px;width:108px;height:22px;border-radius:11px;background-image:repeating-linear-gradient(90deg,#FF9FB6 0 13.5px,#fff 13.5px 27px);${B}"></i><i style="left:4px;top:20px;width:24px;height:80px;border-radius:0 0 20px 6px;background:#FFC4D4;${B}"></i><i style="left:84px;top:20px;width:24px;height:80px;border-radius:0 0 6px 20px;background:#FFC4D4;${B}"></i>`
    : r.curtain === "2" ? `<i style="left:2px;top:4px;width:108px;height:8px;border-radius:4px;background:#C9905A;${B}"></i><i style="left:4px;top:10px;width:28px;height:90px;border-radius:0 0 14px 4px;background:repeating-conic-gradient(#8FD9B6 0 25%,#fff 0 50%) 0 0/12px 12px;${B}"></i><i style="left:80px;top:10px;width:28px;height:90px;border-radius:0 0 4px 14px;background:repeating-conic-gradient(#8FD9B6 0 25%,#fff 0 50%) 0 0/12px 12px;${B}"></i>` : ""}</div>`;
  // đồ treo tường
  h += `<div class="rm-slot${glow("wall")}" style="left:124px;top:26px;width:50px;height:58px;border-radius:10px">${
    r.wallItem === "1" ? `<button class="sway rm-frame" data-act="photo" aria-label="Ảnh trong khung" style="width:100%;height:100%;border-radius:8px;background:#FFE9B8;${B};padding:5px"><div style="width:100%;height:100%;border-radius:4px;background:#FFD1DC;display:grid;place-items:center;overflow:hidden">${S.photo ? `<img src="${S.photo}" alt="">` : HEART}</div></button>`
    : r.wallItem === "2" ? `<svg width="50" height="58" viewBox="0 0 50 58" fill="none" stroke="#4A3438" stroke-width="2.4" stroke-linejoin="round"><path d="M8 14 L10 2 L19 9 M42 14 L40 2 L31 9" fill="#fff"/><circle cx="25" cy="28" r="20" fill="#fff"/><circle cx="25" cy="28" r="15" fill="#FFF3F6" stroke-width="1.8"/><path d="M25 28 V18 M25 28 L32 32" stroke-width="2.6" stroke-linecap="round"/><path d="M25 48 V56 M21 56 H29" stroke-width="2"/></svg>`
    : S.photo ? `<button class="rm-photo sway" data-act="photo" aria-label="Ảnh treo tường"><img src="${S.photo}" alt=""></button>`
    : `<button class="rm-empty" data-act="photo" aria-label="Treo ảnh lên tường">+</button>`}</div>`;
  // bảng menu
  h += `<button class="rm-menu" data-act="menu" aria-label="Xem menu"><b>Menu</b><i style="width:40px"></i><i style="width:30px"></i><small>${o.recipes ?? 4} món</small></button>`;
  // đèn
  if (!ev) h += `<div class="rm-slot${glow("lamp")}" style="left:266px;top:0;width:92px;height:48px;border-radius:0 0 14px 14px">${
    r.lamp === "1" ? `<i style="left:34px;top:0;width:2.5px;height:16px;background:#4A3438"></i><div class="sway" style="position:absolute;left:10px;top:12px;width:52px;height:30px"><i style="left:0;top:10px;width:22px;height:20px;border-radius:50%;background:#FFF7DC;${B}"></i><i style="left:12px;top:2px;width:28px;height:26px;border-radius:50%;background:#FFF7DC;${B}"></i><i style="left:30px;top:10px;width:22px;height:20px;border-radius:50%;background:#FFF7DC;${B}"></i><i style="left:4px;top:13px;width:44px;height:14px;background:#FFF7DC;border-radius:6px"></i></div>`
    : r.lamp === "2" ? `<svg width="92" height="40" viewBox="0 0 92 40" fill="none" stroke="#4A3438" stroke-width="2" style="position:absolute;left:0;top:0"><path d="M0 8 Q23 26 46 14 Q69 2 92 20"/></svg>${[[4, 10], [22, 17], [40, 14], [58, 7], [76, 12]].map(([x, y], i) => `<i class="bulb" style="left:${x}px;top:${y}px;background:${["#FFF1A8", "#FFB3C7", "#B8EBD3", "#FFF1A8", "#C9B8F0"][i]};animation-duration:${1.2 + i * 0.3}s"></i>`).join("")}` : ""}</div>`;
  else h += `<div class="rm-flags">${Array.from({ length: 13 }, (_, i) => `<i style="border-top-color:${["#FF8FAB", "#FFD66B", "#8FD9B6", "#C9B8F0"][i % 4]}"></i>`).join("")}</div>`;
  // tủ bánh
  h += `<button class="rm-case${glow("case")}" data-act="cakes" aria-label="Tủ bánh: xem bánh đang bán" style="background:${r.counter === "mint" ? "#B6E6CF" : "#E9B98A"}"><div class="gl">
      <i style="left:0;right:0;top:56px;height:3px;background:#C9905A"></i><i style="left:8px;top:6px;width:10px;height:100px;background:rgba(255,255,255,.7);transform:skewX(-12deg)"></i>
      <div class="sh" style="top:20px">${cakeSVG({ base: 0, cream: 0, top: 0, sweet: 1 }, { size: 32, still: true })}${cakeSVG({ base: 2, cream: 1, top: 0, sweet: 0 }, { size: 32, still: true })}</div>
      <div class="sh" style="top:82px">${cakeSVG({ base: 1, cream: 2, top: 2, sweet: 2 }, { size: 32, still: true })}${more ? cakeSVG({ base: 0, cream: 1, top: 1, sweet: 1 }, { size: 32, still: true }) : `<i style="position:static;width:30px;height:24px;border-radius:6px;border:2px dashed #C7D9E6"></i>`}</div>
    </div><div class="lb">Tủ bánh</div></button>`;
  // thú cưng sau quầy + quầy
  const pets = (["dog", "gold", "white"] as PetId[]);
  h += `<div class="rm-pets">${pets.map(id => `<button class="rpet" data-pet="${id}" aria-label="Vuốt ve ${esc(petName(id))}">${critterSVG({ ...PETS[id], mood: o.love === id ? "love" : PET_MOOD[id], wave: id === "white" && o.love !== id, ledge: false }, 64)}</button>`).join("")}</div>
    <div class="rm-top"></div>
    <div class="rm-counter${glow("counter")}" style="background:${COUNTERS[r.counter] || COUNTERS.pink}">${pets.map(id => `<span>${esc(petName(id))}</span>`).join("")}</div>`;
  // hộp quà
  h += `<button class="rm-gift" data-go="/cua-hang/qua-tang" aria-label="Quà tặng"><i style="left:2px;top:12px;width:28px;height:20px;background:#8FD9B6;${B};border-radius:3px"></i><i style="left:0;top:6px;width:32px;height:9px;background:#8FD9B6;${B};border-radius:3px"></i><i style="left:13px;top:6px;width:6px;height:26px;background:#FF7FA1"></i><i style="left:6px;top:-2px;width:10px;height:9px;${B};border-radius:50% 50% 0 50%;background:#FF7FA1"></i><i style="left:16px;top:-2px;width:10px;height:9px;${B};border-radius:50% 50% 50% 0;background:#FF7FA1"></i>${o.giftDot ? `<i class="dot"></i>` : ""}</button>`;
  // bàn khách
  const tables = [{ x: 14, who: g > 0 ? guestSVG({ gender: "girl", hairStyle: "long", hair: "#6B4A3A", skin: "#FFE3D0", accent: "#FF8FAB", gesture: "cheek", mood: "love", ledge: false }, 66) : "", c: [0, 1, 0] },
                  { x: 124, who: g > 1 ? critterSVG({ kind: "bunny", fur: "#FFFFFF", bow: "#FF8FAB", mood: "happy", ledge: false }, 58) : "", c: [2, 0, 1] }];
  h += tables.map(t => `<div class="rm-table" style="left:${t.x}px"><div class="tw">${t.who}</div>
    <i style="left:46px;top:62px;width:12px;height:40px;background:${tableC};${B}"></i><i style="left:28px;bottom:6px;width:48px;height:10px;border-radius:50%;background:${tableC};${B}"></i>
    <i style="left:4px;top:52px;width:96px;height:22px;border-radius:50%;background:${tableTop};${B}"></i>
    <div style="position:absolute;left:58px;top:36px">${cakeSVG({ base: t.c[0], cream: t.c[1], top: t.c[2], sweet: 1 }, { size: 30, still: true })}</div>
    <i style="left:18px;top:44px;width:18px;height:14px;border-radius:0 0 7px 7px;background:#fff;${B}"></i><i class="steam"></i></div>`).join("");
  // cây
  h += `<div class="rm-slot${glow("plant")}" style="left:232px;top:252px;width:48px;height:76px;border-radius:14px">${
    r.plant === "1" ? `<i style="left:10px;top:12px;width:18px;height:30px;border-radius:50%;background:#7FB77E;${B};transform:rotate(-24deg)"></i><i style="left:21px;top:8px;width:18px;height:32px;border-radius:50%;background:#9FD18A;${B};transform:rotate(18deg)"></i><i style="left:9px;top:40px;width:30px;height:32px;border-radius:4px 4px 10px 10px;background:#E9A27C;${B}"></i>`
    : r.plant === "2" ? `<svg width="48" height="76" viewBox="0 0 48 76" fill="none" stroke="#4A3438" stroke-width="2.3" stroke-linejoin="round" style="position:absolute;inset:0"><path d="M24 50 C22 36 12 30 4 30 C4 40 14 48 24 50 Z" fill="#6FB27A"/><path d="M24 50 C26 32 36 22 46 22 C46 36 36 46 24 50 Z" fill="#8FCB86"/><path d="M24 48 C20 30 22 12 28 2 C34 14 32 34 24 48 Z" fill="#7FBF80"/><path d="M14 36 L10 34 M36 30 L40 28 M26 16 L29 14" stroke-width="1.8"/><path d="M10 50 H38 L34 74 H14 Z" fill="#FFF3F6"/><path d="M11 56 H37" stroke="#FF9FB6" stroke-width="3"/></svg>`
    : `<div class="rm-empty pl">+</div>`}</div>`;
  return `<div class="roomfit"><div class="room4">${h}</div></div>`;
}

/* co cảnh 361×340 theo bề ngang khung chứa */
export function fitRooms() {
  document.querySelectorAll<HTMLElement>(".roomfit").forEach(f => {
    const k = Math.min(1.2, f.clientWidth / 361);
    f.style.height = 340 * k + "px";
    (f.firstElementChild as HTMLElement).style.transform = `scale(${k})`;
  });
}
addEventListener("resize", fitRooms);
