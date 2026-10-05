/* Khung xem 3D nhỏ (canvas riêng, nền trong) cho model GLB: xoay chậm, dùng ở màn hiện vật phẩm to. Trả về hàm dọn dẹp. */
import * as THREE from "three";
import { glbProp, PROPS } from "./glbprop";
import { webglOK } from "./shop3d";

export function mountTurntable(host: HTMLElement, modelId: string, px: number): () => void {
  if (!webglOK()) return () => { };
  const cv = document.createElement("canvas"); cv.className = "gh-3d"; cv.style.cssText = `position:absolute;inset:0;width:${px}px;height:${px}px`;
  host.appendChild(cv);
  const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.setSize(px, px, false); r.setClearColor(0, 0);
  const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9ab0, 2.3)); const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(2, 4, 3); scene.add(d);
  const m = glbProp(modelId), cfg = PROPS[modelId]!, hh = cfg.h + (cfg.fly ?? 0) * .6, spin = new THREE.Group(); spin.add(m.group); scene.add(spin);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50), dist = hh / 2 / Math.tan(Math.PI / 12) * 1.35, cy = hh / 2;
  cam.position.set(0, cy + hh * .1, dist); cam.lookAt(0, cy, 0);
  let raf = 0, t0 = performance.now(), dead = false;
  const loop = (now: number) => { if (dead) return; if (!cv.isConnected) { dead = true; r.dispose(); return; } raf = requestAnimationFrame(loop); const t = (now - t0) / 1000; spin.rotation.y = Math.sin(t * .9) * .7; m.update(t); r.render(scene, cam); };
  raf = requestAnimationFrame(loop);
  return () => { dead = true; cancelAnimationFrame(raf); r.dispose(); cv.remove(); };
}
