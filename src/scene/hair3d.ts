/* Tóc 3D dựng riêng cho model nam (tóc gốc được tách ra khỏi đầu rồi thay bằng tóc này).
   Mỗi kiểu = một "mũ tóc" ôm sọ + nhiều lọn thon (nhọn dần) xếp lớp, giống phong cách tóc cắt khối của model. */
import * as THREE from "three";
import type { HeadCtx } from "./accessories";

export const HAIR_KINDS = new Set(["crop", "fringe", "bob", "long", "spiky"]);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function buildHair(kind: string, c: HeadCtx): THREE.Group {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: c.hair, side: THREE.DoubleSide });
  const a = c.R, b = c.H / 2, d = c.D / 2, yc = c.H * .04;                 // bán trục sọ (x, y, z) và tâm
  /** điểm trên mặt sọ: e = góc nâng (0 = ngang, 90° = đỉnh đầu), az = góc quanh (0 = trước mặt) */
  const surf = (e: number, az: number, k = 1) => V(a * k * Math.cos(e) * Math.sin(az), yc + b * k * Math.sin(e), d * k * Math.cos(e) * Math.cos(az));
  const nrm = (p: THREE.Vector3) => V(p.x / (a * a), (p.y - yc) / (b * b), p.z / (d * d)).normalize();
  /** lọn tóc thon: gốc ở p, hướng dir, dài len, rộng w, dẹt theo mặt sọ */
  const lock = (p: THREE.Vector3, dir: THREE.Vector3, len: number, w: number, flat = .55) => {
    const o = new THREE.Mesh(new THREE.ConeGeometry(w, len, 10, 1), m); const n = dir.clone().normalize();
    o.quaternion.setFromUnitVectors(V(0, 1, 0), n); o.position.copy(p).addScaledVector(n, len / 2 - w * .3); o.scale.set(1, 1, flat); o.castShadow = true; g.add(o); return o;
  };
  /** mũ tóc ôm sọ (chừa trống mặt phía trước) */
  const cap = (down: number, k = 1.04, open = .9) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20, Math.PI / 2 + open, Math.PI * 2 - open * 2, 0, down), m);
    o.scale.set(a * k, b * k, d * k); o.position.y = yc; o.castShadow = true; g.add(o);
  };
  const ring = (n: number, e: number, az0: number, az1: number, k: number, fn: (p: THREE.Vector3, nn: THREE.Vector3, t: number) => void) => {
    for (let i = 0; i < n; i++) { const t = n === 1 ? .5 : i / (n - 1), p = surf(e, az0 + (az1 - az0) * t, k); fn(p, nrm(p), t); }
  };
  const fringe = (len: number, rows = 2) => {                                      // mái trước trán, rủ xuống và hơi lệch sang bên
    for (let r = 0; r < rows; r++) ring(9 - r, .62 - r * .14, -1.1 + r * .12, 1.1 - r * .12, 1.0, (p, n, t) => {
      const dir = n.clone().multiplyScalar(.5).add(V((t - .5) * .55, -1, .25)); lock(p, dir, len * (1 - Math.abs(t - .5) * .5), c.R * .17);
    });
  };
  const crown = (n: number, len: number, up: number) => {                         // lọn chải quanh đỉnh đầu
    for (let i = 0; i < n; i++) { const az = i / n * Math.PI * 2, p = surf(1.15, az, 1.0), nn = nrm(p); lock(p, nn.clone().multiplyScalar(up).add(V(Math.sin(az) * .8, -.3, Math.cos(az) * .8)), len, c.R * .2); }
  };
  switch (kind) {
    case "crop":                                   // cua: ngắn gọn, mái ngắn
      cap(1.75); fringe(c.H * .2, 2); crown(7, c.H * .2, .6);
      ring(7, .18, 1.2, Math.PI * 2 - 1.2, 1.0, (p, n) => lock(p, n.clone().add(V(0, -1, 0)), c.H * .17, c.R * .13)); break;
    case "fringe":                                 // mái ngố dày
      cap(1.9); fringe(c.H * .3, 3); crown(8, c.H * .22, .7); break;
    case "bob":                                    // bob ngang cằm
      cap(2.0); fringe(c.H * .28, 2);
      ring(11, .15, 1.0, Math.PI * 2 - 1.0, 1.0, (p, n) => lock(p, V(n.x * .25, -1, n.z * .25), c.H * .55, c.R * .24, .45)); crown(8, c.H * .2, .6); break;
    case "long":                                   // tóc dài
      cap(2.0); fringe(c.H * .28, 2);
      ring(13, .15, .95, Math.PI * 2 - .95, 1.0, (p, n) => lock(p, V(n.x * .15, -1, n.z * .15), c.H * (.95 + .2 * Math.abs(Math.cos(Math.atan2(p.x, p.z)))), c.R * .24, .45)); crown(8, c.H * .2, .6); break;
    case "spiky":                                  // dựng đứng
      cap(1.9);
      ring(10, .95, 0, Math.PI * 2 - .01, 1.0, (p, n) => lock(p, n.clone().multiplyScalar(.9).add(V(0, 1.1, 0)), c.H * .42, c.R * .24, .8));
      ring(12, .45, 1.1, Math.PI * 2 - 1.1, 1.0, (p, n) => lock(p, n.clone().multiplyScalar(1.2).add(V(0, .5, 0)), c.H * .32, c.R * .2, .8));
      ring(7, .55, -.95, .95, 1.0, (p, _n, t) => lock(p, V((t - .5) * 1.1, .55, .8), c.H * .3, c.R * .18)); break;
  }
  return g;
}
