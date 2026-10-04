/* Nhân vật người chibi 3D: đầu to, mắt to, má hồng; 12 kiểu tóc theo mã ảnh (g1..g6, b1..b6).
   Màu tóc, mắt, áo ngoài, áo trong, da lấy từ cùng bộ màu tô ảnh 2D nên khớp phần tuỳ chỉnh cá nhân. */
import * as THREE from "three";
import { Animated, CAP, CONE, CYL, RB, SPH, T, add, animeFace } from "./kit";
import { boyActor, boyPerson } from "./boy3d";
import { girlActor, girlPerson } from "./girl3d";

export interface PersonLook { skin?: string; hair?: string; coat?: string; shirt?: string; eye?: string; pants?: string; shoes?: string }
export type Pose = "seat" | "stand";
/** nhân vật có trạng thái: đứng, đi, ngồi xuống, đứng dậy (khách ra vào tiệm) */
export type ActorMode = "idle" | "walk" | "sit" | "getup";
export interface Actor extends Animated { mode(m: ActorMode): void; done(): boolean; snap(): void; dispose(): void; ready: Promise<boolean> }   // ready: true khi model 3D đã tải xong (false: đang dùng nhân vật khối)
const HAIR_KIND: Record<string, string> = { g1: "long", g2: "buns", g3: "pony", g4: "bob", g5: "braid", g6: "wave", b1: "spiky", b2: "curly", b3: "slick", b4: "tie", b5: "buzz", b6: "bowl", boy: "swept" };

/** chi tiết áo theo mã ảnh: mũ, cổ, cúc, túi, nơ, khoá, yếm, váy */
interface Outfit { hood?: boolean; collar?: "white" | "turtle" | "rib"; buttons?: boolean; pockets?: boolean; pinafore?: boolean; blouse?: boolean; bow?: boolean; zip?: boolean; skirt?: "dark" | "coat" }
const OUTFIT: Record<string, Outfit> = {
  g1: { hood: true, skirt: "dark" }, g2: { collar: "white", buttons: true, skirt: "dark" }, g3: { pinafore: true, skirt: "coat" }, g4: { collar: "turtle", skirt: "dark" }, g5: { blouse: true, bow: true, skirt: "coat" }, g6: { zip: true, collar: "rib", skirt: "dark" },
  boy: { hood: true }, b1: { hood: true }, b2: { collar: "white" }, b3: { buttons: true, pockets: true, collar: "rib" }, b4: { pinafore: true }, b5: { bow: true, buttons: true }, b6: { zip: true, collar: "rib" }
};

/** Nam và nữ dùng model 3D có sẵn (boy3d.ts, girl3d.ts); khi model lỗi tải thì dựng chibi bằng khối bên dưới */
export function person(look: PersonLook, sprite = "b1", pose: Pose = "seat"): Animated {
  if (sprite[0] === "b") return boyPerson(look, pose, () => blockActor(look, sprite), sprite);
  return girlPerson(look, pose, () => blockActor(look, sprite), sprite);
}

/** Nhân vật có đủ trạng thái cho khách ra vào */
export function personActor(look: PersonLook, sprite: string): Actor {
  return (sprite[0] === "b" ? boyActor : girlActor)(look, () => blockActor(look, sprite), sprite);
}

/** Nhân vật khối: hai dáng (đứng / ngồi) hoán đổi theo trạng thái, đi thì nhún nhẹ */
function blockActor(look: PersonLook, sprite: string): Actor {
  const g = new THREE.Group(), stand = blockPerson(look, sprite, "stand"), seat = blockPerson(look, sprite, "seat");
  g.add(stand.group, seat.group);
  let m: ActorMode = "idle", t0 = 0, now = 0, snapped = false;
  const sitDone = () => snapped || now - t0 >= 1, upDone = () => now - t0 >= .6;
  const sitting = () => (m === "sit" && sitDone()) || (m === "getup" && !upDone());
  return {
    group: g,
    update(t) {
      now = t; const s = sitting(); seat.group.visible = s; stand.group.visible = !s;
      stand.group.position.set(0, m === "walk" ? Math.abs(Math.sin(t * 9)) * .05 : 0, m === "sit" || m === "getup" ? .3 : 0);
      stand.update(t); seat.update(t);
    },
    mode(x) { m = x; t0 = now; if (x !== "sit") snapped = false; },
    done: () => m === "sit" ? sitDone() : m === "getup" ? upDone() : true,
    snap() { snapped = true; },
    dispose() { /* hình học dùng chung nên không giải phóng riêng */ },
    ready: Promise.resolve(false)
  };
}

function blockPerson(look: PersonLook, sprite: string, pose: Pose): Animated {
  const g = new THREE.Group(), ups: ((t: number) => void)[] = [];
  const skin = look.skin || "#FFE3D0", hair = look.hair || "#3B2A26", coat = look.coat || "#2F6F86", shirt = look.shirt || "#8A3D55", eye = look.eye || "#5FA6C9";
  const o = OUTFIT[sprite] || {}, girl = sprite[0] === "g", pants = look.pants || "#3A3A44";
  const sk = T(skin), hr = T(hair, { emissive: new THREE.Color(hair), emissiveIntensity: .12 }), ct = T(o.blouse ? "#F6EFE2" : coat), ca = T(o.pinafore ? shirt : o.blouse ? "#F6EFE2" : coat), cs = T(coat);
  add(g, CAP(.2, .26), ct, 0, .62, 0, { s: [1.05, 1, .95] });
  if (!o.pinafore && !o.blouse) add(g, SPH(.13, 14, 10), T(shirt), 0, .7, .13, { s: [1.1, 1.3, .6], ol: null });
  if (o.pinafore) { ([-1, 1] as const).forEach(s => add(g, RB(.06, .24, .05, .02), cs, s * .1, .8, .12, { ol: "thin" })); add(g, RB(.2, .12, .03, .02), T("#2A5A70"), 0, .56, .2, { ol: "thin" }); }
  if (o.hood) { add(g, SPH(.19, 16, 12), cs, 0, .86, -.15, { s: [1.35, .8, .9] }); ([-1, 1] as const).forEach(s => { add(g, CAP(.01, .14), T("#F2E6D0"), s * .06, .66, .2, { ol: null }); add(g, SPH(.018, 6, 6), T("#C9B48A"), s * .06, .57, .2, { ol: null }); }); }
  if (o.collar === "white") ([-1, 1] as const).forEach(s => add(g, CONE(.06, .11, 4), T("#fff"), s * .08, .85, .14, { r: [.3, 0, s * 1.0], ol: "thin" }));
  if (o.collar === "turtle") add(g, new THREE.TorusGeometry(.12, .045, 8, 16), T(shirt), 0, .86, .02, { r: [Math.PI / 2, 0, 0], ol: "thin" });
  if (o.collar === "rib") add(g, new THREE.TorusGeometry(.12, .035, 8, 16), cs, 0, .86, .02, { r: [Math.PI / 2, 0, 0], ol: "thin" });
  if (o.buttons) [0, 1, 2].forEach(i => add(g, SPH(.018, 6, 6), T("#D9DDE3"), 0, .78 - i * .09, .2, { ol: null }));
  if (o.pockets) ([-1, 1] as const).forEach(s => add(g, RB(.09, .07, .03, .01), T("#2A5A70"), s * .12, .7, .2, { ol: null }));
  if (o.zip) add(g, CAP(.006, .32), T("#E8E8F0"), 0, .66, .2, { ol: null });
  if (o.bow) { ([-1, 1] as const).forEach(s => add(g, CONE(.045, .09, 4), T("#8A3D55"), s * .06, .83, .2, { r: [0, 0, s * Math.PI / 2], ol: "thin" })); add(g, SPH(.03, 8, 6), T("#8A3D55"), 0, .83, .2, { ol: "thin" }); }
  const armR: [number, number, number] = pose === "stand" ? [.05, 0, 0] : [.9, 0, 0];
  ([-1, 1] as const).forEach(s => { const arm = add(g, CAP(.075, .22), ca, s * .28, pose === "stand" ? .55 : .6, pose === "stand" ? .02 : .1, { r: [armR[0], 0, s * (pose === "stand" ? .28 : .15)] }); add(arm, SPH(.075, 10, 8), sk, 0, -.2, 0, { ol: "thin" }); add(arm, SPH(.032, 8, 6), sk, -s * .06, -.17, .05, { ol: "thin" }); });
  const skirtC = o.skirt === "coat" ? coat : pants;
  if (pose === "stand") {
    if (girl) { add(g, CYL(.2, .3, .2, 22), T(skirtC), 0, .4, 0); ([-1, 1] as const).forEach(s => { add(g, CAP(.065, .12), sk, s * .1, .18, 0); add(g, SPH(.095, 10, 8), T("#2E2E38"), s * .1, .05, .05, { s: [1, .6, 1.4], ol: "thin" }); }); }
    else ([-1, 1] as const).forEach(s => { add(g, CAP(.085, .25), T(pants), s * .1, .27, 0); add(g, SPH(.1, 10, 8), T("#E8E8F0"), s * .1, .06, .05, { s: [1, .6, 1.4], ol: "thin" }); });
  } else {
    if (girl) add(g, CYL(.2, .3, .16, 22), T(skirtC), 0, .5, .02);
    ([-1, 1] as const).forEach(s => { add(g, CAP(.085, .28), girl ? sk : T(pants), s * .11, .46, .26, { r: [Math.PI / 2, 0, 0] }); add(g, SPH(.1, 10, 8), T("#E8A0B4"), s * .11, .24, .5, { s: [1, .7, 1.3], ol: "thin" }); });
  }
  const head = new THREE.Group(); head.position.set(0, 1.14, 0); head.scale.setScalar(1.16); g.add(head);
  add(head, SPH(.34, 26, 20), sk, 0, 0, 0, { s: [1.03, .94, 1] });
  ([-1, 1] as const).forEach(s => add(head, SPH(.06, 8, 6), sk, s * .34, -.02, 0, { s: [.5, 1, .8], ol: "thin" }));
  ups.push(animeFace(head, eye));
  const cap = (r: number, th: number, tilt: number) => add(head, new THREE.SphereGeometry(r, 30, 20, 0, Math.PI * 2, 0, Math.PI * th), hr, 0, .02, -.02, { r: [-tilt, 0, 0] });
  const bangs = (n = 6, y = .2, sz = .075) => { const rr = Math.min(.09, sz * .75), len = .17 + sz; for (let i = 0; i < n; i++) { const a = (i / (n - 1) - .5) * 1.9; add(head, CONE(rr, len, 6), hr, Math.sin(a) * .3, y - Math.abs(a) * .045, .3 * Math.cos(a) + .035, { r: [Math.PI, 0, a * .35], ol: "thin" }); } };
  const ring = (c: string, r: number, y: number, z: number, rx: number) => add(head, new THREE.TorusGeometry(r, .025, 6, 12), T(c), 0, y, z, { r: [rx, 0, 0], ol: "thin" });
  switch (HAIR_KIND[sprite] || sprite) {
    case "long": cap(.375, .6, .28); bangs(); add(head, CAP(.3, .5), hr, 0, -.3, -.14, { s: [1.1, 1, .7] }); ([-1, 1] as const).forEach(s => add(head, CAP(.075, .5), hr, s * .32, -.25, .04)); break;
    case "buns": cap(.375, .6, .3); bangs(); ([-1, 1] as const).forEach(s => add(head, SPH(.15, 14, 12), hr, s * .26, .33, -.04)); break;
    case "pony": cap(.375, .6, .3); bangs(); add(head, CAP(.1, .46), hr, 0, .02, -.4, { r: [.5, 0, 0] }); ring("#C2406A", .07, .27, -.28, .5); break;
    case "bob": cap(.38, .62, .3); bangs(); add(head, SPH(.4, 22, 16), hr, 0, -.06, -.07, { s: [1, .82, 1] }); break;
    case "braid": cap(.375, .6, .3); bangs(); add(head, CAP(.075, .5), hr, .3, -.32, -.22, { r: [.3, 0, -.15] }); [0, 1, 2].forEach(i => add(head, SPH(.085, 10, 8), hr, .31 - i * .01, -.2 - i * .17, -.22 + i * .02)); break;
    case "wave": cap(.385, .62, .3); bangs(); add(head, SPH(.42, 22, 16), hr, 0, -.05, -.08, { s: [1.05, .85, 1] }); add(head, new THREE.TorusGeometry(.33, .035, 6, 24, Math.PI), T("#C2406A"), 0, .02, -.01, { r: [Math.PI / 2 - .3, 0, 0], ol: "thin" }); break;
    case "spiky": cap(.37, .55, .2); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(head, CONE(.1, .26, 8), hr, Math.sin(a) * .24, .3, Math.cos(a) * .2 - .02, { r: [Math.cos(a) * .6, 0, -Math.sin(a) * .6], ol: "thin" }); } bangs(3, .26, .1); break;
    case "curly": cap(.37, .5, .25); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(head, SPH(.12, 10, 8), hr, Math.sin(a) * .3, .18 + (i % 2) * .1, Math.cos(a) * .27 - .02, { ol: "thin" }); } add(head, SPH(.16, 10, 8), hr, 0, .34, 0, { ol: "thin" }); bangs(4, .24, .1); break;
    case "slick": cap(.375, .56, .25); add(head, SPH(.19, 12, 10), hr, -.12, .3, .1, { s: [1.2, .8, 1.2], r: [0, 0, .4], ol: "thin" }); bangs(3, .27, .1); break;
    case "tie": cap(.375, .58, .3); bangs(3, .26, .11); add(head, CAP(.09, .36), hr, 0, -.08, -.4, { r: [.35, 0, 0] }); ring("#8A3D55", .06, .06, -.34, .35); break;
    case "buzz": cap(.355, .5, .22); add(head, new THREE.TorusGeometry(.37, .035, 8, 24, Math.PI), T("#8A3D55"), 0, .06, 0, { r: [0, Math.PI / 2, 0], ol: "thin" }); ([-1, 1] as const).forEach(s => add(head, new THREE.CylinderGeometry(.1, .1, .08, 16), T("#8A3D55"), s * .37, -.02, 0, { r: [0, 0, Math.PI / 2], ol: "thin" })); break;
    case "swept": cap(.375, .56, .26); for (let i = 0; i < 6; i++) { const a = i / 5 - .5; add(head, CONE(.09, .27, 7), hr, a * .5 + .03, .33 - Math.abs(a) * .1, -.02 + a * .08, { r: [-.15, 0, -.85 - a * .3], ol: "thin" }); } bangs(4, .26, .09); add(head, SPH(.12, 10, 8), hr, .27, .17, .17, { s: [.8, 1.3, .7], ol: "thin" }); break;
    case "bowl": cap(.385, .5, .25); add(head, new THREE.TorusGeometry(.33, .09, 8, 28), hr, 0, .17, .0, { r: [Math.PI / 2, 0, 0], ol: "thin" }); bangs(5, .27, .06); break;
  }
  ups.push(t => { head.rotation.z = Math.sin(t * 1.3) * .03; head.position.y = 1.14 + Math.sin(t * 2) * .008; });
  return { group: g, update: t => ups.forEach(f => f(t)) };
}
