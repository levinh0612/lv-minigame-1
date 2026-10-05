/* Hiệu ứng quay gacha: phim triệu hồi dựng bằng canvas (gachawarp.ts) + hạt/rung/chớp + âm thanh tổng hợp.
   Thường ~6s, Hiếm ~4,5s (sóng xung kích, chữ HIẾM), Cực hiếm ~9s (huy hiệu vàng, ba sao, chớp trắng, pháo giấy, cánh sáng).
   Chạm để bỏ qua. Quay 10 lần: sau phim là 10 thẻ lật lần lượt, thẻ hiếm bung hạt khi lật. */
import { sfx } from "../audio/sound";
import { RARITIES, RARITY, KIND_NAME, type GachaItem, type Rarity } from "../content/gacha";
import { roomItem } from "../content/room";
import type { PullResult } from "../engine/gacha";
import { S } from "../engine/state";
import { fmtN } from "../engine/util";
import { cakeSVG, guestSVG } from "./art";
import { esc } from "./dom";
import { createVFX, shake } from "./gachavfx";
import { runWarp, WARP_MS } from "./gachawarp";
import { mountTurntable } from "../scene/glbview";
import { hydratePortraits, portraitHTML } from "./portrait";

const LOOK = { skin: "#FFE9DA", hair: "#3B2A26", coat: "#444", shirt: "#fff", eye: "#5FA6C9" };
const PAL: Record<Rarity, string[]> = {
  common: ["#BFE0FF", "#FFFFFF", "#9ED0FF"],
  rare: ["#9FB0FF", "#D8B8FF", "#7A8CFF", "#FFFFFF"],
  ultra: ["#FFD35A", "#FFF0B0", "#FFB347", "#FFFFFF", "#FF9BD0"]
};

/** hình của một vật phẩm (công thức: bánh; trang trí: mẫu màu; nhân vật: ảnh 3D; linh vật: ảnh thú) */
export function gachaArt(it: GachaItem, px: number, live = false) {
  if (it.recipe) return cakeSVG({ base: it.recipe.base, cream: it.recipe.cream, top: it.recipe.top, sweet: 1 }, { size: px, still: true });
  if (it.decor) { const d = roomItem(it.decor.k, it.decor.v); return `<span class="gart sw" style="width:${px}px;height:${px}px;background:${d.sw};background-size:${d.sws || "auto"}"></span>`; }
  if (it.char) return portraitHTML(it.char.sprite, LOOK, px, guestSVG({ gender: it.char.gender, sprite: it.char.sprite, mood: "happy", ledge: false }, px), "", live);
  if (it.mascot) return `<span class="gart mas${it.mascot.art ? " art" : ""}" style="width:${px}px;height:${px}px"><img src="/gacha/mascot-${it.mascot.img}.webp" alt="" width="${px}" height="${px}"></span>`;
  return "";
}

const card = (r: PullResult, px: number, live: boolean) => {
  const R = RARITY[r.item.rarity];
  return `<div class="gcard r-${r.item.rarity}" style="--rc:${R.c};--rc2:${R.c2}"><span class="gtag">${R.n}</span><div class="gimg">${gachaArt(r.item, px, live)}</div>
    <b>${esc(r.item.n)}</b><small>${KIND_NAME[r.item.kind]}</small>${r.isNew ? `<em class="gnew">Mới!</em>` : `<em class="gdup">Trùng · +${r.dust} Bụi sao</em>`}</div>`;
};
const STARS: Record<Rarity, string> = { common: "★", rare: "★★", ultra: "★★★" };
/** màn "vật phẩm hiện to" trước khi ra thẻ: mỗi loại có chuyển động riêng (nhân vật bước vào, thú nảy, bánh xoay, trang trí lật) */
function heroHTML(r: PullResult, px: number) {
  const it = r.item, R = RARITY[it.rarity];
  return `<div class="ghx k-${it.kind} r-${it.rarity}" style="--rc:${R.c};--rc2:${R.c2}">
    <div class="gh-wrap"><div class="gsun"></div><div class="gh-pillar"></div><div class="gh-aura"></div>${it.mascot ? `<i class="gh-heart">♥</i><i class="gh-heart b">♥</i><i class="gh-heart c">✦</i>` : ""}
      ${it.full ? `<div class="gh-item gh-full"><img src="/gacha/full-${it.full}.webp" alt="" draggable="false"></div>` : `<div class="gh-item" style="--px:${px}px">${gachaArt(it, px, true)}</div>`}</div>
    <div class="gh-name"><i>${STARS[it.rarity]}</i><b>${esc(it.n)}</b><span>${R.n} · ${KIND_NAME[it.kind]}</span></div>
    ${r.isNew ? `<em class="gh-stamp">MỚI!</em>` : `<em class="gh-stamp dup">Trùng · +${r.dust} Bụi sao</em>`}<small class="gh-hint">Chạm để tiếp tục</small></div>`;
}
const SHINE: Record<Rarity, string> = { common: "gshine1", rare: "gshine2", ultra: "gshine3" };
const BANNER: Partial<Record<Rarity, string>> = { rare: "✦ HIẾM ✦", ultra: "★ CỰC HIẾM ★" };

/** chạy phim cho kết quả quay; gọi onDone khi người chơi bấm OK */
export function playReveal(results: PullResult[], onDone: () => void) {
  const best = RARITIES.reduce((b, r) => (results.some(x => x.item.rarity === r) ? r : b), "common" as Rarity), R = RARITY[best], cols = PAL[best];
  const root = document.createElement("div");
  root.className = `gfx r-${best}`; root.style.cssText = `--rc:${R.c};--rc2:${R.c2};--d:${WARP_MS[best]}ms`;
  root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Kết quả triệu hồi");
  root.innerHTML = `<div class="gfx-world"><div class="gfx-bg"></div><div class="gfx-rays"></div><canvas class="gfx-cv"></canvas>
      <video class="gfx-vid" src="/gacha/summon-${best}.mp4" playsinline preload="auto"></video><canvas class="gfx-warp"></canvas>${BANNER[best] ? `<div class="gfx-banner"><span>${BANNER[best]}</span></div>` : ""}</div>
    <div class="gfx-flash"></div><div class="gfx-hint">Chạm để bỏ qua</div><div class="gfx-out"></div>`;
  document.body.appendChild(root);
  const world = root.querySelector<HTMLElement>(".gfx-world")!, out = root.querySelector<HTMLElement>(".gfx-out")!;
  const vid = root.querySelector<HTMLVideoElement>(".gfx-vid")!, wcv = root.querySelector<HTMLCanvasElement>(".gfx-warp")!;
  let warp: ReturnType<typeof runWarp> | null = null;
  vid.muted = !S.sound; vid.volume = .8;
  const vfx = createVFX(root.querySelector<HTMLCanvasElement>(".gfx-cv")!, cols);
  const timers: number[] = [], at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const flash = (cls: string) => { const f = root.querySelector<HTMLElement>(".gfx-flash")!; f.className = "gfx-flash"; void f.offsetWidth; f.classList.add(cls); };
  const cls = (...c: string[]) => root.classList.add(...c);
  let shown = false;

  const show = () => {
    if (shown) return; shown = true; timers.forEach(clearTimeout);
    warp?.stop(); vid.pause(); vid.remove(); vfx.setCharge(0); cls("p1", "s2", "s3", "s4", "p3", "p4"); flash("soft");
    if (best !== "common") vfx.setEmbers(best === "ultra" ? 1.2 : .7);
    const buildCard = () => {
    if (results.length === 1) {
      const it = results[0]!.item;
      out.innerHTML = `<div class="gone">${best !== "common" ? `<div class="gsun"></div>` : ""}${best === "ultra" ? `<i class="gwing l"></i><i class="gwing r"></i>` : ""}
        <div class="gstep ${it.char ? "walk" : ""}">${card(results[0]!, 150, true)}</div><button class="b3 gok">OK</button></div>`;
      at(180, () => { const c = out.querySelector(".gcard")?.getBoundingClientRect(); if (c) vfx.burstAt(c.left + c.width / 2, c.top + c.height / 2, best === "ultra" ? 50 : best === "rare" ? 28 : 14, 300); });
    } else {
      const news = results.filter(x => x.isNew).length, dust = results.reduce((a, x) => a + x.dust, 0);
      out.innerHTML = `<div class="gmulti"><h2>Triệu hồi ${results.length} lần</h2><p>${news} món mới${dust ? ` · +${fmtN(dust)} Bụi sao` : ""}</p>
        <div class="ggrid">${results.map(x => `<div class="gflip r-${x.item.rarity}" style="--rc:${RARITY[x.item.rarity].c}"><div class="gface front">${card(x, 52, false)}</div><div class="gface back"><span>★</span></div></div>`).join("")}</div>
        <button class="b3 gok" disabled>OK</button></div>`;
      const flips = [...out.querySelectorAll<HTMLElement>(".gflip")], ok = out.querySelector<HTMLButtonElement>(".gok")!;
      flips.forEach((el, i) => at(300 + i * 230, () => {
        el.classList.add("open"); sfx("gflip");
        const rar = results[i]!.item.rarity;
        if (rar !== "common") { sfx(rar === "ultra" ? "gshine2" : "gshine1"); const b = el.getBoundingClientRect(); vfx.burstAt(b.left + b.width / 2, b.top + b.height / 2, rar === "ultra" ? 46 : 22, 260); if (rar === "ultra") vfx.ring(cols[0]!, 120, .8, 4); }
        if (i === flips.length - 1) ok.disabled = false;
      }));
    }
      hydratePortraits(out);
      out.querySelector(".gok")?.addEventListener("click", e => { e.stopPropagation(); root.classList.add("out"); setTimeout(() => { vfx.stop(); root.remove(); onDone(); }, 220); });
    };
    /* vật phẩm hiếm nhất (ưu tiên món mới) hiện to trước, rồi mới ra thẻ hoặc lưới */
    const star = [...results].sort((x, y) => RARITIES.indexOf(y.item.rarity) - RARITIES.indexOf(x.item.rarity) || Number(y.isNew) - Number(x.isNew))[0]!;
    const hold = ({ common: 1700, rare: 2500, ultra: 3300 })[best] + (star.item.full ? 1200 : 0);
    const heroPx = Math.round(Math.min(300, innerWidth * .72, innerHeight * .4));
    out.innerHTML = heroHTML(star, heroPx);
    let unmount = () => { };
    const mdl = star.item.mascot?.art ? undefined : star.item.mascot?.model, hostEl = out.querySelector<HTMLElement>(".gh-item");
    if (mdl && hostEl) { unmount = mountTurntable(hostEl, mdl, heroPx); window.setTimeout(() => { const im = hostEl.querySelector<HTMLElement>(".gart"); if (im && hostEl.querySelector(".gh-3d")) im.style.visibility = "hidden"; }, 900); }
    hydratePortraits(out); sfx(SHINE[star.item.rarity]);
    const ctr = vfx.center();
    vfx.burstAt(ctr.x, ctr.y, star.item.rarity === "ultra" ? 70 : star.item.rarity === "rare" ? 40 : 18, 340); vfx.ring(cols[0]!, star.item.rarity === "ultra" ? 280 : 200, 1, 7);
    let went = false;
    const next = () => { if (went) return; went = true; clearTimeout(holdT); out.querySelector(".ghx")?.classList.add("leave"); setTimeout(() => { unmount(); buildCard(); }, 280); };
    const holdT = window.setTimeout(next, hold);
    window.setTimeout(() => out.querySelector(".ghx")?.addEventListener("click", e => { e.stopPropagation(); next(); }), 700);
    if (best === "ultra") { vfx.confetti(results.length === 1 ? 40 : 60); vfx.ring(cols[0]!, 300, 1.1, 8); }
  };

  /* ---- phương án dự phòng (video lỗi/không phát được): phim vẽ bằng canvas theo mốc tỷ lệ thời gian (WARP_MS) ---- */
  const fallback = () => {
  vid.remove(); warp = runWarp(wcv, best);
  const wob = (amp: number, ms: number) => shake(world, amp, ms), D = WARP_MS[best], T = (f: number) => Math.round(D * f);
  const burstEnd = () => { cls("p3", "s4"); vfx.setCharge(0); sfx("gboom"); wob(best === "ultra" ? 16 : best === "rare" ? 9 : 4, 600); };
  at(20, () => { cls("p1"); vfx.setCharge(.3); sfx(best === "common" ? "gcharge1" : best === "rare" ? "gcharge2" : "gcharge3"); if (best !== "common") vfx.setEmbers(.6); });
  at(T(.26), () => { cls("s2"); vfx.setCharge(.55); vfx.ring(cols[0]!, 190, .9, 4); });
  at(T(.56), () => { cls("s3"); vfx.setCharge(.85); sfx("gwhoosh"); if (best !== "common") vfx.meteors(best === "ultra" ? 10 : 5); wob(3, 900); });
  if (best === "ultra") at(T(.78), () => { vfx.setCharge(1); vfx.meteors(6); wob(7, 900); vfx.ring(cols[1]!, 300, .9, 6); });
  at(T(.9), () => {
    burstEnd(); flash(best === "ultra" ? "white" : best === "rare" ? "hard" : "soft");
    vfx.burst(best === "ultra" ? 170 : best === "rare" ? 90 : 30, best === "ultra" ? 620 : 460); vfx.ring(cols[0]!, best === "common" ? 170 : 330, 1, 9);
    if (best === "ultra") { vfx.confetti(60); [340, 260, 190].forEach((r, i) => setTimeout(() => vfx.ring(cols[i]!, r * 1.3, 1.1, 10 - i * 2), i * 160)); }
    if (BANNER[best]) root.classList.add("banner");
  });
  at(T(.985), show);
  };
  /* ---- chính: phát đoạn video đã cắt (thường 0–6s, hiếm 9–13s, cực hiếm 14–23s của summon_animation.mp4) ---- */
  wcv.style.display = "none";
  cls("p1"); vfx.setEmbers(0);
  vid.addEventListener("ended", () => { flash(best === "ultra" ? "white" : "soft"); at(250, show); });
  vid.addEventListener("error", () => { wcv.style.display = ""; fallback(); });
  at(WARP_MS[best] + 2500, show);                                                      // chốt chặn nếu video đứng
  vid.play().then(() => { if (best === "ultra") at(WARP_MS[best] - 1200, () => root.classList.add("banner")); else if (best === "rare") at(WARP_MS[best] - 1500, () => root.classList.add("banner")); }).catch(() => { vid.muted = true; vid.play().catch(() => { wcv.style.display = ""; fallback(); }); });
  root.addEventListener("click", () => { if (!shown) show(); });
}

