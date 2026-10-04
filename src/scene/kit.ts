/* Bộ dựng chung cho cảnh 3D: vật liệu hoạt hình (toon) có viền nâu như nhân vật 2D, và hàm add() để ghép khối. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const INK = "#4A3438";
/** Mỗi mô hình trả về nhóm khối và hàm cập nhật chuyển động (chớp mắt, vẫy đuôi...) theo giây */
export interface Animated { group: THREE.Group; update: (t: number) => void }

let gradient: THREE.DataTexture | null = null;
const grad = () => {
  if (!gradient) { gradient = new THREE.DataTexture(new Uint8Array([105, 165, 220, 255]), 4, 1, THREE.RedFormat); gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true; }
  return gradient;
};
/** vật liệu hoạt hình 4 bậc sáng */
export const T = (color: THREE.ColorRepresentation, o: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad(), ...o });

/* viền = bản sao lật mặt, đẩy ra theo pháp tuyến */
const outlines: Partial<Record<Outline, THREE.MeshBasicMaterial>> = {};
export type Outline = "thin" | "mid" | "fat";
const THICK: Record<Outline, number> = { thin: .012, mid: .02, fat: .032 };
function outlineMat(k: Outline) {
  return outlines[k] ??= (() => {
    const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normalize(normal) * ${THICK[k].toFixed(4)};`); };
    return m;
  })();
}

export interface AddOpts { s?: [number, number, number]; r?: [number, number, number]; ol?: Outline | null; cast?: boolean; recv?: boolean }
/** thêm một khối vào `parent` tại (x, y, z); mặc định có viền vừa, đổ bóng và nhận bóng */
export function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, o: AddOpts = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (o.s) m.scale.set(...o.s);
  if (o.r) m.rotation.set(...o.r);
  geo.boundingSphere ?? geo.computeBoundingSphere();
  const rad = geo.boundingSphere!.radius * Math.max(m.scale.x, m.scale.y, m.scale.z);              // vật quá nhỏ: bỏ bóng đổ và viền (mắt thường không thấy, đỡ nặng máy)
  m.castShadow = o.cast !== false && rad > .09; m.receiveShadow = o.recv !== false;
  parent.add(m);
  if (o.ol !== null && rad > .045) { const ol = new THREE.Mesh(geo, outlineMat(o.ol ?? "mid")); ol.castShadow = false; ol.receiveShadow = false; m.add(ol); }
  return m;
}
/** hình cầu: vật nhỏ dùng ít mặt hơn (giảm số tam giác khi trong cảnh có hàng trăm khối nhỏ) */
export const SPH = (r: number, w = 20, h = 14) => { const f = r < .08 ? .5 : r < .15 ? .7 : 1; return new THREE.SphereGeometry(r, Math.max(8, Math.round(w * f)), Math.max(6, Math.round(h * f))); };
export const CAP = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 6, 14);
export const CYL = (a: number, b: number, h: number, n = 20) => new THREE.CylinderGeometry(a, b, h, n);
export const CONE = (r: number, h: number, n = 10) => new THREE.ConeGeometry(r, h, n);
export const RB = (w: number, h: number, d: number, r = .04) => new RoundedBoxGeometry(w, h, d, 2, r);
export const flat = (c: THREE.ColorRepresentation) => new THREE.MeshBasicMaterial({ color: c });

/** Mắt chibi: tròng tối, lòng màu, điểm sáng; má hồng và miệng nhỏ. `r` = bán kính đầu. Trả về hàm chớp mắt. */
export function face(head: THREE.Object3D, eyeCol: string, r = .34, o: { gap?: number; eyeSize?: number; mouth?: boolean } = {}): (t: number) => void {
  const gap = o.gap ?? .4, sz = o.eyeSize ?? 1, eyes: THREE.Group[] = [];
  ([-1, 1] as const).forEach(s => {
    const e = new THREE.Group(); e.position.set(s * r * gap, -.02 * r / .34, r * .9); head.add(e); eyes.push(e);
    add(e, SPH(.065 * sz, 14, 12), T("#2A1E22"), 0, 0, 0, { s: [1, 1.3, .55], ol: null });
    add(e, SPH(.042 * sz, 12, 10), T(eyeCol, { emissive: new THREE.Color(eyeCol), emissiveIntensity: .25 }), 0, -.012, .018, { s: [1, 1.3, .5], ol: null });
    add(e, SPH(.02 * sz, 8, 6), flat("#fff"), s * .012 + .012, .035 * sz, .04, { ol: null });
    add(head, SPH(.05, 10, 8), T("#FF9FB6", { transparent: true, opacity: .75 }), s * r * .62, -.1 * r / .34, r * .78, { s: [1.2, .6, .4], ol: null, cast: false });
  });
  if (o.mouth !== false) add(head, new THREE.TorusGeometry(.035, .008, 6, 14, Math.PI), T("#B0485E"), 0, -.12 * r / .34, r * .96, { r: [0, 0, Math.PI], ol: null });
  return t => { const k = (t % 4.2) > 4.05 ? .1 : 1; eyes.forEach(e => { e.scale.y = k; }); };
}

/* ---------- mặt nhân vật kiểu anime: mắt, chân mày, má hồng vẽ bằng texture dán lên đầu ---------- */
const decals = new Map<string, THREE.CanvasTexture>();
function decal(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  let t = decals.get(key);
  if (!t) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!); t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; decals.set(key, t); }
  return t;
}
/** mắt to: viền tối, tròng có chuyển màu, đồng tử, hai điểm sáng, mi trên đậm có đuôi (s = -1 mắt trái, 1 mắt phải) */
const eyeTex = (iris: string, s: 1 | -1) => decal(`eye${iris}${s}`, 128, 160, g => {
  g.translate(64, 84); g.scale(s, 1);
  g.fillStyle = "#2A1E22"; g.beginPath(); g.ellipse(0, 0, 56, 68, 0, 0, 7); g.fill();
  const gr = g.createLinearGradient(0, -60, 0, 64); gr.addColorStop(0, "#1B2A3C"); gr.addColorStop(.35, iris); gr.addColorStop(1, "#ffffffcc");
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 6, 46, 58, 0, 0, 7); g.fill();
  g.fillStyle = "#14101a"; g.beginPath(); g.ellipse(0, 0, 22, 30, 0, 0, 7); g.fill();
  g.fillStyle = "#fff"; g.beginPath(); g.ellipse(-16, -26, 15, 18, -.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(17, 26, 7, 8, 0, 0, 7); g.fill();
  g.strokeStyle = "#1B1218"; g.lineWidth = 11; g.lineCap = "round"; g.beginPath(); g.moveTo(-54, -2); g.quadraticCurveTo(-34, -74, 14, -72); g.quadraticCurveTo(46, -68, 56, -44); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(52, -46); g.lineTo(66, -58); g.stroke();                                   // đuôi mi
});
const browTex = (c: string) => decal("brow" + c, 96, 32, g => { g.strokeStyle = c; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(10, 22); g.quadraticCurveTo(48, 2, 86, 18); g.stroke(); });
const blushTex = () => decal("blush", 64, 40, g => { const gr = g.createRadialGradient(32, 20, 2, 32, 20, 30); gr.addColorStop(0, "rgba(255,120,150,.75)"); gr.addColorStop(1, "rgba(255,120,150,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 40); });

/** đặt tấm hình lên mặt cầu đầu (bán kính 0.34, dẹt 1.03 × 0.94 × 1) tại (x, y), hướng ra ngoài */
function onHead(head: THREE.Object3D, map: THREE.Texture, x: number, y: number, w: number, h: number, lift = .004) {
  const Rx = .34 * 1.03, Ry = .34 * .94, R = .34, k = 1 - (x / Rx) ** 2 - (y / Ry) ** 2, z = R * Math.sqrt(Math.max(.01, k)) + lift;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(x, y, z); m.lookAt(x * 2, y * 2, z * 2.3); head.add(m); return m;
}
/** mặt anime đầy đủ: hai mắt (chớp được), chân mày, má hồng, mũi, miệng. Trả về hàm chớp mắt. */
export function animeFace(head: THREE.Object3D, eyeCol: string, browCol = "#3a2a2a"): (t: number) => void {
  const eyes = ([-1, 1] as const).map(s => onHead(head, eyeTex(eyeCol, s), s * .135, -.035, .15, .19, .006));
  ([-1, 1] as const).forEach(s => { onHead(head, browTex(browCol), s * .14, .115, .12, .04, .003).rotation.z += s * .08; onHead(head, blushTex(), s * .215, -.115, .11, .07, .002); });
  add(head, SPH(.014, 8, 6), T("#E8A98C"), 0, -.085, .339, { ol: null, cast: false });
  add(head, new THREE.TorusGeometry(.04, .0085, 6, 14, Math.PI), T("#B0485E"), 0, -.115, .328, { r: [0, 0, Math.PI], ol: null });
  return t => { const k = (t % 4.2) > 4.05 ? .12 : 1; eyes.forEach(e => { e.scale.y = k; }); };
}

/** Gộp các khối tĩnh dưới `root` thành rất ít khối lớn (cùng vật liệu và cùng kiểu đổ bóng thì gộp một): từ hàng trăm lần vẽ còn vài chục.
    `skip`: các nhóm còn chuyển động hoặc được dựng lại (không đụng vào). `protect`: vật liệu mà code khác còn đổi màu/phát sáng (giữ nguyên, không trộn với vật liệu giống). */
export function mergeStatic(root: THREE.Object3D, skip: Set<THREE.Object3D>, protect: Set<THREE.Material>) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), canon = new Map<string, THREE.Material>();
  const hex = (c?: THREE.Color) => (c ? c.getHexString() : "-");
  const canonical = (m: THREE.Material): THREE.Material => {
    if (protect.has(m) || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile || m.userData.keep) return m;
    const a = m as THREE.MeshToonMaterial & THREE.MeshBasicMaterial;
    const key = [m.type, hex(a.color), hex(a.emissive), a.emissiveIntensity ?? 0, a.map?.uuid ?? "-", a.gradientMap?.uuid ?? "-", m.side, m.transparent, m.opacity, m.depthWrite, m.alphaTest, a.vertexColors].join("|");
    return canon.get(key) ?? (canon.set(key, m), m);
  };
  interface Bucket { mat: THREE.Material; cast: boolean; recv: boolean; geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }
  const buckets = new Map<string, Bucket>(), ids = new Map<THREE.Material, number>(), rel = new THREE.Matrix4();
  const visit = (o: THREE.Object3D) => {
    if (skip.has(o)) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh && !Array.isArray(m.material) && m.visible) {
      rel.multiplyMatrices(inv, m.matrixWorld);
      if (rel.determinant() > 0 && m.geometry.attributes.position && m.geometry.attributes.normal) {
        const mat = canonical(m.material as THREE.Material); if (!ids.has(mat)) ids.set(mat, ids.size);
        const key = `${ids.get(mat)}|${m.castShadow ? 1 : 0}|${m.receiveShadow ? 1 : 0}`;
        const b = buckets.get(key) ?? { mat, cast: m.castShadow, recv: m.receiveShadow, geos: [], meshes: [] }; buckets.set(key, b);
        const g = m.geometry.clone().applyMatrix4(rel);
        for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
        if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count * 2), 2));
        b.geos.push(g); b.meshes.push(m);
      }
    }
    o.children.slice().forEach(visit);
  };
  visit(root);
  buckets.forEach(b => {
    if (b.geos.length < 2) { b.geos.forEach(g => g.dispose()); return; }               // một khối lẻ: để nguyên
    const indexed = b.geos.every(g => g.index); if (!indexed) b.geos.forEach((g, i) => { if (g.index) b.geos[i] = g.toNonIndexed(); });
    const merged = mergeGeometries(b.geos, false); b.geos.forEach(g => g.dispose()); if (!merged) return;
    b.meshes.forEach(m => { m.removeFromParent(); });
    const mesh = new THREE.Mesh(merged, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.matrixAutoUpdate = false; root.add(mesh);
  });
}
