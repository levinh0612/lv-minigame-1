/* Phim "triệu hồi sao băng" vẽ bằng canvas (không dùng video): sao chổi lao vào → lỗ tinh vân xoáy mở ra → đường hầm sao → loé sao 4 cánh.
   Cực hiếm có thêm vầng huy hiệu vàng và 3 ngôi sao hiện lần lượt. Trả về hàm dừng; `progress()` cho biết tiến độ 0..1. */
import type { Rarity } from "../content/gacha";

const COL: Record<Rarity, { a: string; b: string; c: string }> = {
  common: { a: "#7FC4FF", b: "#D9EEFF", c: "#2E5FD0" },
  rare: { a: "#A98BFF", b: "#EDE5FF", c: "#5B3FD0" },
  ultra: { a: "#FFD36A", b: "#FFF3C9", c: "#E08A1E" }
};
export const WARP_MS: Record<Rarity, number> = { common: 6000, rare: 4500, ultra: 9000 };

export function runWarp(cv: HTMLCanvasElement, rarity: Rarity) {
  const ctx = cv.getContext("2d")!, C = COL[rarity], D = WARP_MS[rarity], dpr = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0, raf = 0, t0 = performance.now(), stopped = false, last = t0;
  const fit = () => { W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit();
  const rnd = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const stars = Array.from({ length: 260 }, () => ({ a: rnd() * Math.PI * 2, r: rnd(), z: .2 + rnd() * .8, s: .6 + rnd() * 1.6 }));
  const dust = Array.from({ length: 70 }, () => ({ x: rnd(), y: rnd(), s: .4 + rnd() * 1.2, p: rnd() * 6 }));
  const E = (x: number) => x * x * (3 - 2 * x), cl = (x: number) => Math.max(0, Math.min(1, x)), seg = (p: number, a: number, b: number) => cl((p - a) / (b - a));
  const star4 = (x: number, y: number, r: number, rot: number, al: number) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = al; ctx.globalCompositeOperation = "lighter";
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, "#fff"); gr.addColorStop(.18, C.b); gr.addColorStop(.55, C.a + "88"); gr.addColorStop(1, "transparent"); ctx.fillStyle = gr;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .1 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * .28); core.addColorStop(0, "#fff"); core.addColorStop(1, "transparent"); ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, r * .28, 0, 7); ctx.fill(); ctx.restore();
  };

  const frame = (now: number) => {
    if (stopped) return; raf = requestAnimationFrame(frame);
    if (cv.clientWidth && (Math.abs(cv.clientWidth - W) > 2 || Math.abs(cv.clientHeight - H) > 2)) fit();
    const t = now - t0, p = cl(t / D), cx = W / 2, cy = H * .46, M = Math.min(W, H); last = now;
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    const g0 = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .8); g0.addColorStop(0, "#14122e"); g0.addColorStop(1, "#05040f"); ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    /* bụi sao nền nhấp nháy */
    ctx.fillStyle = C.b; dust.forEach(d => { ctx.globalAlpha = (.25 + .35 * Math.sin(t / 500 + d.p)) * (1 - seg(p, .55, .75)); ctx.fillRect(d.x * W, d.y * H, d.s, d.s); });
    ctx.globalAlpha = 1;

    const hole = E(seg(p, .26, .58)) * (1 - E(seg(p, .88, 1)) * .0), holeR = M * (rarity === "ultra" ? .34 : .3) * hole;
    const tun = E(seg(p, .56, .9));

    /* sao chổi: bay từ góc trên-trái vào tâm trong 0..0.3 */
    const cp = seg(p, .02, .3);
    if (cp > 0 && cp < 1) {
      const e = E(cp), hx = -W * .1 + (cx + W * .1) * e, hy = H * .05 + (cy - H * .05) * e * e * .6 + (cy - H * .05) * e * .4 * 0;
      for (let i = 0; i < 26; i++) {
        const k = i / 26, x = hx - (cx + W * .1) * .22 * k, y = hy - (H * .5) * .2 * k * (1 - e * .4), r = (1 - k) * M * .05;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r + 1); gr.addColorStop(0, C.b); gr.addColorStop(.4, C.a); gr.addColorStop(1, "transparent");
        ctx.globalAlpha = (1 - k) * .75; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; star4(hx, hy, M * .09, t / 400, 1);
    }

    /* lỗ tinh vân xoáy */
    if (hole > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(cx, cy);
      const halo = ctx.createRadialGradient(0, 0, holeR * .2, 0, 0, holeR * 1.7); halo.addColorStop(0, "rgba(0,0,0,0)"); halo.addColorStop(.45, C.c + "AA"); halo.addColorStop(.7, C.a + "55"); halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, holeR * 1.7, 0, 7); ctx.fill();
      const arms = rarity === "ultra" ? 4 : 3, spin = t / (900 - tun * 450);
      for (let a = 0; a < arms; a++) for (let i = 0; i < 42; i++) {
        const k = i / 42, ang = spin + a * (Math.PI * 2 / arms) + k * 4.2, rr = holeR * (.15 + k * 1.15), s = (1 - k * .6) * M * .02 * (.6 + hole);
        ctx.globalAlpha = (1 - k) * .55 * hole; ctx.fillStyle = k < .5 ? C.b : C.a; ctx.beginPath(); ctx.arc(Math.cos(ang) * rr, Math.sin(ang) * rr * .92, s, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, holeR * .8); core.addColorStop(0, "#02010a"); core.addColorStop(.75, "#05030f"); core.addColorStop(1, "rgba(5,3,15,0)");
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, holeR * .8, 0, 7); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = C.b; ctx.globalAlpha = .8 * hole; ctx.shadowColor = C.a; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(0, 0, holeR * .82, 0, 7); ctx.stroke();
      ctx.restore();
    }

    /* đường hầm sao: sao bắn ra từ tâm, càng lúc càng dài */
    if (tun > 0) {
      ctx.save(); ctx.translate(cx, cy); ctx.lineCap = "round"; ctx.strokeStyle = C.b;
      stars.forEach(s => {
        const base = (s.r + (t / 1000) * s.z * (.25 + tun * 1.6)) % 1, r0 = base * base * Math.hypot(W, H) * .62, len = (4 + tun * 90 * s.z) * base;
        const x0 = Math.cos(s.a) * r0, y0 = Math.sin(s.a) * r0, x1 = Math.cos(s.a) * (r0 + len), y1 = Math.sin(s.a) * (r0 + len);
        ctx.globalAlpha = tun * Math.min(1, base * 2.5); ctx.lineWidth = s.s * (.5 + base * 1.6); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      });
      ctx.restore(); ctx.globalAlpha = 1;
    }

    /* cực hiếm: vạch vàng ngang → huy hiệu 8 tia, rồi 3 ngôi sao */
    if (rarity === "ultra") {
      const lp = seg(p, .3, .42), em = seg(p, .38, .52), fade = 1 - seg(p, .86, .93);
      if (lp > 0 && fade > 0) {
        ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha = fade; ctx.shadowColor = C.a; ctx.shadowBlur = 20; ctx.strokeStyle = C.b; ctx.lineWidth = 3;
        const hw = W * .45 * E(lp) * (1 - em * .55); ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
        if (em > 0) {
          const R = M * .2 * E(em); ctx.rotate(t / 2200); ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
          for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(R * 1.03, 0); ctx.lineTo(R * (i % 2 ? 1.28 : 1.5), 0); ctx.stroke(); }
          ctx.rotate(-t / 2200); ctx.fillStyle = C.a; ctx.globalAlpha = fade * .85; ctx.beginPath(); ctx.moveTo(0, -R * .5); ctx.lineTo(R * .3, 0); ctx.lineTo(0, R * .5); ctx.lineTo(-R * .3, 0); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      for (let i = 0; i < 3; i++) { const sp = seg(p, .55 + i * .08, .62 + i * .08); if (sp > 0 && fade > 0) star4(cx + (i - 1) * M * .17, cy + M * .31, M * .07 * (.4 + E(sp) * .6) * (1 + (1 - sp) * 1.5), 0, sp * fade); }
    }
    ctx.globalAlpha = 1;

    /* loé sao 4 cánh cuối phim */
    const fl = seg(p, .88, 1);
    if (fl > 0) { const k = Math.sin(fl * Math.PI); star4(cx, cy, M * (.2 + fl * .75), fl * .8, Math.min(1, k * 1.2)); }
    void last;
  };
  raf = requestAnimationFrame(frame);
  return { stop: () => { stopped = true; cancelAnimationFrame(raf); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }, progress: () => cl((performance.now() - t0) / D) };
}
