/* Hệ hạt cho hiệu ứng gacha, vẽ bằng canvas 2D (cộng sáng): hạt xoáy hút vào, nổ tung, sao băng, sóng xung kích, pháo giấy, đom đóm.
   Mọi kích thước tính theo màn hình nên cùng một kịch bản chạy tốt trên điện thoại và máy tính. */
interface P {
  x: number; y: number; vx: number; vy: number; ay: number; life: number; max: number; size: number; c: string;
  k: "glow" | "star" | "conf" | "streak"; rot: number; vr: number; len: number; grow: number;
  pol?: { a: number; r: number; dr: number; w: number };
}
interface Ring { r: number; dr: number; life: number; max: number; c: string; lw: number }
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(c: string, kind: "glow" | "star") {
  const key = kind + c, hit = sprites.get(key); if (hit) return hit;
  const s = document.createElement("canvas"); s.width = s.height = 64; const g = s.getContext("2d")!;
  if (kind === "glow") {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "#fff"); gr.addColorStop(.25, c); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  } else {
    g.translate(32, 32); g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 8; g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 6 : 28; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill();
  }
  sprites.set(key, s); return s;
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;

export function createVFX(cv: HTMLCanvasElement, colors: string[]) {
  const ctx = cv.getContext("2d")!, ps: P[] = [], rings: Ring[] = [];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, cap = reduce ? 80 : 700;
  let W = 0, H = 0, U = 1, cx = 0, cy = 0, raf = 0, last = 0, charge = 0, embers = 0, running = true, meteorLeft = 0, meteorT = 0;
  const resize = () => {
    const dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    U = Math.min(W, H * .8) / 420; cx = W / 2; cy = H * .44;
  };
  resize(); addEventListener("resize", resize);
  const add = (p: Partial<P> & { c: string; k: P["k"] }) => {
    if (ps.length > cap) return;
    ps.push({ x: cx, y: cy, vx: 0, vy: 0, ay: 0, life: 0, max: 1, size: 10, rot: 0, vr: 0, len: 0, grow: 0, ...p });
  };
  function burstAt(x: number, y: number, n: number, speed: number, cols = colors) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = rnd(.3, 1) * speed * U;
      add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, max: rnd(.6, 1.4), size: rnd(6, 16) * U, c: pick(cols), k: Math.random() < .45 ? "star" : "glow", rot: rnd(0, 6), vr: rnd(-4, 4) });
    }
  }
  function ring(c: string, maxR: number, life = .9, lw = 6) { rings.push({ r: 8 * U, dr: maxR * U / life, life: 0, max: life, c, lw: lw * U }); }
  function confetti(n: number) {
    for (let i = 0; i < n; i++) add({ x: rnd(0, W), y: rnd(-H * .3, -10), vx: rnd(-40, 40) * U, vy: rnd(120, 320) * U, ay: 120 * U, max: rnd(2.2, 3.6), size: rnd(7, 13) * U, c: pick(colors), k: "conf", rot: rnd(0, 6), vr: rnd(-8, 8) });
  }
  function meteor() {
    const a = rnd(2.25, 2.55), v = rnd(900, 1300) * U, len = rnd(120, 260) * U;
    add({ x: rnd(W * .3, W * 1.1), y: rnd(-60, H * .15), vx: Math.cos(a) * v, vy: Math.sin(a) * v, max: rnd(.7, 1.1), size: rnd(2.5, 5) * U, c: pick(colors), k: "streak", len });
  }
  function frame(t: number) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
    // phát hạt
    if (charge > 0) {
      const rate = charge * 90 * dt, n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
      for (let i = 0; i < n; i++) { const r = rnd(140, 260) * U * (1.2 - charge * .3); add({ k: Math.random() < .3 ? "star" : "glow", c: pick(colors), size: rnd(5, 12) * U, max: 1.6, pol: { a: rnd(0, 6.28), r, dr: -rnd(110, 220) * U * (.7 + charge), w: rnd(1.6, 3.4) * (Math.random() < .5 ? 1 : -1) } }); }
    }
    if (embers > 0 && Math.random() < embers * dt * 14) add({ x: rnd(0, W), y: H + 10, vx: rnd(-12, 12) * U, vy: -rnd(40, 110) * U, max: rnd(2, 3.5), size: rnd(4, 9) * U, c: pick(colors), k: Math.random() < .4 ? "star" : "glow" });
    if (meteorLeft > 0) { meteorT -= dt; if (meteorT <= 0) { meteor(); meteorLeft--; meteorT = rnd(.08, .22); } }
    // vẽ
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]!; r.life += dt; r.r += r.dr * dt * (1 - r.life / r.max * .6);
      if (r.life >= r.max) { rings.splice(i, 1); continue; }
      ctx.globalAlpha = (1 - r.life / r.max) * .85; ctx.strokeStyle = r.c; ctx.lineWidth = r.lw * (1 - r.life / r.max * .7);
      ctx.beginPath(); ctx.arc(cx, cy, r.r, 0, 7); ctx.stroke();
    }
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]!; p.life += dt;
      if (p.life >= p.max) { ps.splice(i, 1); continue; }
      if (p.pol) { p.pol.a += p.pol.w * dt; p.pol.r += p.pol.dr * dt; if (p.pol.r < 10 * U) { ps.splice(i, 1); continue; } p.x = cx + Math.cos(p.pol.a) * p.pol.r; p.y = cy + Math.sin(p.pol.a) * p.pol.r * .75; }
      else { p.vy += p.ay * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - .6 * dt * (p.k === "conf" ? 0 : 1); }
      p.rot += p.vr * dt;
      const f = p.life / p.max, a = p.pol ? Math.min(1, f * 4) * (1 - f * .3) : f < .12 ? f / .12 : 1 - (f - .12) / .88;
      ctx.globalAlpha = Math.max(0, a);
      if (p.k === "streak") {
        const sp = Math.hypot(p.vx, p.vy) || 1, tx = p.x - p.vx / sp * p.len, ty = p.y - p.vy / sp * p.len, g = ctx.createLinearGradient(p.x, p.y, tx, ty);
        g.addColorStop(0, "#fff"); g.addColorStop(.25, p.c); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = g; ctx.lineWidth = p.size; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tx, ty); ctx.stroke();
      } else if (p.k === "conf") {
        ctx.globalCompositeOperation = "source-over"; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 1.7)); ctx.fillStyle = p.c; ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66); ctx.restore(); ctx.globalCompositeOperation = "lighter";
      } else {
        const s = sprite(p.c, p.k), sz = p.size * (1 + p.grow * f) * 2.2;
        if (p.k === "star") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(s, -sz / 2, -sz / 2, sz, sz); ctx.restore(); }
        else ctx.drawImage(s, p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  raf = requestAnimationFrame(frame);
  return {
    burst: (n: number, speed = 320, cols = colors) => burstAt(cx, cy, n, speed, cols), burstAt, ring, confetti,
    meteors: (n: number) => { meteorLeft += n; }, setCharge: (v: number) => { charge = v; }, setEmbers: (v: number) => { embers = v; },
    center: () => ({ x: cx, y: cy }),
    stop() { running = false; cancelAnimationFrame(raf); removeEventListener("resize", resize); }
  };
}
export type VFX = ReturnType<typeof createVFX>;

/** rung một phần tử: biên độ giảm dần theo thời gian */
export function shake(el: HTMLElement, amp: number, ms: number) {
  const t0 = performance.now();
  const step = (now: number) => {
    const f = (now - t0) / ms; if (f >= 1) { el.style.transform = ""; return; }
    const k = amp * (1 - f) * (1 - f);
    el.style.transform = `translate(${((Math.random() - .5) * 2 * k).toFixed(1)}px,${((Math.random() - .5) * 2 * k).toFixed(1)}px)`;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
