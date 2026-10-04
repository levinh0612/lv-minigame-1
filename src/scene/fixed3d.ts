/* Nhân vật 3D làm sẵn, giữ nguyên áo/tóc/màu của model (không đổi màu được). Mỗi nhân vật: một model đã nén (model.glb)
   và bộ chuyển động đứng/đi/ngồi đúc sẵn từ chuyển động của nhân vật nữ cũ (clips.json).
   - n1 "Nữ anime": “cute anime girl” của udream studio (CC BY 4.0)
   - n2 "Nữ cyber": “cyber girl” (bạn tải từ Sketchfab; giấy phép cần xác nhận)
   - n3 "Nữ Lynae": model 3D tạo dáng đứng (giấy phép cần xác nhận)
   - m1 "Nam đời thực": avatar kiểu Ready Player Me (giấy phép cần xác nhận)
   Phần dùng chung nằm ở figure3d.ts. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { headBind, headInfo, makeActor, type Assets, type FigureCfg } from "./figure3d";
import type { Actor, PersonLook, Pose } from "./people";

interface Def { dir: string; file: string; head: RegExp; headBone: string; h: number; seatY: number; seatZ: number }
const DEFS: Record<string, Def> = {
  n1: { dir: "anime-girl", file: "", head: /^Head_/, headBone: "Head_47", h: 1.5, seatY: .1, seatZ: 0 },
  n2: { dir: "cyber-girl", file: "", head: /^head_/, headBone: "head_08", h: 1.55, seatY: .1, seatZ: 0 },
  n3: { dir: "lynae", file: "", head: /^Bip001Head_/, headBone: "Bip001Head_011", h: 1.6, seatY: .1, seatZ: 0 },
  n4: { dir: "auto-girl", file: "", head: /^Head_/, headBone: "", h: 1.6, seatY: .1, seatZ: 0 },
  m1: { dir: "real-boy", file: "", head: /^Head_/, headBone: "Head_3", h: 1.6, seatY: .1, seatZ: 0 }
};
/** khách trong bộ "customer_all_characters" (low-poly): k4..k11, mỗi người một model + chuyển động riêng. Nam: k5, k6, k7 */
const GUEST_MALE = new Set(["k5", "k6", "k7"]);
for (let n = 4; n <= 11; n++) DEFS["k" + n] = { dir: "guests", file: "g" + n, head: /^spine006_/, headBone: "", h: GUEST_MALE.has("k" + n) ? 1.6 : 1.5, seatY: .1, seatZ: 0 };
/** nhân vật khối dự phòng (khi model 3D lỗi tải): m1 và khách nam dùng nam, còn lại dùng nữ */
export const fixedFallback = (sprite: string) => sprite[0] === "m" || GUEST_MALE.has(sprite) ? "b1" : "g1";
export const isFixed = (sprite: string) => sprite in DEFS;

const boneName = (root: THREE.Object3D, re: RegExp) => { let n = ""; root.traverse(o => { if (!n && (o as THREE.Bone).isBone && re.test(o.name)) n = o.name; }); return n; };
const cache: Record<string, Promise<Assets>> = {};
function load(id: string): Promise<Assets> {
  const d = DEFS[id]!, dir = `/models/${d.dir}/`;
  return cache[id] ??= (async () => {
    const [gl, clips] = await Promise.all([new GLTFLoader().loadAsync(dir + (d.file || "model") + ".glb"), fetch(dir + (d.file || "clips") + ".json").then(r => r.json())]);
    gl.scene.updateMatrixWorld(true);
    const sm = gl.scene.getObjectByProperty("isSkinnedMesh", true) as THREE.SkinnedMesh; sm.skeleton.update();
    const box = new THREE.Box3().setFromObject(gl.scene, true), clip = (k: string) => THREE.AnimationClip.parse(clips[k]);
    return { scene: gl.scene, idle: clip("idle"), walk: clip("walk"), sit: clip("sit"), tex: new THREE.Texture(), scale: d.h / (box.max.y - box.min.y), head: headInfo(gl.scene, d.head), bind: headBind(gl.scene, d.head), headBone: d.headBone || boneName(gl.scene, d.head) };
  })().catch(e => { delete cache[id]; throw e; });
}

const cfgOf = (id: string): FigureCfg => {
  const d = DEFS[id]!;
  return { key: "fixed-" + id, assets: () => load(id), glsl: "", plain: true, sitClip: false, shoesFollowShirt: false, mouthBind: [0, 0, 0], eyeBind: [0, 0, 0, 0], eyeRel: [0, 0], seatY: d.seatY, seatZ: d.seatZ,
    defaults: { coat: "#444", hair: "#ccc", pants: "#444", skin: "#fdd", shirt: "#fff" } };
};
export const fixedActor = (sprite: string, look: PersonLook, fallback: () => Actor): Actor => makeActor(cfgOf(sprite), look, fallback, "");

/** Một nhân vật đứng hoặc ngồi tĩnh (chủ tiệm, khách ngồi sẵn) */
export function fixedPerson(sprite: string, look: PersonLook, pose: Pose, fallback: () => Actor) {
  const a = fixedActor(sprite, look, fallback); a.mode(pose === "seat" ? "sit" : "idle"); if (pose === "seat") a.snap(); return a;
}
