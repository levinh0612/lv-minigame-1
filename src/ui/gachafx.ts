/* Hiệu ứng quay gacha: phim triệu hồi dựng bằng canvas (gachawarp.ts) + hạt/rung/chớp + âm thanh tổng hợp.
   Thường ~6s, Hiếm ~4,5s (sóng xung kích, chữ HIẾM), Cực hiếm ~9s (huy hiệu vàng, ba sao, chớp trắng, pháo giấy, cánh sáng).
   Chạm để bỏ qua. Quay 10 lần: sau phim là 10 thẻ lật lần lượt, thẻ hiếm bung hạt khi lật. */
import { rarityIcon, rarityText } from "./badges";
import { sfx } from "../audio/sound";
import { RARITIES, RARITY, KIND_NAME, itemImg, type GachaItem, type Rarity } from "../content/gacha";
import { roomItem } from "../content/room";
import type { PullResult } from "../engine/gacha";
import { fmtN } from "../engine/util";
import { cakeSVG, guestSVG } from "./art";
import { esc } from "./dom";
import { createVFX, shake } from "./gachavfx";
import { runWarp, WARP_MS } from "./gachawarp";
import { mountTurntableLazy as mountTurntable } from "../scene/turntable";
import { hydratePortraits, portraitHTML } from "./portrait";
import type { Reveal3d } from "./gachareveal3d";

export const LOOK = { skin: "#FFE9DA", hair: "#3B2A26", coat: "#444", shirt: "#fff", eye: "#5FA6C9" };
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
  if (it.mascot || it.mgr) return `<span class="gart mas${it.mascot?.art ? " art" : ""}" style="width:${px}px;height:${px}px"><img src="${itemImg(it)}" alt="" width="${px}" height="${px}"></span>`;
  return "";
}

let previewMode = false;                                                   // xem thử từ bảng "Có thể trúng gì": không đổi dữ liệu, ghi "Xem trước"
const card = (r: PullResult, px: number, live: boolean) => {
  const R = RARITY[r.item.rarity];
  return `<div class="gcard r-${r.item.rarity}" style="--rc:${R.c};--rc2:${R.c2}"><span class="gtag">${R.n}</span><div class="gimg">${gachaArt(r.item, px, live)}</div>
    <b>${esc(r.item.n)}</b><small>${KIND_NAME[r.item.kind]}</small>${previewMode ? `<em class="gnew">Xem trước</em>` : r.isNew ? `<em class="gnew">Mới!</em>` : `<em class="gdup">Trùng · +${r.dust} Bụi sao</em>`}</div>`;
};
const gridCard = (r: PullResult) => { const k = r.item.rarity;
  return `<div class="mc r-${k}" style="--bg:url(/gacha/fx2/bg-${k}.webp);--rc:${RARITY[k].c}"><div class="mc-art">${gachaArt(r.item, 64, false)}</div>
    <b>${esc(r.item.n)}</b>${r.isNew ? `<em class="gnew">Mới!</em>` : `<em class="mc-dup">+${r.dust} ✦</em>`}<i class="mc-fr" style="border-image-source:url(/gacha/frames/card-${k}.webp)"></i></div>`; };
const STARS: Record<Rarity, string> = { common: "★", rare: "★★", ultra: "★★★" };
/** màn "vật phẩm hiện to" trước khi ra thẻ: mỗi loại có chuyển động riêng (nhân vật bước vào, thú nảy, bánh xoay, trang trí lật) */
function heroHTML(r: PullResult, px: number) {
  const it = r.item, R = RARITY[it.rarity];
  const stamp = previewMode ? `<em class="gh-stamp dup">XEM TRƯỚC</em>` : r.isNew ? `<em class="gh-stamp">MỚI!</em>` : `<em class="gh-stamp dup">Trùng · +${r.dust} Bụi sao</em>`;
  const info = `<div class="gh-name"><i>${STARS[it.rarity]}</i><b>${esc(it.n)}</b><span>${R.n} · ${KIND_NAME[it.kind]}</span></div>${stamp}<small class="gh-hint">Chạm để tiếp tục</small>`;
  if (it.full) {            // có tranh minh hoạ: tranh phủ kín màn hình (nền mờ cùng tranh lấp phần thừa), thông tin nằm dải dưới
    const url = `/gacha/full-${it.full}.webp`;
    return `<div class="ghx ghx-fs r-${it.rarity}" style="--rc:${R.c};--rc2:${R.c2}"><div class="gh-fsbg" style="background-image:url(${url})"></div><img class="gh-fsimg" src="${url}" alt="" draggable="false"><div class="gh-fsinfo">${info}</div></div>`;
  }
  return `<div class="ghx k-${it.kind} r-${it.rarity}" style="--rc:${R.c};--rc2:${R.c2}">
    <div class="gh-wrap"><div class="gsun"></div><div class="gh-pillar"></div><div class="gh-aura"></div>${it.mascot || it.mgr ? `<i class="gh-heart">♥</i><i class="gh-heart b">♥</i><i class="gh-heart c">✦</i>` : ""}
      <div class="gh-item" style="--px:${px}px">${gachaArt(it, px, true)}</div></div>${info}</div>`;
}
const SHINE: Record<Rarity, string> = { common: "gshine1", rare: "gshine2", ultra: "gshine3" };
const BANNER: Partial<Record<Rarity, string>> = { rare: "✦ HIẾM ✦", ultra: "★ CỰC HIẾM ★" };

const DESC: Record<Rarity, string> = { common: "Hiệu ứng ánh sáng đơn giản, tông màu lạnh, hiệu ứng hạt nhẹ.", rare: "Hiệu ứng ánh sáng xanh lam, vệt năng lượng xoáy nhẹ, hiệu ứng hạt rõ hơn.", ultra: "Hiệu ứng ánh sáng vàng kim, vệt năng lượng mạnh mẽ, hạt dày đặc, kèm dải lụa và ánh sao." };
const webglOK = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
/** ảnh tĩnh của vật phẩm để in lên mặt thẻ 3D (null: dùng chữ tên) */
async function itemImageURL(it: GachaItem): Promise<{ url: string | null; full: boolean }> {
  if (it.full) return { url: `/gacha/full-${it.full}.webp`, full: true };
  if (it.mascot || it.mgr) return { url: itemImg(it), full: false };
  if (it.char) { try { const m = await import("../scene/portrait3d"); return { url: await m.portrait3d(it.char.sprite, LOOK), full: false }; } catch { return { url: null, full: false }; } }
  if (it.decor) {      // đồ trang trí: ảnh mẫu hoa văn (vẽ bằng foreignObject để dùng đúng nền CSS của món)
    const d = roomItem(it.decor.k, it.decor.v), svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><foreignObject width="300" height="300"><div xmlns="http://www.w3.org/1999/xhtml" style="width:300px;height:300px;border-radius:36px;background:${d.sw};background-size:${d.sws || "auto"}"></div></foreignObject></svg>`;
    return { url: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg), full: false };
  }
  if (it.recipe) return { url: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(cakeSVG({ base: it.recipe.base, cream: it.recipe.cream, top: it.recipe.top, sweet: 1 }, { size: 300, still: true }).replace("<svg ", "<svg xmlns=\"http://www.w3.org/2000/svg\" ")), full: false };
  return { url: null, full: false };
}

/** chạy phim cho kết quả quay; gọi onDone khi người chơi bấm OK */
export function playReveal(results: PullResult[], onDone: () => void, preview = false) {
  previewMode = preview;
  const best = RARITIES.reduce((b, r) => (results.some(x => x.item.rarity === r) ? r : b), "common" as Rarity), R = RARITY[best], cols = PAL[best];
  const star = [...results].sort((x, y) => RARITIES.indexOf(y.item.rarity) - RARITIES.indexOf(x.item.rarity) || Number(y.isNew) - Number(x.isNew))[0]!;
  const use3d = webglOK() && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.createElement("div");
  root.className = `gfx r-${best}${use3d ? " is3d" : ""}`; root.style.cssText = `--rc:${R.c};--rc2:${R.c2};--d:${WARP_MS[best]}ms`;
  root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Kết quả triệu hồi");
  root.innerHTML = `<div class="gfx-world"><div class="gfx-bg"></div><div class="gfx-rays"></div><canvas class="gfx-cv"></canvas>
      <canvas class="gfx-warp"></canvas>${BANNER[best] ? `<div class="gfx-banner"><span>${BANNER[best]}</span></div>` : ""}</div>
    <div class="gfx-flash"></div><div class="gfx-hint">Chạm để bỏ qua</div><div class="gfx-out"></div>`;
  document.body.appendChild(root);
  const world = root.querySelector<HTMLElement>(".gfx-world")!, out = root.querySelector<HTMLElement>(".gfx-out")!;
  const wcv = root.querySelector<HTMLCanvasElement>(".gfx-warp")!;
  let warp: ReturnType<typeof runWarp> | null = null;
  const vfx = createVFX(root.querySelector<HTMLCanvasElement>(".gfx-cv")!, cols);
  const timers: number[] = [], at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const flash = (cls: string) => { const f = root.querySelector<HTMLElement>(".gfx-flash")!; f.className = "gfx-flash"; void f.offsetWidth; f.classList.add(cls); };
  const cls = (...c: string[]) => root.classList.add(...c);
  let shown = false;

  const show = () => {
    if (shown) return; shown = true; timers.forEach(clearTimeout);
    warp?.stop(); vfx.setCharge(0); cls("p1", "s2", "s3", "s4", "p3", "p4"); flash("soft");
    if (best !== "common") vfx.setEmbers(best === "ultra" ? 1.2 : .7);
    const buildCard = () => {
    if (results.length === 1) {
      const it = results[0]!.item;
      out.innerHTML = `<div class="gone">${best !== "common" ? `<div class="gsun"></div>` : ""}${best === "ultra" ? `<i class="gwing l"></i><i class="gwing r"></i>` : ""}
        <div class="gstep ${it.char ? "walk" : ""}">${card(results[0]!, 150, true)}</div><button class="b3 gok">OK</button></div>`;
      at(180, () => { const c = out.querySelector(".gcard")?.getBoundingClientRect(); if (c) vfx.burstAt(c.left + c.width / 2, c.top + c.height / 2, best === "ultra" ? 50 : best === "rare" ? 28 : 14, 300); });
    } else {
      const rk = { ultra: 2, rare: 1, common: 0 } as const;
      const sorted = [...results].sort((a, b) => rk[b.item.rarity] - rk[a.item.rarity] || Number(b.isNew) - Number(a.isNew));   // hiếm nhất lên đầu
      const news = results.filter(x => x.isNew).length, dust = results.reduce((a, x) => a + x.dust, 0);
      out.innerHTML = `<div class="gmulti"><h2>Triệu hồi ${results.length} lần</h2><p>${news} món mới${dust ? ` · +${fmtN(dust)} Bụi sao` : ""}</p>
        <div class="ggrid">${sorted.map(x => `<div class="gflip r-${x.item.rarity}" style="--rc:${RARITY[x.item.rarity].c}"><div class="gface front">${gridCard(x)}</div><div class="gface back" style="background-image:url(/gacha/fx2/back-${x.item.rarity}.webp)"></div></div>`).join("")}</div>
        <button class="b3 gok" disabled>OK</button></div>`;
      const flips = [...out.querySelectorAll<HTMLElement>(".gflip")], ok = out.querySelector<HTMLButtonElement>(".gok")!;
      flips.forEach((el, i) => at(300 + (flips.length - 1 - i) * 230, () => {      // lật từ thẻ thấp lên cao, thẻ hiếm nhất lật cuối
        el.classList.add("open"); sfx("gflip");
        const rar = sorted[i]!.item.rarity;
        if (rar !== "common") { sfx(rar === "ultra" ? "gshine2" : "gshine1"); const b = el.getBoundingClientRect(); vfx.burstAt(b.left + b.width / 2, b.top + b.height / 2, rar === "ultra" ? 46 : 22, 260); if (rar === "ultra") vfx.ring(cols[0]!, 120, .8, 4); }
        if (i === 0) ok.disabled = false;
      }));
    }
      hydratePortraits(out);
      out.querySelector(".gok")?.addEventListener("click", e => { e.stopPropagation(); root.classList.add("out"); setTimeout(() => { root.remove(); try { vfx.stop(); } catch { /* đã huỷ */ } onDone(); }, 220); });
    };
    if (use3d) { buildCard(); return; }                         // phim Three.js đã cho xem vật phẩm to rồi
    /* vật phẩm hiếm nhất (ưu tiên món mới) hiện to trước, rồi mới ra thẻ hoặc lưới */
    const hold = ({ common: 1700, rare: 2500, ultra: 3300 })[best] + (star.item.full ? 1200 : 0);
    const heroPx = Math.round(Math.min(300, innerWidth * .72, innerHeight * .4));
    out.innerHTML = heroHTML(star, heroPx);
    let unmount = () => { };
    const mdl = star.item.mascot?.art ? undefined : star.item.mascot?.model ?? star.item.mgr?.model, hostEl = out.querySelector<HTMLElement>(".gh-item");
    if (mdl && hostEl) { unmount = mountTurntable(hostEl, mdl, heroPx); window.setTimeout(() => { const im = hostEl.querySelector<HTMLElement>(".gart"); if (im && hostEl.querySelector(".gh-3d")) im.style.visibility = "hidden"; }, 900); }
    hydratePortraits(out); sfx(SHINE[star.item.rarity]);
    const fsImg = out.querySelector<HTMLImageElement>(".gh-fsimg");
    if (fsImg) { const fit = () => { const ra = fsImg.naturalWidth / fsImg.naturalHeight, rv = innerWidth / innerHeight; if (ra && Math.abs(Math.log(ra / rv)) < .5) fsImg.style.objectFit = "cover"; }; if (fsImg.complete) fit(); else fsImg.onload = fit; }
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
  if (shown) return;
  warp = runWarp(wcv, best);
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
  /* ---- phim dự phòng vẽ bằng canvas, dùng khi máy không có WebGL ---- */
  const startClassic = () => { wcv.style.display = ""; fallback(); root.addEventListener("click", () => { if (!shown) show(); }); };

  /* ---- phim Three.js: 5 bước theo bản thiết kế, chữ và nút là lớp HTML phủ lên ---- */
  const run3d = async () => {
    const stW = Math.min(innerWidth, 430), stH = innerHeight, it = star.item, isFull = !!it.full;
    const img = await itemImageURL(it);
    out.innerHTML = `<div class="gr3"><div class="gr3-st" style="width:${stW}px;height:${stH}px;--g:${PAL[best][0]}">
      ${img.full ? `<div class="gr3-fa" style="background-image:url(${img.url})"></div>` : ""}
      <div class="gr3-tt gr3-rl">${rarityText(best, 168)}</div>
      <div class="gr3-info"><div class="gr3-rate">${rarityIcon(best, 30)}</div>
        <b>${esc(it.n)}</b><em>${esc(KIND_NAME[it.kind])}${previewMode ? " · Xem trước" : results.length === 1 ? (star.isNew ? " · Mới!" : ` · Trùng, +${star.dust} Bụi sao`) : ""}</em><span>${esc(it.desc || DESC[best])}</span>
        <button class="b3 gr3-ok">${results.length > 1 ? "Tiếp tục" : "OK"}</button></div></div></div>`;
    const st = out.querySelector<HTMLElement>(".gr3-st")!, okb = out.querySelector<HTMLButtonElement>(".gr3-ok")!;
    const icUrl = `url(/gacha/fx/star-${best}.webp)`; st.style.setProperty("--ic", icUrl);
    const rtp = new URLSearchParams(location.search).get("rt");
    let h: Reveal3d | null = null, iv = 0, closed = false;
    h = await (await import("./gachareveal3d")).createReveal3d({ host: st, rar: best, img: img.url, full: img.full, fallbackText: it.n, w: stW, h: stH, frozenT: rtp ? +rtp : undefined,
      onPhase: p => { st.classList.add("p" + p); if (p === 1) sfx(best === "common" ? "gcharge1" : best === "rare" ? "gcharge2" : "gcharge3"); else if (p === 2) sfx("gwhoosh"); else if (p === 4) { sfx("gboom"); shake(st, best === "ultra" ? 10 : 5, 500); } else if (p === 5) { sfx(SHINE[best]); if (isFull) st.classList.add("full"); } } });
    const close = (toGrid: boolean) => { if (closed) return; closed = true; clearInterval(iv); if (toGrid) { h?.dispose(); out.innerHTML = ""; root.classList.remove("is3d"); show(); } else { root.classList.add("out"); setTimeout(() => { root.remove(); try { h?.dispose(); vfx.stop(); } catch { /* đã huỷ */ } onDone(); }, 220); } };
    iv = window.setInterval(() => { if (h?.ended()) { st.classList.add("ready"); clearInterval(iv); } }, 120);
    st.addEventListener("click", e => { if (e.target === okb) return; if (h && !h.ended()) h.skipToEnd(); });
    okb.addEventListener("click", e => { e.stopPropagation(); close(results.length > 1); });
  };
  if (use3d) void run3d().catch(() => { out.innerHTML = ""; root.classList.remove("is3d"); startClassic(); }); else startClassic();
}

