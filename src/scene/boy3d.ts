/* Nhân vật nam 3D có sẵn (model "Basemesh_sd_boy" của phurit2014, CC BY 4.0; xương + animation Mixamo).
   Đầu phóng to cho giống chibi của nữ. Màu da, tóc, áo khoác, áo trong, quần, giày đổi ngay trên ảnh gốc
   bằng shader: nhận vùng theo màu và độ cao trên cơ thể, giữ nguyên nếp vải, nút, bóng đổ.
   Tải một lần, mỗi nhân vật là một bản sao có xương riêng. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Actor, ActorMode, PersonLook, Pose } from "./people";

const DIR = "/models/boy-lo/", H = 1.55, HEAD_K = 1.95;   // chiều cao trong cảnh, hệ số phóng đầu
const SEAT_Z = .3, SEAT_Y = .1;                         // độ dời khi ngồi để khớp ghế cao 0.5 của cảnh
interface Assets { scene: THREE.Group; idle: THREE.AnimationClip; walk: THREE.AnimationClip; sit: THREE.AnimationClip; tex: THREE.Texture; scale: number }
let assets: Promise<Assets> | null = null;

/** bỏ chuyển động tiến của hông (game tự điều khiển vị trí) và các track tỉ lệ (để phóng đầu không bị ghi đè) */
const inPlace = (c: THREE.AnimationClip, keepRoot = false) => {
  c.tracks = c.tracks.filter(t => !/\.scale$/.test(t.name));
  if (!keepRoot) c.tracks.forEach(t => { if (/Hips\.position$/.test(t.name)) { const v = t.values; for (let i = 0; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; } } });
  return c;
};

function load(): Promise<Assets> {
  return assets ??= (async () => {
    const gl = new GLTFLoader(), [a, w, s, tex] = await Promise.all([gl.loadAsync(DIR + "idle.glb"), gl.loadAsync(DIR + "walk.glb"), gl.loadAsync(DIR + "sit.glb"), new THREE.TextureLoader().loadAsync(DIR + "tex.jpg")]);
    tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    a.scene.traverse(o => { if (/Head$/.test(o.name)) o.scale.setScalar(HEAD_K); });     // đầu to kiểu chibi
    a.scene.updateMatrixWorld(true);
    const sm = a.scene.getObjectByProperty("isSkinnedMesh", true) as THREE.SkinnedMesh; sm.skeleton.update();
    const box = new THREE.Box3().setFromObject(a.scene, true);
    return { scene: a.scene, idle: inPlace(a.animations[0]), walk: inPlace(w.animations[0]), sit: inPlace(s.animations[0], true), tex, scale: H / (box.max.y - box.min.y) };
  })().catch(e => { assets = null; throw e; });
}

const rgb = (hex: string) => { const n = parseInt(hex.replace("#", ""), 16); return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };
const GLSL_HEAD = `varying vec3 vBind; uniform vec3 uJ, uH, uP, uS, uT, uF;
vec3 rgb2hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }`;
const GLSL_MAP = `#include <map_fragment>
{ vec3 s = pow(max(diffuseColor.rgb, 0.), vec3(1./2.2)); vec3 hv = rgb2hsv(s); float h = hv.x*360., sa = hv.y, v = hv.z, y = vBind.y;
  float jk = smoothstep(180.,195.,h)*(1.-smoothstep(235.,250.,h))*smoothstep(.15,.3,sa)*smoothstep(-.25,-.1,y);
  float hr = (1.-smoothstep(32.,42.,h))*smoothstep(.25,.4,sa)*(1.-smoothstep(.55,.65,v))*smoothstep(.55,.65,y)*clamp(smoothstep(.67,.7,y)+step(vBind.z,0.),0.,1.);
  float pt = (1.-smoothstep(.28,.34,v))*(1.-smoothstep(.35,.45,sa))*smoothstep(-.88,-.8,y)*(1.-smoothstep(-.06,0.,y));
  float sk = smoothstep(2.,8.,h)*(1.-smoothstep(38.,48.,h))*smoothstep(.18,.28,sa)*(1.-smoothstep(.62,.72,sa))*smoothstep(.62,.72,v)*(1.-hr)*(1.-jk);
  float tee = (1.-smoothstep(.1,.18,sa))*smoothstep(.62,.78,v)*smoothstep(-.12,-.02,y)*(1.-smoothstep(.5,.58,y));
  float sh = (1.-smoothstep(-.86,-.8,y))*smoothstep(.22,.34,v)*(1.-sk);
  vec3 o = mix(s, uJ*(v/.5), jk); o = mix(o, uH*(v/.38), hr); o = mix(o, uP*clamp(v/.2,.45,1.4), pt);
  o = mix(o, clamp(s*(uS/vec3(.93,.68,.55)),0.,1.), sk); o = mix(o, uT*clamp(v/.85,.3,1.1), tee); o = mix(o, uF*clamp(v/.7,.35,1.25), sh);
  diffuseColor.rgb = pow(clamp(o,0.,1.), vec3(2.2)); }`;

function material(tex: THREE.Texture, look: PersonLook) {
  const U = { uJ: { value: rgb(look.coat || "#4F86A8") }, uH: { value: rgb(look.hair || "#8A4A30") }, uP: { value: rgb(look.pants || "#2A2A33") },
    uS: { value: rgb(look.skin || "#EBAD8C") }, uT: { value: rgb(look.shirt || "#F4F4F4") }, uF: { value: rgb(look.shoes || look.shirt || "#F2E6D0") } };
  const m = new THREE.MeshLambertMaterial({ map: tex });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vBind;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvBind = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GLSL_HEAD).replace("#include <map_fragment>", GLSL_MAP);
  };
  m.customProgramCacheKey = () => "boy3d2";
  return m;
}

/** Nhân vật nam có nhiều trạng thái: đứng, đi, ngồi xuống, đứng dậy. `fallback` dùng khi tải model lỗi (nhân vật khối cũ). */
export function boyActor(look: PersonLook, fallback: () => Actor): Actor {
  interface Rt { model: THREE.Group; mixer: THREE.AnimationMixer; idle: THREE.AnimationAction; walk: THREE.AnimationAction; sit: THREE.AnimationAction; baseY: number; dur: number; cur: ActorMode | null; mats: THREE.Material[] }
  const group = new THREE.Group(); let rt: Rt | null = null, inner: Actor | null = null, want: ActorMode = "idle", snap = false, last = -1;
  const go = (m: ActorMode) => {
    if (!rt) return; const act = m === "walk" ? rt.walk : m === "idle" ? rt.idle : rt.sit, prev = rt.cur ? (rt.cur === "walk" ? rt.walk : rt.cur === "idle" ? rt.idle : rt.sit) : null;
    act.reset(); act.enabled = true;
    if (m === "sit" || m === "getup") { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.timeScale = m === "sit" ? 1 : -1; act.time = m === "sit" ? 0 : rt.dur; }
    else { act.setLoop(THREE.LoopRepeat, Infinity); act.timeScale = 1; }
    act.play(); if (prev && prev !== act) act.crossFadeFrom(prev, .2, false);
    rt.cur = m;
    if (snap && m === "sit") { act.time = rt.dur; rt.mixer.update(0); }
  };
  load().then(a => {
    const model = clone(a.scene) as THREE.Group; model.scale.setScalar(a.scale); const mats: THREE.Material[] = [];
    model.traverse(o => { const sm = o as THREE.SkinnedMesh; if (sm.isSkinnedMesh) { sm.material = material(a.tex, look); mats.push(sm.material); sm.castShadow = true; sm.frustumCulled = false; } });
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
      const f = rt.cur === "sit" || rt.cur === "getup" ? Math.max(0, Math.min(1, rt.sit.time / rt.dur)) : 0;
      rt.model.position.set(0, rt.baseY + SEAT_Y * f, SEAT_Z * f);
    },
    mode(m) { want = m; if (inner) inner.mode(m); else go(m); },
    done() { if (inner) return inner.done(); if (!rt) return false; return rt.cur === "sit" ? rt.sit.time >= rt.dur - .03 : rt.cur === "getup" ? rt.sit.time <= .03 : true; },
    snap() { snap = true; if (inner) inner.snap(); else if (rt && rt.cur === "sit") { rt.sit.time = rt.dur; rt.mixer.update(0); } },
    dispose() { if (rt) rt.mats.forEach(m => m.dispose()); }
  };
}

/** Một nhân vật nam đứng hoặc ngồi tĩnh (chủ tiệm, khách ngồi sẵn) */
export function boyPerson(look: PersonLook, pose: Pose, fallback: () => Actor) {
  const a = boyActor(look, fallback); a.mode(pose === "seat" ? "sit" : "idle"); if (pose === "seat") a.snap(); return a;
}
