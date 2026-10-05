/* Model 3D gacha/thú cưng dạng GLB: nạp 1 lần (cache), chuẩn hoá chiều cao, chân chạm y=0, mặt hướng +z. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Animated } from "./kit";

export interface PropCfg { h: number; ry?: number; fly?: number; still?: boolean }   // h: chiều cao (đơn vị cảnh), ry: xoay cho mặt về +z, fly: độ cao bay lơ lửng
export const PROPS: Record<string, PropCfg> = {
  siro: { h: .75, still: true }, cacao: { h: 1.1 }, cacao_cat: { h: .95 }, siamese: { h: .95, ry: Math.PI },
  baizhi: { h: 1.6 },
  phoenix: { h: .9, ry: -Math.PI / 2, fly: 1.1 }
};
type Loaded = { scene: THREE.Object3D; clips: THREE.AnimationClip[] };
const cache = new Map<string, Promise<Loaded>>();
const load = (id: string) => { let p = cache.get(id); if (!p) { p = new GLTFLoader().loadAsync(`/models/gacha/${id}.glb`).then(g => ({ scene: g.scene, clips: g.animations })); cache.set(id, p); } return p; };
export const preloadProp = (id: string) => { void load(id).catch(() => { }); };

export function glbProp(id: string): Animated {
  const cfg = PROPS[id] ?? { h: 1 }, g = new THREE.Group(), holder = new THREE.Group(); g.add(holder);
  let mixer: THREE.AnimationMixer | null = null, last = -1;
  load(id).then(({ scene, clips }) => {
    const m = clone(scene); const w = new THREE.Group(); w.add(m); w.rotation.y = cfg.ry ?? 0; w.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(w, true), s = cfg.h / Math.max(.001, b.max.y - b.min.y), c = b.getCenter(new THREE.Vector3());
    m.scale.setScalar(s); m.position.set(-c.x * s, -b.min.y * s + (cfg.fly ?? 0), -c.z * s);
    w.traverse(o => { const me = o as THREE.Mesh; if (me.isMesh) { me.castShadow = false; me.frustumCulled = false; } });
    holder.add(w);
    if (clips.length) { const mx = new THREE.AnimationMixer(m); mx.clipAction(clips[0]).play(); if (cfg.still) { mx.setTime(clips[0]!.duration * .25); mx.update(0); } else mixer = mx; }   // still: clip đi bộ có chuyển động gốc làm thú quay vòng, nên chỉ lấy 1 dáng
  }).catch(() => { });
  return {
    group: g,
    update: t => {
      if (mixer) { mixer.update(last < 0 ? 0 : Math.min(.1, t - last)); } last = t;
      if (cfg.fly) holder.position.y = Math.sin(t * 2) * .08; else holder.position.y = Math.sin(t * 1.6) * .008;
    }
  };
}
