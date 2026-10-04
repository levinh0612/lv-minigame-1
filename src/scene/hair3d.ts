/* Tóc 3D dựng riêng cho model nam (tóc gốc được tách ra khỏi đầu rồi thay bằng tóc này).
   Mỗi kiểu = một "mũ tóc" ôm sọ + nhiều lọn thon (nhọn dần) xếp lớp, giống phong cách tóc cắt khối của model. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { HeadCtx } from "./accessories";

export const HAIR_KINDS = new Set(["crop", "fringe", "bob", "long", "anime"]);

/* tóc anime: model có sẵn (white_mesh.glb), đã cắt riêng phần tóc, nạp một lần rồi dùng chung hình học */
let animeNow: { geo: THREE.BufferGeometry; box: THREE.Box3 } | null = null;
let animeGeo: Promise<{ geo: THREE.BufferGeometry; box: THREE.Box3 }> | null = null;
const loadAnime = () => animeGeo ??= new GLTFLoader().loadAsync("/models/hair/anime.glb").then(r => {
  let geo: THREE.BufferGeometry | null = null; r.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) geo = m.geometry; });
  if (!geo) throw new Error("không có hình học tóc"); (geo as THREE.BufferGeometry).computeVertexNormals(); (geo as THREE.BufferGeometry).userData.keep = true;
  (geo as THREE.BufferGeometry).computeBoundingBox(); return animeNow = { geo: geo as THREE.BufferGeometry, box: (geo as THREE.BufferGeometry).boundingBox! };
}).catch(e => { animeGeo = null; throw e; });
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function buildHair(kind: string, c: HeadCtx): THREE.Group {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: c.hair, emissive: new THREE.Color(c.hair).multiplyScalar(.28), side: THREE.DoubleSide });
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
  const cap = (down: number, k = 1.04, open = .62) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20, Math.PI / 2 + open, Math.PI * 2 - open * 2, 0, down), m);
    o.scale.set(a * k, b * k, d * k); o.position.y = yc; o.castShadow = true; g.add(o);
  };
  const ring = (n: number, e: number, az0: number, az1: number, k: number, fn: (p: THREE.Vector3, nn: THREE.Vector3, t: number) => void) => {
    for (let i = 0; i < n; i++) { const t = n === 1 ? .5 : i / (n - 1), p = surf(e, az0 + (az1 - az0) * t, k); fn(p, nrm(p), t); }
  };
  const fringe = (len: number, rows = 2) => {                                      // mái rẽ lệch: lọn quét từ ngôi (lệch phải) sang trái, dài ngắn không đều
    for (let r = 0; r < rows; r++) ring(10 - r * 2, .66 - r * .15, -1.15 + r * .1, 1.15 - r * .1, 1.0, (p, n, t) => {
      const sw = 1 - t;                                                            // t=0 bên trái người xem (dài, che trán), t=1 phía ngôi (ngắn)
      const dir = n.clone().multiplyScalar(.35).add(V(-.55 + (t - .5) * .3, -1, .35)); lock(p, dir, len * (.55 + .75 * sw) * (r ? .85 : 1), c.R * (.15 + .04 * sw), .5);
    });
  };
  const crown = (n: number, len: number, up: number) => {                         // lọn phủ đỉnh đầu, xuôi theo sọ ra sau và xuống
    for (let i = 0; i < n; i++) { const az = i / n * Math.PI * 2, p = surf(1.0, az, 1.02), nn = nrm(p); lock(p, nn.clone().multiplyScalar(up * .5).add(V(Math.sin(az) * .9, -.45, Math.cos(az) * .9 - .25)), len, c.R * .21, .5); }
  };
  if (kind === "anime") {
    const put = ({ geo, box }: { geo: THREE.BufferGeometry; box: THREE.Box3 }) => {
      const sz = box.getSize(V()), ctr = box.getCenter(V()), k = c.R * 2 * 1.14 / sz.x, o = new THREE.Mesh(geo, m);
      o.scale.setScalar(k); o.position.set(-ctr.x * k, c.H * .5 * 1.02 - box.max.y * k, -ctr.z * k - c.D * .02); o.castShadow = true; g.add(o);
    };
    if (animeNow) put(animeNow); else void loadAnime().then(put).catch(e => console.warn("Không nạp được tóc anime", e));
    return g;
  }
  switch (kind) {
    case "crop":                                   // cua: ngắn gọn, mái ngắn
      cap(1.9); fringe(c.H * .22, 3); crown(7, c.H * .2, .6);
      ring(7, .18, 1.2, Math.PI * 2 - 1.2, 1.0, (p, n) => lock(p, n.clone().add(V(0, -1, 0)), c.H * .17, c.R * .13)); break;
    case "fringe":                                 // mái ngố dày
      cap(1.9); fringe(c.H * .3, 3); crown(8, c.H * .22, .7); break;
    case "bob":                                    // bob ngang cằm
      cap(2.0); fringe(c.H * .28, 2);
      ring(11, .15, 1.0, Math.PI * 2 - 1.0, 1.0, (p, n) => lock(p, V(n.x * .25, -1, n.z * .25), c.H * .55, c.R * .24, .45)); crown(8, c.H * .2, .6); break;
    case "long":                                   // tóc dài
      cap(2.0); fringe(c.H * .28, 2);
      ring(13, .15, .95, Math.PI * 2 - .95, 1.0, (p, n) => lock(p, V(n.x * .15, -1, n.z * .15), c.H * (.95 + .2 * Math.abs(Math.cos(Math.atan2(p.x, p.z)))), c.R * .24, .45)); crown(8, c.H * .2, .6); break;
  }
  return g;
}

/** nạp trước model tóc (nếu kiểu cần) để nhân vật dựng xong là có tóc ngay */
export const hairPreload = (kind: string): Promise<void> => kind === "anime" ? loadAnime().then(() => undefined).catch(() => undefined) : Promise.resolve();
