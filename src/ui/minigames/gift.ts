/* Minigame gói quà: 3 bước (đóng hộp, chọn ruy băng, cố định hộp), mỗi bước vài giây.
   Luật và số liệu ở engine/minigame.ts; component tự dựng và tự chạy trong `host`, xong gọi onDone/onSkip.
   Dùng chung cho Storybook (xem trước) và trong ca (hộp thoại). */
import { sfx } from "../../audio/sound";
import { RIBBONS, TIERS, type Ribbon } from "../../content/minigames";
import { giftParams, giftResult, judge, sweepPos, zoneRange, type GiftResult, type Hit, type Rng } from "../../engine/minigame";
import { esc, haptic } from "../dom";
import { boxSVG, ribbonSVG } from "../giftart";

export interface GiftOpts { tier: number; price: number; ribbon: Ribbon; onDone: (r: GiftResult) => void; onSkip: () => void; rng?: Rng }
const STEPS = ["Đóng hộp", "Chọn ruy băng", "Cố định hộp"];
const HIT_TXT: Record<Hit, string> = { perfect: "Tuyệt!", good: "Được", miss: "Trượt" };

const barHTML = (bars: number, z: [number, number]) =>
  `<div class="mg-bar" data-bar><div class="mg-cells">${Array.from({ length: bars }, (_, i) => { const p = (i + .5) / bars; return `<i class="${p >= z[0] && p <= z[1] ? "zone" : ""}"></i>`; }).join("")}</div><b class="mg-ptr" data-ptr></b></div>`;

export function mountGift(host: HTMLElement, o: GiftOpts): () => void {
  const rng = o.rng ?? Math.random, P = giftParams(o.tier);
  const hits: Hit[] = [];
  let step = -1, locked = false, t0 = 0, raf = 0, zone: [number, number] = [0, 1], opts: Ribbon[] = [], picked: Ribbon | null = null, done = false, dead = false;

  const head = () => `<div class="mg-top"><div class="mg-steps">${STEPS.map((s, i) => `<span class="${i === step ? "on" : i < step ? "ok" : ""}"><em>${i + 1}</em>${s}</span>`).join("")}</div></div>`;
  const wish = () => `<div class="mg-wish"><span>Khách muốn ruy băng</span><b style="background:${o.ribbon.c}">${esc(o.ribbon.n)}</b></div>`;
  const foot = (extra = "") => `<div class="mg-foot">${extra}<button type="button" class="mg-skip" data-skip>Bỏ qua (mất thưởng)</button></div>`;

  function paint() {
    const art = boxSVG({ size: 132, lid: step > 0 ? "shut" : "open", ribbon: step >= 2 ? picked ?? o.ribbon : null, tied: step > 2 || done });
    if (done) return;
    let mid = "";
    if (step < 0) mid = `<p class="mg-hint">Gói quà cho khách: ${STEPS.length} bước, khoảng 8 giây. Bấm đúng lúc để được thưởng thêm.</p>${wish()}
      <div class="mg-lv">Bậc <b>${TIERS[o.tier]}</b></div><button type="button" class="mg-go" data-go>Bắt đầu</button>`;
    else if (step === 0) mid = `${barHTML(P.bars, zone)}<p class="mg-hint">Bấm khi mũi tên nằm trong vùng xanh để đậy nắp</p><button type="button" class="mg-go" data-tap>Đậy nắp</button>`;
    else if (step === 1) mid = `${wish()}<div class="mg-ribs">${opts.map(r => `<button type="button" class="mg-rib" data-rib="${r.id}">${ribbonSVG(r, 62)}<span>${esc(r.n)}</span></button>`).join("")}</div>
      <div class="mg-time"><i data-time></i></div>`;
    else mid = `${barHTML(P.bars, zone)}<p class="mg-hint">Bấm đúng vùng xanh để thắt nơ và cố định hộp</p><button type="button" class="mg-go" data-tap>Thắt nơ</button>`;
    host.innerHTML = `<div class="mg-gift">${head()}<div class="mg-stage"><div class="mg-box" data-box>${art}</div></div>${mid}${foot()}</div>`;
  }

  function begin(n: number) {
    step = n; t0 = performance.now(); picked = null;
    if (n === 0) zone = zoneRange(P.bars, P.zone1, .3 + rng() * .5);
    if (n === 1) { const others = RIBBONS.filter(r => r.id !== o.ribbon.id).sort(() => rng() - .5).slice(0, P.ribbons - 1); opts = [...others, o.ribbon].sort(() => rng() - .5); }
    if (n === 2) zone = zoneRange(P.bars, P.zone3, .25 + rng() * .5);
    paint();
  }
  function record(h: Hit) {
    hits.push(h); sfx(h === "miss" ? "wrong" : "click"); haptic(h === "miss" ? [40, 40, 40] : 18);
    const box = host.querySelector<HTMLElement>("[data-box]"); if (box) { box.dataset.fx = h; const f = document.createElement("div"); f.className = `mg-fx ${h}`; f.textContent = HIT_TXT[h]; box.appendChild(f); }
    cancelAnimationFrame(raf); locked = true;     // khoá bấm trong lúc chờ sang bước sau
    const next = step + 1;
    setTimeout(() => { if (dead) return; locked = false; if (next > 2) finish(); else { begin(next); raf = requestAnimationFrame(loop); } }, 520);
  }
  function finish() {
    const res = giftResult(o.price, hits, o.tier); done = true; cancelAnimationFrame(raf);
    sfx(res.ok ? "level" : "wrong"); haptic(res.ok ? [30, 30, 60] : [60, 40, 60]);
    const art = boxSVG({ size: 150, lid: "shut", ribbon: o.ribbon, tied: res.ok || res.misses < 2, face: res.ok });
    host.innerHTML = `<div class="mg-gift mg-res ${res.ok ? "ok" : "bad"}"><div class="mg-stage"><div class="mg-box ${res.ok ? "pop" : "sad"}">${art}</div></div>
      <h3>${res.ok ? (res.grade === "S" ? "Gói đẹp hoàn hảo!" : res.grade === "A" ? "Gói đẹp lắm!" : "Gói xong rồi") : "Gói hỏng rồi…"}</h3>
      <div class="mg-hits">${hits.map(h => `<span class="${h}">${HIT_TXT[h]}</span>`).join("")}</div>
      <p class="mg-fee">${res.ok ? `Thưởng gói quà <b>+${res.fee}</b> xu` : "Mất thưởng gói quà, khách sẽ phàn nàn"}</p>
      <button type="button" class="mg-go" data-end>${res.ok ? "Nhận thưởng" : "Đóng"}</button></div>`;
    host.dataset.result = JSON.stringify(res);
    (host as HTMLElement & { _res?: GiftResult })._res = res;
  }
  function loop(now: number) {
    if (dead || locked) return; raf = requestAnimationFrame(loop);
    const el = (now - t0) / 1000;
    if (step === 0 || step === 2) {
      const sp = step === 0 ? P.sweep : P.fill, p = sweepPos(el, sp), ptr = host.querySelector<HTMLElement>("[data-ptr]");
      if (ptr) ptr.style.left = p * 100 + "%";
      if (el * sp > 4) record("miss");          // chạy 2 lượt đi về mà chưa bấm: tính trượt
    } else if (step === 1) {
      const f = host.querySelector<HTMLElement>("[data-time]"), k = el / (P.pickMs / 1000);
      if (f) f.style.transform = `scaleX(${Math.max(0, 1 - k)})`;
      if (k >= 1) record("miss");
    }
  }
  function tap() {
    if (locked || (step !== 0 && step !== 2)) return;
    const sp = step === 0 ? P.sweep : P.fill, p = sweepPos((performance.now() - t0) / 1000, sp);
    record(judge(p, zone));
  }
  function pick(id: string) {
    if (locked || step !== 1) return;
    const r = opts.find(x => x.id === id)!; picked = r;
    const k = (performance.now() - t0) / P.pickMs;
    host.querySelector<HTMLElement>(`[data-rib="${id}"]`)?.classList.add(r.id === o.ribbon.id ? "right" : "wrong");
    record(r.id !== o.ribbon.id ? "miss" : k < .5 ? "perfect" : "good");
  }
  const onClick = (e: Event) => {
    const t = e.target as HTMLElement, b = t.closest<HTMLElement>("button"); if (!b) return;
    if (b.dataset.go !== undefined) { sfx("click"); begin(0); raf = requestAnimationFrame(loop); }
    else if (b.dataset.tap !== undefined) tap();
    else if (b.dataset.rib) pick(b.dataset.rib);
    else if (b.dataset.skip !== undefined) { dead = true; cancelAnimationFrame(raf); o.onSkip(); }
    else if (b.dataset.end !== undefined) { dead = true; o.onDone((host as HTMLElement & { _res?: GiftResult })._res!); }
  };
  host.addEventListener("click", onClick);
  paint();
  return () => { dead = true; cancelAnimationFrame(raf); host.removeEventListener("click", onClick); };
}
