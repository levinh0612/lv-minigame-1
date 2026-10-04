/* Nhân vật 3D có xương dùng chung cho nam và nữ: tải một lần, mỗi người là bản sao có xương riêng.
   Màu da, tóc, áo, quần, giày đổi ngay trên ảnh gốc bằng shader (mỗi nhân vật có đoạn nhận vùng màu riêng),
   giữ nguyên nếp vải, bóng đổ. Các trạng thái: đứng, đi, ngồi xuống, đứng dậy. */
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Actor, ActorMode, PersonLook } from "./people";

export interface Assets { scene: THREE.Group; idle: THREE.AnimationClip; walk: THREE.AnimationClip; sit: THREE.AnimationClip; tex: THREE.Texture; scale: number }
export interface FigureCfg {
  key: string;                         // khoá chương trình shader
  assets: () => Promise<Assets>;
  glsl: string;                        // đoạn thay #include <map_fragment>
  defaults: Required<Pick<PersonLook, "coat" | "hair" | "pants" | "skin" | "shirt">>;
  seatY: number; seatZ: number;        // độ dời để khớp mặt ghế cao 0.5 của cảnh
  sitClip: boolean;                    // true: clip ngồi có động tác ngồi xuống; false: clip ngồi tĩnh, chuyển mềm từ dáng đứng
}

/** khách đi tới điểm cách tâm ghế APPROACH về phía bàn rồi mới ngồi xuống (shop3d dùng cùng số này) */
export const APPROACH = .3;
export const rgb = (hex: string) => { const n = parseInt(hex.replace("#", ""), 16); return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };
export const GLSL_HEAD = `varying vec3 vBind; uniform vec3 uJ, uH, uP, uS, uT, uF;
vec3 rgb2hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }`;

/** bỏ chuyển động tiến của hông (game tự điều khiển vị trí) và các track tỉ lệ; rootAxes = chỉ số trục ngang trong khung xương */
export const inPlace = (c: THREE.AnimationClip, rootAxes: [number, number], keepRoot = false) => {
  c.tracks = c.tracks.filter(t => !/\.scale$/.test(t.name));
  if (!keepRoot) c.tracks.forEach(t => { if (/Hips\.position$/.test(t.name)) { const v = t.values; for (let i = 0; i < v.length; i += 3) rootAxes.forEach(a => { v[i + a] = v[a]; }); } });
  return c;
};

function material(cfg: FigureCfg, tex: THREE.Texture, look: PersonLook) {
  const d = cfg.defaults;
  const U = { uJ: { value: rgb(look.coat || d.coat) }, uH: { value: rgb(look.hair || d.hair) }, uP: { value: rgb(look.pants || d.pants) },
    uS: { value: rgb(look.skin || d.skin) }, uT: { value: rgb(look.shirt || d.shirt) }, uF: { value: rgb(look.shoes || look.shirt || d.shirt) } };
  const m = new THREE.MeshLambertMaterial({ map: tex });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vBind;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvBind = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GLSL_HEAD).replace("#include <map_fragment>", cfg.glsl);
  };
  m.customProgramCacheKey = () => cfg.key;
  return m;
}

/** Nhân vật có nhiều trạng thái. `fallback` dùng khi tải model lỗi (nhân vật khối cũ). */
export function makeActor(cfg: FigureCfg, look: PersonLook, fallback: () => Actor): Actor {
  interface Rt { model: THREE.Group; mixer: THREE.AnimationMixer; idle: THREE.AnimationAction; walk: THREE.AnimationAction; sit: THREE.AnimationAction; baseY: number; dur: number; cur: ActorMode | null; mats: THREE.Material[] }
  const group = new THREE.Group(); let rt: Rt | null = null, inner: Actor | null = null, want: ActorMode = "idle", snap = false, last = -1, blend = 0;
  const actOf = (r: Rt, m: ActorMode) => m === "walk" ? r.walk : m === "idle" ? r.idle : r.sit;
  const go = (m: ActorMode) => {
    if (!rt) return; const act = actOf(rt, m), prev = rt.cur ? actOf(rt, rt.cur) : null;
    act.reset(); act.enabled = true;
    if (cfg.sitClip && (m === "sit" || m === "getup")) { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.timeScale = m === "sit" ? 1 : -1; act.time = m === "sit" ? 0 : rt.dur; }
    else { act.setLoop(THREE.LoopRepeat, Infinity); act.timeScale = 1; }
    act.play(); if (prev && prev !== act) act.crossFadeFrom(prev, cfg.sitClip ? .2 : .5, false);
    rt.cur = m;
    if (snap && m === "sit") { [rt.idle, rt.walk].forEach(a => a.stop()); act.setEffectiveWeight(1); if (cfg.sitClip) act.time = rt.dur; blend = 1; rt.mixer.update(0); }
  };
  cfg.assets().then(a => {
    const model = clone(a.scene) as THREE.Group; model.scale.setScalar(a.scale); const mats: THREE.Material[] = [];
    model.traverse(o => { const sm = o as THREE.SkinnedMesh; if (sm.isSkinnedMesh) { sm.material = material(cfg, a.tex, look); mats.push(sm.material); sm.castShadow = true; sm.frustumCulled = false; } });
    const mixer = new THREE.AnimationMixer(model), idle = mixer.clipAction(a.idle), walk = mixer.clipAction(a.walk), sit = mixer.clipAction(a.sit);
    idle.play(); mixer.update(0); model.updateMatrixWorld(true);
    rt = { model, mixer, idle, walk, sit, baseY: -new THREE.Box3().setFromObject(model, true).min.y, dur: a.sit.duration, cur: null, mats };
    model.position.y = rt.baseY; group.add(model); go(want);
  }).catch(() => { inner = fallback(); inner.mode(want); group.add(inner.group); });
  return {
    group,
    update(t) {
      if (inner) return inner.update(t);
      if (!rt) return; const dt = last < 0 ? 0 : Math.min(t - last, .1); last = t; rt.mixer.update(dt);
      let f = 0;
      if (cfg.sitClip) f = rt.cur === "sit" || rt.cur === "getup" ? Math.max(0, Math.min(1, rt.sit.time / rt.dur)) : 0;
      else { const target = rt.cur === "sit" ? 1 : 0; blend += Math.sign(target - blend) * Math.min(Math.abs(target - blend), dt / .6); f = blend; }
      const seated = rt.cur === "sit" || rt.cur === "getup";       // nhóm đặt ở tâm ghế: đứng cách ghế APPROACH, ngồi thì tiến dần tới seatZ
      rt.model.position.set(0, rt.baseY + cfg.seatY * f, seated ? APPROACH + (cfg.seatZ - APPROACH) * f : 0);
    },
    mode(m) { want = m; if (inner) inner.mode(m); else go(m); },
    done() {
      if (inner) return inner.done(); if (!rt) return false;
      if (cfg.sitClip) return rt.cur === "sit" ? rt.sit.time >= rt.dur - .03 : rt.cur === "getup" ? rt.sit.time <= .03 : true;
      return rt.cur === "sit" ? blend >= .98 : rt.cur === "getup" ? blend <= .02 : true;
    },
    snap() { snap = true; if (inner) inner.snap(); else if (rt && rt.cur === "sit") { [rt.idle, rt.walk].forEach(a => a.stop()); rt.sit.setEffectiveWeight(1); if (cfg.sitClip) rt.sit.time = rt.dur; blend = 1; rt.mixer.update(0); } },
    dispose() { if (rt) rt.mats.forEach(m => m.dispose()); }
  };
}
