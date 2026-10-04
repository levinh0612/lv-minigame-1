/* Nhân vật nữ 3D có sẵn (model "Girl 38" từ bộ Textures + Animations, xương và chuyển động Mixamo).
   Chuyển động lấy từ file FBX đã đổi sang JSON (public/models/girl-lo/clips.json), hông đã đổi sang khung xương của bản GLB.
   Phần dùng chung nằm ở figure3d.ts. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { inPlace, makeActor, type Assets, type FigureCfg } from "./figure3d";
import type { Actor, PersonLook, Pose } from "./people";

const DIR = "/models/girl-lo/", H = 1.5;
let assets: Promise<Assets> | null = null;
function load(): Promise<Assets> {
  return assets ??= (async () => {
    const [gl, tex, clips] = await Promise.all([new GLTFLoader().loadAsync(DIR + "mesh.glb"), new THREE.TextureLoader().loadAsync(DIR + "tex.jpg"), fetch(DIR + "clips.json").then(r => r.json())]);
    tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    gl.scene.updateMatrixWorld(true);
    const sm = gl.scene.getObjectByProperty("isSkinnedMesh", true) as THREE.SkinnedMesh; sm.skeleton.update();
    const box = new THREE.Box3().setFromObject(gl.scene, true), clip = (k: string, keep = false) => inPlace(THREE.AnimationClip.parse(clips[k]), [0, 1], keep);
    return { scene: gl.scene, idle: clip("idle"), walk: clip("walk"), sit: clip("sit", true), tex, scale: H / (box.max.y - box.min.y) };
  })().catch(e => { assets = null; throw e; });
}

/* ảnh màu: tóc nâu, mũ len + tay áo + viền giày màu cam (áo trong), áo khoác xanh rêu (áo khoác), quần nâu, da; hoodie trắng giữ nguyên */
const GLSL = `#include <map_fragment>
{ vec3 s = pow(max(diffuseColor.rgb, 0.), vec3(1./2.2)); vec3 hv = rgb2hsv(s); float h = hv.x*360., sa = hv.y, v = hv.z, y = vBind.y;
  float jk = smoothstep(55.,68.,h)*(1.-smoothstep(120.,135.,h))*smoothstep(.15,.28,sa)*smoothstep(.3,.4,y)*(1.-smoothstep(.62,.7,y));
  float ac = smoothstep(26.,32.,h)*(1.-smoothstep(46.,54.,h))*smoothstep(.45,.6,sa)*smoothstep(.5,.65,v);
  float hr = (1.-smoothstep(30.,40.,h))*smoothstep(.3,.42,sa)*(1.-smoothstep(.45,.55,v))*smoothstep(.55,.62,y)*clamp(smoothstep(.76,.8,y)+step(vBind.z,0.),0.,1.)*(1.-ac);
  float pt = (1.-smoothstep(30.,40.,h))*smoothstep(.35,.5,sa)*(1.-smoothstep(.4,.5,v))*(1.-smoothstep(.5,.58,y))*smoothstep(.08,.14,y);
  float sk = smoothstep(6.,12.,h)*(1.-smoothstep(32.,40.,h))*smoothstep(.1,.18,sa)*(1.-smoothstep(.5,.6,sa))*smoothstep(.6,.7,v)*(1.-ac)*(1.-hr)*(1.-pt);
  vec3 o = mix(s, uJ*(v/.4), jk); o = mix(o, uT*clamp(v/.78,.4,1.2), ac); o = mix(o, uH*(v/.38), hr); o = mix(o, uP*clamp(v/.36,.4,1.3), pt);
  o = mix(o, clamp(s*(uS/vec3(.93,.75,.66)),0.,1.), sk);
  diffuseColor.rgb = pow(clamp(o,0.,1.), vec3(2.2)); }`;

const CFG: FigureCfg = {
  key: "girl3d", assets: load, glsl: GLSL, sitClip: false, seatY: .22, seatZ: -.02,
  defaults: { coat: "#5B6F34", hair: "#6B4A3A", pants: "#6B3F22", skin: "#F0C0A8", shirt: "#E8A23B" }
};
export const girlActor = (look: PersonLook, fallback: () => Actor): Actor => makeActor(CFG, look, fallback);

/** Một nhân vật nữ đứng hoặc ngồi tĩnh */
export function girlPerson(look: PersonLook, pose: Pose, fallback: () => Actor) {
  const a = girlActor(look, fallback); a.mode(pose === "seat" ? "sit" : "idle"); if (pose === "seat") a.snap(); return a;
}
