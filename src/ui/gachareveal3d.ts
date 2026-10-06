/* Phim mở thẻ Gacha bằng Three.js: 5 bước (bắt đầu, lộ diện, tối sáng, hiện thân, kết thúc) theo bản thiết kế.
   Cảnh là hàm thuần của thời gian t (giây): thẻ lật theo phối cảnh, dải lụa 3D bị thẻ che đúng chỗ, bloom, hạt GPU, mảnh vỡ.
   Chữ và nút nằm ở lớp HTML của gachafx.ts, module này chỉ vẽ cảnh và báo mốc bước qua onPhase. */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import type { Rarity } from "../content/gacha";

export interface Reveal3dOpts {
  host: HTMLElement; rar: Rarity; img: string | null; full?: boolean; fallbackText?: string;
  w: number; h: number; onPhase?: (p: 1 | 2 | 3 | 4 | 5) => void; frozenT?: number;
}
export interface Reveal3d { dispose(): void; skipToEnd(): void; time(): number; ended(): boolean }

const FX = "/gacha/fx/", FX2 = "/gacha/fx2/";
/* mốc thời gian (giây) của 5 bước */
export const PHASE_AT = [0.06, 1.3, 2.5, 3.5, 5.2] as const;
export const END_AT = 6.2;
const CFG = {
  common: { g: "#CFE0FF", c1: [.8, .88, 1], c2: [.55, .7, 1], bloom: .55, rib: 0, bands: 3, parts: 160 },
  rare: { g: "#4C8DFF", c1: [.75, .88, 1], c2: [.2, .5, 1], bloom: .8, rib: 2, bands: 6, parts: 380 },
  ultra: { g: "#FFC85A", c1: [1, .95, .75], c2: [1, .68, .2], bloom: 1, rib: 6, bands: 9, parts: 700 }
} as const;
const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (a: number, b: number, c: number, x: number) => sm(a, b, x) * (1 - sm(b, c, x));

const loadTex = (u: string) => new Promise<THREE.Texture>((res, rej) => new THREE.TextureLoader().load(u, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t); }, undefined, rej));
const loadImg = (u: string) => new Promise<HTMLImageElement | null>(res => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = u; });
const canvasTex = (w: number, h: number, f: (g: CanvasRenderingContext2D, w: number, h: number) => void) => { const c = document.createElement("canvas"); c.width = w; c.height = h; f(c.getContext("2d")!, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

/** khung thẻ vẽ bằng code: bạc (thường), tinh thể xanh (hiếm), vàng có sao và dải cuốn (cực hiếm) */
function drawFrame(g: CanvasRenderingContext2D, w: number, h: number, rar: Rarity) {
  const grad = (cols: string[]) => { const gr = g.createLinearGradient(0, 0, w, h); cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); return gr; };
  const rr = (i: number, r: number) => { g.beginPath(); g.roundRect(i, i, w - 2 * i, h - 2 * i, r); };
  const star = (cx: number, cy: number, s: number, col: string) => { g.save(); g.translate(cx, cy); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 16; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * .26 : s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.restore(); };
  g.save(); g.lineJoin = "round";
  if (rar === "common") {
    rr(9, 20); g.lineWidth = 16; g.strokeStyle = grad(["#fbfdff", "#9ba6b8", "#eef3fb", "#7a8498"]); g.stroke();
    rr(21, 14); g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,.8)"; g.stroke();
    rr(3, 22); g.lineWidth = 1.5; g.strokeStyle = "rgba(60,70,90,.7)"; g.stroke();
    for (const [x, y, sx, sy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]] as const) { g.beginPath(); g.moveTo(x + sx * 12, y + sy * 12); g.lineTo(x + sx * 62, y + sy * 14); g.lineTo(x + sx * 14, y + sy * 62); g.closePath(); g.fillStyle = grad(["#ffffff", "#8e98ab"]); g.globalAlpha = .9; g.fill(); g.globalAlpha = 1; }
    star(w / 2, 12, 18, "#eaf2ff"); star(w / 2, h - 12, 18, "#eaf2ff");
  } else if (rar === "rare") {
    g.shadowColor = "#4C8DFF"; g.shadowBlur = 22; rr(9, 18); g.lineWidth = 12; g.strokeStyle = grad(["#e6f2ff", "#4C8DFF", "#bcd8ff", "#2b5fd6"]); g.stroke(); g.shadowBlur = 0;
    rr(22, 12); g.lineWidth = 2; g.strokeStyle = "rgba(220,238,255,.9)"; g.stroke();
    const crystal = (x: number, y: number, ang: number, len: number, wd: number) => { g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, -wd); g.lineTo(len, 0); g.lineTo(0, wd); g.closePath(); const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, "rgba(130,190,255,.9)"); gr.addColorStop(1, "rgba(235,246,255,.95)"); g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1.2; g.stroke(); g.restore(); };
    for (let x = 60; x < w - 40; x += 46) { crystal(x, 8, -Math.PI / 2, 14 + Math.sin(x) * 6, 7); crystal(x + 20, h - 8, Math.PI / 2, 14 + Math.cos(x) * 6, 7); }
    for (let y = 80; y < h - 60; y += 52) { crystal(8, y, Math.PI, 12 + Math.sin(y) * 6, 6); crystal(w - 8, y + 24, 0, 12 + Math.cos(y) * 6, 6); }
    for (const [x, y, a] of [[18, 18, -2.35], [w - 18, 18, -.78], [18, h - 18, 2.35], [w - 18, h - 18, .78]] as const) { crystal(x, y, a, 44, 13); crystal(x, y, a + .5, 30, 9); }
    star(w / 2, 10, 20, "#bfe0ff"); star(w / 2, h - 10, 20, "#bfe0ff");
  } else {
    g.shadowColor = "#FFC85A"; g.shadowBlur = 20; rr(10, 18); g.lineWidth = 11; g.strokeStyle = grad(["#fff3c4", "#e6a62d", "#fff0b0", "#b87a12"]); g.stroke(); g.shadowBlur = 0;
    rr(24, 12); g.lineWidth = 2.2; g.strokeStyle = "rgba(255,236,170,.95)"; g.stroke();
    rr(5, 22); g.lineWidth = 1.4; g.strokeStyle = "rgba(120,70,0,.6)"; g.stroke();
    for (const [x, y, sx, sy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]] as const) {   // góc cuốn
      g.save(); g.translate(x, y); g.scale(sx, sy); g.strokeStyle = "#ffe08a"; g.lineWidth = 3; g.shadowColor = "#FFC85A"; g.shadowBlur = 10;
      g.beginPath(); g.moveTo(14, 70); g.bezierCurveTo(14, 30, 30, 14, 70, 14); g.stroke();
      g.beginPath(); g.moveTo(26, 56); g.bezierCurveTo(26, 40, 40, 26, 56, 26); g.stroke();
      g.beginPath(); g.arc(34, 34, 8, 0, Math.PI * 2); g.fillStyle = "#fff3c4"; g.fill(); g.restore();
    }
    for (const [x, y] of [[w / 2, 12], [w / 2, h - 12], [10, h / 2], [w - 10, h / 2]] as const) star(x, y, 22, "#fff0b0");
    g.globalAlpha = .55; g.strokeStyle = "#fff2c0"; g.lineWidth = 6; g.shadowColor = "#FFC85A"; g.shadowBlur = 12;   // dải lụa mảnh vòng hai bên
    g.beginPath(); g.moveTo(18, h * .25); g.bezierCurveTo(60, h * .35, -10, h * .6, 40, h * .78); g.stroke();
    g.beginPath(); g.moveTo(w - 18, h * .18); g.bezierCurveTo(w - 70, h * .4, w + 10, h * .55, w - 40, h * .82); g.stroke(); g.globalAlpha = 1;
  }
  g.restore();
}

export async function createReveal3d(o: Reveal3dOpts): Promise<Reveal3d> {
  const { rar, w: W, h: H } = o, C = CFG[rar], gcol = new THREE.Color(C.g);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const dpr = Math.min(devicePixelRatio || 1, 1.6);
  renderer.setPixelRatio(dpr); renderer.setSize(W, H); renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.className = "gr3-cv"; o.host.prepend(renderer.domElement);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, .1, 60); cam.position.set(0, 0, 7.2);
  const composer = new EffectComposer(renderer); composer.setPixelRatio(dpr); composer.setSize(W, H); composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), C.bloom * .42, .5, .86); composer.addPass(bloom);
  const post = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uCA: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uT,uCA; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      void main(){ vec2 d=vUv-.5; float r=dot(d,d); vec2 o=d*r*.012*uCA; vec3 c=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
        c*=1.-smoothstep(.12,.62,r)*.62; c+=(h(vUv*vec2(340.,560.)+uT)-.5)*.016; gl_FragColor=vec4(c,1.); }`
  }); composer.addPass(post); composer.addPass(new OutputPass());

  const CW = 1.38, CH = 2.16, disposables: { dispose(): void }[] = [renderer, composer];
  const track = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
  const [bgT, backT, starT, shardsT, sparkT, ringsT, itemImg] = await Promise.all([
    loadTex(`${FX2}bg-${rar}.webp`), loadTex(`${FX2}back-${rar}.webp`), loadTex(`${FX}star-${rar}.png`), loadTex(`${FX}shards.png`), loadTex(`${FX}sparkles.png`), loadTex(`${FX}rings.png`),
    o.img ? loadImg(o.img) : Promise.resolve(null)
  ]);
  [bgT, backT, starT, shardsT, sparkT, ringsT].forEach(t => track(t));

  const add = (map: THREE.Texture | null, col: THREE.ColorRepresentation, w: number, h: number, z: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false })); m.position.z = z; scene.add(m); return m;
  };
  /* nền: cắt giữa cho vừa khung dọc, tối dần ở các bước đầu */
  const bgImg = bgT.image as HTMLImageElement, bgAsp = bgImg.width / bgImg.height, bgH = 2 * (7.2 + 4) * Math.tan(THREE.MathUtils.degToRad(20)) * 1.12, bgW = bgH * (W / H);
  if (bgAsp >= W / H) { bgT.repeat.set((W / H) / bgAsp, 1); bgT.offset.set((1 - (W / H) / bgAsp) / 2, 0); } else { bgT.repeat.set(1, bgAsp / (W / H)); bgT.offset.set(0, (1 - bgAsp / (W / H)) * .35); }
  const bgMat = new THREE.MeshBasicMaterial({ map: bgT, color: 0x444444, toneMapped: false }), bg = new THREE.Mesh(new THREE.PlaneGeometry(bgW, bgH), bgMat); bg.position.z = -4; scene.add(bg);

  const bandTex = track(canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.55, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,.95)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gh = g.createLinearGradient(0, 0, w, 0); gh.addColorStop(0, "rgba(0,0,0,1)"); gh.addColorStop(.5, "rgba(0,0,0,0)"); gh.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = gh; g.fillRect(0, 0, w, h); }));
  const bands: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [], bandData: { o: number; a: number; d: number }[] = [];
  for (let i = 0; i < C.bands; i++) { const od = i - (C.bands - 1) / 2, wd = [.9, .4, .2][i % 3]!; const m = add(bandTex, gcol, wd, 5.2, -1.4 - Math.abs(od) * .1); m.position.set(od * .62, -.1, m.position.z); bands.push(m); bandData.push({ o: od, a: .17 - Math.abs(od) * .02, d: Math.abs(od) * .06 }); }
  const glowTex = track(canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.3, "rgba(255,255,255,.4)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); }));
  const star = add(starT, 0xffffff, 3.2, 3.2, -.5), floor = add(glowTex, gcol, 4.4, 1.3, -.2); floor.position.y = -1.55;
  const hfl = add(glowTex, 0xffffff, 6, .09, 0), beam = add(glowTex, 0xffffff, .09, 9, -.3), flare = add(starT, 0xffffff, 3.4, 3.4, .9);
  const ringTex = ringsT.clone(); ringTex.needsUpdate = true; ringTex.repeat.set(.5, 1); ringTex.offset.set(rar === "ultra" ? .5 : 0, 0); track(ringTex);
  const rings = add(ringTex, 0xffffff, 3.6, 1.3, -.4); rings.position.y = -1.6;
  const fogTex = track(canvasTex(512, 128, (g, w, h) => { for (let i = 0; i < 46; i++) { const x = Math.random() * w, y = h * (.3 + Math.random() * .5), r = 30 + Math.random() * 70, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }));
  const fogs = ([[-.8, -1.35, 6.2, 1.5, .5], [.5, -1.55, 5.2, 1.3, -.35]] as const).map(([z, y, w, h, sp]) => { const t = fogTex.clone(); t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true; track(t); const m = add(t, gcol, w, h, z); m.position.y = y; return { m, t, sp }; });
  const rayTex = track(canvasTex(512, 512, (g, w, h) => { g.translate(w / 2, h / 2); for (let i = 0; i < 36; i++) { g.rotate(Math.PI * 2 / 36); const gr = g.createLinearGradient(0, 0, w / 2, 0); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, -4 - Math.random() * 14); g.lineTo(w / 2, 4 + Math.random() * 14); g.fill(); } }));
  const rays = add(rayTex, gcol, 7.5, 7.5, -.6);
  const lineTex = track(canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.4, "rgba(255,255,255,.7)"); gr.addColorStop(.85, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,.2)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gh = g.createLinearGradient(0, 0, w, 0); gh.addColorStop(0, "#000"); gh.addColorStop(.5, "rgba(0,0,0,0)"); gh.addColorStop(1, "#000"); g.globalCompositeOperation = "destination-out"; g.fillStyle = gh; g.fillRect(0, 0, w, h); }));
  const vlines = [-1.15, -.98, .98, 1.15].map(x => { const m = add(lineTex, new THREE.Color(rar === "ultra" ? "#FFE3A0" : "#BFD6FF"), .05, 5.6, -.2); m.position.set(x, .2, -.2); return { m, x }; });

  /* thẻ: mặt sau (ảnh) + mặt trước (vẽ canvas: nền cảnh, nhân vật, tối chân, khung vẽ bằng code) */
  const frontTex = track(canvasTex(512, 800, (g, w, h) => {
    g.save(); g.beginPath(); g.roundRect(0, 0, w, h, 22); g.clip();
    const bgG = g.createLinearGradient(0, 0, 0, h); bgG.addColorStop(0, "#0b1230"); bgG.addColorStop(1, "#050a1c"); g.fillStyle = bgG; g.fillRect(0, 0, w, h);
    if (!o.full) {
      const bi = bgT.image as HTMLImageElement, sc = Math.max(w / bi.width, h / bi.height) * 1.05; g.globalAlpha = .75; g.filter = "brightness(.8) saturate(1.2) blur(1px)"; g.drawImage(bi, (w - bi.width * sc) / 2 - w * .05, 0, bi.width * sc, bi.height * sc); g.globalAlpha = 1; g.filter = "none";
      const vg = g.createLinearGradient(0, 0, 0, h); vg.addColorStop(0, "rgba(4,8,22,.55)"); vg.addColorStop(.5, "rgba(4,8,22,.1)"); vg.addColorStop(1, "rgba(4,8,22,.7)"); g.fillStyle = vg; g.fillRect(0, 0, w, h);
      const rg = g.createRadialGradient(w / 2, h * .42, 0, w / 2, h * .42, w * .8); rg.addColorStop(0, "rgba(255,255,255,.34)"); rg.addColorStop(.35, C.g + "88"); rg.addColorStop(1, "transparent"); g.fillStyle = rg; g.fillRect(0, 0, w, h);
    }
    if (itemImg) {
      const s = o.full ? Math.max(w / itemImg.width, h / itemImg.height) : Math.min((w * 1.0) / itemImg.width, (h * .62) / itemImg.height), iw = itemImg.width * s, ih = itemImg.height * s;
      g.drawImage(itemImg, (w - iw) / 2, o.full ? -h * .02 : h * .5 - ih * .56, iw, ih);
    } else if (o.fallbackText) { g.fillStyle = "#fff"; g.font = "800 54px Nunito, sans-serif"; g.textAlign = "center"; g.fillText(o.fallbackText, w / 2, h * .5); }
    const fg = g.createLinearGradient(0, h * .6, 0, h); fg.addColorStop(0, "rgba(3,6,18,0)"); fg.addColorStop(1, "rgba(3,6,18,.85)"); g.fillStyle = fg; g.fillRect(0, 0, w, h);
    g.restore(); drawFrame(g, w, h, rar);
  }));
  const mkFace = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, color: 0xd8d8d8, transparent: true, toneMapped: false, side: THREE.FrontSide });
  const card = new THREE.Group(), backM = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), mkFace(backT)), frontM = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), mkFace(frontTex));
  backM.position.z = .004; frontM.rotation.y = Math.PI; frontM.position.z = -.004; card.add(backM, frontM);
  const sheenTex = track(canvasTex(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.46, "rgba(255,255,255,0)"); gr.addColorStop(.5, "rgba(255,255,255,.9)"); gr.addColorStop(.54, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  sheenTex.wrapS = THREE.RepeatWrapping;
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); sheen.position.z = .006; frontM.add(sheen);
  const edgeTex = track(canvasTex(256, 400, (g, w, h) => { g.strokeStyle = "#fff"; g.shadowColor = "#fff"; g.shadowBlur = 18; g.lineWidth = 5; g.beginPath(); g.roundRect(14, 14, w - 28, h - 28, 14); g.stroke(); }));
  const edgeG = new THREE.Mesh(new THREE.PlaneGeometry(CW * 1.16, CH * 1.12), new THREE.MeshBasicMaterial({ map: edgeTex, color: gcol.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 })); edgeG.position.z = .02;
  const edgeB = edgeG.clone(); edgeB.material = edgeG.material.clone(); edgeB.position.z = -.02; edgeB.rotation.y = Math.PI; card.add(edgeG, edgeB); scene.add(card);

  /* phản chiếu thẻ trên sàn */
  const refl = new THREE.Group(), fadeTex = track(canvasTex(4, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#fff"); gr.addColorStop(.6, "#000"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  const rf = (map: THREE.Texture, rotY: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshBasicMaterial({ map, alphaMap: fadeTex, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); m.rotation.y = rotY; m.position.z = rotY ? -.004 : .004; return m; };
  const rb = rf(backT, 0), rfr = rf(frontTex, Math.PI); refl.add(rb, rfr); scene.add(refl);
  const sides = [-3, -2, -1, 1, 2, 3].map(od => { const m = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshBasicMaterial({ map: backT, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, color: 0xcccccc })); scene.add(m); return { m, o: od }; });

  /* dải lụa 3D: hình học tạo trong vertex shader, thon hai đầu, xoắn, viền sáng */
  type Spec = { a0: number; sw: number; sp: number; rx: number; rz: number; tilt: number; w: number; tw: number; y: number };
  const ribMats: THREE.ShaderMaterial[] = [];
  const mkRibbon = (sp: Spec) => {
    const N = 120, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= N; i++) for (const v of [-1, 1]) { pos.push(0, 0, 0); uv.push(i / N, v); }
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aUV", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uProg: { value: 0 }, uA0: { value: sp.a0 }, uSweep: { value: sp.sw }, uSpeed: { value: sp.sp }, uRx: { value: sp.rx }, uRz: { value: sp.rz }, uTilt: { value: sp.tilt }, uW: { value: sp.w }, uTw: { value: sp.tw }, uY: { value: sp.y }, uC1: { value: new THREE.Vector3(...C.c1) }, uC2: { value: new THREE.Vector3(...C.c2) } },
      vertexShader: `attribute vec2 aUV; uniform float uTime,uA0,uSweep,uSpeed,uRx,uRz,uTilt,uW,uTw,uY; varying vec2 vUv; varying float vF;
        vec3 crv(float a){ vec3 p=vec3(cos(a)*uRx, uY+sin(a*2.0)*.12, sin(a)*uRz); float c=cos(uTilt),s=sin(uTilt); return vec3(p.x*c-p.y*s, p.x*s+p.y*c, p.z); }
        void main(){ float u=aUV.x, v=aUV.y; float a=uA0+u*uSweep+uTime*uSpeed; vec3 p=crv(a); vec3 p2=crv(a+.03); vec3 tg=normalize(p2-p); vec3 r=normalize(vec3(p.x,0.,p.z)+vec3(.0001));
          vec3 b1=normalize(cross(tg,r)); float tw=a*uTw; vec3 d=normalize(cos(tw)*b1+sin(tw)*r); float w=uW*pow(sin(3.14159*u),.85)*(.65+.35*sin(a*2.7+1.3));
          vUv=aUV; vF=smoothstep(-.1,1.0,p.z); gl_Position=projectionMatrix*modelViewMatrix*vec4(p+d*v*w,1.); }`,
      fragmentShader: `uniform float uTime,uProg; uniform vec3 uC1,uC2; varying vec2 vUv; varying float vF;
        void main(){ float u=vUv.x, v=vUv.y; float edge=smoothstep(.62,1.,abs(v)); float body=1.-abs(v)*.55; float streak=.7+.3*sin(u*70.+uTime*2.+v*5.);
          float reveal=1.-smoothstep(uProg-.06,uProg,u); float tap=smoothstep(0.,.08,u)*smoothstep(1.,.92,u);
          float al=(.5*body*streak+.7*edge)*reveal*tap*(1.-.55*vF); vec3 col=mix(uC1,uC2,u+.15*v); gl_FragColor=vec4(col*.9*al, al); }`
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 2; scene.add(mesh); ribMats.push(m); disposables.push(g, m);
  };
  const SP: Spec[] = rar === "ultra"
    ? [{ a0: .3, sw: 5.6, sp: .55, rx: 1.75, rz: 1.1, tilt: -.5, w: .42, tw: 1.3, y: .1 }, { a0: 2.2, sw: 5.2, sp: -.4, rx: 2.0, rz: 1.25, tilt: .55, w: .48, tw: 1.1, y: -.2 }, { a0: 3.8, sw: 4.4, sp: .7, rx: 1.55, rz: 1.0, tilt: -.1, w: .32, tw: 1.6, y: .3 }, { a0: 1.1, sw: 4.8, sp: -.8, rx: 1.4, rz: .9, tilt: .95, w: .26, tw: 1.4, y: 0 }, { a0: 5.0, sw: 4.0, sp: .35, rx: 2.15, rz: 1.35, tilt: -.8, w: .5, tw: .9, y: .15 }, { a0: .2, sw: 3.8, sp: -.6, rx: 1.3, rz: .8, tilt: .2, w: .2, tw: 1.8, y: -.3 }]
    : [{ a0: .6, sw: 5.2, sp: .5, rx: 1.7, rz: 1.1, tilt: -.45, w: .36, tw: 1.2, y: .1 }, { a0: 3.1, sw: 4.8, sp: -.45, rx: 1.95, rz: 1.2, tilt: .5, w: .4, tw: 1.0, y: -.15 }];
  SP.slice(0, C.rib).forEach(mkRibbon);

  /* hạt sáng GPU */
  const PN = C.parts, pp = new Float32Array(PN * 3), ps = new Float32Array(PN * 2);
  for (let i = 0; i < PN; i++) { pp.set([(Math.random() - .5) * 4.2, Math.random() * 6 - 3, (Math.random() - .5) * 2.4], i * 3); ps.set([Math.random(), .5 + Math.random()], i * 2); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pp, 3)); pg.setAttribute("aS", new THREE.BufferAttribute(ps, 2));
  const pm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uA: { value: 0 }, uC: { value: new THREE.Vector3(...C.c1) }, uPx: { value: dpr } },
    vertexShader: `attribute vec2 aS; uniform float uT,uPx; varying float vA; void main(){ vec3 p=position; p.y=mod(p.y+uT*(.25+aS.y*.5)+3.,6.)-3.; p.x+=sin(uT*.6+aS.x*20.)*.12; vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(1.2+aS.y*2.6)*uPx*(7./-mv.z)*1.6; vA=sin(3.14159*clamp((p.y+3.)/6.,0.,1.))*(.35+aS.x*.65); }`,
    fragmentShader: `uniform vec3 uC; uniform float uA; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(mix(uC,vec3(1.),.5)*a*vA*uA*1.1, a*vA*uA); }`
  });
  const pts = new THREE.Points(pg, pm); pts.renderOrder = 3; scene.add(pts); disposables.push(pg, pm);

  /* mảnh vỡ và ánh sao: sprite cắt từ ảnh sheet */
  const shards: { m: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; a: number; r: number; z: number; d: number; rot: number }[] = [];
  if (rar !== "common") for (let i = 0; i < (rar === "ultra" ? 14 : 9); i++) {
    const t = shardsT.clone(); t.needsUpdate = true; t.repeat.set(.48, 1); t.offset.set(rar === "ultra" ? .52 : 0, 0); track(t);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.55 + Math.random() * .5, .55 + Math.random() * .5), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false })); m.renderOrder = 4; scene.add(m);
    shards.push({ m, a: Math.random() * 6.28, r: .9 + Math.random() * 1.8, z: (Math.random() - .3) * 1.8, d: Math.random() * .5, rot: (Math.random() - .5) * 3 });
  }
  const sparks: { m: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; d: number; s: number }[] = [];
  for (let i = 0; i < (rar === "ultra" ? 10 : rar === "rare" ? 7 : 3); i++) {
    const t = sparkT.clone(); t.needsUpdate = true; t.repeat.set(.24, 1); t.offset.set((rar === "ultra" ? .5 : 0) + (i % 2) * .25, 0); track(t);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.35 + Math.random() * .3, .3 + Math.random() * .2), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false }));
    m.position.set((Math.random() - .5) * 3, (Math.random() - .5) * 4.2, .6 + Math.random()); m.renderOrder = 5; scene.add(m); sparks.push({ m, d: Math.random() * 2, s: 1 + Math.random() });
  }

  /* trạng thái là hàm thuần của t */
  let lastPhase = 0;
  const frame = (t: number) => {
    const appear = sm(.06, 1, t), flip = sm(3.5, 4.7, t), e3 = sm(2.5, 3.3, t), act = sm(3.5, 4.6, t);
    bgMat.color.setScalar(.26 + .08 * e3 + .14 * act); bg.position.z = -4 + .6 * sm(3.5, 8, t);
    card.rotation.y = Math.PI * flip; card.position.y = .05 * Math.sin(t * 1.2) + .26 * sm(5, 5.8, t);
    card.scale.setScalar(.92 + .08 * appear + .12 * sm(5, 5.9, t));
    (backM.material as THREE.MeshBasicMaterial).opacity = appear; (frontM.material as THREE.MeshBasicMaterial).opacity = appear;
    const eg = (e3 * (1 - sm(3.5, 3.9, t)) * (.7 + .3 * Math.sin(t * 7))) * .8 + act * .4;
    (edgeG.material as THREE.MeshBasicMaterial).opacity = eg; (edgeB.material as THREE.MeshBasicMaterial).opacity = eg;
    const ec = t < 3.5 ? new THREE.Color("#FFC85A") : gcol; (edgeG.material as THREE.MeshBasicMaterial).color.copy(ec); (edgeB.material as THREE.MeshBasicMaterial).color.copy(ec);
    refl.position.y = card.position.y - CH - .12; refl.rotation.y = card.rotation.y; refl.scale.set(card.scale.x, -card.scale.x, card.scale.x); rb.material.opacity = rfr.material.opacity = .32 * appear;
    star.material.opacity = (sm(.6, 1.4, t) * .2 + e3 * .3) * (1 - sm(3.5, 4.5, t)) + .12 * sm(4.5, 5.5, t); star.rotation.z = t * .1; star.scale.setScalar(1 + .12 * Math.sin(t * 2) + sm(3.5, 4.6, t) * 1.2);
    floor.material.opacity = e3 * .22 * (.8 + .2 * Math.sin(t * 1.5)); rings.material.opacity = e3 * .5; rings.scale.setScalar(1 + .05 * Math.sin(t * 1.4));
    hfl.material.opacity = bump(1.2, 1.7, 2.3, t) * .55; hfl.scale.x = .2 + 1.2 * sm(1.2, 1.9, t);
    beam.material.opacity = bump(1.2, 1.8, 2.5, t) * .5 + bump(3.4, 3.8, 4.6, t) * .35; beam.scale.x = 1 + 5 * bump(1.2, 1.8, 2.5, t);
    flare.material.opacity = bump(3.5, 3.9, 4.7, t) * .35; flare.scale.setScalar(.6 + 1.6 * sm(3.5, 4.7, t)); flare.rotation.z = t * .5;
    bands.forEach((b, i) => { const u = bandData[i]!, k = sm(3.5 + u.d, 4.7 + u.d, t); b.scale.y = Math.max(.001, k); b.material.opacity = k * u.a * (.65 + .35 * Math.sin(t * 1.3 + u.o)); });
    vlines.forEach(l => { l.m.material.opacity = sm(3.6, 4.6, t) * .3 * (.75 + .25 * Math.sin(t * 2 + l.x * 3)); });
    fogs.forEach(f => { f.t.offset.x = t * f.sp * .04; f.m.material.opacity = e3 * .09 + act * .04; });
    rays.material.opacity = sm(4.5, 5.5, t) * .05 * (.8 + .2 * Math.sin(t * 1.7)); rays.rotation.z = t * .06;
    sheenTex.offset.x = .9 - 1.8 * sm(4.7, 5.8, t); (sheen.material as THREE.MeshBasicMaterial).opacity = bump(4.7, 5.1, 5.8, t) * .16;
    sides.forEach(({ m, o: od }) => { const e2 = sm(1.3, 2.2, t), out = 1 - sm(3.4, 3.9, t); m.position.set(od * (.7 * e2 + .46 * e3 + .5 * sm(3.5, 4, t)), .04 * Math.sin(t + od), -.3 - Math.abs(od) * .05); m.rotation.y = -od * .55 * e3; m.scale.setScalar(.74); m.material.opacity = .55 * sm(1.3, 1.9, t) * out; });
    ribMats.forEach(m => { m.uniforms.uTime!.value = t; m.uniforms.uProg!.value = sm(3.6, 5.2, t) * 1.15; });
    pm.uniforms.uT!.value = t; pm.uniforms.uA!.value = sm(3.5, 4.5, t);
    shards.forEach(s => { const k = Math.max(0, t - 3.6 - s.d), ex = 1 - Math.exp(-k * 1.6); s.m.position.set(Math.cos(s.a + k * .2) * s.r * ex, Math.sin(s.a + k * .2) * s.r * ex * .9, s.z * ex); s.m.material.opacity = Math.min(1, k * 4) * (.75 + .25 * Math.sin(t * 2 + s.a)) * (k > 0 ? 1 : 0); s.m.lookAt(cam.position); s.m.rotation.z += s.rot * k * .4; });
    sparks.forEach(s => { const v = Math.max(0, Math.sin(t * 2.2 * s.s + s.d * 5)); s.m.material.opacity = sm(3.5, 4.2, t) * v; s.m.scale.setScalar(.6 + .5 * v); });
    post.uniforms.uT!.value = t; post.uniforms.uCA!.value = 1 + 3 * bump(3.5, 3.9, 4.6, t);
    const shake = bump(3.5, 3.75, 4.3, t) * .06;
    cam.position.set(.12 * Math.sin(t * .5) + Math.sin(t * 61) * shake, .05 * Math.cos(t * .4) + Math.cos(t * 57) * shake, 7.2 - .5 * sm(3.5, 5.5, t)); cam.lookAt(0, 0, 0);
    composer.render();
    const ph = (PHASE_AT.filter(p => t >= p).length) as 0 | 1 | 2 | 3 | 4 | 5;
    if (ph > lastPhase) { lastPhase = ph; if (ph >= 1) o.onPhase?.(ph as 1 | 2 | 3 | 4 | 5); }
  };

  const T0 = performance.now(); let off = 0, raf = 0, dead = false;
  const nowT = () => o.frozenT ?? ((performance.now() - T0) / 1000 + off);
  const loop = () => { if (dead) return; raf = requestAnimationFrame(loop); frame(nowT()); };
  if (o.frozenT !== undefined) { PHASE_AT.forEach((p, i) => { if (o.frozenT! >= p) o.onPhase?.((i + 1) as 1 | 2 | 3 | 4 | 5); }); frame(o.frozenT); } else loop();
  return {
    time: nowT, ended: () => nowT() >= END_AT, skipToEnd() { off += Math.max(0, END_AT - nowT()); },
    dispose() { dead = true; cancelAnimationFrame(raf); scene.traverse(ob => { const m = ob as THREE.Mesh; m.geometry?.dispose?.(); }); disposables.forEach(d => { try { d.dispose(); } catch { /* bỏ qua */ } }); renderer.forceContextLoss(); renderer.domElement.remove(); }
  };
}
