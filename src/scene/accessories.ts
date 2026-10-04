/* Kiểu đầu 3D: mỗi mã kiểu trong Hồ sơ (b1..b6, g1..g6) là một phụ kiện đội lên đầu nhân vật (mũ len, băng đô, búi tóc,
   tai mèo, kính, nơ, hoa cài). Gắn vào xương đầu nên đi theo khi cử động. Kích thước tính theo đầu thật của từng model. */
import * as THREE from "three";
import { STYLE_OF } from "../content/game";

export interface HeadCtx { R: number; H: number; D: number; hair: string; coat: string; shirt: string; eyeY: number; eyeZ: number }
const mat = (c: string) => new THREE.MeshLambertMaterial({ color: c });
const ball = (g: THREE.Group, r: number, c: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(c)); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; g.add(o); return o; };
const cone = (g: THREE.Group, r: number, h: number, c: string, x: number, y: number, z: number, rx = 0, rz = 0) => { const o = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), mat(c)); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); g.add(o); return o; };
const ring = (g: THREE.Group, r: number, t: number, c: string, x: number, y: number, z: number, rx: number, ry = 0, rz = 0, arc = Math.PI * 2) => { const o = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 28, arc), mat(c)); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };

/* tóc 3D: các khối tóc dựng thêm lên đầu, màu theo màu tóc người chơi chọn */
const hmat = (c: string) => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide });
/** vỏ tóc ôm đầu, chừa trống phần mặt phía trước; `down` = góc phủ xuống (rad) */
const shell = (g: THREE.Group, c: HeadCtx, down: number, k = 1.07, open = .95) => {
  const o = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18, Math.PI / 2 + open, Math.PI * 2 - open * 2, 0, down), hmat(c.hair));
  o.scale.set(c.R * k, c.H * .5 * k, c.D * .5 * k); o.position.y = c.H * .02; o.castShadow = true; g.add(o); return o;
};
const bangs = (g: THREE.Group, c: HeadCtx, n = 5, drop = .0) => {
  for (let i = 0; i < n; i++) { const t = n === 1 ? 0 : i / (n - 1) - .5; ball(g, c.R * .3, c.hair, t * c.R * 1.25, c.H * (.3 - drop - Math.abs(t) * .1), c.D * (.42 - Math.abs(t) * .22), 1.1, .75, .7); }
};

const BUILD: Record<string, (g: THREE.Group, c: HeadCtx) => void> = {
  beanie: (g, c) => {   // mũ len: thân tròn đội hơi chếch ra sau, vành gấp rộng khác màu, búp bông to
    const y0 = c.H * .09, top = new THREE.Mesh(new THREE.SphereGeometry(c.R * 1.1, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), mat(c.shirt));
    top.position.set(0, y0, -c.D * .05); top.scale.set(1.04, 1.02, 1.1); g.add(top);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(c.R * 1.17, c.R * 1.15, c.R * .42, 32, 1, true), mat(c.coat)); cuff.position.set(0, y0 - c.R * .02, -c.D * .045); cuff.scale.set(1.04, 1, 1.1); g.add(cuff);
    ring(g, c.R * 1.17, c.R * .06, c.coat, 0, y0 + c.R * .19, -c.D * .045, Math.PI / 2, 0, 0); ring(g, c.R * 1.15, c.R * .06, c.coat, 0, y0 - c.R * .23, -c.D * .045, Math.PI / 2, 0, 0);
    ball(g, c.R * .36, "#FFFFFF", 0, y0 + c.R * 1.08, -c.D * .1, 1, .95, 1); },
  headband: (g, c) => { ring(g, c.R * .96, c.R * .08, c.coat, 0, c.H * .07, -c.D * .02, Math.PI / 2 - .12); },
  bun: (g, c) => { ball(g, c.R * .36, c.hair, 0, c.H * .5 - c.R * .08, -c.D * .1); ball(g, c.R * .17, c.coat, 0, c.H * .5 - c.R * .32, -c.D * .1, 1.3, .45, 1.3); },
  ears: (g, c) => { ring(g, c.R * .96, c.R * .07, c.coat, 0, c.H * .12, -c.D * .02, Math.PI / 2 - .12);
    ([-1, 1] as const).forEach(s => { cone(g, c.R * .3, c.R * .55, c.hair, s * c.R * .6, c.H * .5 + c.R * .12, -c.D * .02, 0, -s * .22); cone(g, c.R * .16, c.R * .32, c.shirt, s * c.R * .6, c.H * .5 + c.R * .08, c.D * .03, 0, -s * .22); }); },
  glasses: (g, c) => { const k = c.R * .18; ([-1, 1] as const).forEach(s => ring(g, k, k * .16, "#2B1A1A", s * c.R * .36, c.eyeY, c.eyeZ, 0)); { const br = new THREE.Mesh(new THREE.BoxGeometry(c.R * .18, k * .14, k * .14), mat("#2B1A1A")); br.position.set(0, c.eyeY + k * .3, c.eyeZ); g.add(br); }
    ([-1, 1] as const).forEach(s => { const a = new THREE.Mesh(new THREE.BoxGeometry(k * .14, k * .14, c.D * .5), mat("#2B1A1A")); a.position.set(s * c.R * .8, c.eyeY + k * .3, c.eyeZ - c.D * .25); g.add(a); }); },
  bow: (g, c) => { const x = c.R * .8, y = c.H * .3, h = c.R * .5; ([-1, 1] as const).forEach(s => cone(g, c.R * .24, h, c.shirt, x + s * h / 2, y, c.D * .1, 0, s * Math.PI / 2)); ball(g, c.R * .13, c.shirt, x, y, c.D * .1); },
  flower: (g, c) => { const x = c.R * .8, y = c.H * .34, z = c.D * .12; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ball(g, c.R * .15, "#FFFFFF", x + Math.cos(a) * c.R * .2, y + Math.sin(a) * c.R * .2, z, 1, 1, .6); } ball(g, c.R * .12, "#FFD35A", x, y, z + c.R * .04); },
  ponytail: (g, c) => { const z = -c.D * .5; ring(g, c.R * .16, c.R * .05, c.shirt, 0, c.H * .2, z + c.D * .05, 0); [[.22, .3, .0], [.04, .27, -.04], [-.14, .23, -.07], [-.3, .17, -.1]].forEach(([y, r, dz]) => ball(g, c.R * r!, c.hair, 0, c.H * y!, z - c.D * dz! - c.R * .1)); },
  twintails: (g, c) => { ([-1, 1] as const).forEach(s => { const x = s * c.R * .98; ring(g, c.R * .15, c.R * .045, c.shirt, x, c.H * .22, -c.D * .1, 0, Math.PI / 2); [[.2, .26, 0], [.04, .24, .04], [-.12, .21, .08], [-.27, .16, .12]].forEach(([y, r, dx]) => ball(g, c.R * r!, c.hair, x + s * c.R * dx!, c.H * y!, -c.D * .1)); }); },
  twinbows: (g, c) => { const h = c.R * .38; ([-1, 1] as const).forEach(s => { const x = s * c.R * .8, y = c.H * .3; ([-1, 1] as const).forEach(w => cone(g, c.R * .19, h, c.shirt, x + w * h / 2, y, c.D * .1, 0, w * Math.PI / 2)); ball(g, c.R * .1, c.shirt, x, y, c.D * .1); }); },
  bob: (g, c) => { shell(g, c, 2.05); bangs(g, c); ([-1, 1] as const).forEach(sd => ball(g, c.R * .3, c.hair, sd * c.R * .98, -c.H * .05, -c.D * .04, .8, 1.5, 1.2)); },
  long: (g, c) => { shell(g, c, 1.85); bangs(g, c); const o = ball(g, c.R * .98, c.hair, 0, -c.H * .5, -c.D * .38, 1, 1.35, .38); o.material = hmat(c.hair); ([-1, 1] as const).forEach(sd => ball(g, c.R * .2, c.hair, sd * c.R * .97, -c.H * .22, -c.D * .05, .8, 2.4, 1)); },
  curly: (g, c) => { shell(g, c, 1.55, 1.03); bangs(g, c, 4, .02); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, up = i % 2; ball(g, c.R * .3, c.hair, Math.cos(a) * c.R * (up ? .62 : 1.02), c.H * (up ? .5 : .24), Math.sin(a) * c.D * (up ? .35 : .5) - c.D * .08); } ball(g, c.R * .4, c.hair, 0, c.H * .55, -c.D * .1); },
  spiky: (g, c) => { shell(g, c, 1.45, 1.03); for (let i = 0; i < 9; i++) { const a = Math.PI * (.15 + i / 8 * .7), x = Math.cos(a) * c.R * .85; cone(g, c.R * .26, c.R * .8, c.hair, x, c.H * .5 + c.R * .05 - Math.abs(x) * .25, 0, 0, -Math.cos(a) * .9); } },
  afro: (g, c) => { ball(g, c.R * 1, c.hair, 0, c.H * .24, -c.D * .14, 1.22, 1.0, 1.1); }
};

export function buildStyle(sprite: string, c: HeadCtx): THREE.Group | null {
  const k = BUILD[sprite] ? sprite : STYLE_OF[sprite]; if (!k || !BUILD[k]) return null;
  try { const g = new THREE.Group(); BUILD[k]!(g, c); return g; } catch (e) { console.warn("Không dựng được kiểu đầu", sprite, e); return null; }
}
