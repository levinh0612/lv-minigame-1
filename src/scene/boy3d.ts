/* Nhân vật nam 3D có sẵn (model "Basemesh_sd_boy" của phurit2014, CC BY 4.0; xương + animation Mixamo).
   Đầu phóng to cho giống chibi của nữ. Phần dùng chung nằm ở figure3d.ts. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLSL_FACE, headBind, headInfo, inPlace, makeActor, type Assets, type FigureCfg } from "./figure3d";
import type { Actor, PersonLook, Pose } from "./people";

const DIR = "/models/boy-lo/", H = 1.55, HEAD_K = 1.95;   // chiều cao trong cảnh, hệ số phóng đầu
let assets: Promise<Assets> | null = null;
function load(): Promise<Assets> {
  return assets ??= (async () => {
    const gl = new GLTFLoader(), [a, w, s, tex] = await Promise.all([gl.loadAsync(DIR + "idle.glb"), gl.loadAsync(DIR + "walk.glb"), gl.loadAsync(DIR + "sit.glb"), new THREE.TextureLoader().loadAsync(DIR + "tex.jpg")]);
    tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    a.scene.traverse(o => { if (/Head$/.test(o.name)) o.scale.setScalar(HEAD_K); });     // đầu to kiểu chibi
    a.scene.updateMatrixWorld(true);
    const sm = a.scene.getObjectByProperty("isSkinnedMesh", true) as THREE.SkinnedMesh; sm.skeleton.update();
    const head = headInfo(a.scene), bind = headBind(a.scene);
    const box = new THREE.Box3().setFromObject(a.scene, true);
    const bald = baldGeo(sm, tex, head, bind);
    return { bald, scene: a.scene, idle: inPlace(a.animations[0], [0, 2]), walk: inPlace(w.animations[0], [0, 2]), sit: inPlace(s.animations[0], [0, 2], true), tex, scale: H / (box.max.y - box.min.y), head, bind, headBone: "mixamorigHead" };
  })().catch(e => { assets = null; throw e; });
}

const GLSL = `#include <map_fragment>
{ vec3 s = pow(max(diffuseColor.rgb, 0.), vec3(1./2.2)); vec3 hv = rgb2hsv(s); float h = hv.x*360., sa = hv.y, v = hv.z, y = vBind.y;
  float jk = smoothstep(180.,195.,h)*(1.-smoothstep(235.,250.,h))*smoothstep(.15,.3,sa)*smoothstep(-.25,-.1,y);
  float hr = (1.-smoothstep(32.,42.,h))*smoothstep(.25,.4,sa)*(1.-smoothstep(.55,.65,v))*smoothstep(.55,.65,y)*clamp(smoothstep(.67,.7,y)+step(vBind.z,0.),0.,1.);
  float pt = (1.-smoothstep(.28,.34,v))*(1.-smoothstep(.35,.45,sa))*smoothstep(-.88,-.8,y)*(1.-smoothstep(-.06,0.,y));
  float sk = smoothstep(2.,8.,h)*(1.-smoothstep(38.,48.,h))*smoothstep(.18,.28,sa)*(1.-smoothstep(.62,.72,sa))*smoothstep(.62,.72,v)*(1.-hr)*(1.-jk);
  float tee = (1.-smoothstep(.1,.18,sa))*smoothstep(.62,.78,v)*smoothstep(-.12,-.02,y)*(1.-smoothstep(.5,.58,y));
  float sh = (1.-smoothstep(-.86,-.8,y))*smoothstep(.22,.34,v)*(1.-sk);
  vec3 o = mix(s, uJ*(v/.5), jk); o = mix(o, uH*(v/.38), hr); o = mix(o, uP*clamp(v/.2,.45,1.4), pt);
  o = mix(o, clamp(s*(uS/vec3(.93,.68,.55)),0.,1.), sk); o = mix(o, uT*clamp(v/.85,.3,1.1), tee); o = mix(o, uF*clamp(v/.7,.35,1.25), sh);
  o = mix(o, uE*clamp(v/.32,.3,1.3), eyeMask(h, sa, v));${GLSL_FACE}
  diffuseColor.rgb = pow(clamp(o,0.,1.), vec3(2.2)); }`;

const CFG: FigureCfg = {
  key: "boy3d2", assets: load, glsl: GLSL, sitClip: true, shoesFollowShirt: true, mouthBind: [-.33, .16, .09], eyeBind: [-.15, .28, .14, .064], eyeRel: [-.15, .46], seatY: .1, seatZ: .3,
  defaults: { coat: "#4F86A8", hair: "#8A4A30", pants: "#2A2A33", skin: "#EBAD8C", shirt: "#F4F4F4" }
};
export const boyActor = (look: PersonLook, fallback: () => Actor, style = ""): Actor => makeActor(CFG, look, fallback, style);

/** Một nhân vật nam đứng hoặc ngồi tĩnh (chủ tiệm, khách ngồi sẵn) */
export function boyPerson(look: PersonLook, pose: Pose, fallback: () => Actor, style = "") {
  const a = boyActor(look, fallback, style); a.mode(pose === "seat" ? "sit" : "idle"); if (pose === "seat") a.snap(); return a;
}

/** bản hình học không có tóc gốc: nhận các tam giác tóc theo màu texture ở phần trên đầu (tóc là phần "nắp" của đầu) */
function baldGeo(sm: THREE.SkinnedMesh, tex: THREE.Texture, _head: unknown, bind: { c: THREE.Vector3; s: THREE.Vector3 }): THREE.BufferGeometry | undefined {
  try {
    const img = tex.image as CanvasImageSource & { width: number; height: number }, cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext("2d")!; cx.drawImage(img, 0, 0); const px = cx.getImageData(0, 0, cv.width, cv.height).data;
    const g = sm.geometry, pos = g.attributes.position!, uv = g.attributes.uv!, idx = g.index!, top = bind.c.y + bind.s.y / 2, bot = bind.c.y - bind.s.y / 2, hair = new Uint8Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = Math.min(cv.width - 1, Math.max(0, Math.floor(uv.getX(i) * cv.width))), y = Math.min(cv.height - 1, Math.max(0, Math.floor(uv.getY(i) * cv.height))), o = (y * cv.width + x) * 4;
      const r = px[o]! / 255, gg = px[o + 1]! / 255, b = px[o + 2]! / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn;
      const h = d ? (mx === r ? ((gg - b) / d + 6) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4) * 60 : 0, s = mx ? d / mx : 0;
      hair[i] = (pos.getY(i) - bot) / (top - bot) > .52 && h < 42 && s > .25 && mx < .7 ? 1 : 0;
    }
    const keep: number[] = [];
    for (let t = 0; t < idx.count; t += 3) { const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2); if (hair[a]! + hair[b]! + hair[c]! < 2) keep.push(a, b, c); }
    const out = g.clone(); out.setIndex(keep); return out;
  } catch { return undefined; }
}
