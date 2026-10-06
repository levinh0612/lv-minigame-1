/* Model 3D gacha/thú cưng dạng GLB: nạp 1 lần (cache), chuẩn hoá chiều cao, chân chạm y=0, mặt hướng +z. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Animated } from "./kit";

export interface PropCfg { h: number; ry?: number; fly?: number; still?: boolean; hide?: string[]; clip?: string | number; hideMat?: string[]; at?: number; range?: [number, number] }   // range: chỉ lặp đoạn clip từ a đến b (tỉ lệ 0..1), bỏ phần còn lại   // h: chiều cao (đơn vị cảnh), ry: xoay cho mặt về +z, fly: độ cao bay lơ lửng
export const PROPS: Record<string, PropCfg> = {
  siro: { h: .75, still: true }, cacao: { h: 1.1 }, cacao_cat: { h: .95 }, siamese: { h: .95, ry: Math.PI },
  baizhi: { h: 1.6 },
  g_tanjiro: { h: 1.5 }, g_violet: { h: 1.5, hide: ["Object_277", "Object_279", "Object_281", "Object_283"] }, g_goku: { h: 1.5 }, g_punchan: { h: 1.5 }, g_mizuki: { h: 1.5 }, g_kenji: { h: 1.5 }, g_gohan: { h: 1.4 }, g_samba: { h: 1.5 },
  g_nakroth: { h: 1.5, hideMat: ["EF"], hide: ["Object_513", "Object_519"], range: [.72, 1] },
  g_tsubasa: { h: 1.5, still: true, at: 0 }, g_naruto: { h: 1.5 }, g_elaina: { h: 1.5 }, g_ryo: { h: 1.5, ry: Math.PI },
  pet_chicken: { h: .8, clip: "stand" }, pet_frog: { h: .6, clip: "stand" }, pet_mouse: { h: .6, clip: "stand" }, pet_cat: { h: .8 }, pet_tako: { h: .8 },
  pet_leopard: { h: .8 }, pet_eagle: { h: 1.1, fly: .15 }, pet_rover: { h: .85, clip: "Pleased" }, pet_dragon1: { h: .9, clip: 1 },
  pet_dragon2: { h: 1.1, fly: .3, clip: 1 }, pet_panther: { h: 1, hide: ["Object_15", "Object_17", "Object_18"] },
  pet_blackcat: { h: .8 }, pet_graycat: { h: .85 }, pet_angel: { h: .9 }, pet_corgi: { h: 1 },
  phoenix: { h: .9, ry: -Math.PI / 2, fly: 1.1 }
};
const pick = (clips: THREE.AnimationClip[], cfg: PropCfg) => (typeof cfg.clip === "number" ? clips[cfg.clip] : cfg.clip ? clips.find(c => c.name.includes(cfg.clip as string)) : undefined) ?? clips[0]!;   // clip: tên (hoặc số thứ tự) clip đứng yên, mặc định clip đầu
type Loaded = { scene: THREE.Object3D; clips: THREE.AnimationClip[] };
const cache = new Map<string, Promise<Loaded>>();
const load = (id: string) => { let p = cache.get(id); if (!p) { p = new GLTFLoader().loadAsync(`/models/gacha/${id}.glb`).then(g => ({ scene: g.scene, clips: g.animations })); cache.set(id, p); } return p; };

/** kích thước thật sau khi chuẩn hoá (đơn vị cảnh); fly đã cộng vào h. Dùng để lấy khung hình vừa ô xem */
export interface PropAnim extends Animated { dims?: { w: number; h: number; d: number } }
/** khoảng cách camera (fov 30) và độ cao nhìn để cả chiều cao lẫn chiều rộng đều lọt khung vuông */
export const frameOf = (d: { w: number; h: number; d: number }) => ({ dist: Math.max(d.h, d.w, d.d) * 1.18 / 2 / Math.tan(Math.PI / 12), cy: d.h / 2 });
export function glbProp(id: string): PropAnim {
  const cfg = PROPS[id] ?? { h: 1 }, g = new THREE.Group(), holder = new THREE.Group(); g.add(holder);
  let mixer: THREE.AnimationMixer | null = null, last = -1, span = 0, allClips: THREE.AnimationClip[] = [];
  load(id).then(({ scene, clips: all }) => {
    const clips = cfg.clip === -1 ? [] : all; allClips = clips;   // clip -1: bỏ animation, dùng tư thế gốc của xương
    const m = clone(scene); const w = new THREE.Group(); w.add(m); w.rotation.y = cfg.ry ?? 0;
    if (cfg.hideMat) { const drop: THREE.Object3D[] = []; m.traverse(o => { const me = o as THREE.Mesh; if (me.isMesh && cfg.hideMat!.some(k => ((me.material as THREE.Material).name || "").includes(k))) drop.push(o); }); drop.forEach(o => o.removeFromParent()); }   // hideMat: bỏ mảnh có tên vật liệu chứa chuỗi này (hiệu ứng đi kèm model)
    if (cfg.hide) { const drop: THREE.Object3D[] = []; m.traverse(o => { if (cfg.hide!.includes(o.name)) drop.push(o); }); drop.forEach(o => o.removeFromParent()); }
    let mx: THREE.AnimationMixer | null = null;
    const b = new THREE.Box3(), tmp = new THREE.Box3();
    if (clips.length) {   // đo kích thước ở nhiều thời điểm của clip (xương gốc có thể là chữ T, tỉ lệ lệch, hoặc clip nhảy/đá làm cao hơn lúc đầu)
      const clip = pick(clips, cfg); mx = new THREE.AnimationMixer(m); mx.clipAction(clip).play();
      for (const f of cfg.still ? [cfg.at ?? .25] : cfg.range ? [cfg.range[0], (cfg.range[0] + cfg.range[1]) / 2, cfg.range[1]] : [0, .25, .5, .75]) { mx.setTime(clip.duration * f); w.updateMatrixWorld(true); b.union(tmp.setFromObject(w, true)); }
      mx.setTime(0);
    } else { w.updateMatrixWorld(true); b.setFromObject(w, true); }
    const s = cfg.h / Math.max(.001, b.max.y - b.min.y), c = b.getCenter(new THREE.Vector3());
    out.dims = { w: (b.max.x - b.min.x) * s, h: (b.max.y - b.min.y) * s + (cfg.fly ?? 0), d: (b.max.z - b.min.z) * s };
    m.scale.setScalar(s); m.position.set(-c.x * s, -b.min.y * s + (cfg.fly ?? 0), -c.z * s);
    w.traverse(o => { const me = o as THREE.Mesh; if (me.isMesh) { me.castShadow = false; me.frustumCulled = false; } });
    holder.add(w);
    if (mx) { if (cfg.still) { mx.setTime(pick(clips, cfg).duration * (cfg.at ?? .25)); mx.update(0); } else { mixer = mx; if (cfg.range) { const dur = pick(clips, cfg).duration; span = dur * (cfg.range[1] - cfg.range[0]); mx.setTime(dur * cfg.range[0]); } } }   // still: clip đi bộ có chuyển động gốc làm thú quay vòng, nên chỉ lấy 1 dáng
  }).catch(() => { });
  const out: PropAnim = {
    group: g,
    update: t => {
      if (mixer && span && cfg.range) { if (t - last >= .066) { mixer.setTime(pick(allClips, cfg).duration * cfg.range[0] + t % span); last = t; } } else if (mixer) { if (last < 0) { mixer.update(0); last = t; } else if (t - last >= .066) { mixer.update(Math.min(.15, t - last)); last = t; } } else last = t;   // chuyển động xương cập nhật ~15 lần/giây cho nhẹ máy
      if (cfg.fly) holder.position.y = Math.sin(t * 2) * .08; else holder.position.y = Math.sin(t * 1.6) * .008;
    }
  };
  return out;
}
