/* Nhân vật 3D có xương dùng chung cho nam và nữ: tải một lần, mỗi người là bản sao có xương riêng.
   Màu da, tóc, áo, quần, giày đổi ngay trên ảnh gốc bằng shader (mỗi nhân vật có đoạn nhận vùng màu riêng),
   giữ nguyên nếp vải, bóng đổ. Các trạng thái: đứng, đi, ngồi xuống, đứng dậy. */
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { buildStyle } from "./accessories";
import type { Actor, ActorMode, PersonLook } from "./people";

export interface Assets { scene: THREE.Group; idle: THREE.AnimationClip; walk: THREE.AnimationClip; sit: THREE.AnimationClip; tex: THREE.Texture; scale: number; head: { c: THREE.Vector3; s: THREE.Vector3 }; bind: { c: THREE.Vector3; s: THREE.Vector3 }; headBone: string }
export interface FigureCfg {
  key: string;                         // khoá chương trình shader
  assets: () => Promise<Assets>;
  glsl: string;                        // đoạn thay #include <map_fragment>
  defaults: Required<Pick<PersonLook, "coat" | "hair" | "pants" | "skin" | "shirt">>;
  eyeRel: [number, number];            // (kính) vị trí mắt so với tâm đầu: [dọc theo chiều cao đầu, ra trước theo chiều sâu]
  mouthBind: [number, number, number];  // [dọc, nửa rộng, nửa cao khi mở] của miệng theo đầu (toạ độ gốc)
  eyeBind: [number, number, number, number]; // (đổi màu mắt) [dọc, ngang, bán kính, lệch tâm mặt] theo nửa bề rộng đầu, trong toạ độ gốc của mesh            // vị trí mắt so với tâm đầu (tỉ lệ theo chiều cao, chiều sâu đầu) để đặt kính
  shoesFollowShirt: boolean;           // nam: giày theo màu áo trong; nữ: giày mặc định màu kem
  seatY: number; seatZ: number;        // độ dời để khớp mặt ghế cao 0.5 của cảnh
  sitClip: boolean;                    // true: clip ngồi có động tác ngồi xuống; false: clip ngồi tĩnh, chuyển mềm từ dáng đứng
}

/** khách đi tới điểm cách tâm ghế APPROACH về phía bàn rồi mới ngồi xuống (shop3d dùng cùng số này) */
export const APPROACH = .3;
export const rgb = (hex: string) => { const n = parseInt(hex.replace("#", ""), 16); return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };
export const GLSL_HEAD = `varying vec3 vBind; uniform vec3 uJ, uH, uP, uS, uT, uF, uE; uniform vec4 uEc, uMc; uniform float uEz, uBlink, uMo; uniform vec3 uLid;
/* mắt: hai đĩa quanh vị trí mắt ở nửa trước đầu, chỉ lấy điểm ảnh tròng nâu (giữ nguyên con ngươi đen và tròng trắng) */
float eyeMask(float h, float sa, float v){ vec2 q = vec2(abs(vBind.x - uEc.x) - uEc.z, vBind.y - uEc.y); return step(uEz, vBind.z) * (1. - smoothstep(uEc.w * .75, uEc.w, length(q))) * (1. - smoothstep(.45, .55, v)) * smoothstep(.12, .18, v) * smoothstep(.22, .32, sa) * (1. - smoothstep(40., 50., h)) * step(.001, uEc.w); }
vec3 rgb2hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }`;

/** chớp mắt (mí che từ trên xuống trong vùng mắt) và miệng mở khi "nói"; chèn sau khi đã đổi màu, o là màu sRGB */
export const GLSL_FACE = `
  { vec2 q = vec2(abs(vBind.x - uEc.x) - uEc.z, vBind.y - uEc.y); float ra = uEc.w * 1.9;
    float ea = step(uEz, vBind.z) * step(.001, uEc.w) * step(.02, uBlink) * (1. - smoothstep(ra * .85, ra, length(q)));
    float edge = uEc.y + ra * (1. - 2. * uBlink);
    o = mix(o, uLid, ea * step(edge, vBind.y));
    o = mix(o, vec3(.2,.1,.09), ea * (1. - smoothstep(0., ra * .16, abs(vBind.y - edge))) * step(vBind.y, edge + ra * .1)); }
  { vec2 mq = vec2((vBind.x - uMc.x) / uMc.z, (vBind.y - uMc.y) / max(uMc.w * uMo, .0001)); float md = length(mq);
    float mm = step(uEz, vBind.z) * step(.001, uMc.w) * step(.03, uMo) * (1. - smoothstep(.8, 1., md));
    o = mix(o, mix(vec3(.42,.1,.14), vec3(.9,.42,.5), smoothstep(.1, .85, -mq.y)), mm); }`;

/** bỏ chuyển động tiến của hông (game tự điều khiển vị trí) và các track tỉ lệ; rootAxes = chỉ số trục ngang trong khung xương */
export const inPlace = (c: THREE.AnimationClip, rootAxes: [number, number], keepRoot = false) => {
  c.tracks = c.tracks.filter(t => !/\.scale$/.test(t.name));
  if (!keepRoot) c.tracks.forEach(t => { if (/Hips\.position$/.test(t.name)) { const v = t.values; for (let i = 0; i < v.length; i += 3) rootAxes.forEach(a => { v[i + a] = v[a]; }); } });
  return c;
};

/** hộp bao đầu (các đỉnh gắn xương đầu nhiều nhất) trong khung của cảnh gốc, tính ở tư thế mặc định */
export function headInfo(scene: THREE.Object3D) {
  const sm = scene.getObjectByProperty("isSkinnedMesh", true) as THREE.SkinnedMesh; scene.updateMatrixWorld(true); sm.skeleton.update();
  const g = sm.geometry, si = g.attributes.skinIndex!, sw = g.attributes.skinWeight!, bones = sm.skeleton.bones, box = new THREE.Box3(), v = new THREE.Vector3();
  for (let i = 0; i < g.attributes.position!.count; i++) { let m = 0, mi = 0; for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > m) { m = sw.getComponent(i, k); mi = si.getComponent(i, k); } if (/Head$/.test(bones[mi]!.name)) { sm.getVertexPosition(i, v); box.expandByPoint(v.applyMatrix4(sm.matrixWorld)); } }
  return { c: box.getCenter(new THREE.Vector3()), s: box.getSize(new THREE.Vector3()) };
}

/** hộp bao đầu theo toạ độ gốc của mesh (chưa xương, chưa phóng đầu): dùng để định vị mắt trong shader */
export function headBind(scene: THREE.Object3D) {
  const sm = scene.getObjectByProperty("isSkinnedMesh", true) as THREE.SkinnedMesh, g = sm.geometry, si = g.attributes.skinIndex!, sw = g.attributes.skinWeight!, bones = sm.skeleton.bones, box = new THREE.Box3(), v = new THREE.Vector3();
  for (let i = 0; i < g.attributes.position!.count; i++) { let m = 0, mi = 0; for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > m) { m = sw.getComponent(i, k); mi = si.getComponent(i, k); } if (/Head$/.test(bones[mi]!.name)) box.expandByPoint(v.fromBufferAttribute(g.attributes.position!, i)); }
  return { c: box.getCenter(new THREE.Vector3()), s: box.getSize(new THREE.Vector3()) };
}

function material(cfg: FigureCfg, tex: THREE.Texture, look: PersonLook, bind: Assets["bind"]) {
  const mc = new THREE.Vector4(bind.c.x + (bind.s.x / 2) * cfg.eyeBind[3], bind.c.y + cfg.mouthBind[0] * bind.s.y, (bind.s.x / 2) * cfg.mouthBind[1], (bind.s.x / 2) * cfg.mouthBind[2]);
  const d = cfg.defaults, R = bind.s.x / 2, ec = look.eye ? new THREE.Vector4(bind.c.x + R * cfg.eyeBind[3], bind.c.y + cfg.eyeBind[0] * bind.s.y, R * cfg.eyeBind[1], R * cfg.eyeBind[2]) : new THREE.Vector4(0, 0, 0, 0);
  const U = { uJ: { value: rgb(look.coat || d.coat) }, uH: { value: rgb(look.hair || d.hair) }, uP: { value: rgb(look.pants || d.pants) },
    uS: { value: rgb(look.skin || d.skin) }, uT: { value: rgb(look.shirt || d.shirt) }, uF: { value: rgb(look.shoes || (cfg.shoesFollowShirt ? look.shirt : "#F2E6D0") || d.shirt) }, uE: { value: rgb(look.eye || "#5FA6C9") }, uEc: { value: ec }, uEz: { value: bind.c.z }, uBlink: { value: 0 }, uMo: { value: 0 }, uMc: { value: mc }, uLid: { value: rgb(look.skin || d.skin).multiplyScalar(.97) } };
  const m = new THREE.MeshLambertMaterial({ map: tex });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vBind;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvBind = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GLSL_HEAD).replace("#include <map_fragment>", cfg.glsl);
  };
  m.customProgramCacheKey = () => cfg.key;
  m.userData.U = U;
  return m;
}

/** Nhân vật có nhiều trạng thái. `fallback` dùng khi tải model lỗi (nhân vật khối cũ). */
export function makeActor(cfg: FigureCfg, look: PersonLook, fallback: () => Actor, style = ""): Actor {
  interface Rt { model: THREE.Group; mixer: THREE.AnimationMixer; idle: THREE.AnimationAction; walk: THREE.AnimationAction; sit: THREE.AnimationAction; baseY: number; dur: number; cur: ActorMode | null; mats: THREE.Material[]; U: { uBlink: { value: number }; uMo: { value: number } } | null; headB: THREE.Object3D | null; spineB: THREE.Object3D | null }
  const group = new THREE.Group(); let rt: Rt | null = null, inner: Actor | null = null, want: ActorMode = "idle", snap = false, last = -1, blend = 0, finish: (ok: boolean) => void = () => 0;
  const ready = new Promise<boolean>(r => { finish = r; });
  /* sống động: chớp mắt, thỉnh thoảng mở miệng, đầu và thân lắc nhẹ, nhún người */
  const ph = Math.random() * 6.28, tq = new THREE.Quaternion(), te = new THREE.Euler();
  let nextBlink = 1 + Math.random() * 3, blinkAt = -1, nextTalk = 4 + Math.random() * 5, talkAt = -1;
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
    const model = clone(a.scene) as THREE.Group; model.scale.setScalar(a.scale); const mats: THREE.Material[] = []; a.tex.userData.keep = true;
    model.traverse(o => { const sm = o as THREE.SkinnedMesh; if (sm.isSkinnedMesh) { sm.geometry.userData.keep = true; sm.material = material(cfg, a.tex, look, a.bind); mats.push(sm.material); sm.castShadow = true; sm.frustumCulled = false; } });
    model.updateMatrixWorld(true);                                  // tư thế mặc định: tính vị trí phụ kiện trước khi chạy animation
    // kiểu đầu: phụ kiện gắn vào xương đầu, kích thước theo đầu thật
    const hb = a.head, k = a.scale, bone = model.getObjectByName(a.headBone);
    const acc = bone ? buildStyle(style, { R: hb.s.x / 2 * k, H: hb.s.y * k, D: hb.s.z * k, hair: look.hair || cfg.defaults.hair, coat: look.coat || cfg.defaults.coat, shirt: look.shirt || cfg.defaults.shirt, eyeY: hb.s.y * k * cfg.eyeRel[0], eyeZ: hb.s.z * k * cfg.eyeRel[1] }) : null;
    if (acc && bone) { const rig = new THREE.Group(); rig.matrixAutoUpdate = false; rig.matrix.copy(bone.matrixWorld).invert().multiply(new THREE.Matrix4().makeTranslation(hb.c.x * k, hb.c.y * k, hb.c.z * k)); rig.add(acc); bone.add(rig); }
    const mixer = new THREE.AnimationMixer(model), idle = mixer.clipAction(a.idle), walk = mixer.clipAction(a.walk), sit = mixer.clipAction(a.sit);
    idle.play(); mixer.update(0); model.updateMatrixWorld(true);
    rt = { model, mixer, idle, walk, sit, baseY: -new THREE.Box3().setFromObject(model, true).min.y, dur: a.sit.duration, cur: null, mats, U: (mats[0]?.userData.U as Rt["U"]) ?? null, headB: model.getObjectByName(a.headBone) ?? null, spineB: model.getObjectByName("mixamorigSpine1") ?? null };
    model.position.y = rt.baseY; group.add(model); go(want); finish(true);
  }).catch(e => { console.warn("Không dựng được nhân vật 3D, dùng nhân vật khối", e); inner = fallback(); inner.mode(want); group.add(inner.group); finish(false); });
  return {
    group,
    update(t) {
      if (inner) return inner.update(t);
      if (!rt) return; const dt = last < 0 ? 0 : Math.min(t - last, .1); last = t; rt.mixer.update(dt);
      const U = rt.U;
      if (U) {
        if (blinkAt < 0 && t > nextBlink) blinkAt = t;
        if (blinkAt >= 0) { const p = (t - blinkAt) / .2; if (p >= 1) { blinkAt = -1; nextBlink = t + 1.8 + Math.random() * 3.6; U.uBlink.value = 0; } else U.uBlink.value = p < .5 ? p * 2 : (1 - p) * 2; }
        if (talkAt < 0 && t > nextTalk) talkAt = t;
        if (talkAt >= 0) { const p = (t - talkAt) / 1.1; if (p >= 1) { talkAt = -1; nextTalk = t + 5 + Math.random() * 7; U.uMo.value = 0; } else U.uMo.value = Math.sin(p * Math.PI) * (.4 + .4 * Math.abs(Math.sin(t * 13))); }
      }
      const kw = rt.cur === "walk" ? .35 : 1;
      if (rt.headB) { te.set(Math.sin(t * .9 + ph) * .04 * kw, Math.sin(t * .55 + ph * 1.7) * .1 * kw, Math.sin(t * .7 + ph * 2.3) * .03 * kw); tq.setFromEuler(te); rt.headB.quaternion.multiply(tq); }
      if (rt.spineB) { te.set(0, 0, Math.sin(t * 1.1 + ph) * .018 * kw); tq.setFromEuler(te); rt.spineB.quaternion.multiply(tq); }
      let f = 0;
      if (cfg.sitClip) f = rt.cur === "sit" || rt.cur === "getup" ? Math.max(0, Math.min(1, rt.sit.time / rt.dur)) : 0;
      else { const target = rt.cur === "sit" ? 1 : 0; blend += Math.sign(target - blend) * Math.min(Math.abs(target - blend), dt / .6); f = blend; }
      const seated = rt.cur === "sit" || rt.cur === "getup";       // nhóm đặt ở tâm ghế: đứng cách ghế APPROACH, ngồi thì tiến dần tới seatZ
      rt.model.position.set(0, rt.baseY + cfg.seatY * f + Math.sin(t * 2.2 + ph) * .006, seated ? APPROACH + (cfg.seatZ - APPROACH) * f : 0);
    },
    mode(m) { want = m; if (inner) inner.mode(m); else go(m); },
    done() {
      if (inner) return inner.done(); if (!rt) return false;
      if (cfg.sitClip) return rt.cur === "sit" ? rt.sit.time >= rt.dur - .03 : rt.cur === "getup" ? rt.sit.time <= .03 : true;
      return rt.cur === "sit" ? blend >= .98 : rt.cur === "getup" ? blend <= .02 : true;
    },
    snap() { snap = true; if (inner) inner.snap(); else if (rt && rt.cur === "sit") { [rt.idle, rt.walk].forEach(a => a.stop()); rt.sit.setEffectiveWeight(1); if (cfg.sitClip) rt.sit.time = rt.dur; blend = 1; rt.mixer.update(0); } },
    dispose() { if (rt) rt.mats.forEach(m => m.dispose()); },
    ready
  };
}
