/* Kiểu đầu 3D: mỗi mã kiểu trong Hồ sơ (b1..b6, g1..g6) là một phụ kiện đội lên đầu nhân vật (mũ len, băng đô, búi tóc,
   tai mèo, kính, nơ, hoa cài). Gắn vào xương đầu nên đi theo khi cử động. Kích thước tính theo đầu thật của từng model. */
import * as THREE from "three";

export interface HeadCtx { R: number; H: number; D: number; hair: string; coat: string; shirt: string; eyeY: number; eyeZ: number }
const mat = (c: string) => new THREE.MeshLambertMaterial({ color: c });
const ball = (g: THREE.Group, r: number, c: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(c)); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; g.add(o); return o; };
const cone = (g: THREE.Group, r: number, h: number, c: string, x: number, y: number, z: number, rx = 0, rz = 0) => { const o = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), mat(c)); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); g.add(o); return o; };
const ring = (g: THREE.Group, r: number, t: number, c: string, x: number, y: number, z: number, rx: number, ry = 0, rz = 0, arc = Math.PI * 2) => { const o = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 28, arc), mat(c)); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };

const BUILD: Record<string, (g: THREE.Group, c: HeadCtx) => void> = {
  beanie: (g, c) => { const d = new THREE.Mesh(new THREE.SphereGeometry(c.R * 1.12, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(c.coat)); d.position.set(0, c.H * .1, -c.D * .02); d.scale.set(1.04, .92, 1.04); g.add(d);
    ring(g, c.R * 1.1, c.R * .12, c.coat, 0, c.H * .1, -c.D * .02, Math.PI / 2); ball(g, c.R * .2, c.shirt, 0, c.H * .1 + c.R * 1.1, -c.D * .02); },
  headband: (g, c) => { ring(g, c.R * .96, c.R * .08, c.coat, 0, c.H * .07, -c.D * .02, Math.PI / 2 - .12); },
  bun: (g, c) => { ball(g, c.R * .36, c.hair, 0, c.H * .5 - c.R * .08, -c.D * .1); ball(g, c.R * .17, c.coat, 0, c.H * .5 - c.R * .32, -c.D * .1, 1.3, .45, 1.3); },
  ears: (g, c) => { ring(g, c.R * .96, c.R * .07, c.coat, 0, c.H * .12, -c.D * .02, Math.PI / 2 - .12);
    ([-1, 1] as const).forEach(s => { cone(g, c.R * .3, c.R * .55, c.hair, s * c.R * .6, c.H * .5 + c.R * .12, -c.D * .02, 0, -s * .22); cone(g, c.R * .16, c.R * .32, c.shirt, s * c.R * .6, c.H * .5 + c.R * .08, c.D * .03, 0, -s * .22); }); },
  glasses: (g, c) => { const k = c.R * .18; ([-1, 1] as const).forEach(s => ring(g, k, k * .16, "#2B1A1A", s * c.R * .36, c.eyeY, c.eyeZ, 0)); { const br = new THREE.Mesh(new THREE.BoxGeometry(c.R * .18, k * .14, k * .14), mat("#2B1A1A")); br.position.set(0, c.eyeY + k * .3, c.eyeZ); g.add(br); }
    ([-1, 1] as const).forEach(s => { const a = new THREE.Mesh(new THREE.BoxGeometry(k * .14, k * .14, c.D * .5), mat("#2B1A1A")); a.position.set(s * c.R * .8, c.eyeY + k * .3, c.eyeZ - c.D * .25); g.add(a); }); },
  bow: (g, c) => { const x = c.R * .8, y = c.H * .3, h = c.R * .5; ([-1, 1] as const).forEach(s => cone(g, c.R * .24, h, c.shirt, x + s * h / 2, y, c.D * .1, 0, s * Math.PI / 2)); ball(g, c.R * .13, c.shirt, x, y, c.D * .1); },
  flower: (g, c) => { const x = c.R * .8, y = c.H * .34, z = c.D * .12; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ball(g, c.R * .15, "#FFFFFF", x + Math.cos(a) * c.R * .2, y + Math.sin(a) * c.R * .2, z, 1, 1, .6); } ball(g, c.R * .12, "#FFD35A", x, y, z + c.R * .04); },
  twinbows: (g, c) => { const h = c.R * .38; ([-1, 1] as const).forEach(s => { const x = s * c.R * .8, y = c.H * .3; ([-1, 1] as const).forEach(w => cone(g, c.R * .19, h, c.shirt, x + w * h / 2, y, c.D * .1, 0, w * Math.PI / 2)); ball(g, c.R * .1, c.shirt, x, y, c.D * .1); }); }
};
export const STYLE_OF: Record<string, string> = { b2: "beanie", b3: "headband", b4: "bun", b5: "glasses", b6: "ears", g2: "bow", g3: "ears", g4: "flower", g5: "glasses", g6: "twinbows" };

export function buildStyle(sprite: string, c: HeadCtx): THREE.Group | null {
  const k = STYLE_OF[sprite]; if (!k) return null;
  try { const g = new THREE.Group(); BUILD[k]!(g, c); return g; } catch (e) { console.warn("Không dựng được kiểu đầu", sprite, e); return null; }
}
