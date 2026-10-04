/* Ảnh đại diện chụp từ model 3D (đầu + vai), dùng cho thẻ hồ sơ và bảng chọn nhân vật.
   Một bộ vẽ nhỏ dùng chung, xếp hàng tuần tự; kết quả nhớ theo kiểu + màu. Trả null nếu máy không vẽ được 3D. */
import * as THREE from "three";
import { personActor, type PersonLook } from "./people";

let rd: THREE.WebGLRenderer | null | undefined, chain: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Promise<string | null>>(), SIZE = 256;

function renderer() {
  if (rd !== undefined) return rd;
  try { rd = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "low-power" }); rd.setSize(SIZE, SIZE, false); rd.setPixelRatio(1); }
  catch { rd = null; }
  return rd;
}

async function shoot(sprite: string, look: PersonLook): Promise<string | null> {
  const r = renderer(); if (!r) return null;
  const actor = personActor(look, sprite);
  try {
    if (!await Promise.race([actor.ready, new Promise<boolean>(res => setTimeout(() => res(false), 20000))])) return null;
    actor.update(0); actor.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(actor.group, true), hb = box.max.y - box.min.y, cy = box.max.y - hb * .27, hh = hb * .31;
    const scene = new THREE.Scene(); scene.add(actor.group);
    scene.add(new THREE.HemisphereLight("#fff6ec", "#b9a58c", 1.6)); const sun = new THREE.DirectionalLight("#fff", 1.2); sun.position.set(2, 4, 5); scene.add(sun);
    const cam = new THREE.OrthographicCamera(-hh, hh, hh, -hh, .1, 20); cam.position.set(0, cy, 6); cam.lookAt(0, cy, 0);
    r.setClearColor(0x000000, 0); r.render(scene, cam);
    return r.domElement.toDataURL("image/png");
  } catch { return null; }
  finally { actor.dispose(); }
}

/** ảnh data URL của nhân vật `sprite` với bộ màu `look` (null nếu không vẽ được) */
export function portrait3d(sprite: string, look: PersonLook): Promise<string | null> {
  const key = sprite + JSON.stringify(look);
  let p = cache.get(key);
  if (!p) { p = chain.then(() => shoot(sprite, look)); chain = p.catch(() => null); cache.set(key, p); void p.then(u => { if (!u) cache.delete(key); }); if (cache.size > 80) cache.delete(cache.keys().next().value!); }
  return p;
}
