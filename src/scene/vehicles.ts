/* Xe chạy ngoài phố (chỉ hiện khi xem ngoài tiệm): khối bo tròn cùng phong cách toon với phòng. Mỗi làn một xe tại một thời điểm, chạy qua rồi nghỉ ngẫu nhiên. */
import * as THREE from "three";
import { CYL, RB, SPH, T, add } from "./kit";

export interface Vehicle { g: THREE.Group; wheels: THREE.Object3D[]; label: string; dir: 1 | -1; x: number }
interface Lane { z: number; dir: 1 | -1; cars: Vehicle[]; cur: Vehicle | null; wait: number; speed: number; goal: number; call: boolean; stop: boolean; hold: number }   // call: có đơn giao đang chờ xe tải; stop/hold: xe tải đang dừng trước cửa tiệm
export interface Traffic { update(t: number): void; setNight(n: number): void; active(): Vehicle[]; callVan(): void }

const VAN = "Xe giao bánh", DELIVER = "Đang giao hàng", GROUND = -.335, WR = .17, LIM = 17;   // mặt đường, bán kính bánh, nửa đoạn đường xe chạy

/** xe tải nhỏ: thùng sau, cabin trước (đầu xe quay về +z) */
function van(body: string, stripe: string, glow: THREE.Material, tail: THREE.Material): Vehicle {
  const g = new THREE.Group(), wy = GROUND + WR, bot = GROUND + .12;
  add(g, RB(1.0, .85, 1.25, .08), T(body), 0, bot + .425, -.28);
  add(g, RB(1.02, .14, 1.27, .03), T(stripe), 0, bot + .3, -.28, { ol: null });
  add(g, RB(.96, .6, .62, .08), T(body), 0, bot + .3, .72);
  add(g, RB(.8, .26, .05, .03), T("#BFE6FF"), 0, bot + .4, 1.03, { ol: null });
  add(g, RB(1.0, .1, .1, .03), T("#4A4F5C"), 0, bot + .05, 1.03, { ol: null });
  ([-1, 1] as const).forEach(s => { add(g, SPH(.08, 8, 6), glow, s * .3, bot + .16, 1.05, { ol: null, cast: false }); add(g, SPH(.07, 8, 6), tail, s * .34, bot + .3, -.92, { ol: null, cast: false }); });
  return { g, wheels: wheels(g, wy, [.65, -.55]), label: VAN, dir: 1, x: 0 };
}
/** xe con bốn chỗ */
function car(body: string, glow: THREE.Material, tail: THREE.Material): Vehicle {
  const g = new THREE.Group(), wy = GROUND + WR, bot = GROUND + .12;
  add(g, RB(.95, .38, 1.7, .12), T(body), 0, bot + .19, 0);
  add(g, RB(.8, .34, .9, .12), T(body), 0, bot + .53, -.1);
  add(g, RB(.84, .18, .62, .05), T("#BFE6FF"), 0, bot + .54, -.1, { ol: null });
  ([-1, 1] as const).forEach(s => { add(g, SPH(.08, 8, 6), glow, s * .3, bot + .22, .86, { ol: null, cast: false }); add(g, SPH(.07, 8, 6), tail, s * .32, bot + .24, -.86, { ol: null, cast: false }); });
  return { g, wheels: wheels(g, wy, [.55, -.55]), label: "Khách ghé qua", dir: 1, x: 0 };
}
/** bốn bánh: mỗi bánh nằm trong một nhóm riêng để xoay quanh trục ngang khi xe chạy */
function wheels(g: THREE.Group, y: number, zs: number[]) {
  const tire = T("#3C3F4A"), out: THREE.Object3D[] = [];
  zs.forEach(z => ([-1, 1] as const).forEach(s => {
    const p = new THREE.Group(); p.position.set(s * .5, y, z); g.add(p);
    const m = add(p, CYL(WR, WR, .12, 14), tire, 0, 0, 0, { ol: "thin", cast: false }); m.rotation.z = Math.PI / 2;
    add(p, CYL(.07, .07, .14, 8), T("#E9E5DD"), 0, 0, 0, { ol: null, cast: false }).rotation.z = Math.PI / 2;
    out.push(p);
  }));
  return out;
}

/** stopX: chỗ xe giao hàng dừng (trước cửa tiệm) */
export function buildTraffic(parent: THREE.Group, roadZ: number, accent: string, stopX: number): Traffic {
  const glow = new THREE.MeshStandardMaterial({ color: "#FFF1CC", emissive: new THREE.Color("#FFD27A"), emissiveIntensity: .1 });
  const tail = new THREE.MeshStandardMaterial({ color: "#FF6B6B", emissive: new THREE.Color("#FF3B3B"), emissiveIntensity: .1 });
  const mk = (...v: Vehicle[]) => v;
  const lanes: Lane[] = [
    { z: roadZ - .55, dir: 1, cars: mk(van("#FFFFFF", accent, glow, tail), car("#8FD9B6", glow, tail)), cur: null, wait: .6, speed: 0, goal: 3, call: false, stop: false, hold: 0 },
    { z: roadZ + .55, dir: -1, cars: mk(car("#7FB8E6", glow, tail), van("#FFF3C4", "#FFB347", glow, tail)), cur: null, wait: 2.4, speed: 0, goal: 3, call: false, stop: false, hold: 0 }
  ];
  lanes.forEach(l => l.cars.forEach(c => { c.dir = l.dir; c.g.visible = false; c.g.rotation.y = l.dir * Math.PI / 2; c.g.position.z = l.z; parent.add(c.g); }));
  let last = 0;
  return {
    update(t) {
      const dt = last ? Math.min(Math.max(t - last, 0), .1) : 0; last = t; if (!dt) return;
      for (const l of lanes) {
        if (!l.cur) {
          if ((l.wait -= dt) > 0 && !l.call) continue;
          l.cur = l.call ? l.cars.find(c => c.label === VAN)! : l.cars[Math.floor(Math.random() * l.cars.length)]!; l.stop = l.call; l.hold = 3.5; l.call = false; if (l.stop) l.cur.label = DELIVER; l.cur.x = -l.dir * LIM; l.speed = 0; l.goal = 2.6 + Math.random() * 1.4; l.cur.g.visible = true;
        }
        const v = l.cur, left = (stopX - v.x) * l.dir;     // quãng còn lại tới chỗ dừng (âm: đã qua)
        if (l.stop && left < -.02) { l.stop = false; v.label = VAN; }   // dừng xong, lăn bánh tiếp
        if (l.stop && left < .06 && l.speed < .25) { l.speed = 0; if ((l.hold -= dt) <= 0) { l.stop = false; v.label = VAN; l.goal = 3; } continue; }
        l.speed += (l.goal - l.speed) * Math.min(1, dt * 1.5);    // tăng/giảm tốc êm, không giật
        if (l.stop) l.speed = Math.min(l.speed, Math.max(left, 0) * 1.3);   // sắp tới chỗ dừng: tốc độ tỉ lệ quãng còn lại nên giảm dần, êm và không lố
        const dx = l.speed * dt; v.x += l.dir * dx; v.g.position.x = v.x;
        v.wheels.forEach(w => { w.rotation.x += dx / WR; });
        if (Math.abs(v.x) > LIM) { v.g.visible = false; l.cur = null; l.wait = 3 + Math.random() * 7; }
      }
    },
    setNight(n) { glow.emissiveIntensity = .1 + n * 2.4; tail.emissiveIntensity = .1 + n * 1.2; },
    callVan() { lanes[0]!.call = true; },
    active: () => lanes.flatMap(l => l.cur ? [l.cur] : [])
  };
}
