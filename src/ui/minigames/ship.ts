/* Minigame giao hàng: xe chạy trên 3 làn tới địa chỉ khách, né chướng ngại trong 6 đến 10 giây.
   Chạm nửa trái hoặc phải của đường (hoặc vuốt ngang, hoặc nút mũi tên) để đổi làn. Va 3 lần thì hỏng hàng.
   Luật ở engine/minigame.ts; dùng chung cho Storybook và trong ca. */
import { sfx } from "../../audio/sound";
import { OBSTACLE_NAMES, TIERS, type Address } from "../../content/minigames";
import { genRows, shipParams, shipResult, SHIP_LIVES, type Rng, type Row, type ShipResult } from "../../engine/minigame";
import { esc, haptic } from "../dom";
import { houseSVG, obstacleSVG, carSVG } from "../giftart";
import { ic } from "../icons";

export interface ShipOpts { tier: number; price: number; addr: Address; onDone: (r: ShipResult) => void; onSkip: () => void; rng?: Rng }
const LANE_X = [16.7, 50, 83.3];   // % chiều ngang của từng làn
const CAR_P = 0.82;                // vị trí xe theo chiều cao đường (0 đỉnh, 1 đáy)
const ARRIVE = 1.1;                // giây xe chạy từ cuối đường vào cổng nhà

type Host = HTMLElement & { _mg?: () => void; _res?: ShipResult };
export function mountShip(host: Host, o: ShipOpts): () => void {
  host._mg?.();   // host này đang chạy một ván cũ thì dừng hẳn trước, không để hai ván chồng lên nhau
  const P = shipParams(o.tier, o.addr.km), rows: Row[] = genRows(P, o.rng ?? Math.random);
  let lane = 1, hits = 0, t0 = 0, raf = 0, running = false, dead = false;
  const done = new Set<number>(), els: HTMLElement[] = [];
  const hearts = () => Array.from({ length: SHIP_LIVES }, (_, i) => `<i class="${i < SHIP_LIVES - hits ? "" : "off"}">${ic.heart(18, 2.4)}</i>`).join("");

  function paint() {
    host.innerHTML = `<div class="mg-ship">
      <div class="mg-addr"><span>Giao tới</span><b>${esc(o.addr.text)}</b><small>${o.addr.km.toFixed(1)} km · bậc ${TIERS[o.tier]}</small></div>
      <div class="mg-road" data-road><div class="mg-lanes"></div><div class="mg-edge l"></div><div class="mg-edge r"></div>
        <div class="mg-house" data-house>${houseSVG(70)}</div>
        <div class="mg-car" data-car>${carSVG(104)}</div>
        <div class="mg-ready" data-ready><p>Chạm bên trái hoặc phải để đổi làn, né hết chướng ngại!</p><button type="button" class="mg-go" data-go>Bắt đầu giao</button></div>
      </div>
      <div class="mg-hud"><div class="mg-hearts" data-hearts>${hearts()}</div><div class="mg-prog"><i data-prog></i></div></div>
      <div class="mg-foot"><button type="button" class="mg-arrow" data-move="-1" aria-label="Sang trái">${ic.left(22, 3)}</button><button type="button" class="mg-skip" data-skip>Bỏ qua (mất thưởng)</button><button type="button" class="mg-arrow" data-move="1" aria-label="Sang phải">${ic.right(22, 3)}</button></div></div>`;
    place();
  }
  const car = () => host.querySelector<HTMLElement>("[data-car]");
  const place = () => { const c = car(); if (c) c.style.left = LANE_X[lane] + "%"; };
  function move(d: number) { if (!running) return; const n = Math.max(0, Math.min(2, lane + d)); if (n === lane) return; lane = n; place(); sfx("click"); haptic(8); }

  function frame(now: number) {
    if (dead) return; raf = requestAnimationFrame(frame);
    const el = (now - t0) / 1000, road = host.querySelector<HTMLElement>("[data-road]")!, H = road.clientHeight;
    const prog = host.querySelector<HTMLElement>("[data-prog]"); if (prog) prog.style.transform = `scaleX(${Math.min(1, el / P.dur)})`;
    host.querySelector<HTMLElement>(".mg-lanes")!.style.backgroundPositionY = (el * 260) % 64 + "px";
    rows.forEach((r, i) => {
      const p = (el - r.t) / P.travel;
      if (p < 0 || p > 1.5) { els[i]?.remove(); delete els[i]; return; }
      if (!els[i]) { const d = document.createElement("div"); d.className = "mg-row"; d.innerHTML = r.blocked.map((l, j) => `<span style="left:${LANE_X[l]}%" data-k="${r.kind[j]}" title="${OBSTACLE_NAMES[r.kind[j]!]}">${obstacleSVG(r.kind[j]!, 58)}</span>`).join(""); road.appendChild(d); els[i] = d; }
      els[i]!.style.transform = `translateY(${(p * CAR_P * H - 40).toFixed(1)}px)`;
      if (p >= 1 && !done.has(i)) {
        done.add(i);
        if (r.blocked.includes(lane)) { hits++; sfx("wrong"); haptic([50, 30, 50]); els[i]!.classList.add("hit"); const h = host.querySelector("[data-hearts]"); if (h) h.innerHTML = hearts(); car()?.classList.add("hurt"); setTimeout(() => car()?.classList.remove("hurt"), 450); if (hits >= SHIP_LIVES) return finish(); }
      }
    });
    if (el >= P.dur) {            // hết đường: xe chạy thẳng tới nhà khách rồi mới tính xong
      const k = Math.min(1, (el - P.dur) / ARRIVE), c = car();
      if (c) { c.style.transition = "none"; c.style.top = 82 - k * 62 + "%"; c.style.transform = `scale(${1 - k * 0.45})`; }
      if (k >= 1) finish();
    }
  }
  function finish() {
    if (dead || !running) return; running = false; cancelAnimationFrame(raf);
    const res = shipResult(o.price, o.addr.km, hits, o.tier); sfx(res.ok ? "level" : "wrong"); haptic(res.ok ? [30, 30, 60] : [60, 40, 60]);
    host.innerHTML = `<div class="mg-ship mg-res ${res.ok ? "ok" : "bad"}"><div class="mg-stage"><div class="mg-box ${res.ok ? "pop" : "sad"}">${houseSVG(110)}${res.ok ? "" : ""}</div></div>
      <h3>${res.ok ? (res.grade === "S" ? "Giao êm ru!" : res.grade === "A" ? "Giao tới nơi rồi!" : "Giao tới, hơi xóc") : "Hàng hỏng mất rồi…"}</h3>
      <p class="mg-hint">${esc(o.addr.text)} · va ${hits} lần</p>
      <p class="mg-fee">${res.ok ? `Phí ship <b>+${res.fee}</b> xu` : "Mất phí ship, khách sẽ phàn nàn"}</p>
      <button type="button" class="mg-go" data-end>${res.ok ? "Nhận phí ship" : "Đóng"}</button></div>`;
    host._res = res;
  }
  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("button");
    if (b?.dataset.go !== undefined) { host.querySelector("[data-ready]")?.remove(); running = true; t0 = performance.now(); sfx("click"); raf = requestAnimationFrame(frame); return; }
    if (b?.dataset.move) return move(Number(b.dataset.move));
    if (b?.dataset.skip !== undefined) { dead = true; cancelAnimationFrame(raf); return o.onSkip(); }
    if (b?.dataset.end !== undefined) { dead = true; return o.onDone(host._res!); }
  };
  const onTap = (e: PointerEvent) => {
    const road = (e.target as HTMLElement).closest<HTMLElement>("[data-road]"); if (!road || (e.target as HTMLElement).closest("button")) return;
    const r = road.getBoundingClientRect(); move(e.clientX < r.left + r.width / 2 ? -1 : 1);
  };
  let sx = 0; const onDown = (e: PointerEvent) => { sx = e.clientX; };
  const onUp = (e: PointerEvent) => { if (Math.abs(e.clientX - sx) > 36 && running) move(e.clientX > sx ? 1 : -1); };
  host.addEventListener("click", onClick); host.addEventListener("pointerdown", onDown); host.addEventListener("pointerup", onUp);
  host.addEventListener("pointerdown", onTap);
  paint();
  const dispose = () => { dead = true; cancelAnimationFrame(raf); host.removeEventListener("click", onClick); host.removeEventListener("pointerdown", onDown); host.removeEventListener("pointerup", onUp); host.removeEventListener("pointerdown", onTap); };
  host._mg = dispose;
  return dispose;
}
