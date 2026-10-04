/* Hiệu ứng quay gacha: một đoạn phim nhỏ theo độ hiếm, tự dựng bằng canvas + CSS + âm thanh tổng hợp.
   Thường (~2s): tụ sáng nhẹ rồi bung.  Hiếm (~3,6s): tụ năng lượng, sóng xung kích, rung màn hình, chữ HIẾM.
   Cực hiếm (~5,6s): sao băng vàng, tụ năng lượng rung dần, chớp trắng, ba lớp sóng, pháo giấy, chữ CỰC HIẾM, cánh sáng.
   Chạm để bỏ qua. Quay 10 lần: sau phim là 10 thẻ lật lần lượt, thẻ hiếm bung hạt khi lật. */
import { sfx } from "../audio/sound";
import { RARITIES, RARITY, KIND_NAME, type GachaItem, type Rarity } from "../content/gacha";
import { roomItem } from "../content/room";
import type { PullResult } from "../engine/gacha";
import { fmtN } from "../engine/util";
import { cakeSVG, guestSVG } from "./art";
import { esc } from "./dom";
import { createVFX, shake } from "./gachavfx";
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
  if (it.mascot) return `<span class="gart mas" style="width:${px}px;height:${px}px"><img src="/gacha/mascot-${it.mascot.img}.webp" alt="" width="${px}" height="${px}"></span>`;
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
      <div class="gh-item" style="--px:${px}px">${gachaArt(it, px, true)}</div></div>
    <div class="gh-name"><i>${STARS[it.rarity]}</i><b>${esc(it.n)}</b><span>${R.n} · ${KIND_NAME[it.kind]}</span></div>
    ${r.isNew ? `<em class="gh-stamp">MỚI!</em>` : `<em class="gh-stamp dup">Trùng · +${r.dust} Bụi sao</em>`}<small class="gh-hint">Chạm để tiếp tục</small></div>`;
}
const SHINE: Record<Rarity, string> = { common: "gshine1", rare: "gshine2", ultra: "gshine3" };
const BANNER: Partial<Record<Rarity, string>> = { rare: "✦ HIẾM ✦", ultra: "★ CỰC HIẾM ★" };

/** chạy phim cho kết quả quay; gọi onDone khi người chơi bấm OK */
export function playReveal(results: PullResult[], onDone: () => void) {
  const best = RARITIES.reduce((b, r) => (results.some(x => x.item.rarity === r) ? r : b), "common" as Rarity), R = RARITY[best], cols = PAL[best];
  const root = document.createElement("div");
  root.className = `gfx r-${best}`; root.style.cssText = `--rc:${R.c};--rc2:${R.c2};--d:${({ common: 2000, rare: 3600, ultra: 5600 })[best]}ms`;
  root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Kết quả triệu hồi");
  const frames = [1, 2, 3, 4].map(i => `<img class="f${i}" src="/gacha/${best}-${i}.webp" alt="" draggable="false">`).join("");
  root.innerHTML = `<div class="gfx-world"><div class="gfx-bg"></div><div class="gfx-rays"></div><canvas class="gfx-cv"></canvas>
      <div class="gfx-stage"><div class="gfx-frames">${frames}</div></div>${BANNER[best] ? `<div class="gfx-banner"><span>${BANNER[best]}</span></div>` : ""}</div>
    <div class="gfx-flash"></div><div class="gfx-hint">Chạm để bỏ qua</div><div class="gfx-out"></div>`;
  document.body.appendChild(root);
  const world = root.querySelector<HTMLElement>(".gfx-world")!, out = root.querySelector<HTMLElement>(".gfx-out")!;
  const vfx = createVFX(root.querySelector<HTMLCanvasElement>(".gfx-cv")!, cols);
  const timers: number[] = [], at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const flash = (cls: string) => { const f = root.querySelector<HTMLElement>(".gfx-flash")!; f.className = "gfx-flash"; void f.offsetWidth; f.classList.add(cls); };
  const cls = (...c: string[]) => root.classList.add(...c);
  let shown = false;

  const show = () => {
    if (shown) return; shown = true; timers.forEach(clearTimeout);
    vfx.setCharge(0); cls("p1", "s2", "s3", "s4", "p3", "p4"); flash("soft");
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
    const hold = ({ common: 1700, rare: 2500, ultra: 3300 })[best];
    out.innerHTML = heroHTML(star, Math.round(Math.min(300, innerWidth * .72, innerHeight * .4)));
    hydratePortraits(out); sfx(SHINE[star.item.rarity]);
    const ctr = vfx.center();
    vfx.burstAt(ctr.x, ctr.y, star.item.rarity === "ultra" ? 70 : star.item.rarity === "rare" ? 40 : 18, 340); vfx.ring(cols[0]!, star.item.rarity === "ultra" ? 280 : 200, 1, 7);
    let went = false;
    const next = () => { if (went) return; went = true; clearTimeout(holdT); out.querySelector(".ghx")?.classList.add("leave"); setTimeout(buildCard, 280); };
    const holdT = window.setTimeout(next, hold);
    window.setTimeout(() => out.querySelector(".ghx")?.addEventListener("click", e => { e.stopPropagation(); next(); }), 700);
    if (best === "ultra") { vfx.confetti(results.length === 1 ? 40 : 60); vfx.ring(cols[0]!, 300, 1.1, 8); }
  };

  /* ---- kịch bản theo độ hiếm ---- */
  const wob = (amp: number, ms: number) => shake(world, amp, ms);
  if (best === "common") {
    at(20, () => { cls("p1"); vfx.setCharge(.45); sfx("gcharge1"); }); at(520, () => { cls("s2"); vfx.setCharge(.7); }); at(1000, () => cls("s3"));
    at(1450, () => { cls("p3", "s4"); vfx.setCharge(0); vfx.burst(30, 300); vfx.ring(cols[0]!, 170, .7, 5); flash("soft"); sfx("gwhoosh"); }); at(1850, show);
  } else if (best === "rare") {
    at(20, () => { cls("p1"); vfx.setCharge(.4); vfx.setEmbers(.5); sfx("gcharge2"); }); at(750, () => { cls("s2"); vfx.setCharge(.65); vfx.ring(cols[0]!, 190, .9, 4); });
    at(1550, () => { cls("s3"); vfx.setCharge(.9); vfx.ring(cols[1]!, 230, .9, 5); wob(2.5, 800); });
    at(2450, () => { cls("p3", "s4"); vfx.setCharge(0); flash("hard"); sfx("gboom"); vfx.burst(90, 460); vfx.ring(cols[0]!, 330, 1, 9); vfx.ring(cols[1]!, 240, .8, 5); wob(9, 520); root.classList.add("banner"); });
    at(3500, show);
  } else {
    at(20, () => { cls("p1"); vfx.setCharge(.3); vfx.setEmbers(.8); vfx.meteors(5); sfx("gcharge3"); });
    at(900, () => { cls("s2"); vfx.setCharge(.5); vfx.meteors(8); vfx.ring(cols[0]!, 200, 1, 4); });
    at(1900, () => { cls("s3"); vfx.setCharge(.8); vfx.meteors(10); vfx.ring(cols[2]!, 260, 1, 6); sfx("gwhoosh"); wob(3, 900); });
    at(2900, () => { vfx.setCharge(1); vfx.meteors(6); wob(7, 1000); vfx.ring(cols[1]!, 300, .9, 6); });
    at(3900, () => { cls("p3", "s4", "zoomend"); vfx.setCharge(0); flash("white"); sfx("gboom"); vfx.burst(170, 620); [340, 260, 190].forEach((r, i) => setTimeout(() => vfx.ring(cols[i]!, r * 1.3, 1.1, 10 - i * 2), i * 160)); vfx.confetti(60); wob(16, 760); root.classList.add("banner"); });
    at(4800, show);
  }
  root.addEventListener("click", () => { if (!shown) show(); });
}

/** nạp sẵn ảnh hiệu ứng để lúc quay không bị chớp */
export function preloadGachaFx() { RARITIES.forEach(r => [1, 2, 3, 4].forEach(i => { const im = new Image(); im.src = `/gacha/${r}-${i}.webp`; })); }
