/* Ngoại cảnh phụ của tiệm (chỉ dựng khi xem ngoài tiệm): bảng quảng cáo ảnh/video, đồ trang trí sân, bãi đáp trực thăng trên mái và chuyến bay đón khách VIP. */
import * as THREE from "three";
import { CAP, CONE, CYL, INK, RB, SPH, T, add } from "./kit";

export interface Disposable { dispose(): void }
export interface Heli { update(t: number): void; tag(): { text: string; pos: THREE.Vector3 } | null }

const VIP_NAMES = ["Ngài Matcha", "Tiểu thư Bơ Sữa", "Bá tước Trà Xanh", "Công nương Kem Tươi", "Ngài Bánh Quy", "Nữ hoàng Sương Mai", "Hoàng tử Đào Hồng", "Quý bà Hoa Anh Đào"];
const isVideo = (s: string) => /\.(mp4|webm|ogv)(\?|#|$)/i.test(s);

/** áp phích mặc định khi chưa cài quảng cáo: ba mẫu cho trái, phải, trên mái */
function poster(kind: number) {
  const P = [
    { bg: "#CFEFD4", fg: "#3F7A4A", a: "Matcha Latte", b: "Thơm béo · Mát lạnh", ic: "🍵" },
    { bg: "#FFD9E3", fg: "#C73A56", a: "Bánh mới ra lò", b: "Mời bạn ghé thử!", ic: "🍰" },
    { bg: "#FFF1C2", fg: "#B7791F", a: "Ca đêm ưu đãi", b: "Giờ vàng · Khách VIP", ic: "✨" }
  ][kind % 3]!;
  const c = document.createElement("canvas"); c.width = 512; c.height = 288; const g = c.getContext("2d")!;
  g.fillStyle = P.bg; g.fillRect(0, 0, 512, 288);
  g.fillStyle = "rgba(255,255,255,.55)"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(30 + i * 62, 24 + (i % 2) * 238, 22, 0, 7); g.fill(); }
  g.font = "120px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(P.ic, 256, 92);
  g.fillStyle = P.fg; g.font = "800 50px Nunito, system-ui, sans-serif"; g.fillText(P.a, 256, 190);
  g.font = "700 28px Nunito, system-ui, sans-serif"; g.fillText(P.b, 256, 238);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** bảng quảng cáo: khung + màn hình sáng (không bị tối đi ban đêm). src rỗng = áp phích mặc định; ảnh hoặc video lỗi thì quay về áp phích */
function billboard(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, ry: number, src: string, kind: number, frame: string, keep: Disposable[], screen: (o: THREE.Object3D) => void) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const def = poster(kind); keep.push(def);
  const mat = new THREE.MeshBasicMaterial({ map: def });
  let fit = (_a: number) => { /* gán sau khi có khung */ };
  const set = (t: THREE.Texture) => { t.colorSpace = THREE.SRGBColorSpace; mat.map = t; mat.needsUpdate = true; keep.push(t);
    const im = t.image as { width?: number; height?: number; videoWidth?: number; videoHeight?: number } | undefined, iw = im?.videoWidth || im?.width || 0, ih = im?.videoHeight || im?.height || 0; if (iw && ih) fit(iw / ih); };   // khung co theo tỉ lệ ảnh thật: không méo, thấy y như ảnh đã đặt
  if (src && isVideo(src)) {
    const v = document.createElement("video"); v.crossOrigin = "anonymous"; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.src = src;
    v.addEventListener("error", () => { mat.map = def; mat.needsUpdate = true; }, { once: true });
    v.addEventListener("loadeddata", () => set(new THREE.VideoTexture(v)), { once: true });
    v.play().catch(() => { /* trình duyệt chặn tự phát: giữ áp phích */ });
    keep.push({ dispose() { v.pause(); v.removeAttribute("src"); v.load(); } });
  } else if (src) {
    new THREE.TextureLoader().setCrossOrigin("anonymous").load(src, t => set(t), undefined, () => { mat.map = def; mat.needsUpdate = true; });
  }
  const fr = add(g, RB(w + .22, h + .22, .12, .04), T(frame), 0, h / 2 + .9, 0, { ol: "thin" });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); scr.position.set(0, h / 2 + .9, .07); g.add(scr); screen(scr);
  fit = asp => { const tall = asp < 1 ? 1.45 : 1, sw = asp > w / h ? w : h * tall * asp, sh = asp > w / h ? w / asp : h * tall, kx = (sw + .22) / (w + .22), ky = (sh + .22) / (h + .22); scr.scale.set(sw / w, sh / h, 1); scr.position.y = sh / 2 + .9; fr.scale.set(kx, ky, 1); fr.position.y = sh / 2 + .9; };
  ([-1, 1] as const).forEach(s => add(g, CYL(.055, .07, .9 + (h > 1.5 ? .0 : 0), 8), T("#4A4F5C"), s * (w / 2 - .25), .45, -.02, { ol: "thin" }));
  return g;
}

/** đài phun nước ở sân bên trái */
function fountain(parent: THREE.Object3D, x: number, z: number, keep: Disposable[]) {
  add(parent, CYL(.95, 1.05, .3, 24), T("#E6E1D8"), x, -.2, z, { ol: "mid" });
  const water = new THREE.MeshToonMaterial({ color: "#8FD3F0", transparent: true, opacity: .85 }); keep.push(water);
  add(parent, CYL(.82, .82, .04, 24), water, x, -.04, z, { ol: null, cast: false });
  add(parent, CYL(.12, .16, .55, 12), T("#E6E1D8"), x, .2, z, { ol: "thin" });
  add(parent, CYL(.42, .3, .1, 18), T("#E6E1D8"), x, .45, z, { ol: "thin" });
  add(parent, CYL(.34, .34, .03, 18), water, x, .5, z, { ol: null, cast: false });
  add(parent, SPH(.14, 10, 8), T("#BDEBFF", { transparent: true, opacity: .8 }), x, .72, z, { ol: null, cast: false });
}
/** bồn hoa viền thấp: hàng hoa nhiều màu */
function flowerBed(parent: THREE.Object3D, x: number, z: number, n: number, seed: number) {
  add(parent, RB(n * .42 + .2, .22, .5, .05), T("#C9966A"), x, -.2, z, { ol: "thin" });
  add(parent, RB(n * .42, .06, .36, .03), T("#7A5A3C"), x, -.07, z, { ol: null });
  const cols = ["#FF8FAB", "#FFD66B", "#FFFFFF", "#B79BFF", "#FF9F68"];
  for (let i = 0; i < n; i++) {
    const cx = x + (i - (n - 1) / 2) * .42; add(parent, SPH(.16, 8, 6), T("#7BC47F"), cx, .04, z, { ol: "thin" });
    add(parent, SPH(.09, 8, 6), T(cols[(i + seed) % cols.length]!), cx + ((i * 7 + seed) % 3 - 1) * .05, .17, z + .03, { ol: null });
  }
}
function umbrellaSet(parent: THREE.Object3D, x: number, z: number) {
  add(parent, CYL(.5, .5, .06, 20), T("#fff"), x, .42, z, { ol: "thin" }); add(parent, CYL(.05, .07, .72, 8), T("#8A5A3A"), x, .06, z, { ol: "thin" });
  add(parent, CONE(1.15, .5, 12), T("#FF8FAB"), x, 1.5, z, { ol: "mid" }); add(parent, CYL(.03, .03, 1.1, 6), T("#8A5A3A"), x, 1.0, z, { ol: null });
  ([[-.85, 0], [.85, 0]] as const).forEach(([dx]) => { add(parent, CYL(.2, .2, .06, 12), T("#FFD66B"), x + dx, .1, z, { ol: "thin" }); add(parent, CYL(.04, .05, .3, 6), T("#8A5A3A"), x + dx, -.05, z, { ol: null }); });
}
function bikeRack(parent: THREE.Object3D, x: number, z: number) {
  const m = T("#4A4F5C"); add(parent, RB(1.5, .05, .1, .02), m, x, -.3, z, { ol: null });
  for (let i = 0; i < 4; i++) add(parent, CYL(.025, .025, .45, 6), m, x - .55 + i * .37, -.1, z, { ol: null });
  [[-.35, "#8FD9B6"], [.4, "#FFB347"]].forEach(([dx, c]) => {
    const b = new THREE.Group(); b.position.set(x + (dx as number), -.02, z + .12); b.rotation.y = Math.PI / 2; parent.add(b);
    ([-.3, .3] as const).forEach(wx => { const w = add(b, new THREE.TorusGeometry(.26, .03, 6, 16), T("#3C3F4A"), wx, 0, 0, { ol: null, cast: false }); w.rotation.y = 0; });
    add(b, RB(.7, .04, .04, .01), T(c as string), 0, .14, 0, { ol: null }); add(b, RB(.04, .34, .04, .01), T(c as string), -.3, .1, 0, { ol: null }); add(b, RB(.18, .04, .1, .01), T(INK), -.3, .3, 0, { ol: null }); add(b, RB(.04, .04, .28, .01), T(INK), .3, .32, 0, { ol: null });
  });
}
function mailbox(parent: THREE.Object3D, x: number, z: number) {
  add(parent, CYL(.04, .05, .7, 8), T("#4A4F5C"), x, .05, z, { ol: "thin" }); add(parent, RB(.34, .3, .26, .06), T("#FF6B6B"), x, .5, z, { ol: "thin" }); add(parent, RB(.26, .03, .02, .01), T("#fff"), x, .52, z + .14, { ol: null });
}
function bin(parent: THREE.Object3D, x: number, z: number) { add(parent, CYL(.2, .17, .5, 12), T("#7FBF86"), x, -.08, z, { ol: "thin" }); add(parent, CYL(.22, .22, .05, 12), T("#5E9E69"), x, .2, z, { ol: "thin" }); }
function lantern(parent: THREE.Object3D, x: number, z: number, glow: THREE.Material) {
  add(parent, CYL(.035, .04, 1.1, 8), T("#4A4F5C"), x, .22, z, { ol: "thin" }); add(parent, SPH(.2, 10, 8), glow, x, .95, z, { ol: "thin", cast: false, s: [1, 1.2, 1] });
}

/** khinh khí cầu trôi chậm ngang trời phía sau tiệm */
function balloon(parent: THREE.Object3D, cx: number, cz: number): (t: number) => void {
  const g = new THREE.Group(); parent.add(g);
  add(g, SPH(1.1, 16, 12), T("#FF8FAB"), 0, 0, 0, { ol: "mid", cast: false, s: [1, 1.15, 1] });
  [["#FFD66B", 0], ["#fff", Math.PI / 2]].forEach(([c, r]) => add(g, new THREE.TorusGeometry(1.0, .12, 6, 20), T(c as string), 0, 0, 0, { ol: null, cast: false, s: [1, 1.15, 1], r: [0, r as number, 0] }));
  add(g, RB(.5, .38, .5, .06), T("#B98450"), 0, -1.95, 0, { ol: "thin", cast: false });
  ([[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]] as const).forEach(([dx, dz]) => add(g, CYL(.01, .01, .8, 4), T(INK), dx, -1.45, dz, { ol: null, cast: false }));
  return t => { g.position.set(cx + Math.sin(t * .045) * 14, 11 + Math.sin(t * .3) * .25, cz - 12); g.rotation.y = t * .1; };
}

export interface YardOpts { z0: number; zs: number; x0: number; cx: number; cz: number; w: number; d: number; roofY: number; rx: number; ads: { l: string; r: string; roof: string }; hotspot: (id: string, label: string, obj: THREE.Object3D) => void; screens: THREE.Object3D[]; keep: Disposable[]; glow: THREE.Material }

/** đồ trang trí sân bên trái, bên phải, hàng hoa viền vỉa hè và ba bảng quảng cáo; trả về hàm cập nhật mỗi khung hình */
export function buildYard(out: THREE.Group, o: YardOpts): (t: number) => void {
  const { z0, zs, x0, keep } = o, rx = o.rx, lx = -6.4;
  const mk = (id: string, label: string, x: number, y: number, z: number) => { const a = new THREE.Object3D(); a.position.set(x, y, z); out.add(a); o.hotspot(id, label, a); };
  // quảng cáo trái / phải trên sân, trên mái phía sau
  billboard(out, lx, -.34, zs - 1.2, 3.6, 2.2, .25, o.ads.l, 0, "#4A4F5C", keep, s => o.screens.push(s)); mk("ads-l", "Chỉnh quảng cáo bên trái", lx, 1.9, zs - 1.1);
  billboard(out, rx, -.34, zs - 1.2, 3.6, 2.2, -.25, o.ads.r, 1, "#4A4F5C", keep, s => o.screens.push(s)); mk("ads-r", "Chỉnh quảng cáo bên phải", rx, 1.9, zs - 1.1);
  billboard(out, o.cx - .7, o.roofY, o.cz - o.d / 2 + .7, 5.2, 2.8, 0, o.ads.roof, 2, "#B7791F", keep, s => o.screens.push(s)); mk("ads-roof", "Chỉnh quảng cáo trên mái", o.cx - .7, o.roofY + 3.0, o.cz - o.d / 2 + .75);
  // sân trái
  fountain(out, lx, zs + 1.45, keep); flowerBed(out, lx + 1.6, zs - 2.2, 3, 0); flowerBed(out, lx - 1.0, zs - 2.2, 2, 2); bin(out, -3.95, z0 + 1.6); mailbox(out, -3.2, z0 + .4); lantern(out, lx - 1.5, zs + .4, o.glow);
  // sân phải
  umbrellaSet(out, rx - .1, zs + 1.5); bikeRack(out, x0 + 1.3, z0 + 1.7); flowerBed(out, rx - 1.3, zs - 2.4, 3, 1); bin(out, x0 + .9, z0 + 1.0); lantern(out, rx + 1.4, zs + .6, o.glow);
  // viền hoa sát mép vỉa hè
  for (let i = 0; i < 4; i++) { flowerBed(out, -7.4 + i * 1.5, zs + 2.45, 3, i); flowerBed(out, x0 + .6 + i * 1.5, zs + 2.45, 3, i + 2); }
  return balloon(out, o.cx, o.cz);
}

/** bãi đáp trực thăng trên mái + chuyến bay đón khách VIP lâu lâu một lần */
export function buildHeli(out: THREE.Group, o: { px: number; py: number; pz: number }): Heli {
  const pad = new THREE.Group(); pad.position.set(o.px, o.py, o.pz); pad.scale.setScalar(1.6); out.add(pad);
  add(pad, CYL(1.35, 1.4, .08, 32), T("#5A5F6D"), 0, .04, 0, { ol: "thin", cast: false });
  add(pad, new THREE.RingGeometry(1.1, 1.2, 32), new THREE.MeshBasicMaterial({ color: "#FFD66B", side: THREE.DoubleSide }), 0, .1, 0, { ol: null, cast: false }).rotation.x = -Math.PI / 2;
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ color: "#FFD66B", transparent: true, map: (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!; g.fillStyle = "#FFD66B"; g.font = "800 120px Nunito, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("H", 64, 70); return new THREE.CanvasTexture(c); })() }));
  mark.rotation.x = -Math.PI / 2; mark.position.y = .11; pad.add(mark);
  const blob = add(pad, new THREE.CircleGeometry(.9, 20), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0 }), 0, .12, 0, { ol: null, cast: false }); blob.rotation.x = -Math.PI / 2;

  // trực thăng: mũi hướng +x
  const heli = new THREE.Group(); heli.visible = false; heli.scale.setScalar(1.6); out.add(heli);
  const body = new THREE.Group(); heli.add(body);
  add(body, SPH(.55, 16, 12), T("#FF8FAB"), 0, .55, 0, { ol: "mid", cast: false, s: [1.35, 1, .95] });
  add(body, SPH(.38, 12, 10), T("#BFE6FF", { emissive: new THREE.Color("#BFE6FF"), emissiveIntensity: .25 }), .52, .62, 0, { ol: "thin", cast: false, s: [1, .85, .95] });
  add(body, RB(1.35, .08, .98, .03), T("#fff"), -.05, .62, 0, { ol: null, cast: false });
  add(body, CYL(.09, .17, 1.5, 10), T("#FF8FAB"), -1.2, .72, 0, { ol: "thin", cast: false, r: [0, 0, Math.PI / 2 + .06] });
  add(body, RB(.05, .45, .3, .02), T("#fff"), -1.9, .95, 0, { ol: "thin", cast: false });
  add(body, CYL(.05, .05, .2, 8), T(INK), 0, 1.15, 0, { ol: null, cast: false });
  const rotor = new THREE.Group(); rotor.position.y = 1.26; body.add(rotor);
  ([0, Math.PI / 2] as const).forEach(r => add(rotor, RB(2.9, .03, .14, .01), T("#4A4F5C"), 0, 0, 0, { ol: null, cast: false, r: [0, r, 0] }));
  const tail = new THREE.Group(); tail.position.set(-1.9, .95, .06); body.add(tail); add(tail, RB(.04, .5, .08, .01), T("#4A4F5C"), 0, 0, 0, { ol: null, cast: false });
  ([-1, 1] as const).forEach(s => { add(body, CYL(.025, .025, 1.0, 6), T("#4A4F5C"), .05, .12, s * .42, { ol: null, cast: false, r: [0, 0, Math.PI / 2] }); add(body, CYL(.02, .02, .45, 6), T("#4A4F5C"), -.3, .28, s * .38, { ol: null, cast: false }); add(body, CYL(.02, .02, .45, 6), T("#4A4F5C"), .35, .28, s * .38, { ol: null, cast: false }); });

  // khách VIP: áo vàng, kính đen, vương miện nhỏ
  const vip = new THREE.Group(); vip.visible = false; pad.add(vip);
  add(vip, CAP(.14, .28), T("#E9C46A"), 0, .45, 0, { ol: "thin", cast: false }); add(vip, SPH(.17, 12, 10), T("#FFE3C9"), 0, .88, 0, { ol: "thin", cast: false });
  add(vip, RB(.3, .06, .05, .02), T("#2A2A2A"), 0, .9, .15, { ol: null, cast: false }); add(vip, CYL(.1, .12, .08, 5), T("#FFD66B"), 0, 1.08, 0, { ol: "thin", cast: false });
  vip.position.set(1.7, 0, .6);

  type Ph = "idle" | "in" | "land" | "stay" | "up" | "out";
  let ph: Ph = "idle", pt = 0, wait = 3, last = 0, name = "", spin = 0, spinV = 0;
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("vip") === "1") { ph = "stay"; name = VIP_NAMES[0]!; heli.visible = true; vip.visible = true; heli.position.set(o.px, o.py + .12, o.pz); heli.rotation.y = -Math.PI / 2; }   // ?vip=1: xem thử lúc trực thăng đã đáp
  const A = new THREE.Vector3(-26, o.py + 13, o.pz - 15), B = new THREE.Vector3(o.px, o.py + 3, o.pz), Z = new THREE.Vector3(30, o.py + 14, o.pz - 14);
  const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3), tmp = new THREE.Vector3();
  const set = (x: number, y: number, z: number, yw: number, tilt: number) => { heli.position.set(x, y, z); heli.rotation.set(0, yw, 0); body.rotation.z = tilt; };
  const wrap = Math.PI;   // hướng hạ cánh: mũi quay về phía +z
  return {
    update(t) {
      const dt = last ? Math.min(Math.max(t - last, 0), .1) : 0; last = t; if (!dt) return;
      pt += dt; spin += spinV * dt; rotor.rotation.y = spin; tail.rotation.z = spin * 1.6;
      if (ph === "idle") { if ((wait -= dt) <= 0) { ph = "in"; pt = 0; name = VIP_NAMES[Math.floor(Math.random() * VIP_NAMES.length)]!; heli.visible = true; spinV = 40; set(A.x, A.y, A.z, 0, 0); } return; }
      if (ph === "in") {   // bay từ xa tới trên bãi đáp, giảm tốc, xoay mũi về phía trước tiệm
        const k = ease(pt / 7); tmp.lerpVectors(A, B, k); const turn = ease((pt - 5) / 2);
        set(tmp.x, tmp.y, tmp.z, -wrap / 2 * turn, -.18 * (1 - k)); if (pt >= 7) { ph = "land"; pt = 0; }
      } else if (ph === "land") {
        const k = ease(pt / 2.6); set(B.x, B.y + (o.py + .12 - B.y) * k, B.z, -wrap / 2, 0); blob.scale.setScalar(.7 + k * .5); (blob.material as THREE.MeshBasicMaterial).opacity = .35 * k;
        if (pt >= 2.6) { ph = "stay"; pt = 0; vip.visible = true; }
      } else if (ph === "stay") {
        spinV = Math.max(6, spinV - dt * 18); vip.position.y = Math.abs(Math.sin(pt * 3)) * .04; vip.rotation.y = Math.sin(pt) * .4;
        if (pt >= 10) { ph = "up"; pt = 0; vip.visible = false; }
      } else if (ph === "up") {
        spinV = Math.min(40, spinV + dt * 30); const k = ease(pt / 2.4), turn = ease((pt - 1.6) / 2);
        set(B.x, o.py + .12 + (B.y - o.py - .12) * k, B.z, -wrap / 2 * (1 - turn), 0); (blob.material as THREE.MeshBasicMaterial).opacity = .35 * (1 - k); if (pt >= 4) { ph = "out"; pt = 0; }
      } else {
        const k = pt / 7; tmp.lerpVectors(B, Z, k * k); set(tmp.x, tmp.y, tmp.z, 0, -.22 * Math.min(1, k * 3)); if (pt >= 7) { ph = "idle"; heli.visible = false; wait = 40 + Math.random() * 40; spinV = 0; }
      }
    },
    tag() {
      if (ph !== "land" && ph !== "stay") return null;
      return { text: `💎 Khách VIP ${name} đã đến!`, pos: new THREE.Vector3(o.px, o.py + 2.6, o.pz) };
    }
  };
}
