/* BẢN XEM TRƯỚC thiết kế phòng tiệm mới (chưa dùng trong game): tiệm bánh gỗ đen + hồng, có ban ngày và ban đêm. Mở bằng roomdesign.html */
import * as THREE from "three";
import { CAP, CONE, CYL, RB, SPH, T, add } from "./kit";
import { cake } from "./cake";

const BLK = "#3B2A2E", PINK = "#F28AA6", PINK_L = "#FFD3DE", PINK_D = "#D9577A", WOOD = "#A06B45", WOOD_D = "#6E452B", RED = "#C8344E", MARBLE = "#FFF4EA", COPPER = "#C97B4A";
export type Mode = "day" | "night";

const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, rep?: [number, number]) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return t;
};
const checker = (a: string, b: string, n = 8, rep?: [number, number]) => tex(128, 128, (g, w) => { const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * s, j * s, s, s); } }, rep);

export function createRoomDesign(canvas: HTMLCanvasElement) {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 120);
  const X0 = -5, X1 = 5, Z0 = -3.6, Z1 = 3.6, WH = 3.4;
  const glow: THREE.MeshStandardMaterial[] = [], lights: THREE.PointLight[] = [], glass: THREE.MeshBasicMaterial[] = [], flames: THREE.MeshBasicMaterial[] = [];
  const M = (c: string, o: THREE.MeshToonMaterialParameters = {}) => T(c, o);
  const lampMat = () => { const m = new THREE.MeshStandardMaterial({ color: "#FFF1CC", emissive: new THREE.Color("#FFC56B"), emissiveIntensity: .5 }); glow.push(m); return m; };
  const room = new THREE.Group(); scene.add(room);
  const box = (p: THREE.Object3D, w: number, h: number, d: number, c: string | THREE.Material, x: number, y: number, z: number, r = .03, o: Parameters<typeof add>[6] = {}) => add(p, RB(w, h, d, r), typeof c === "string" ? M(c) : c, x, y, z, o);

  /* ---------- sàn, viền gỗ đen, tường ---------- */
  const floorTex = checker("#F8E8CF", "#F3DDBC", 4, [5, 3.6]);
  const floor = add(room, new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), new THREE.MeshToonMaterial({ map: floorTex }), 0, 0, 0, { ol: null, cast: false }); floor.rotation.x = -Math.PI / 2;
  box(room, X1 - X0 + .5, .35, Z1 - Z0 + .5, WOOD_D, 0, -.2, 0, .04, { cast: false });                 // đế gỗ đen
  box(room, X1 - X0 + .5, .08, .14, WOOD, 0, .02, Z1 + .22, .02, { ol: null }); box(room, .14, .08, Z1 - Z0 + .5, WOOD, X1 + .22, .02, 0, .02, { ol: null });
  const wallTex = tex(256, 256, (g, w, h) => { g.fillStyle = "#3A3042"; g.fillRect(0, 0, w, h); g.fillStyle = "#43374B"; for (let x = 0; x < w; x += 64) g.fillRect(x + 4, 6, 56, h - 12); g.strokeStyle = "#2D2434"; g.lineWidth = 3; for (let x = 0; x < w; x += 64) g.strokeRect(x + 4, 6, 56, h - 12); }, [5, 1]);
  const wallM = new THREE.MeshToonMaterial({ map: wallTex });
  const wallN = add(room, RB(X1 - X0 + .3, WH, .25, .02), wallM, 0, WH / 2, Z0 - .12, { ol: "mid" }), wallW = add(room, RB(.25, WH, Z1 - Z0 + .3, .02), wallM, X0 - .12, WH / 2, 0, { ol: "mid" });
  wallW.material = new THREE.MeshToonMaterial({ map: wallTex.clone() }); (wallW.material as THREE.MeshToonMaterial).map!.repeat.set(4, 1); (wallW.material as THREE.MeshToonMaterial).map!.needsUpdate = true; void wallN;
  box(room, X1 - X0 + .3, 1.0, .3, WOOD, 0, .5, Z0 - .02, .02, { ol: "thin" }); box(room, .3, 1.0, Z1 - Z0 + .3, WOOD, X0 - .02, .5, 0, .02, { ol: "thin" });             // ốp hồng dưới chân tường
  box(room, X1 - X0 + .35, .1, .34, WOOD_D, 0, 1.02, Z0 - .02, .02, { ol: null }); box(room, .34, .1, Z1 - Z0 + .35, WOOD_D, X0 - .02, 1.02, 0, .02, { ol: null });
  box(room, X1 - X0 + .4, .14, .4, WOOD_D, 0, WH + .05, Z0 - .12, .03, { ol: "thin" }); box(room, .4, .14, Z1 - Z0 + .4, WOOD_D, X0 - .12, WH + .05, 0, .03, { ol: "thin" });

  /* ---------- đèn lồng gắn tường ---------- */
  const lantern = (p: THREE.Object3D, x: number, y: number, z: number, ry: number) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g);
    box(g, .28, .06, .2, WOOD_D, 0, .24, 0, .01, { ol: null }); box(g, .08, .4, .06, WOOD_D, 0, .0, -.12, .01, { ol: null }); box(g, .22, .06, .22, WOOD_D, 0, -.24, 0, .01, { ol: null });
    add(g, RB(.2, .4, .2, .04), lampMat(), 0, 0, 0, { ol: "thin", cast: false }); add(g, CONE(.17, .16, 4), M(BLK), 0, .34, 0, { ol: "thin", cast: false, r: [0, Math.PI / 4, 0] });
    if (lights.length < 3) { const pl = new THREE.PointLight("#FFB868", 0, 6, 1.4); pl.position.set(0, 0, .5); g.add(pl); lights.push(pl); }   // chỉ vài đèn thật cho nhẹ máy
  };
  [Z0 + 1.0, 0.6, 2.6].forEach(z => lantern(room, X0 + .2, 2.35, z, Math.PI / 2));
  [-0.4, 2.2, 4.4].forEach(x => lantern(room, x, 2.35, Z0 + .2, 0));

  /* ---------- cửa sổ vòm + mái hiên sọc hồng trắng (tường bắc) ---------- */
  const star = tex(128, 192, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#141C46"); gr.addColorStop(1, "#37306B"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; for (let i = 0; i < 26; i++) { g.globalAlpha = .4 + Math.random() * .6; g.fillRect(Math.random() * w, Math.random() * h * .8, 2, 2); } });
  const dayGlass = tex(128, 192, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#9ED6FF"); gr.addColorStop(1, "#FFE9F1"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(40, 120, 18, 0, 7); g.arc(66, 112, 22, 0, 7); g.arc(92, 124, 16, 0, 7); g.fill(); });
  const stripe = tex(128, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#fff" : PINK; g.fillRect(i * w / 8, 0, w / 8, h); } g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(0, h - 8, w, 8); });
  [-0.4, 2.2, 4.4].forEach(x => {
    const wy = 1.9, g = new THREE.Group(); g.position.set(x, wy, Z0 + .02); room.add(g);
    const gm = new THREE.MeshBasicMaterial({ map: dayGlass }); glass.push(gm);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), gm); pane.position.set(0, 0, .09); g.add(pane);
    const arch = new THREE.Mesh(new THREE.CircleGeometry(.55, 20, 0, Math.PI), gm); arch.position.set(0, .7, .09); g.add(arch);
    box(g, 1.34, .16, .16, WOOD, 0, -.78, .1, .02); box(g, .1, 1.5, .14, WOOD_D, -.6, -.02, .1, .01, { ol: null }); box(g, .1, 1.5, .14, WOOD_D, .6, -.02, .1, .01, { ol: null }); box(g, .06, 1.4, .1, WOOD_D, 0, 0, .12, .01, { ol: null }); box(g, 1.2, .06, .1, WOOD_D, 0, .1, .12, .01, { ol: null });
    const ring = add(g, new THREE.TorusGeometry(.6, .06, 6, 20, Math.PI), M(WOOD_D), 0, .7, .1, { ol: "thin", cast: false }); ring.rotation.z = 0;
    add(g, RB(1.5, .08, .55, .03), new THREE.MeshToonMaterial({ map: stripe }), 0, 1.68, .3, { r: [.5, 0, 0], ol: "thin" }); box(g, 1.5, .1, .1, PINK_D, 0, 1.52, .5, .02, { ol: null });
    box(g, 1.1, .1, .22, WOOD, 0, -.88, .22, .02, { ol: "thin" }); add(g, SPH(.1, 8, 6), M("#7BC47F"), -.3, -.78, .24, { ol: "thin" }); add(g, SPH(.07, 8, 6), M(PINK), -.3, -.66, .26, { ol: null });
  });
  const frame = (p: THREE.Object3D, x: number, y: number, z: number, ry: number, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); box(g, w + .14, h + .14, .08, BLK, 0, 0, 0, .02, { ol: "thin" });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(160, Math.round(160 * h / w), draw) })); pl.position.z = .05; g.add(pl);
  };
  const cakeArt = (bg: string) => (g: CanvasRenderingContext2D, w: number, h: number) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.font = `${h * .55}px system-ui`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("🍰", w / 2, h / 2); };
  frame(room, -1.6, 2.2, Z0 + .1, 0, .7, .7, cakeArt("#FFE3EA")); frame(room, 3.3, 2.5, Z0 + .1, 0, .6, .6, cakeArt("#FFF1C2")); frame(room, X0 + .12, 2.3, 2.0, Math.PI / 2, .6, .6, cakeArt("#E3F5E9"));

  /* ---------- cầu thang gỗ đen, thảm chạy hồng (góc bắc-tây) ---------- */
  for (let i = 0; i < 7; i++) {
    const x = -2.4 - i * .36, h = .3 + i * .3; box(room, .36, h, .8, i % 2 ? "#C98B5E" : "#BC7E52", x, h / 2, Z0 + .5, .02, { ol: "thin" });
  }
  box(room, 1.1, 1.7, .1, WOOD, -4.3, 2.45, Z0 + .04, .03, { ol: "thin", cast: false }); box(room, .9, 1.5, .1, "#F2C98E", -4.3, 2.45, Z0 + .08, .03, { ol: null, cast: false });          // cửa lên lầu ở đầu cầu thang

  /* ---------- lò nướng gạch + tủ lạnh + kệ (tường tây, gần góc) ---------- */
  const fr = new THREE.Group(); fr.position.set(X0 + .5, 0, Z0 + 1.6); room.add(fr);
  box(fr, .9, 2.0, .9, "#FFFFFF", 0, 1.0, 0, .08, { ol: "mid" }); box(fr, .92, .04, .92, "#C9C4C0", 0, 1.35, 0, .01, { ol: null }); box(fr, .05, .5, .06, BLK, .46, 1.65, -.28, .01, { ol: null }); box(fr, .05, .6, .06, BLK, .46, 1.0, -.28, .01, { ol: null });
  const ov = new THREE.Group(); ov.position.set(X0 + .8, 0, Z0 + 2.8); room.add(ov);
  const BR = "#D8A57E", BR2 = "#C58E66";
  box(ov, 1.5, .8, 1.4, BR, 0, .4, 0, .05, { ol: "mid" });
  [.2, .4, .6].forEach(y => box(ov, 1.52, .02, 1.42, BR2, 0, y, 0, .005, { ol: null }));
  box(ov, 1.0, .5, 1.1, "#E6B791", 0, 1.05, 0, .12, { ol: "mid" });
  add(ov, new THREE.SphereGeometry(.7, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), M("#EBC09B"), 0, 1.25, 0, { ol: "mid", s: [1, .65, .85] });
  box(ov, .06, .42, .62, "#2A1612", .75, .62, 0, .02, { ol: null }); add(ov, CYL(.31, .31, .06, 14, ), M("#2A1612"), .75, .83, 0, { ol: null, r: [0, 0, Math.PI / 2] });
  box(ov, .03, .34, .5, "#FF8A3D", .79, .62, 0, .01, { ol: null, cast: false }); add(ov, CYL(.25, .25, .03, 14), lampMat(), .79, .79, 0, { ol: null, cast: false, r: [0, 0, Math.PI / 2] });
  box(ov, .35, .4, .5, "#8A5A3A", .62, .2, .9, .03, { ol: "thin" }); [0, 1, 2].forEach(i => add(ov, CYL(.06, .06, .45, 8), M("#6E452B"), .62, .45 + i * .1, .9 + (i - 1) * .12, { ol: null, r: [Math.PI / 2, 0, 0] }));
  box(ov, .5, 1.8, .5, BR, -.5, 1.9, 0, .04, { ol: "mid" }); [1.3, 1.7, 2.1, 2.5].forEach(y => box(ov, .52, .02, .52, BR2, -.5, y, 0, .005, { ol: null }));
  const ovl = new THREE.PointLight("#FF8A3D", 0, 3.5, 1.6); ovl.position.set(.9, .8, 0); ov.add(ovl); lights.push(ovl);
  void [0];

  /* ---------- quầy bánh: quầy gỗ đen mặt hồng, tủ kính cong, kệ bánh, đèn thả, máy tính tiền ---------- */
  const cx = X0 + .6;
  box(room, 1.2, 1.0, 2.6, WOOD, cx, .5, 1.6, .05, { ol: "mid" }); box(room, 1.3, .1, 2.7, MARBLE, cx, 1.05, 1.6, .03, { ol: "thin" }); [0, 1, 2].forEach(i => box(room, .04, .7, .7, WOOD_D, cx + .6, .5, .6 + i * .85, .02, { ol: null }));
  const gl = new THREE.Group(); gl.position.set(cx + 1.1, 0, 1.45); room.add(gl);
  box(gl, 1.0, .85, 2.1, WOOD, 0, .42, 0, .05, { ol: "mid" }); box(gl, 1.04, .08, 2.14, MARBLE, 0, .88, 0, .03, { ol: "thin" }); [-.7, 0, .7].forEach(z => box(gl, .04, .55, .55, WOOD_D, .5, .42, z, .02, { ol: null }));
  add(gl, RB(.92, .62, 2.0, .2), M("#CFEFFF", { transparent: true, opacity: .32 }), 0, 1.25, 0, { ol: "thin", cast: false });
  [0, 1].forEach(sh => [-.75, -.25, .25, .75].forEach((z, i) => { const c = cake((i + sh) % 3, (i + 1) % 3, (i + sh * 2) % 3, .42); c.position.set(0, .95 + sh * .32, z); gl.add(c); }));
  const reg = new THREE.Group(); reg.position.set(cx, 1.1, 2.5); room.add(reg); box(reg, .5, .2, .45, BLK, 0, .1, 0, .03); box(reg, .46, .3, .05, "#8FD9B6", -.05, .35, -.1, .02, { r: [-.3, 0, 0] });
  const cakeStand = cake(1, 2, 0, .9); cakeStand.position.set(cx + .05, 1.1, .8); room.add(cakeStand);
  // kệ treo tường
  [1.65, 2.1, 2.55].forEach((y, i) => { box(room, .5, .06, 1.9, WOOD, X0 + .3, y, 2.2, .02, { ol: "thin" }); [0, 1, 2, 3, 4].forEach(k => { if (i === 2 && k > 2) return; const c = cake((k + i) % 3, (k + 2) % 3, (k + 1) % 3, .3); c.position.set(X0 + .3, y + .03, 1.45 + k * .4); room.add(c); }); });
  const chalk = new THREE.Group(); chalk.position.set(X0 + .12, 2.6, .3); chalk.rotation.y = Math.PI / 2; room.add(chalk);
  box(chalk, 1.5, 1.0, .08, WOOD, 0, 0, 0, .03, { ol: "thin" });
  { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.36, .86), new THREE.MeshBasicMaterial({ map: tex(272, 172, (g, w, h) => { g.fillStyle = "#2A2A2E"; g.fillRect(0, 0, w, h); g.fillStyle = "#FFF"; g.font = "700 48px 'Caveat', cursive, system-ui"; g.fillText("Sweet", 24, 56); g.font = "20px system-ui"; ["Matcha Latte ····· 35", "Bánh dâu ······· 42", "Trà đào ········ 30", "Cupcake ········ 28"].forEach((t, i) => g.fillText(t, 24, 92 + i * 24)); g.font = "46px system-ui"; g.fillText("🧁", 200, 62); }) })); pl.position.z = .05; chalk.add(pl); }
  [.2, 1.4].forEach(z => { const pd = new THREE.Group(); pd.position.set(cx + .55, 0, z + .8); room.add(pd);
    add(pd, CYL(.01, .01, 1.0, 4), M(WOOD_D), 0, 3.0, 0, { ol: null, cast: false }); add(pd, new THREE.ConeGeometry(.3, .26, 18, 1, true), M(COPPER, { side: THREE.DoubleSide }), 0, 2.45, 0, { ol: "thin", cast: false }); add(pd, SPH(.1, 10, 8), lampMat(), 0, 2.38, 0, { ol: null, cast: false }); });
  // rổ bánh mì trên quầy
  [0, 1, 2].forEach(i => add(room, CAP(.07, .22), M("#D9954F"), cx + (i - 1) * .12, 1.25, 2.95, { ol: "thin", r: [0, 0, Math.PI / 2] })); box(room, .5, .12, .3, WOOD, cx, 1.17, 2.95, .03);

  /* ---------- bàn tròn khăn caro hồng, ghế gỗ đen đệm hồng, thảm tròn ---------- */
  const cloth = checker("#FFFFFF", "#F6A3B8", 8, [1.6, 1.6]);
  const chair = (p: THREE.Object3D, x: number, z: number, ry: number) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    box(g, .44, .07, .44, WOOD, 0, .46, 0, .03, { ol: "thin" }); box(g, .38, .09, .38, RED, 0, .53, 0, .04, { ol: null });
    ([[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]] as const).forEach(([dx, dz]) => add(g, CYL(.025, .03, .46, 6), M(WOOD_D), dx, .23, dz, { ol: null }));
    ([-.17, 0, .17] as const).forEach(dx => box(g, .06, .5, .05, WOOD, dx, .8, -.2, .02, { ol: "thin" })); box(g, .42, .07, .05, WOOD_D, 0, 1.05, -.2, .02, { ol: "thin" }); box(g, .26, .2, .04, PINK_L, 0, .88, -.16, .03, { ol: null });
  };
  const table = (x: number, z: number, n: number, a0 = 0, skip: number[] = []) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
    const rug = add(g, new THREE.CircleGeometry(1.3, 36), M("#F9C8D6"), 0, .012, 0, { ol: null, cast: false }); rug.rotation.x = -Math.PI / 2; const rim = add(g, new THREE.RingGeometry(1.1, 1.3, 36), M("#EE9DB4"), 0, .014, 0, { ol: null, cast: false }); rim.rotation.x = -Math.PI / 2;
    add(g, CYL(.56, .6, .08, 28), M("#FFFFFF"), 0, .82, 0, { ol: "thin" });
    add(g, new THREE.CylinderGeometry(.62, .78, .55, 28, 1, true), new THREE.MeshToonMaterial({ map: cloth, side: THREE.DoubleSide }), 0, .55, 0, { ol: null }); add(g, CYL(.08, .1, .5, 8), M(WOOD_D), 0, .4, 0, { ol: null });
    const c = cake(Math.round(x * 3 + z) & 1 ? 1 : 0, 2, (Math.abs(Math.round(x + z)) % 3), .75); c.position.set(-.12, .86, .05); g.add(c);
    add(g, CYL(.07, .05, .12, 8), M("#fff"), .25, .92, -.12, { ol: "thin" }); add(g, SPH(.1, 8, 6), M(PINK), .25, 1.04, -.12, { ol: null }); add(g, SPH(.06, 8, 6), M("#7BC47F"), .3, 1.02, -.08, { ol: null });
    box(g, .16, .22, .04, "#fff", .18, .96, .2, .01, { ol: "thin", r: [0, .5, 0] });   // bảng thực đơn nhỏ
    for (let i = 0; i < n; i++) { if (skip.includes(i)) continue; const a = a0 + (i / n) * Math.PI * 2; chair(g, Math.sin(a) * .95, Math.cos(a) * .95, a + Math.PI); }
    return g;
  };
  table(-1.2, -1.9, 4, .4, [0]); table(1.5, -2.0, 3, 0, [2]); table(4.0, -2.0, 3, .8, [1]);
  table(-1.1, .5, 4); table(1.4, .9, 4, .3); table(3.8, .6, 4, .2); table(2.9, 2.7, 4, .5);
  // sofa cong sát tường bắc (dưới cửa sổ)
  [[.3, 2.7], [3.0, 4.95]].forEach(([a, b]) => { const w = b - a, s = new THREE.Group(); s.position.set((a + b) / 2, 0, Z0 + .55); room.add(s);
    box(s, w, .45, .85, WOOD, 0, .25, 0, .06, { ol: "mid" }); box(s, w, .85, .22, WOOD, 0, .85, -.32, .06, { ol: "mid" }); box(s, w - .1, .22, .7, RED, 0, .56, .04, .08, { ol: "thin" }); box(s, w - .1, .6, .12, "#E35A78", 0, .95, -.2, .08, { ol: "thin" }); box(s, .22, .6, .85, WOOD, -w / 2 + .1, .5, 0, .05, { ol: "thin" }); box(s, .22, .6, .85, WOOD, w / 2 - .1, .5, 0, .05, { ol: "thin" });
    box(s, .38, .38, .12, PINK_L, -w / 4, .85, -.12, .06, { ol: "thin", r: [0, .2, .1] }); box(s, .34, .34, .12, "#FFE8A8", w / 4, .85, -.12, .06, { ol: "thin", r: [0, -.2, -.1] }); });

  /* ---------- góc chờ + trang trí phía trước ---------- */
  const ab = new THREE.Group(); ab.position.set(-0.55, 0, 3.2); ab.rotation.y = .3; room.add(ab);
  box(ab, .8, 1.0, .06, WOOD_D, 0, .75, 0, .02, { ol: "thin", r: [.12, 0, 0] }); box(ab, .66, .8, .02, "#272226", 0, .76, .04, .01, { ol: null, r: [.12, 0, 0] }); { const pl = new THREE.Mesh(new THREE.PlaneGeometry(.66, .8), new THREE.MeshBasicMaterial({ map: tex(132, 160, (g, w, h) => { g.fillStyle = "#2A2A2E"; g.fillRect(0, 0, w, h); g.fillStyle = "#FFD3DE"; g.font = "700 26px system-ui"; g.textAlign = "center"; g.fillText("Hôm nay", w / 2, 40); g.fillText("Matcha 🍵", w / 2, 78); g.font = "54px system-ui"; g.fillText("🧁", w / 2, 140); }) })); pl.position.set(0, .76, .056); pl.rotation.x = -.12; ab.add(pl); }
  [-.35, .35].forEach(x => box(ab, .05, .75, .05, BLK, x, .37, -.16, .01, { ol: null, r: [-.15, 0, 0] }));
  box(room, 1.2, .04, .8, "#F7A3BA", 1.55, .03, 3.2, .03, { ol: "thin" }); box(room, .9, .02, .5, "#FFE0E8", 1.55, .06, 3.2, .01, { ol: null }); box(room, 1.3, .05, .22, WOOD_D, 1.55, .03, Z1 - .08, .02, { ol: "thin" });
  const pot = (x: number, z: number, s = 1) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); room.add(g); box(g, .55, .55, .55, "#FFF6F2", 0, .28, 0, .06, { ol: "mid" });
    [[0, .9, 0, .38], [.2, .75, .1, .28], [-.2, .72, -.1, .3], [.05, 1.15, -.05, .26]].forEach(([dx, dy, dz, r]) => add(g, SPH(r!, 10, 8), M("#6DB777"), dx, dy, dz, { ol: "thin" })); [[.2, 1.0], [-.15, .95], [0, 1.28]].forEach(([dx, dy], i) => add(g, SPH(.08, 8, 6), M(i % 2 ? PINK : "#FFE8A8"), dx!, dy!, .2, { ol: null })); };
  pot(.9, Z1 - .15, .6); pot(2.2, Z1 - .15, .6); pot(X1 - .35, Z1 - .35, .9);
  const vase = (x: number, y: number, z: number) => { add(room, CYL(.07, .06, .16, 8), M("#fff"), x, y + .08, z, { ol: "thin" }); [0, 1, 2].forEach(i => add(room, SPH(.07, 8, 6), M(i % 2 ? PINK : "#FFE8A8"), x + (i - 1) * .07, y + .22, z, { ol: null })); };
  vase(cx, 1.1, 2.4);
  const fence = (x0: number, x1: number, z: number) => { for (let x = x0; x <= x1; x += .3) box(room, .12, .55, .05, "#FFF6F2", x, .3, z, .02, { ol: "thin" }); box(room, x1 - x0, .06, .05, "#FFF6F2", (x0 + x1) / 2, .4, z, .01, { ol: null }); };
  fence(-4.0, -3.1, Z1 - .15);
  // đèn lồng đặt sàn
  const fl = (x: number, z: number) => { const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g); box(g, .3, .06, .3, BLK, 0, .03, 0, .01, { ol: "thin" }); add(g, RB(.22, .34, .22, .04), lampMat(), 0, .23, 0, { ol: "thin", cast: false }); add(g, CONE(.2, .14, 4), M(BLK), 0, .47, 0, { ol: "thin", cast: false, r: [0, Math.PI / 4, 0] });
    };
  fl(-3.3, 3.3); fl(3.8, 3.4);


  /* ---------- thêm đồ cho giống ảnh: kệ gỗ, tủ hồng, dây leo, bàn trưng bánh, bàn dài, ghế cạnh lò ---------- */
  const shelfU = new THREE.Group(); shelfU.position.set(-1.0, 0, Z0 + .45); room.add(shelfU);                                     // kệ gỗ cạnh cầu thang
  box(shelfU, 1.5, 2.2, .5, WOOD_D, 0, 1.1, 0, .03, { ol: "mid" }); [.5, 1.0, 1.5, 2.0].forEach(y => { box(shelfU, 1.4, .05, .46, WOOD, 0, y, .02, .01, { ol: "thin" }); [-.5, -.1, .35].forEach((x, i) => add(shelfU, CYL(.1, .1, .22, 10), M(i % 2 ? "#F7D9E2" : "#FFF4EA"), x, y + .14, .02, { ol: "thin" })); });
  [[-2.2, 2.6], [-0.6, 2.9], [3.2, 2.7]].forEach(([x, y]) => { add(room, CYL(.01, .01, .8, 4), M("#2A5A33"), x!, y! + .5, Z0 + .08, { ol: null, cast: false }); [0, 1, 2, 3].forEach(k => add(room, SPH(.12, 8, 6), M("#5FAE6B"), x! + (k % 2 ? .1 : -.1), y! + .35 - k * .16, Z0 + .12, { ol: "thin", cast: false })); });   // dây leo trên tường
  const disp = new THREE.Group(); disp.position.set(-3.2, 0, 2.55); room.add(disp);                                                // bàn trưng bánh gỗ
  box(disp, 1.5, .08, .8, WOOD, 0, .8, 0, .03, { ol: "thin" }); ([[-.65, -.32], [.65, -.32], [-.65, .32], [.65, .32]] as const).forEach(([dx, dz]) => box(disp, .08, .8, .08, WOOD_D, dx, .4, dz, .01, { ol: null })); [-.45, 0, .45].forEach((x, i) => { const c = cake(i, (i + 1) % 3, (i + 2) % 3, .5); c.position.set(x, .84, 0); disp.add(c); });
  const lt = new THREE.Group(); lt.position.set(0.0, 0, 2.7); room.add(lt);                                                         // bàn dài trước
  box(lt, 1.7, .08, .8, new THREE.MeshToonMaterial({ map: cloth }), 0, .8, 0, .03, { ol: "thin" }); box(lt, 1.7, .4, .8, new THREE.MeshToonMaterial({ map: cloth }), 0, .6, 0, .03, { ol: null }); [-.5, .5].forEach(x => { const c = cake(1, 2, x > 0 ? 0 : 2, .55); c.position.set(x, .84, 0); lt.add(c); }); [-.5, .5].forEach(x => { chair(lt, x, .75, Math.PI); chair(lt, x, -.75, 0); });

  box(room, .6, .35, .45, "#C9955E", -2.0, .18, 3.0, .05, { ol: "thin" }); [0, 1].forEach(i => add(room, CAP(.07, .2), M("#D9954F"), -2.1 + i * .2, .42, 3.0, { ol: "thin", r: [0, 0, Math.PI / 2] }));   // thùng bánh mì

  /* ---------- ánh sáng + chế độ ngày/đêm ---------- */
  const hemi = new THREE.HemisphereLight("#fff", "#caa", .8), sun = new THREE.DirectionalLight("#fff", 2), fill = new THREE.AmbientLight("#fff", .2);
  sun.position.set(8, 12, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: .5, far: 40 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  scene.add(hemi, sun, fill);
  const skyC = document.createElement("canvas"); skyC.width = 512; skyC.height = 512; const skyT = new THREE.CanvasTexture(skyC); skyT.colorSpace = THREE.SRGBColorSpace; scene.background = skyT;
  const paintSky = (m: Mode) => { const g = skyC.getContext("2d")!; const gr = g.createLinearGradient(0, 0, 0, 512);
    if (m === "day") { gr.addColorStop(0, "#BFE3FF"); gr.addColorStop(1, "#FFE6EE"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); g.fillStyle = "rgba(255,255,255,.9)"; [[90, 90], [330, 140], [430, 60], [200, 330]].forEach(([x, y]) => { g.beginPath(); g.arc(x!, y!, 26, 0, 7); g.arc(x! + 30, y! + 6, 32, 0, 7); g.arc(x! + 62, y!, 24, 0, 7); g.fill(); }); }
    else { gr.addColorStop(0, "#0C1030"); gr.addColorStop(1, "#2B1B4A"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); g.fillStyle = "#fff"; for (let i = 0; i < 160; i++) { g.globalAlpha = .3 + Math.random() * .7; g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6); } g.globalAlpha = 1; g.fillStyle = "#FFF4D0"; g.beginPath(); g.arc(410, 90, 26, 0, 7); g.fill(); }
    skyT.needsUpdate = true; };
  let mode: Mode = "day";
  const setMode = (m: Mode) => {
    mode = m; const n = m === "night";
    hemi.color.set(n ? "#6C74C9" : "#FFF3E6"); hemi.groundColor.set(n ? "#2A1F3D" : "#E8B9A8"); hemi.intensity = n ? .55 : .95;
    sun.color.set(n ? "#9FB2FF" : "#FFE2B8"); sun.intensity = n ? .5 : 2.1; fill.intensity = n ? .25 : .25;
    glow.forEach(g => { g.emissiveIntensity = n ? 2.4 : .35; }); lights.forEach(l => { l.intensity = n ? 5 : 0; });   // chỉ vài đèn thật (đèn nhiều quá thì máy yếu bị nặng), các đèn còn lại phát sáng bằng vật liệu
    glass.forEach(g => { g.map = n ? star : dayGlass; g.needsUpdate = true; }); paintSky(m); R.toneMappingExposure = n ? 1.15 : 1;
    document.documentElement.dataset.mode = m;
  };
  void flames;

  /* ---------- camera ---------- */
  let az = Math.PI / 4, w = 1, h = 1; const el = 35 * Math.PI / 180, cxx = 0, czz = 0;
  const frameCam = () => { const r = 30; cam.position.set(cxx + Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, czz + Math.cos(az) * Math.cos(el) * r); cam.lookAt(cxx, 1.1, czz); const asp = w / h, V = 7.2; cam.left = -V * asp; cam.right = V * asp; cam.top = V; cam.bottom = -V; cam.updateProjectionMatrix(); };
  const resize = (ww: number, hh: number) => { w = ww; h = hh; R.setSize(ww, hh, false); frameCam(); };
  let raf = 0;
  const loop = (t: number) => { raf = requestAnimationFrame(loop); const k = .5 + Math.sin(t / 380) * .5; if (mode === "night") glow.forEach((g, i) => { g.emissiveIntensity = 2.2 + Math.sin(t / 300 + i) * .25 * k; }); R.render(scene, cam); };
  setMode("day"); raf = requestAnimationFrame(loop);
  return { setMode, mode: () => mode, resize, rotate(d: number) { az += d * Math.PI / 2; frameCam(); }, stop() { cancelAnimationFrame(raf); } };
}
