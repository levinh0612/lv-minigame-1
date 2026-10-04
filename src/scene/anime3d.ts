/* Nhân vật nữ anime 3D (model "cute anime girl" của udream studio, CC BY 4.0), bản đủ người, nén còn ~1,2MB.
   Giữ nguyên áo/tóc/màu của model (không đổi màu được). Chuyển động đúc sẵn từ chuyển động của nhân vật nữ cũ
   (public/models/anime-girl/clips.json). Phần dùng chung nằm ở figure3d.ts. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { headBind, headInfo, makeActor, type Assets, type FigureCfg } from "./figure3d";
import type { Actor, PersonLook, Pose } from "./people";

const DIR = "/models/anime-girl/", H = 1.5, HEAD = /^Head_/;
let assets: Promise<Assets> | null = null;
function load(): Promise<Assets> {
  return assets ??= (async () => {
    const [gl, clips] = await Promise.all([new GLTFLoader().loadAsync(DIR + "anime.glb"), fetch(DIR + "clips.json").then(r => r.json())]);
    gl.scene.updateMatrixWorld(true);
    const sm = gl.scene.getObjectByProperty("isSkinnedMesh", true) as THREE.SkinnedMesh; sm.skeleton.update();
    const box = new THREE.Box3().setFromObject(gl.scene, true), clip = (k: string) => THREE.AnimationClip.parse(clips[k]);
    return { scene: gl.scene, idle: clip("idle"), walk: clip("walk"), sit: clip("sit"), tex: new THREE.Texture(), scale: H / (box.max.y - box.min.y), head: headInfo(gl.scene, HEAD), bind: headBind(gl.scene, HEAD), headBone: "Head_47" };
  })().catch(e => { assets = null; throw e; });
}

const CFG: FigureCfg = {
  key: "anime3d", assets: load, glsl: "", plain: true, sitClip: false, shoesFollowShirt: false, mouthBind: [0, 0, 0], eyeBind: [0, 0, 0, 0], eyeRel: [0, 0], seatY: .1, seatZ: .0,
  defaults: { coat: "#444", hair: "#ccc", pants: "#444", skin: "#fdd", shirt: "#fff" }
};
export const animeActor = (look: PersonLook, fallback: () => Actor): Actor => makeActor(CFG, look, fallback, "");

/** Một nhân vật đứng hoặc ngồi tĩnh (chủ tiệm, khách ngồi sẵn) */
export function animePerson(look: PersonLook, pose: Pose, fallback: () => Actor) {
  const a = animeActor(look, fallback); a.mode(pose === "seat" ? "sit" : "idle"); if (pose === "seat") a.snap(); return a;
}
