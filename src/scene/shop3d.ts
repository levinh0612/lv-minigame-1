/* Cảnh tiệm 3D của màn chính: phòng dựng bằng code theo đồ trang trí đang dùng, thú cưng, chủ tiệm, khách, bánh.
   Sáng/tối theo giờ, xoay 4 góc. Không đọc trạng thái game: mọi thứ truyền qua ShopOpts. */
import * as THREE from "three";
import { CYL, RB, SPH, T, INK, add, CONE, CAP, mergeStatic } from "./kit";
import { cake } from "./cake";
import { pet, type PetKind } from "./pets";
import { APPROACH } from "./figure3d";
import { person, personActor, type Actor, type PersonLook } from "./people";

export interface ShopOpts {
  room: Record<string, string>;            // wall, floor, counter, curtain, lamp, wallItem, plant, rug
  event: boolean;                          // ngày đặc biệt: tường vàng, cờ và bóng bay
  guests: number;                          // 0..2 khách đang ngồi
  seats: number;                           // số ghế trong tiệm (3..6 hiện trong cảnh)
  giftDot: boolean;
  photo: string;                           // ảnh treo tường (data URL) hoặc ""
  cakes: [number, number, number][];       // bánh trong tủ kính (đế, kem, topping)
  me: { sprite: string; look: PersonLook };
  guestLooks: { sprite: string; look: PersonLook }[];
  menuCount: number;
  shopName: string;                        // tên tiệm trên biển hiệu
  hl?: string;                             // nhóm đồ đang được chọn ở màn trang trí: làm nổi bật
}
export interface Hotspot { id: string; attr: string; value: string; label: string; obj: THREE.Object3D; wall: number | null; dy: number }
export interface ShopScene {
  dom: HTMLCanvasElement; hotspots: Hotspot[];
  resize(w: number, h: number): void; rotate(dir: number): void; setHour(h: number): void; bounce(id: string): void;
  start(): void; stop(): void; dispose(): void; project(h: Hotspot): { x: number; y: number; show: boolean };
  phases(): string[]; breakdown(): Record<string, number>; stats(): { sky: string; upMs: number; drawMs: number; calls: number; tris: number; q: number };
  update(room: Record<string, string>, hl?: string): boolean; setInsets(top: number, bottom: number): void; setExterior(on: boolean): void; isExterior(): boolean; dragStart(): void; drag(dx: number, dy?: number): void; dragEnd(): void; zoomBy(f: number): void; resetView(): void; zoomLevel(): number;
}

let renderer: THREE.WebGLRenderer | null = null, quality = 0;   // quality: mức giảm chất lượng khi máy chậm (0 = đầy đủ), nhớ giữa các cảnh
export const webglOK = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;   // bóng tự vẽ lại thưa hơn (xem frame)
  }
  return renderer;
}

/* ---------- texture canvas ---------- */
const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};
const stripes = (a: string, b: string, rep: [number, number]) => tex(64, 64, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; g.fillRect(w / 2, 0, w / 2, h); }, rep);
const WALL: Record<string, () => { color: string; map: THREE.Texture }> = {
  pink: () => ({ color: "#fff", map: stripes("#FFE6EC", "#FFDDE5", [10, 1]) }),
  mint: () => ({ color: "#fff", map: stripes("#E4F6EC", "#D8F0E3", [10, 1]) }),
  cream: () => ({ color: "#fff", map: tex(64, 64, (g, w, h) => { g.fillStyle = "#FFF6E3"; g.fillRect(0, 0, w, h); g.fillStyle = "#FFD9A8"; g.beginPath(); g.arc(w / 2, h / 2, 6, 0, 7); g.fill(); }, [12, 4]) }),
  lavender: () => ({ color: "#fff", map: tex(64, 64, (g, w, h) => { g.fillStyle = "#F4F0FF"; g.fillRect(0, 0, w, h); g.fillStyle = "#E4DBFF"; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); }, [10, 4]) }),
  party: () => ({ color: "#fff", map: stripes("#FFF0C9", "#FFE7AE", [10, 1]) }),
  peach: () => ({ color: "#fff", map: stripes("#FFE4D0", "#FFD9BE", [10, 1]) }),
  sky: () => ({ color: "#fff", map: stripes("#E2F1FF", "#D3E8FA", [10, 1]) }),
  brick: () => ({ color: "#fff", map: tex(128, 64, (g, w, h) => { g.fillStyle = "#EBC9B4"; g.fillRect(0, 0, w, h); g.fillStyle = "#D99A82"; for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { const ox = r % 2 ? w / 4 : 0; g.fillRect(((c * w / 2 + ox) % w) + 2, r * h / 4 + 2, w / 2 - 4, h / 4 - 4); } }, [6, 3]) })
};
const FLOOR: Record<string, () => THREE.Texture> = {
  check: () => tex(64, 64, (g, w, h) => { g.fillStyle = "#DDF4E8"; g.fillRect(0, 0, w, h); g.fillStyle = "#CBEDDB"; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); }, [8, 6]),
  wood: () => tex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#E7BD8B" : "#EFCB9E"; g.fillRect(0, i * h / 8, w, h / 8); g.fillStyle = "rgba(150,90,40,.35)"; g.fillRect(0, i * h / 8, w, 3); } }, [4, 3]),
  dark: () => tex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#8A5A3C" : "#9A6846"; g.fillRect(0, i * h / 8, w, h / 8); g.fillStyle = "rgba(40,20,10,.4)"; g.fillRect(0, i * h / 8, w, 3); } }, [4, 3]),
  marble: () => tex(128, 128, (g, w, h) => { g.fillStyle = "#F4F4F6"; g.fillRect(0, 0, w, h); g.fillStyle = "#E3E5EA"; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); g.strokeStyle = "rgba(150,160,175,.35)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, 20); g.lineTo(50, 60); g.moveTo(80, 70); g.lineTo(120, 110); g.stroke(); }, [6, 4]),
  tile: () => tex(64, 64, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#FFE3EA"; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); }, [8, 6])
};
const COUNTER_C: Record<string, [string, string]> = { pink: ["#FFB3C7", "#FFC7D5"], mint: ["#9FDCC0", "#B6E6CF"], wood: ["#D9A66B", "#E3B47D"], choco: ["#8B5A3C", "#A06E4B"], white: ["#F1E9DF", "#FFFFFF"] };

const W = 8, D = 6, HH = 3.2, PET_S = .92;
const DOOR_X = 1.3, DOOR_W = 1.5, DOOR_H = 2.35;   // lối cửa chính trên tường Nam
let blobTex: THREE.CanvasTexture | null = null;
const blobMap = () => blobTex ??= (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!, gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, "rgba(60,30,40,.55)"); gr.addColorStop(1, "rgba(60,30,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

export function createShop(o: ShopOpts): ShopScene {
  const r = getRenderer(), scene = new THREE.Scene(), root = new THREE.Group(); scene.add(root);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 80);
  const ups: ((t: number) => void)[] = [], hotspots: Hotspot[] = [], walls: { group: THREE.Group; decor: THREE.Group; nx: number; nz: number; mats: THREE.Material[] }[] = [];
  const disposables: { dispose(): void }[] = [];
  /* màu chủ đạo của tiệm theo màu giao diện người chơi chọn (hồng, cam, xanh...) */
  const css = (n: string, d: string) => (typeof document !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue(n).trim()) || d;
  const PK = css("--pink", "#FF7FA1"), PKM = css("--pink-m", "#FF8FAB"), PKD = css("--pink-d", "#E0567A");
  const ev = o.event, R = o.room; let curHl = o.hl; const hl = (k: string) => curHl === k;
  const glowMats: THREE.MeshToonMaterial[] = [], selAll: Record<string, THREE.MeshToonMaterial[]> = {};
  const sel = (k: string, m: THREE.MeshToonMaterial) => { (selAll[k] ||= []).push(m); if (hl(k)) glowMats.push(m); return m; };
  /* gỡ một nhóm đồ trang trí ra khỏi cảnh và giải phóng bộ nhớ (viền dùng chung nên không hủy) */
  const purge = (g: THREE.Object3D) => {
    const mats = new Set<THREE.Material>();
    g.traverse(ob => { const m = ob as THREE.Mesh; if (!m.isMesh) return; m.geometry.dispose(); if ((m.parent as THREE.Mesh).isMesh) return; (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => mats.add(x)); });
    mats.forEach(x => { const mp = (x as THREE.MeshToonMaterial).map; if (mp && mp !== photoTex) mp.dispose(); x.dispose(); });
    for (const k in selAll) selAll[k] = selAll[k]!.filter(m => !mats.has(m));
    for (let i = glowMats.length - 1; i >= 0; i--) if (mats.has(glowMats[i]!)) glowMats.splice(i, 1);
    g.clear();
  };
  /* vật liệu phụ thuộc tường / sàn / quầy: gom lại để update() đổi tại chỗ, không dựng lại cảnh */
  const cur: Record<string, string> = { ...R }, wallMains: [THREE.MeshToonMaterial, number][] = [], tableTops: THREE.MeshToonMaterial[] = [], tableLegs: THREE.MeshToonMaterial[] = [], counterBits: { top?: THREE.MeshToonMaterial; wood?: THREE.MeshToonMaterial } = {};

  /* nền nhà */
  add(root, RB(W + .5, .35, D + .5, .06), T("#B98450"), 0, -.175, 0);
  const fm = sel("rug", T("#fff", { map: (FLOOR[R.floor] || FLOOR.check)() }));
  const floor = add(root, new THREE.PlaneGeometry(W, D), fm, 0, .002, 0, { cast: false, ol: null }); floor.rotation.x = -Math.PI / 2;

  /* tường */
  const wstyle = (WALL[ev ? "party" : R.wall] || WALL.pink)();
  function wall(len: number, nx: number, nz: number, x: number, z: number, ry: number, gap?: [number, number]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const mats: THREE.Material[] = [];
    const m = sel("wall", T(wstyle.color, { map: wstyle.map.clone(), transparent: true })); (m.map as THREE.Texture).repeat.set(len / W * 10, 1); (m.map as THREE.Texture).needsUpdate = true; mats.push(m); wallMains.push([m, len]);
    const sk = T("#E9B98A", { transparent: true }); mats.push(sk);
    const rl = T("#E9B98A", { transparent: true }); mats.push(rl);
    const segs: [number, number][] = gap ? [[-len / 2, gap[0]], [gap[1], len / 2]] : [[-len / 2, len / 2]];   // chừa lối cửa
    segs.forEach(([a, b]) => { const cx = (a + b) / 2, sw = b - a;
      add(g, RB(sw, HH, .2, .03), m, cx, HH / 2, 0, { ol: null, cast: false }); add(g, RB(sw, .2, .26, .03), sk, cx, .1, 0, { ol: null, cast: false }); add(g, RB(sw, .07, .24, .02), rl, cx, 1.22, 0, { ol: null, cast: false }); });
    if (gap) add(g, RB(gap[1] - gap[0], HH - DOOR_H, .2, .03), m, (gap[0] + gap[1]) / 2, DOOR_H + (HH - DOOR_H) / 2, 0, { ol: null, cast: false });
    const decor = new THREE.Group(); g.add(decor);
    const w = { group: g, decor, nx, nz, mats }; walls.push(w); return w;
  }
  const wN = wall(W, 0, -1, 0, -D / 2 - .1, 0), wW = wall(D, -1, 0, -W / 2 - .1, 0, Math.PI / 2), wS = wall(W, 0, 1, 0, D / 2 + .1, 0, [DOOR_X - DOOR_W / 2, DOOR_X + DOOR_W / 2]), wE = wall(D, 1, 0, W / 2 + .1, 0, Math.PI / 2);
  const wi = (w: typeof wN) => walls.indexOf(w);

  /* cửa sổ + rèm */
  const winGlass = T("#BFE6FF", { emissive: new THREE.Color("#BFE6FF"), emissiveIntensity: .3 });
  const curtainTexOf = (c: string) => c === "1" ? stripes(PKM, "#fff", [4, 1]) : c === "3" ? tex(64, 64, (g, w, h) => { g.fillStyle = "#FFF3C4"; g.fillRect(0, 0, w, h); g.fillStyle = "#F2B84B"; g.beginPath(); g.arc(w / 2, h / 2, 9, 0, 7); g.fill(); }, [3, 4]) : c === "4" ? stripes("#D9CCFF", "#fff", [4, 1]) : c === "2" ? tex(64, 64, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#8FD9B6"; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); }, [2, 3]) : null;
  const curtainBuilds: [THREE.Group, () => void][] = [];
  function windowOn(w: typeof wN, x: number, y = 1.85, ww = 1.5, wh = 1.3) {
    const f = T("#8A5A3A", { transparent: true }); w.mats.push(f);
    const fr = (a: number, b: number, c: number, d: number) => add(w.decor, RB(a, b, .14, .02), f, x + c, d, .09, { ol: "thin" });
    fr(ww + .24, .1, 0, y + wh / 2 + .05); fr(ww + .24, .1, 0, y - wh / 2 - .05); fr(.1, wh, -ww / 2 - .05, y); fr(.1, wh, ww / 2 + .05, y); fr(.06, wh, 0, y);
    add(w.decor, new THREE.PlaneGeometry(ww, wh), winGlass, x, y, .02, { ol: null, cast: false });
    add(w.decor, RB(ww + .1, .1, .22, .03), T("#fff"), x, y - wh / 2 - .14, .16, { ol: "thin" });
    const cg = new THREE.Group(); w.decor.add(cg);
    const bc = () => {
    const curtainTex = curtainTexOf(cur.curtain);
    if (curtainTex) {
      const cm = sel("curtain", T("#fff", { map: curtainTex, side: THREE.DoubleSide }));
      add(cg, CYL(.02, .02, ww + .5, 8), T("#C9905A"), x, y + wh / 2 + .22, .2, { r: [0, 0, Math.PI / 2], ol: null });
      ([-1, 1] as const).forEach(s => add(cg, RB(.45, wh + .45, .05, .02), cm, x + s * (ww / 2 - .1), y - .05, .22, { ol: "thin" }));
    } else add(cg, RB(ww + .6, .1, .75, .03), T(PKM), x, y + wh / 2 + .35, .38, { r: [.38, 0, 0], ol: "thin" });
    }; bc(); curtainBuilds.push([cg, bc]);
  }
  windowOn(wN, -2.0); windowOn(wN, 2.3); windowOn(wW, .3);

  /* đồ treo tường: ảnh / khung đôi / đồng hồ mèo */
  const photoTex = o.photo ? (() => { const t = new THREE.TextureLoader().load(o.photo); t.colorSpace = THREE.SRGBColorSpace; disposables.push(t); return t; })() : null;
  const frameAnchor = new THREE.Object3D(); frameAnchor.position.set(.3, 2.0, .15); wN.decor.add(frameAnchor);
  const wallG = new THREE.Group(); wN.decor.add(wallG);
  const buildWall = () => {
  if (cur.wallItem === "2") {
    add(wallG, CYL(.34, .34, .06, 28), T("#FFF3F6"), .3, 2.0, .1, { r: [Math.PI / 2, 0, 0], ol: "mid" });
    ([-1, 1] as const).forEach(s => add(wallG, CONE(.1, .2, 4), T("#FFE3EA"), .3 + s * .24, 2.38, .1, { r: [0, Math.PI / 4, -s * .3], ol: "thin" }));
    add(wallG, CAPBAR(.02, .22), T(INK), .3, 2.06, .14, { ol: null }); add(wallG, CAPBAR(.02, .16), T(INK), .38, 1.97, .14, { r: [0, 0, 1.2], ol: null });
  } else if (cur.wallItem === "3") {
    ([[-.4, "#FFD1DC"], [.15, "#CFE9FF"], [.7, "#FFE9B8"]] as const).forEach(([dx, c], i) => { add(wallG, RB(.42, .52, .06, .02), T("#fff"), dx, 2.0 + (i === 1 ? .1 : 0), .1, { ol: "thin" }); add(wallG, new THREE.PlaneGeometry(.3, .4), new THREE.MeshBasicMaterial({ color: c }), dx, 2.0 + (i === 1 ? .1 : 0), .14, { ol: null, cast: false }); });
  } else if (cur.wallItem === "4") {
    add(wallG, new THREE.TorusGeometry(.32, .06, 8, 28), T("#7FBF86"), .3, 2.0, .1, { ol: "thin" });
    ["#FF8FAB", "#FFD66B", "#fff", "#C9B8F0", "#FF8FAB", "#FFD66B", "#fff", "#C9B8F0"].forEach((c, i) => { const a = i * Math.PI / 4; add(wallG, SPH(.07, 8, 6), T(c), .3 + Math.cos(a) * .32, 2.0 + Math.sin(a) * .32, .15, { ol: "thin" }); });
  } else if (cur.wallItem === "5") {
    const st = tex(256, 112, (g, w, h) => { g.fillStyle = "#FFF3E4"; g.fillRect(0, 0, w, h); g.fillStyle = "#E0567A"; g.font = "800 62px Nunito, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("OPEN", w / 2, h / 2 + 4); });
    add(wallG, RB(.98, .46, .06, .03), T("#E9A27C"), .3, 2.0, .1, { ol: "mid" });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(.88, .38), new THREE.MeshBasicMaterial({ map: st })); pl.position.set(.3, 2.0, .14); wallG.add(pl);
  } else {
    const gold = cur.wallItem === "1";
    add(wallG, RB(.8, .95, .07, .02), T(gold ? "#E9C46A" : "#fff"), .3, 2.0, .1, { ol: "mid" });
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(.62, .77), photoTex ? new THREE.MeshBasicMaterial({ map: photoTex }) : new THREE.MeshBasicMaterial({ color: gold ? "#FFD1DC" : "#F2E9EC" })); inner.position.set(.3, 2.0, .15); wallG.add(inner);
    if (!photoTex && !gold) add(wallG, new THREE.TorusGeometry(.07, .015, 6, 12), T("#C9B8C0"), .3, 2.0, .16, { ol: null });
    if (gold && !photoTex) add(wallG, SPH(.1, 12, 10), T("#FF6F9B"), .3, 2.0, .17, { s: [1, 1, .3], ol: "thin" });
  }
  }; buildWall();
  const photoHs: Hotspot = { id: "photo", attr: "data-act", value: "photo", label: "Treo ảnh lên tường", obj: frameAnchor, wall: wi(wN), dy: 0 };
  const syncPhoto = () => { const i = hotspots.indexOf(photoHs); if (i >= 0) hotspots.splice(i, 1); if (cur.wallItem === "0" || cur.wallItem === "1") hotspots.push(photoHs); }; syncPhoto();


  /* bảng menu (tường Tây) */
  const menuTex = tex(256, 192, (g, w, h) => { g.fillStyle = "#5E6F5B"; g.fillRect(0, 0, w, h); g.strokeStyle = "#D9A66B"; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
    g.fillStyle = "#fff"; g.font = "800 46px Nunito, system-ui, sans-serif"; g.textAlign = "center"; g.fillText("Menu", w / 2, 82); g.font = "700 28px Nunito, system-ui, sans-serif"; g.fillText(o.menuCount + " món", w / 2, 132); });
  const menuAnchor = new THREE.Object3D(); menuAnchor.position.set(-1.5, 1.95, .12); wW.decor.add(menuAnchor);
  add(wW.decor, RB(1.15, .86, .06, .02), T("#fff", { map: menuTex }), -1.5, 1.95, .1, { ol: "thin" });
  hotspots.push({ id: "menu", attr: "data-act", value: "menu", label: "Xem menu", obj: menuAnchor, wall: wi(wW), dy: 0 });
  // kệ gỗ
  add(wW.decor, RB(.9, .06, .35, .02), T("#B98450"), .8, 1.55, .2, { ol: "thin" });
  [["#FF8FAB", .55], ["#8FD9B6", .8], ["#FFD166", 1.05]].forEach(([c, x]) => { add(wW.decor, CYL(.09, .09, .22, 14), T(c as string), x as number, 1.69, .22, { ol: "thin" }); });

  /* tranh trên tường Nam và Đông (khi xoay) */
  [wS, wE].forEach(w => ([[-1.2, "#FFD6E0", "#FF8FAB"], [w === wS ? -3.0 : 1.2, "#DDF4E8", "#7BC47F"]] as const).forEach(([x, c1, c2]) => {
    add(w.decor, RB(.7, .9, .06, .02), T("#8A5A3A"), x, 1.9, .1, { ol: "thin" });
    const art = new THREE.Mesh(new THREE.PlaneGeometry(.58, .76), new THREE.MeshBasicMaterial({ map: tex(64, 80, (g, tw, th) => { g.fillStyle = c1; g.fillRect(0, 0, tw, th); g.fillStyle = c2; g.beginPath(); g.arc(tw / 2, th * .44, 20, 0, 7); g.fill(); }) })); art.position.set(x, 1.9, .14); w.decor.add(art);
  }));

  /* quầy + máy tính tiền */
  const [c1, c2] = COUNTER_C[R.counter] || COUNTER_C.pink, cm1 = sel("counter", T(c1)), cm2 = sel("counter", T(c2));
  add(root, RB(5, 1.0, .95, .04), cm1, -.8, .5, -1.9, { ol: "mid" });
  for (let i = 0; i < 5; i++) add(root, RB(.8, .62, .02, .01), cm2, -2.8 + i * 1.0, .5, -1.4, { ol: null });
  counterBits.top = T(R.counter === "mint" ? "#F2FBF6" : "#FFF8F0"); add(root, RB(5.15, .1, 1.1, .03), counterBits.top, -.8, 1.04, -1.9, { ol: "mid" });
  [-2.6, -1.2, .2, 1.4].forEach(x => { add(root, CYL(.26, .24, .1, 22), T("#E8A0B4"), x, .7, -.95, { ol: "thin" }); add(root, CYL(.04, .04, .6, 10), T("#B98450"), x, .38, -.95, { ol: "thin" }); add(root, CYL(.2, .22, .04, 18), T("#B98450"), x, .04, -.95, { ol: "thin" }); });
  add(root, RB(.4, .3, .35, .03), T("#fff"), 1.65, 1.24, -1.85, { ol: "thin" }); add(root, RB(.34, .22, .03, .01), T("#3E5F48"), 1.65, 1.38, -1.7, { ol: null });

  /* tủ kính bánh: tủ đứng sát tường Tây, mặt kính quay ra phòng */
  const caseG = new THREE.Group(); caseG.position.set(-3.35, 0, 2.05); root.add(caseG);
  const wood = counterBits.wood = T(R.counter === "mint" ? "#B6E6CF" : "#E9B98A");
  add(caseG, RB(.06, 1.0, 1.5, .02), T("#FFF3E4", { emissive: new THREE.Color("#FFE9C8"), emissiveIntensity: .55 }), -.45, .55, 0, { ol: "mid" });   // lưng tủ sáng nhẹ để thấy bánh bên trong
  ([-1, 1] as const).forEach(sd => add(caseG, RB(.95, 1.0, .06, .02), wood, 0, .55, sd * .72, { ol: "mid" }));
  add(caseG, RB(1.0, .08, 1.56, .02), wood, 0, 1.08, 0, { ol: "mid" }); add(caseG, RB(1.0, .1, 1.56, .02), wood, 0, .05, 0, { ol: "mid" });
  add(caseG, RB(.04, .9, 1.4, .02), new THREE.MeshBasicMaterial({ color: "#E6F4FF", transparent: true, opacity: .14, depthWrite: false }), .47, .56, 0, { ol: null, cast: false, recv: false });
  add(caseG, RB(.86, .04, 1.4, .02), T("#fff"), 0, .58, 0, { ol: "thin" });
  o.cakes.slice(0, 6).forEach((c, i) => { const k = cake(c[0], c[1], c[2], i < 3 ? .8 : .6); k.position.set(.02, i < 3 ? 1.13 : .1, -.45 + (i % 3) * .45); k.rotation.y = Math.PI / 2; caseG.add(k); });
  const caseAnchor = new THREE.Object3D(); caseAnchor.position.set(.5, .6, 0); caseG.add(caseAnchor);
  hotspots.push({ id: "case", attr: "data-act", value: "cakes", label: "Tủ bánh: xem bánh đang bán", obj: caseAnchor, wall: null, dy: 0 });

  /* hộp quà */
  const gift = new THREE.Group(); gift.position.set(.55, 1.09, -1.55); root.add(gift);
  add(gift, RB(.3, .24, .3, .03), T("#8FD9B6"), 0, .12, 0, { ol: "thin" }); add(gift, RB(.32, .08, .32, .02), T("#8FD9B6"), 0, .26, 0, { ol: "thin" });
  add(gift, RB(.06, .3, .32, .01), T(PKM), 0, .14, 0, { ol: null }); add(gift, RB(.32, .3, .06, .01), T(PKM), 0, .14, 0, { ol: null });
  if (o.giftDot) add(gift, SPH(.07, 10, 8), T("#FF4F7A", { emissive: new THREE.Color("#FF4F7A"), emissiveIntensity: .5 }), .16, .38, .16, { ol: "thin" });
  ups.push(t => { gift.position.y = 1.09 + Math.sin(t * 2.4) * .02; });
  hotspots.push({ id: "gift", attr: "data-go", value: "/cua-hang/qua-tang", label: "Quà tặng", obj: gift, wall: null, dy: .25 });

  /* thú cưng + chủ tiệm */
  const petMeta: [PetKind, number, string][] = [["dog", -2.9, "dog"], ["gold", -1.6, "gold"], ["white", -.3, "white"]];
  const petObjs = new Map<string, { g: THREE.Group; t: number }>();
  petMeta.forEach(([k, x, id]) => {
    add(root, CYL(.45, .5, .6, 22), T(PKM), x, .3, -2.5, { ol: "mid" });
    const m = pet(k); m.group.position.set(x, .6, -2.5); m.group.scale.setScalar(PET_S); root.add(m.group); ups.push(m.update); petObjs.set(id, { g: m.group, t: -9 });
    hotspots.push({ id: "pet-" + id, attr: "data-pet", value: id, label: "Vuốt ve " + id, obj: m.group, wall: null, dy: 1.15 });
  });
  const me = person(o.me.look, o.me.sprite, "stand"); me.group.position.set(1.0, .5, -2.55); me.group.scale.setScalar(1.2); root.add(me.group); ups.push(me.update);
  add(root, CYL(.4, .44, .5, 22), T("#B98450"), 1.0, .25, -2.65, { ol: "mid" });

  /* bàn, ghế, khách, bánh trên bàn */
  const tableC = R.floor === "wood" ? "#C98E5A" : "#E9B98A", topC = R.counter === "mint" ? "#E4F6EC" : "#fff";
  function table(x: number, z: number, seats: [string, number][]) {
    const tt = T(topC), tl = T(tableC); tableTops.push(tt); tableLegs.push(tl);
    add(root, CYL(.64, .64, .09, 36), tt, x, .78, z, { ol: "mid" }); add(root, CYL(.08, .1, .72, 14), tl, x, .38, z, { ol: "thin" }); add(root, CYL(.34, .38, .05, 26), tl, x, .03, z, { ol: "thin" });
    return seats.map(([c, a]) => { const cx = x + Math.sin(a), cz = z + Math.cos(a), ch = new THREE.Group(); ch.position.set(cx, 0, cz); ch.rotation.y = a + Math.PI; root.add(ch);
      add(ch, RB(.46, .09, .46, .04), T(c), 0, .5, 0, { ol: "thin" }); add(ch, RB(.46, .5, .07, .03), T("#B98450"), 0, .8, -.2, { ol: "thin" });
      ([[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]] as const).forEach(([dx, dz]) => add(ch, CYL(.03, .03, .46, 8), T("#B98450"), dx, .23, dz, { ol: null })); return { x: cx, z: cz, a: a + Math.PI }; });
  }
  /* số ghế theo số bàn người chơi có (3..6): thêm dần ghế ở hai bàn */
  const CH1: [string, number][] = [["#7FC8D6", 2.4], ["#E8A0B4", -2.4], ["#7FC8D6", .1]], CH2: [string, number][] = [["#7FC8D6", .2], ["#E8A0B4", 2.6], ["#7FC8D6", -2.3]];
  const nSeat = Math.max(3, Math.min(6, o.seats)), n1 = Math.min(3, Math.floor(nSeat / 2)), n2 = Math.min(3, nSeat - n1);
  const s1 = table(-1.8, 1.0, CH1.slice(0, n1)), s2 = table(2.2, 1.5, CH2.slice(0, n2));
  place(cake(0, 0, 0, 1), -1.8, .83, 1.0); place(cake(1, 2, 1, 1), 2.2, .83, 1.5);
  /* khách ra vào: mỗi chỗ ngồi tự chạy vòng ngồi → đứng dậy → ra cửa → vắng → khách khác vào → ngồi xuống */
  const POOL: { sprite: string; look: PersonLook }[] = [
    { sprite: "g4", look: { skin: "#FFE3D0", hair: "#3B2A26", coat: "#2F6F86", shirt: "#F2E6D0", eye: "#5FA6C9" } },
    { sprite: "b1", look: { skin: "#F3C39A", hair: "#6B4A3A", coat: "#8A3D55", shirt: "#F2E6D0", eye: "#5FA6C9" } },
    { sprite: "g6", look: { skin: "#FFE9DA", hair: "#8C6BB5", coat: "#4A4F5C", shirt: "#C9962E", eye: "#7A5A3E" } },
    { sprite: "b5", look: { skin: "#FFE3D0", hair: "#3B2A26", coat: "#6A4C93", shirt: "#F29AB2", eye: "#4F9A6B" } },
    { sprite: "g1", look: { skin: "#F3C39A", hair: "#C98B5A", coat: "#3D7A55", shirt: "#F2E6D0", eye: "#5FA6C9" } },
    { sprite: "b4", look: { skin: "#FFE9DA", hair: "#E7B872", coat: "#2E4A7A", shirt: "#C9962E", eye: "#7A5A3E" } },
    ...["n1", "n2", "n3", "n4", "n5", "m1", "m2", "k4", "k5", "k6", "k7", "k8", "k9", "k10", "k11"].map(sprite => ({ sprite, look: { skin: "#FFE9DA", hair: "#3B2A26", coat: "#444", shirt: "#fff", eye: "#5FA6C9" } }))   // khách 3D làm sẵn (giữ nguyên trang phục)
  ];
  const fwd = (st: { x: number; z: number; a: number }, f: number) => new THREE.Vector2(st.x + Math.sin(st.a) * f, st.z + Math.cos(st.a) * f);
  const STREET = [new THREE.Vector2(DOOR_X, 4.8), new THREE.Vector2(-1.3, 4.95)];           // vỉa hè bên trái cửa (bên phải có cây và biển menu)
  const TK = new URLSearchParams(location.search).has("fast") ? .12 : 1;   // ?fast=1: rút ngắn thời gian chờ để thử
  interface Slot { st: { x: number; z: number; a: number }; actor: Actor; phase: "seated" | "getup" | "out" | "away" | "in" | "sitdown"; next: number; path: THREE.Vector2[]; pi: number; n: number; pending?: { actor: Actor; ok: boolean } }
  const slots: Slot[] = ([s1[0], s2[0]] as const).slice(0, o.guests).map((st, i) => {
    const gl = o.guestLooks[i % Math.max(1, o.guestLooks.length)];
    const actor = personActor(gl.look, gl.sprite); actor.mode("sit"); actor.snap(); place(actor.group, st.x, 0, st.z, st.a);
    return { st, actor, phase: "seated" as const, next: (14 + i * 11 + Math.random() * 10) * TK, path: [], pi: 0, n: i };
  });
  /** dựng sẵn khách kế tiếp (ẩn) trong lúc chỗ này vắng: tải model, dựng xương, biên dịch vật liệu xong rồi mới cho vào, khỏi khựng khi khách xuất hiện */
  const prepare = (sl: Slot) => {
    const gl = POOL[((sl.n + 1) * 5 + Math.floor(Math.random() * POOL.length)) % POOL.length]!;
    const actor = personActor(gl.look, gl.sprite); actor.mode("walk"); const a = actor.group; a.position.set(STREET[1].x, 0, STREET[1].y); a.rotation.y = Math.PI / 2; a.visible = false; root.add(a);
    const p = { actor, ok: false }; sl.pending = p;
    void actor.ready.then(() => { try { r.compile(scene, cam); } catch { /* bỏ qua: sẽ biên dịch lúc hiện */ } p.ok = true; });
  };
  const SPEED = 1.25;
  let lastT = -1;
  const advance = (sl: Slot, dt: number): boolean => {                                     // đi dọc đường, trả true khi tới cuối
    const g = sl.actor.group, p = g.position, tgt = sl.path[sl.pi]; if (!tgt) return true;
    const dx = tgt.x - p.x, dz = tgt.y - p.z, d = Math.hypot(dx, dz), stp = SPEED * dt;
    if (d <= stp) { p.x = tgt.x; p.z = tgt.y; sl.pi++; return sl.pi >= sl.path.length; }
    p.x += dx / d * stp; p.z += dz / d * stp; let dr = Math.atan2(dx, dz) - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); g.rotation.y += dr * Math.min(1, dt * 10); return false;
  };
  ups.push(t => {
    const dt = lastT < 0 ? 0 : Math.min(t - lastT, .25); lastT = t; let nearDoor = false;   // máy chậm thì bước dài hơn thay vì đi quay chậm
    slots.forEach(sl => {
      sl.actor.update(t); const g = sl.actor.group, walking = sl.phase === "out" || sl.phase === "in";
      if (sl.phase === "seated" && t > sl.next) { sl.actor.mode("getup"); sl.phase = "getup"; }
      else if (sl.phase === "getup" && sl.actor.done()) {
        const f = fwd(sl.st, APPROACH); g.position.set(f.x, 0, f.y); sl.actor.mode("walk"); sl.phase = "out";
        sl.path = [new THREE.Vector2(DOOR_X, 2.4), new THREE.Vector2(DOOR_X, 3.9), ...STREET]; sl.pi = 0;
      } else if (sl.phase === "out" && advance(sl, dt)) { g.visible = false; sl.phase = "away"; sl.next = t + (6 + Math.random() * 8) * TK; prepare(sl); }
      else if (sl.phase === "away" && t > sl.next && sl.pending?.ok) {
        root.remove(g); sl.actor.dispose(); sl.n++; sl.actor = sl.pending.actor; sl.pending = undefined; sl.actor.group.visible = true;
        sl.path = [STREET[0], new THREE.Vector2(DOOR_X, 3.9), new THREE.Vector2(DOOR_X, 2.4), fwd(sl.st, APPROACH)]; sl.pi = 0; sl.phase = "in";
      } else if (sl.phase === "in" && advance(sl, dt)) { g.position.set(sl.st.x, 0, sl.st.z); g.rotation.y = sl.st.a; sl.actor.mode("sit"); sl.phase = "sitdown"; }
      else if (sl.phase === "sitdown" && sl.actor.done()) { sl.phase = "seated"; sl.next = t + (26 + Math.random() * 30) * TK; }
      if (walking) { g.visible = exterior || g.position.z < 3.4; if (g.position.z > 2.6 && g.position.z < 4.4 && Math.abs(g.position.x - DOOR_X) < 1.1) nearDoor = true; }
    });
    doorOpen += ((nearDoor ? 1 : 0) - doorOpen) * Math.min(1, dt * 5); doorPivot.rotation.y = -1.45 * doorOpen;   // mở ra phía ngoài
  });
  let doorOpen = 0;

  /* bóng tiếp đất cho đồ vật để không bị "dán" lên sàn */
  const blob = (x: number, z: number, rx: number, rz = rx, a = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), new THREE.MeshBasicMaterial({ map: blobMap(), transparent: true, opacity: a, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, .014, z); root.add(m); };
  blob(-.8, -1.55, 2.9, .85, .8); blob(-1.8, 1.0, 1.1, 1.1); blob(2.2, 1.5, 1.1, 1.1); blob(-3.3, 2.05, .85, 1.1);
  [s1[0], s1[1], s2[0], s2[1], s2[2]].forEach(st => blob(st.x, st.z, .4)); [-2.6, -1.2, .2, 1.4].forEach(x => blob(x, -.95, .38, .38, .7));

  /* thảm */
  const rugG = new THREE.Group(); root.add(rugG);
  const buildRug2 = () => {
    const flat2 = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => { const m = add(rugG, geo, mat, .3, y, .95, { cast: false, ol: null }); m.rotation.x = -Math.PI / 2; return m; };
    if (cur.rug === "3") flat2(new THREE.PlaneGeometry(2.6, 1.7), sel("rug", T("#fff", { map: tex(64, 64, (g, w, h) => { g.fillStyle = "#FFF1D6"; g.fillRect(0, 0, w, h); g.fillStyle = "#FFC9A0"; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); }, [5, 3]) })), .012);
    else if (cur.rug === "5") flat2(new THREE.PlaneGeometry(2.6, 1.7), sel("rug", T("#fff", { map: stripes("#CFE9FF", "#fff", [8, 1]) })), .012);
    else {
      const sh = new THREE.Shape(); sh.moveTo(0, .35); sh.bezierCurveTo(0, .85, -.85, .95, -.85, .3); sh.bezierCurveTo(-.85, -.2, -.25, -.5, 0, -.95); sh.bezierCurveTo(.25, -.5, .85, -.2, .85, .3); sh.bezierCurveTo(.85, .95, 0, .85, 0, .35);
      const g1 = new THREE.ShapeGeometry(sh); g1.scale(1.45, 1.2, 1); flat2(g1, sel("rug", T(PKM)), .012);
      const g2 = new THREE.ShapeGeometry(sh); g2.scale(1.05, .86, 1); flat2(g2, sel("rug", T("#FFE3EA")), .016);
    }
  };
  const buildRug = () => {
  if (cur.rug === "3" || cur.rug === "4" || cur.rug === "5") buildRug2();
  else if (cur.rug !== "0") {
    const rt = cur.rug === "2" ? tex(256, 256, (g, w) => { g.fillStyle = "#FF8FAB"; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.fill(); g.fillStyle = "#FFF1A8"; for (let i = 0; i < 40; i++) { const a = i * 2.4, rr = (i % 7) * 15 + 10; g.beginPath(); g.arc(w / 2 + Math.cos(a) * rr, w / 2 + Math.sin(a) * rr, 3.5, 0, 7); g.fill(); } })
      : tex(256, 256, (g, w) => { const rr = w / 2; ([["#FFD1DC", 1], ["#fff", .86], ["#FFD1DC", .8], ["#fff", .38], ["#FFD1DC", .32]] as const).forEach(([c, k]) => { g.fillStyle = c; g.beginPath(); g.arc(rr, rr, rr * k, 0, 7); g.fill(); }); });
    const rg = add(rugG, new THREE.CircleGeometry(1.5, 48), sel("rug", T("#fff", { map: rt, transparent: true })), .3, .012, .95, { cast: false, ol: null }); rg.rotation.x = -Math.PI / 2; rg.scale.y = .75;
  } };
  buildRug();

  /* cây */
  const plantG = new THREE.Group(); root.add(plantG);
  const plantAt = (x: number, z: number, s: number) => {
    const p = cur.plant; if (p === "0") return;
    add(plantG, CYL(.24 * s, .18 * s, .42 * s, 16), T(p === "2" ? "#fff" : p === "4" ? "#FFF3F6" : "#E9A27C"), x, .21 * s, z, { ol: "mid" });
    const ball = (dx: number, dy: number, dz: number, rr: number, c: string, k: [number, number, number]) => add(plantG, SPH(rr * s, 14, 12), T(c), x + dx * s, dy * s, z + dz * s, { s: k, ol: "thin" });
    if (p === "1") [[0, .5, 0, .22], [.18, .5, .06, .16], [-.17, .52, -.04, .15], [0, .62, 0, .14]].forEach(([dx, dy, dz, rr]) => ball(dx!, dy!, dz!, rr!, "#9FD18A", [1, .7, 1]));
    else if (p === "2") [[0, .75, 0, .32], [.2, 1.0, .05, .26], [-.19, .95, -.06, .24], [.02, 1.2, .02, .2]].forEach(([dx, dy, dz, rr]) => ball(dx!, dy!, dz!, rr!, "#6FB27A", [1.2, .8, 1]));
    else if (p === "3") {
      add(plantG, CAP(.15 * s, .6 * s), T("#7FBF86"), x, .85 * s, z, { ol: "thin" });
      ([-1, 1] as const).forEach(d => { add(plantG, CAP(.07 * s, .2 * s), T("#7FBF86"), x + d * .22 * s, .88 * s, z, { r: [0, 0, -d * 1.2], ol: "thin" }); add(plantG, CAP(.07 * s, .22 * s), T("#7FBF86"), x + d * .3 * s, 1.02 * s, z, { ol: "thin" }); });
      ball(0, 1.28, 0, .07, "#FF8FAB", [1, 1, 1]);
    } else if (p === "4") {
      [[-.12, .95, "#FF8FAB"], [.1, 1.05, "#FFD66B"], [0, .85, "#C9B8F0"], [.18, .8, "#FF6F9B"], [-.2, .78, "#fff"]].forEach(([dx, hy, c], i) => { const top = (hy as number) * s; add(plantG, CYL(.012 * s, .012 * s, top - .3 * s, 5), T("#6FB27A"), x + (dx as number) * s, (top + .3 * s) / 2, z + (i % 2 ? .05 : -.05) * s, { ol: null }); add(plantG, SPH(.09 * s, 10, 8), T(c as string), x + (dx as number) * s, top, z + (i % 2 ? .05 : -.05) * s, { s: [1, 1.3, 1], ol: "thin" }); });
      ball(0, .5, 0, .2, "#9FD18A", [1.1, .5, 1.1]);
    } else {
      add(plantG, CYL(.04 * s, .06 * s, 1.0 * s, 8), T("#A9784F"), x, .9 * s, z, { ol: "thin" });
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; add(plantG, SPH(.3 * s, 12, 8), T("#6FB27A"), x + Math.cos(a) * .3 * s, 1.45 * s, z + Math.sin(a) * .3 * s, { s: [1, .22, .42], r: [0, -a, -.35], ol: "thin" }); }
    }
  };
  const buildPlants = () => { plantAt(3.3, 2.3, 1.2); plantAt(-3.5, 2.5, .9); }; buildPlants();

  /* đèn */
  const lamps: { pl: THREE.PointLight; bulb: THREE.Mesh }[] = [];
  const lampG = new THREE.Group(); root.add(lampG);
  const pendant = (x: number, z: number, kind: string) => {
    const cloud = kind === "1";
    add(lampG, CYL(.012, .012, .9, 6), T(INK), x, 2.72, z, { ol: null, cast: false });
    const col = cloud ? "#FFFCEC" : "#FFB6C8";
    const bulbMat = new THREE.MeshStandardMaterial({ color: "#FFF1CC", emissive: new THREE.Color("#FFD27A"), emissiveIntensity: 0 });
    if (kind === "3") { add(lampG, SPH(.22, 16, 12), T("#FF7A59"), x, 2.12, z, { s: [1, 1.25, 1], ol: "thin", cast: false }); add(lampG, CYL(.1, .1, .05, 10), T("#E9C46A"), x, 2.42, z, { ol: null, cast: false }); add(lampG, CYL(.1, .1, .05, 10), T("#E9C46A"), x, 1.82, z, { ol: null, cast: false }); }
    else if (kind === "4") add(lampG, CONE(.22, .2, 16), T("#3F4452"), x, 2.28, z, { ol: "thin", cast: false });
    else if (cloud) { [[0, 0], [.18, .06], [-.17, .05]].forEach(([dx, dy]) => add(lampG, SPH(.2, 14, 10), T(col), x + dx, 2.18 + dy, z, { ol: "thin", cast: false })); } else add(lampG, new THREE.SphereGeometry(.3, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), T(col, { side: THREE.DoubleSide }), x, 2.1, z, { ol: "thin", cast: false });
    const bulb = add(lampG, SPH(.1, 12, 10), bulbMat, x, 2.1, z, { ol: null, cast: false });
    const pl = new THREE.PointLight("#FFD27A", 0, 6.5, 1.5); pl.position.set(x, 2.0, z); lampG.add(pl); lamps.push({ pl, bulb });
  };
  const bulbsStr: THREE.Mesh[] = [];
  const buildLamps = () => {
  const lk = cur.lamp === "1" || cur.lamp === "3" || cur.lamp === "4" ? cur.lamp : "0";
  pendant(-1.8, 1.0, lk); pendant(2.2, 1.5, lk); pendant(-.8, -1.0, lk);
  if (cur.lamp === "2" || ev) {
    const pts: THREE.Vector3[] = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(-3.8 + t * 7.6, 2.95 - Math.sin(t * Math.PI) * .35, -2.8)); }
    lampG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .008, 4), new THREE.MeshBasicMaterial({ color: INK })));
    pts.filter((_, i) => i % 3 === 1).forEach((p, i) => { const b = new THREE.Mesh(SPH(.06, 10, 8), new THREE.MeshBasicMaterial({ color: ev ? ["#FF8FAB", "#FFD66B", "#8FD9B6", "#C9B8F0"][i % 4] : "#FFE680" })); b.position.copy(p).add(new THREE.Vector3(0, -.06, 0)); lampG.add(b); bulbsStr.push(b); });
  }
  }; buildLamps();
  const swapLamps = () => { lamps.length = 0; bulbsStr.length = 0; purge(lampG); buildLamps(); };
  if (ev) {                                                                      // ngày đặc biệt: bóng bay
    [["#FF8FAB", -3.5, -2.3], ["#FFD66B", -3.2, -2.5], ["#8FD9B6", 3.5, -2.4]].forEach(([c, x, z]) => { add(root, CYL(.005, .005, 1, 4), T(INK), x as number, 1.5, z as number, { ol: null }); add(root, SPH(.3, 16, 12), T(c as string), x as number, 2.2, z as number, { s: [1, 1.15, 1], ol: "thin" }); });
  }

  /* ---------- phía ngoài tiệm: mặt tiền, biển hiệu, vỉa hè, đường, cây (chỉ hiện khi xem ngoài) ---------- */
  const outside = new THREE.Group(); outside.visible = false; root.add(outside);
  const extGlass: THREE.MeshToonMaterial[] = [], neon: THREE.MeshBasicMaterial[] = [];
  const z0 = D / 2 + .2, x0 = W / 2 + .2;
  const streetPl = new THREE.PointLight("#FFD27A", 0, 8, 1.5); streetPl.position.set(-4.9, 3.1, z0 + 1.7); outside.add(streetPl);
  const lampBulb = new THREE.MeshStandardMaterial({ color: "#FFF1CC", emissive: new THREE.Color("#FFD27A"), emissiveIntensity: 0 });
  // cửa chính: khung + cánh cửa quay quanh bản lề; mở khi có người đi qua
  const doorPivot = new THREE.Group(); doorPivot.position.set(DOOR_X - DOOR_W / 2 + .03, 0, 0); wS.group.add(doorPivot);
  { const lw = DOOR_W - .06, wood = T("#8A5A3A", { transparent: true }), frame = T("#6E4529", { transparent: true });
    wS.mats.push(wood, frame);
    ([-1, 1] as const).forEach(sd => add(wS.group, RB(.1, DOOR_H, .26, .02), frame, DOOR_X + sd * (DOOR_W / 2 + .02), DOOR_H / 2, 0, { ol: null })); add(wS.group, RB(DOOR_W + .14, .1, .26, .02), frame, DOOR_X, DOOR_H + .02, 0, { ol: null });
    add(doorPivot, RB(lw, DOOR_H - .05, .08, .02), wood, lw / 2, (DOOR_H - .05) / 2, 0, { ol: null });
    const gm = T("#BFE6FF", { emissive: new THREE.Color("#BFE6FF"), emissiveIntensity: .3, transparent: true }); extGlass.push(gm); wS.mats.push(gm);
    add(doorPivot, RB(lw - .35, 1.45, .05, .02), gm, lw / 2, 1.45, .03, { ol: null });
    const kn = T("#E9C46A", { transparent: true }); wS.mats.push(kn); add(doorPivot, CYL(.04, .04, .36, 8), kn, lw - .16, 1.05, .08, { ol: null });
    const board = T("#fff", { transparent: true }); wS.mats.push(board); add(doorPivot, RB(.6, .22, .03, .02), board, lw / 2, 2.05, .06, { ol: null });
    const openSign = new THREE.MeshBasicMaterial({ map: tex(128, 48, (g, w, h) => { g.fillStyle = "#FFE3EA"; g.fillRect(0, 0, w, h); g.fillStyle = "#E0567A"; g.font = "800 30px Nunito, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("OPEN", w / 2, h / 2 + 2); }), transparent: true }); neon.push(openSign); wS.mats.push(openSign);
    const os = new THREE.Mesh(new THREE.PlaneGeometry(.5, .19), openSign); os.position.set(lw / 2, 2.05, .08); doorPivot.add(os);
    // thảm chùi chân trước cửa
    add(outside, RB(1.2, .04, .7, .02), T("#B98450"), DOOR_X, -.32, z0 + .7, { ol: null }); }
  /* mặt tiền, vỉa hè, đường, cây... chỉ dựng khi bấm xem ngoài tiệm (cảnh trong tiệm dựng nhanh hơn) */
  let outsideBuilt = false;
  function buildOutside() {
    if (outsideBuilt) return; outsideBuilt = true;
    const road = { z: D / 2 + 4.3 };
    const gnd = add(outside, new THREE.PlaneGeometry(70, 60), T("#BFD8A6"), 0, -.352, 0, { cast: false, ol: null }); gnd.rotation.x = -Math.PI / 2;
    const walk = add(outside, new THREE.PlaneGeometry(16, 8.6), T("#fff", { map: tex(64, 64, (g, w, h) => { g.fillStyle = "#EAE5DD"; g.fillRect(0, 0, w, h); g.strokeStyle = "#D8D1C6"; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }, [16, 8]) }), 0, -.34, D / 2 + 1.4, { cast: false, ol: null }); walk.rotation.x = -Math.PI / 2;
    const rd = add(outside, new THREE.PlaneGeometry(70, 3.4), T("#7E8088"), 0, -.335, road.z, { cast: false, ol: null }); rd.rotation.x = -Math.PI / 2;
    for (let i = -6; i <= 6; i++) { const dsh = add(outside, new THREE.PlaneGeometry(.9, .14), T("#FFF1A8"), i * 2.2, -.33, road.z, { cast: false, ol: null }); dsh.rotation.x = -Math.PI / 2; }
    // mái nhà
    add(outside, RB(W + .6, .28, D + .6, .05), T(R.wall === "mint" ? "#CDEBDD" : PKM), 0, HH + .14, 0, { ol: "mid" });
    add(outside, RB(W + .3, .18, D + .3, .04), T("#fff"), 0, HH + .37, 0, { ol: "thin" });
    add(outside, RB(1.0, .5, .8, .04), T("#DDEBF2"), -2.2, HH + .7, -1.2, { ol: "thin" });                          // máy lạnh trên mái
    // biển hiệu
    const signTex = (() => { const c = document.createElement("canvas"); c.width = 768; c.height = 160; const g = c.getContext("2d")!;
      g.fillStyle = PKM; g.beginPath(); g.roundRect(6, 6, 756, 148, 40); g.fill(); g.lineWidth = 8; g.strokeStyle = "#fff"; g.stroke();
      const t = "Tiệm Bánh " + o.shopName; let fs = 76; g.font = `800 ${fs}px Nunito, system-ui, sans-serif`; while (g.measureText(t).width > 680 && fs > 30) { fs -= 4; g.font = `800 ${fs}px Nunito, system-ui, sans-serif`; }
      g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 12; g.strokeStyle = PKD; g.strokeText(t, 384, 84); g.fillStyle = "#fff"; g.fillText(t, 384, 84);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx; })();
    add(outside, RB(3.1, .66, .12, .04), T(PKD), 0, 2.88, z0 + .06, { ol: "thin" });
    { const sm = new THREE.MeshBasicMaterial({ map: signTex, transparent: true }); neon.push(sm); const sp = new THREE.Mesh(new THREE.PlaneGeometry(2.95, .6), sm); sp.position.set(0, 2.88, z0 + .13); outside.add(sp); }
    // mái hiên sọc
    const awnMat = T("#fff", { map: stripes(PK, "#fff", [9, 1]) });
    add(outside, RB(7.4, .1, 1.1, .03), awnMat, 0, 2.38, z0 + .55, { r: [.38, 0, 0], ol: "thin" });
    // cửa sổ trưng bày + hộp hoa
    const extWin = (x: number, y: number, z: number, ry: number, w2: number, h2: number, flowers: boolean) => {
      const gp = new THREE.Group(); gp.position.set(x, y, z); gp.rotation.y = ry; outside.add(gp);
      const gm = T("#BFE6FF", { emissive: new THREE.Color("#BFE6FF"), emissiveIntensity: .3 }); extGlass.push(gm);
      add(gp, RB(w2 + .24, h2 + .24, .1, .03), T("#8A5A3A"), 0, 0, .04, { ol: "thin" }); add(gp, RB(w2, h2, .05, .02), gm, 0, 0, .1, { ol: null });
      add(gp, RB(.06, h2, .06, .01), T("#8A5A3A"), 0, 0, .13, { ol: null });
      if (flowers) { add(gp, RB(w2 + .2, .22, .3, .03), T("#E9A27C"), 0, -h2 / 2 - .22, .2, { ol: "thin" }); for (let i = 0; i < 7; i++) add(gp, SPH(.09, 8, 6), T(["#FF8FAB", "#FFD66B", "#fff", "#C9B8F0"][i % 4]), -w2 / 2 + .1 + i * (w2 / 6.4), -h2 / 2 - .06, .22, { ol: "thin", cast: false }); }
    };
    extWin(-2.2, 1.45, z0, 0, 2.6, 1.5, true);
    extWin(x0, 1.45, -1.3, Math.PI / 2, 1.8, 1.4, true); extWin(x0, 1.45, 1.4, Math.PI / 2, 1.8, 1.4, true);
    extWin(-1.6, 1.45, -D / 2 - .2, Math.PI, 2.2, 1.4, false); extWin(2.0, 1.45, -D / 2 - .2, Math.PI, 2.2, 1.4, false);
    extWin(-W / 2 - .2, 1.45, -1.0, -Math.PI / 2, 1.8, 1.4, false); extWin(-W / 2 - .2, 1.45, 1.6, -Math.PI / 2, 1.8, 1.4, false);
    // tấm bảng menu đứng, thảm chùi chân, chậu cây
    add(outside, RB(.9, 1.1, .08, .02), T("#5E6F5B"), 3.2, .62, z0 + 1.1, { r: [-.12, .3, 0], ol: "mid" }); add(outside, RB(.78, .98, .03, .01), T("#fff", { map: menuTex }), 3.2, .62, z0 + 1.15, { r: [-.12, .3, 0], ol: null });
    [[.3, "#7BC47F"], [2.4, "#6FB27A"]].forEach(([x, c]) => { add(outside, CYL(.26, .2, .5, 16), T("#E9A27C"), x as number, -.1, z0 + .55, { ol: "mid" }); [[0, .45, 0, .3], [.15, .7, .05, .22], [-.14, .65, -.04, .2]].forEach(([dx, dy, dz, rr]) => add(outside, SPH(rr, 12, 10), T(c as string), (x as number) + dx, dy - .15, z0 + .55 + dz, { ol: "thin" })); });
    // đèn đường, cây, ghế đá, thùng rác
    add(outside, CYL(.06, .09, 3.3, 10), T("#4A4F5C"), -4.9, 1.3, z0 + 1.7, { ol: "thin" }); add(outside, SPH(.2, 12, 10), lampBulb, -4.9, 3.05, z0 + 1.7, { ol: "thin", cast: false });
    add(outside, CYL(.4, .45, .12, 14), T("#4A4F5C"), -4.9, -.28, z0 + 1.7, { ol: "thin" });
    const tree = (x: number, z: number, sc: number) => { add(outside, CYL(.13 * sc, .18 * sc, 1.3 * sc, 10), T("#9A6A45"), x, .3 * sc, z, { ol: "mid" }); [[0, 1.5, 0, .75], [.5, 1.2, .1, .55], [-.5, 1.25, -.1, .55], [0, 2.0, 0, .5]].forEach(([dx, dy, dz, rr]) => add(outside, SPH(rr * sc, 14, 12), T("#8FD18A"), x + dx * sc, dy * sc - .1, z + dz * sc, { ol: "thin" })); };
    tree(5.6, z0 + 1.4, 1.1); tree(-5.4, -2.5, 1.0); tree(6.2, -1.5, 1.2);
    add(outside, RB(1.4, .1, .5, .03), T("#C9966A"), -2.6, .35, z0 + 2.4, { ol: "thin" }); add(outside, RB(1.4, .5, .08, .03), T("#C9966A"), -2.6, .62, z0 + 2.62, { ol: "thin" }); [-.55, .55].forEach(dx => add(outside, RB(.08, .4, .4, .02), T("#4A4F5C"), -2.6 + dx, .12, z0 + 2.4, { ol: null }));
    add(outside, CYL(.2, .17, .5, 12), T("#9FB8C9"), 4.5, -.08, z0 + 2.2, { ol: "thin" });
    // vài bụi cây thấp quanh nhà
    [[-3.6, z0 + .35], [3.7, z0 + .35], [x0 + .45, 3.0], [x0 + .45, -2.6]].forEach(([x, z]) => [0, 1, 2].forEach(i => add(outside, SPH(.28, 10, 8), T("#7BC47F"), (x as number) + i * .32 - .3, -.1, z as number, { ol: "thin" })));
    setHour(skyState.h);                                // áp lại giờ hiện tại cho kính, đèn mới dựng
  }
  let exterior = false;

  /* ---------- ánh sáng + giờ ---------- */
  const hemi = new THREE.HemisphereLight("#fff2e0", "#c9a37a", .9); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff", 2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = .5; sc.far = 40; sun.shadow.bias = -.0005; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  const C = (c: string) => new THREE.Color(c), lerpC = (a: string, b: string, t: number) => C(a).lerp(C(b), t);
  /* bầu trời vẽ bằng canvas: ngày có mặt trời + tia nắng + mây, đêm có trăng + sao */
  const skyCv = document.createElement("canvas"), skyTex = new THREE.CanvasTexture(skyCv); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
  let skyState = { h: 12, n: 0, warm: 0 }, skyAsp = 1;
  const star = (g: CanvasRenderingContext2D, x: number, y: number, rr: number) => { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); };
  function drawSky() {
    const { h, n, warm } = skyState, H = 512, W = Math.round(H * skyAsp); skyCv.width = W; skyCv.height = H;
    const g = skyCv.getContext("2d")!, hex = (c: THREE.Color) => "#" + c.getHexString();
    const top = C("#8FD0FF").lerp(C("#FFB78A"), Math.min(1, warm * 1.4)).lerp(C("#161E4A"), n), bot = C("#FFF4D6").lerp(C("#FFD9A8"), warm).lerp(C("#3A3F7A"), n);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, hex(top)); gr.addColorStop(1, hex(bot)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const night = n > .55, t = Math.max(0, Math.min(1, ((night ? (h < 12 ? h + 24 : h) - 19 : h - 6)) / (night ? 11 : 12)));
    const R = H * .075;
    // ban ngày: mặt trời đi vòng cung; ban đêm: mặt trăng đậu ở góc trên bên trái (vùng trống, không bị căn phòng che) và trôi nhẹ theo giờ
    const bx = night ? W * (.06 + .06 * t) + R * 1.7 : W * (.12 + .76 * t), by = night ? H * (.15 - Math.sin(t * Math.PI) * .04) : H * (.82 - Math.sin(t * Math.PI) * .62);
    if (!night) {
      const gl = g.createRadialGradient(bx, by, R * .5, bx, by, R * 6); gl.addColorStop(0, "rgba(255,240,170,.85)"); gl.addColorStop(1, "rgba(255,240,170,0)"); g.fillStyle = gl; g.fillRect(0, 0, W, H);
      g.save(); g.translate(bx, by); g.strokeStyle = "rgba(255,226,120,.8)"; g.lineWidth = R * .22; g.lineCap = "round";
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * R * 1.4, Math.sin(a) * R * 1.4); g.lineTo(Math.cos(a) * R * (i % 2 ? 1.9 : 2.3), Math.sin(a) * R * (i % 2 ? 1.9 : 2.3)); g.stroke(); }
      g.restore(); g.fillStyle = warm > .3 ? "#FF9A55" : "#FFD84A"; star(g, bx, by, R);
      g.fillStyle = `rgba(255,255,255,${.9 - n * .8})`;
      [[.2, .22, 1], [.62, .14, .8], [.82, .36, 1.1], [.4, .5, .7]].forEach(([cx, cy, k]) => { const x = W * cx, y = H * cy, u = H * .04 * k; [[0, 0, 1.2], [1.2, .3, .9], [-1.2, .3, .9], [.4, -.5, .8]].forEach(([dx, dy, rr]) => star(g, x + dx * u, y + dy * u, rr * u)); });
    } else {
      // sao nhỏ, sắc nét (một vài ngôi to hơn có tia sáng)
      for (let i = 0; i < 70; i++) {
        const x = ((i * 97 + 13) % 101) / 100 * W, y = ((i * 53 + 7) % 83) / 100 * H, big = i % 11 === 0, r = big ? 1.9 : .7 + (i % 3) * .35;
        g.globalAlpha = .45 + ((i * 37) % 6) / 11; g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        if (big) { g.globalAlpha = .5; g.fillRect(x - 5, y - .5, 10, 1); g.fillRect(x - .5, y - 5, 1, 10); }
      }
      g.globalAlpha = 1;
      const gl = g.createRadialGradient(bx, by, R * .5, bx, by, R * 5); gl.addColorStop(0, "rgba(200,215,255,.45)"); gl.addColorStop(1, "rgba(200,215,255,0)"); g.fillStyle = gl; g.fillRect(0, 0, W, H);
      // trăng lưỡi liềm: khoét một vòng tròn khỏi đĩa trăng (không tô màu nền đè lên nên khớp với dải màu bầu trời)
      const mc = document.createElement("canvas"); mc.width = mc.height = Math.ceil(R * 4); const mg = mc.getContext("2d")!;
      mg.fillStyle = "#FFF6D8"; mg.beginPath(); mg.arc(R * 2, R * 2, R * 1.15, 0, 7); mg.fill();
      mg.globalCompositeOperation = "destination-out"; mg.beginPath(); mg.arc(R * 2 + R * .6, R * 2 - R * .25, R * 1.0, 0, 7); mg.fill();
      g.drawImage(mc, bx - R * 2, by - R * 2);
    }
    skyTex.needsUpdate = true;
  }
  function setHour(h: number) {
    const n = (h < 5.5 || h >= 19.5) ? 1 : h < 7 ? 1 - (h - 5.5) / 1.5 : h < 17 ? 0 : (h - 17) / 2.5;
    const warm = Math.max(0, 1 - Math.abs(n - .5) * 2) * (n > 0 && n < 1 ? 1 : 0);
    const t = Math.max(0, Math.min(1, (h - 6) / 12)), ang = t * Math.PI;
    sun.position.set(Math.cos(ang) * -9, Math.sin(ang) * 11 + 3, 7);
    sun.color.copy(n > .55 ? C("#8FA8FF") : lerpC("#FFFFFF", "#FFB070", warm)); sun.intensity = n > .55 ? .5 : 2.4 - n * 1.5;
    hemi.intensity = .95 - n * .5; hemi.color.copy(lerpC("#fff2e0", "#7C8CD6", n)); hemi.groundColor.copy(lerpC("#c9a37a", "#34406e", n));
    skyState = { h, n, warm }; drawSky();
    lamps.forEach(p => { p.pl.intensity = n * 3.4; (p.bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = n * 1.8; });
    streetPl.intensity = n * 6; lampBulb.emissiveIntensity = n * 2.2; extGlass.forEach(m => { m.emissiveIntensity = .3 + n * .8; m.color.copy(lerpC("#BFE6FF", "#2A3A86", n)); m.emissive.copy(lerpC("#BFE6FF", "#FFD27A", n)); });
    winGlass.emissiveIntensity = .3 + n * .55; winGlass.color.copy(lerpC("#BFE6FF", "#2A3A86", n)); winGlass.emissive.copy(lerpC("#BFE6FF", "#FFD27A", n));
  }
  const hq = new URLSearchParams(location.search).get("hour");               // ?hour=21 để thử giờ khác
  setHour(hq !== null ? +hq : new Date().getHours() + new Date().getMinutes() / 60);

  /* ---------- camera xoay 4 góc ---------- */
  let insTop = 0, insBot = 0; const FR = 5.2; const zq = new URLSearchParams(location.search).get("zoom"); let zoom = zq ? +zq : 1, zoomT = zoom, pan = 0, panT = 0, az = Math.PI / 4, azT = az, el = 38 * Math.PI / 180, dragging = false, w = 1, h = 1, raf = 0, last = 0, running = false;
  function layout() {
    const r2 = 26; cam.position.set(Math.sin(az) * Math.cos(el) * r2, Math.sin(el) * r2 + .8, Math.cos(az) * Math.cos(el) * r2); cam.lookAt(0, 1.0 + pan, 0);
    cam.position.y += pan; cam.zoom = zoom;
    if (insTop || insBot) cam.setViewOffset(w, h, 0, (insBot - insTop) / 2, w, h); else cam.clearViewOffset();      // đẩy căn phòng vào giữa vùng không bị lớp phủ che
    cam.updateProjectionMatrix();
    const cx = Math.sin(az), cz = Math.cos(az);
    walls.forEach(wl => { const d = wl.nx * cx + wl.nz * cz, op = exterior ? 1 : Math.max(0, Math.min(1, 1 - d * 2.2)); wl.mats.forEach(m => { const mm = m as THREE.MeshToonMaterial; mm.opacity = op; mm.transparent = true; mm.depthWrite = op > .95; }); wl.decor.visible = !exterior && d < .45; });
  }
  const dom = r.domElement;
  function resize(ww: number, hh: number) { w = ww; h = hh; r.setSize(ww, hh, false); if (Math.abs(ww / hh - skyAsp) > .01) { skyAsp = ww / hh; drawSky(); } const a = ww / hh, hw = Math.max(FR * a, FR * 1.06), hv = hw / a;   // khung dọc (điện thoại): giữ vừa bề ngang căn phòng, thừa chiều dọc cho lớp phủ giao diện
    cam.left = -hw; cam.right = hw; cam.top = hv; cam.bottom = -hv; cam.updateProjectionMatrix(); }
  const pulse = new Map<string, number>();
  let prevFrame = 0, avgGap = 33, adaptN = 0, shadowTick = 0, upMs = 0, drawMs = 0;
  /** máy chậm: hạ độ phân giải để giữ mượt */
  const applyQuality = () => { r.setPixelRatio(quality >= 3 ? .8 : quality >= 2 ? 1 : Math.min(devicePixelRatio, 1.75)); resize(w, h); };
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!dom.isConnected || document.hidden || now - last < 33) return;      // ~30 hình/giây
    const gap = prevFrame ? Math.min(now - prevFrame, 250) : 33; prevFrame = now; avgGap = avgGap * .92 + gap * .08;
    if (++adaptN % 45 === 0 && avgGap > 50 && quality < 3) { quality++; applyQuality(); avgGap = 33; }   // trung bình dưới 20 hình/giây: giảm một nấc
    last = now; const t = now / 1000; const u0 = performance.now();
    ups.forEach(f => f(t));
    petObjs.forEach((p, id) => { const k = pulse.get(id) ?? -9, dt = t - k; p.g.scale.setScalar(PET_S * (dt < .5 ? 1 + Math.sin(dt / .5 * Math.PI) * .12 : 1)); p.g.position.y = .6 + (dt < .5 ? Math.sin(dt / .5 * Math.PI) * .12 : 0); });
    bulbsStr.forEach((b, i) => (b.scale.setScalar(1 + Math.sin(t * 3 + i) * .12)));
    glowMats.forEach(m => { m.emissive.set("#FFD66B"); m.emissiveIntensity = .25 + .2 * Math.sin(t * 4); });
    if (!dragging) az += (azT - az) * .15;
    zoom += (zoomT - zoom) * .2; pan += (panT - pan) * .2;
    r.shadowMap.needsUpdate = shadowTick++ % (quality >= 1 ? 3 : 2) === 0;     // bóng vẽ lại 1/2 (hoặc 1/3 khi máy chậm) số khung
    upMs = upMs * .9 + (performance.now() - u0) * .1; const d0 = performance.now();
    layout(); r.render(scene, cam); drawMs = drawMs * .9 + (performance.now() - d0) * .1;
  }
  if (new URLSearchParams(location.search).get("ext") === "1") { buildOutside(); exterior = true; outside.visible = true; zoomT = zoom = .78; el = 30 * Math.PI / 180; }   // ?ext=1: thử chế độ xem ngoài tiệm
  /* đổi tường / sàn / quầy và nhóm đang nổi bật ngay tại chỗ (màn Trang trí): trả false nếu cần dựng lại cả cảnh */
  function update(nr: Record<string, string>, nhl?: string): boolean {
    const keys = Object.keys({ ...cur, ...nr }).filter(k => (nr[k] ?? cur[k]) !== cur[k]);
    const SOFT = ["wall", "floor", "counter", "curtain", "wallItem", "rug", "plant", "lamp"];
    if (keys.some(k => !SOFT.includes(k))) return false;
    if (keys.includes("wall") && outsideBuilt) return false;
    if (keys.includes("wall") && !ev) { const st = (WALL[nr.wall!] || WALL.pink)(); wallMains.forEach(([m, len]) => { m.map?.dispose(); m.color.set(st.color); m.map = st.map.clone(); m.map.repeat.set(len / W * 10, 1); m.map.needsUpdate = true; m.needsUpdate = true; }); st.map.dispose(); }
    if (keys.includes("floor")) { fm.map?.dispose(); fm.map = (FLOOR[nr.floor!] || FLOOR.check)(); fm.needsUpdate = true; tableLegs.forEach(m => m.color.set(nr.floor === "wood" ? "#C98E5A" : "#E9B98A")); }
    if (keys.includes("counter")) { const [a, b] = COUNTER_C[nr.counter!] || COUNTER_C.pink, mint = nr.counter === "mint"; cm1.color.set(a); cm2.color.set(b); counterBits.top?.color.set(mint ? "#F2FBF6" : "#FFF8F0"); counterBits.wood?.color.set(mint ? "#B6E6CF" : "#E9B98A"); tableTops.forEach(m => m.color.set(mint ? "#E4F6EC" : "#fff")); }
    Object.assign(cur, nr);
    if (keys.includes("curtain")) curtainBuilds.forEach(([g, b]) => { purge(g); b(); });
    if (keys.includes("wallItem")) { purge(wallG); buildWall(); syncPhoto(); }
    if (keys.includes("rug")) { purge(rugG); buildRug(); }
    if (keys.includes("plant")) { purge(plantG); buildPlants(); }
    if (keys.includes("lamp")) { swapLamps(); setHour(skyState.h); }
    if (nhl !== undefined && nhl !== curHl) { glowMats.forEach(m => { m.emissive.set("#000000"); m.emissiveIntensity = 0; }); glowMats.length = 0; curHl = nhl; (selAll[nhl] || []).forEach(m => glowMats.push(m)); }
    return true;
  }
  /* gộp nội thất tĩnh để giảm số lần vẽ; nhóm còn chuyển động hoặc dựng lại thì bỏ qua */
  if (!new URLSearchParams(location.search).has("nomerge")) {
    const skip = new Set<THREE.Object3D>([lampG, plantG, rugG, outside, gift, me.group, ...walls.map(w2 => w2.group), ...bulbsStr, ...slots.map(sl => sl.actor.group), ...[...petObjs.values()].map(p => p.g), ...hotspots.map(hs => hs.obj)]);
    const protect = new Set<THREE.Material>([...glowMats, ...Object.values(selAll).flat(), ...wallMains.map(x => x[0]), ...tableTops, ...tableLegs, ...[counterBits.top, counterBits.wood].filter((x): x is THREE.MeshToonMaterial => !!x)]);
    mergeStatic(root, skip, protect);
  }
  const v = new THREE.Vector3();
  return {
    update,
    breakdown: () => {                                                            // thống kê cảnh để tối ưu (gọi khi cần, không chạy mỗi khung)
      const o: Record<string, number> = { meshes: 0, tris: 0, skinnedMeshes: 0, skinnedTris: 0, outlineMeshes: 0, outlineTris: 0, castMeshes: 0, castTris: 0, lights: 0, invisible: 0 };
      scene.traverse(ob => { const m = ob as THREE.Mesh; if ((ob as THREE.Light).isLight) o.lights!++; if (!m.isMesh) return; if (!ob.visible) { o.invisible!++; return; }
        const g = m.geometry, t = (g.index ? g.index.count : g.attributes.position!.count) / 3; o.meshes!++; o.tris! += t;
        if ((m as THREE.SkinnedMesh).isSkinnedMesh) { o.skinnedMeshes!++; o.skinnedTris! += t; } if (m.parent && (m.parent as THREE.Mesh).isMesh) { o.outlineMeshes!++; o.outlineTris! += t; } if (m.castShadow) { o.castMeshes!++; o.castTris! += t; } });
      return o;
    },
    stats: () => ({ sky: skyCv.width + "x" + skyCv.height + " asp " + skyAsp.toFixed(2), upMs: +upMs.toFixed(2), drawMs: +drawMs.toFixed(2), calls: r.info.render.calls, tris: r.info.render.triangles, q: quality }),
    phases: () => slots.map(sl => `${sl.phase}@${sl.actor.group.position.x.toFixed(1)},${sl.actor.group.position.z.toFixed(1)}${sl.actor.group.visible ? "" : " hidden"}`),
    dom, hotspots, resize,
    rotate(dir) { azT += dir * Math.PI / 2; },
    setHour, bounce(id) { pulse.set(id, performance.now() / 1000); },
    start() { if (running) return; running = true; resize(w, h); last = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    /* hình học và ảnh của nhân vật 3D dùng chung giữa các cảnh (userData.keep): giữ lại để khỏi tải lại lên GPU */
    dispose() { running = false; cancelAnimationFrame(raf); scene.traverse(ob => { const m = ob as THREE.Mesh; if (m.geometry && !m.geometry.userData.keep) m.geometry.dispose(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach(x => { const mp = (x as THREE.MeshToonMaterial).map; if (mp && !mp.userData.keep) mp.dispose(); x.dispose(); }); }); disposables.forEach(d => d.dispose()); },
    project(hs) { hs.obj.getWorldPosition(v); v.y += hs.dy; v.project(cam); const wl = hs.wall === null ? null : walls[hs.wall]; const show = wl ? (wl.nx * Math.sin(az) + wl.nz * Math.cos(az)) < .45 : true; const x = (v.x * .5 + .5) * w, y = (-v.y * .5 + .5) * h; return { x, y, show: show && !exterior && x > 8 && x < w - 8 && y > 8 && y < h - 8 }; },
    setInsets(top, bottom) { insTop = top; insBot = bottom; },
    setExterior(on) { if (on) buildOutside(); exterior = on; outside.visible = on; zoomT = on ? .78 : 1; panT = 0; el = (on ? 30 : 38) * Math.PI / 180; },
    isExterior() { return exterior; },
    dragStart() { dragging = true; },
    drag(dx, dy = 0) { az -= dx * .006; azT = az; if (zoomT > 1.1) panT = Math.max(-(zoomT - 1) * 1.4, Math.min((zoomT - 1) * 1.4, panT + dy * .012)); },
    zoomBy(f) { zoomT = Math.max(.75, Math.min(2.8, zoomT * f)); if (zoomT <= 1.1) panT = 0; }, resetView() { zoomT = 1; panT = 0; }, zoomLevel() { return zoomT; },
    dragEnd() { dragging = false; azT = Math.round((azT - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4; }
  };

  function place(g: THREE.Object3D, x: number, y: number, z: number, ry = 0) { g.position.set(x, y, z); g.rotation.y = ry; root.add(g); return g; }
}
function CAPBAR(r: number, l: number) { return new THREE.CapsuleGeometry(r, l, 4, 8); }
