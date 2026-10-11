/* Minigame học chữ Hán: bóng bay chở chữ rơi xuống, vẽ thanh điệu của chữ lên màn hình để làm nổ bóng.
   Một nét vẽ làm nổ mọi bóng cùng thanh. Luật ở engine/hanzi.ts; dùng chung cho Storybook và màn Học chữ. */
import { sfx } from "../../audio/sound";
import { TONE_HINT, type Hanzi, type HanziWord, type Tone } from "../../content/hanzi";
import { BOSS_COST, hanziParams, hanziResult, pickHanzi, pickWord, recognizeTone, withTone, wordPinyin, wordTones, type BossOutcome, type HanziResult, type Pt } from "../../engine/hanzi";
import type { Rng } from "../../engine/minigame";
import { esc, haptic } from "../dom";
import { ic } from "../icons";

export interface HanziOpts { tier: number; wrong: Record<string, number>; voice: boolean; onDone: (r: HanziResult) => void; onExit: () => void; onVoice?: (on: boolean) => void; rng?: Rng }
interface Boss { w: HanziWord; el: HTMLElement; born: number; step: number; done: boolean }
interface Ball { z: Hanzi; el: HTMLElement; x: number; born: number; dead: boolean }

/** nét mẫu của từng thanh (khung 40×24) cho bảng gợi ý */
const SHAPE: Record<Tone, string> = {
  1: `<path d="M5 12 H35"/>`, 2: `<path d="M5 20 L35 4"/>`, 3: `<path d="M5 4 Q13 22 20 21 Q28 20 35 4"/>`, 4: `<path d="M5 4 L35 20"/>`, 0: `<circle cx="20" cy="12" r="2.6" fill="currentColor"/>`
};
export const toneShape = (t: Tone, w = 40) => `<svg width="${w}" height="${w * .6}" viewBox="0 0 40 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SHAPE[t]}</svg>`;

/** đọc to chữ bằng giọng Trung của máy (nếu có), im lặng nếu không hỗ trợ */
export function speakZh(text: string) {
  try {
    const ss = window.speechSynthesis; if (!ss) return;
    const u = new SpeechSynthesisUtterance(text); u.lang = "zh-CN"; u.rate = .85;
    const v = ss.getVoices().find(x => x.lang.replace("_", "-").toLowerCase().startsWith("zh")); if (v) u.voice = v;
    ss.cancel(); ss.speak(u);
  } catch { /* máy không có giọng đọc: bỏ qua */ }
}

type Host = HTMLElement & { _mg?: () => void };
export function mountHanzi(host: Host, o: HanziOpts): () => void {
  host._mg?.();   // host này đang chạy một ván cũ thì dừng hẳn trước
  const P = hanziParams(o.tier), rng = o.rng ?? Math.random;
  let voice = o.voice, spawned = 0, popped = 0, fell = 0, last = "", running = false, dead = false, finishing = false, raf = 0, nextAt = 0;
  const balls: Ball[] = [];
  let boss: Boss | null = null, bossRes: BossOutcome = "none";
  let pts: Pt[] = [], pid = -1;

  const hearts = () => Array.from({ length: P.lives }, (_, i) => `<i class="${i < P.lives - fell ? "" : "off"}">${ic.heart(18, 2.4)}</i>`).join("");
  host.innerHTML = `<div class="zh-game">
    <div class="zh-hud"><div class="zh-hearts" data-hearts>${hearts()}</div><div class="zh-cnt" data-cnt>0/${P.total}</div>
      <button type="button" class="zh-voice ${voice ? "" : "off"}" data-voice aria-label="Giọng đọc">${ic.music(18, 2.3)}</button></div>
    <div class="zh-sky" data-sky>
      <svg class="zh-trail" data-trail aria-hidden="true"><polyline points="" fill="none"/></svg>
      <div class="zh-ground"></div>
      <div class="zh-ready" data-ready><b>Vẽ thanh điệu của chữ trên bóng!</b>
        <p>Đoán thanh điệu của chữ rồi vẽ nét đó lên màn hình. Một nét làm nổ mọi bóng cùng thanh. Chạm một cái là thanh nhẹ.</p>
        <button type="button" class="mg-go" data-start>Bắt đầu</button></div>
    </div>
    ${P.legend ? `<div class="zh-legend">${([1, 2, 3, 4, ...(P.tones.includes(0) ? [0] : [])] as Tone[]).map(t => `<span>${toneShape(t, 38)}<small>${TONE_HINT[t]}</small></span>`).join("")}</div>`
      : `<div class="zh-legend off">Đã hết gợi ý nét. Nhớ thanh điệu nhé!</div>`}
    <div class="mg-foot"><button type="button" class="mg-skip" data-exit>Thoát</button></div></div>`;

  const sky = host.querySelector<HTMLElement>("[data-sky]")!, trail = host.querySelector<SVGPolylineElement>("[data-trail] polyline")!;
  const skyH = () => sky.clientHeight, ballH = 96;

  function spawn(now: number) {
    const z = pickHanzi(P.tones, o.wrong, rng, last); last = z.h; spawned++;
    const el = document.createElement("div"), x = 14 + rng() * 72;
    el.className = "zh-b t" + z.tone; el.style.left = x + "%";
    el.innerHTML = `<div class="zh-body"><span class="zh-han">${z.h}</span><em>${esc(z.py)}</em></div><small>${esc(z.vi)}</small>`;
    sky.appendChild(el); balls.push({ z, el, x, born: now, dead: false });
    nextAt = now + P.gap * 1000;
  }
  const say = (b: Ball, cls: string, text: string, ms = 1100) => {
    const f = document.createElement("div"); f.className = "zh-say " + cls; f.style.left = b.x + "%"; f.style.top = Math.min(skyH() - 70, Math.max(10, b.el.getBoundingClientRect().top - sky.getBoundingClientRect().top)) + "px";
    f.textContent = text; sky.appendChild(f); setTimeout(() => f.remove(), ms);
  };
  const setHud = () => {
    host.querySelector("[data-hearts]")!.innerHTML = hearts();
    host.querySelector("[data-cnt]")!.textContent = `${popped}/${P.total}`;
  };

  function spawnBoss(now: number) {
    const w = pickWord(o.wrong, rng), el = document.createElement("div");
    el.className = "zh-b zh-boss";
    el.innerHTML = `<div class="zh-body"><span class="zh-han">${w.w}</span><em>${esc(w.a)} ${esc(w.b)}</em></div><small>BOSS · ${esc(w.vi)}</small><div class="zh-steps"><i class="on"></i><i></i></div>`;
    sky.appendChild(el); boss = { w, el, born: now, step: 0, done: false };
    const m = document.createElement("div"); m.className = "zh-say ok"; m.style.left = "50%"; m.style.top = "30px"; m.textContent = "Boss từ ghép! Vẽ lần lượt 2 thanh"; sky.appendChild(m); setTimeout(() => m.remove(), 1800);
    if (voice) speakZh(w.w);
  }
  function frame(now: number) {
    if (dead) return;
    if (!host.isConnected) return stop();
    raf = requestAnimationFrame(frame);
    if (!running || finishing) return;
    if (spawned < P.total && now >= nextAt) spawn(now);
    const H = skyH() - ballH;
    for (const b of balls) {
      if (b.dead) continue;
      const y = (now - b.born) / (P.fall * 1000) * H;
      if (y >= H) {
        b.dead = true; fell++; o.wrong[b.z.h] = (o.wrong[b.z.h] ?? 0) + 1;
        b.el.classList.add("fell"); b.el.style.transform = `translateY(${H}px)`;
        say(b, "ans", withTone(b.z.py, b.z.tone), 1500); sfx("click"); haptic(20); setHud();
        setTimeout(() => b.el.remove(), 700);
      } else b.el.style.transform = `translateY(${y}px)`;
    }
    if (P.boss && !boss && fell < P.lives && spawned >= P.total && balls.every(b => b.dead)) spawnBoss(now);
    if (boss && !boss.done) {
      const y = (now - boss.born) / (P.bossFall * 1000) * H;
      if (y >= H) {
        boss.done = true; bossRes = "lost"; fell += BOSS_COST; o.wrong[boss.w.w] = (o.wrong[boss.w.w] ?? 0) + 1;
        boss.el.classList.add("fell"); boss.el.style.transform = `translateY(${H}px)`;
        const m = document.createElement("div"); m.className = "zh-say ans"; m.style.left = "50%"; m.textContent = wordPinyin(boss.w); sky.appendChild(m); setTimeout(() => m.remove(), 1500);
        sfx("click"); haptic(30); setHud();
      } else boss.el.style.transform = `translateY(${y}px)`;
    }
    if (fell >= P.lives || (spawned >= P.total && balls.every(b => b.dead) && (!P.boss || boss?.done))) finish();
  }
  function finish() {
    if (finishing) return; finishing = true;
    const r = hanziResult(P, popped, fell, bossRes, boss?.w);
    setTimeout(() => { if (!dead) o.onDone(r); }, 900);
  }

  function hitBoss(tone: Tone) {
    const b = boss!, want = wordTones(b.w)[b.step]!;
    if (tone !== want) { sky.classList.remove("shake"); void sky.offsetWidth; sky.classList.add("shake"); sfx("click"); haptic(12); return; }
    const dots = b.el.querySelectorAll("i"); dots[b.step]!.className = "ok"; b.step++; if (dots[b.step]) dots[b.step]!.className = "on";
    sfx("coin"); haptic(10);
    if (b.step < 2) return;
    b.done = true; bossRes = "won"; o.wrong[b.w.w] = Math.max(0, (o.wrong[b.w.w] ?? 0) - 1);
    const m = document.createElement("div"); m.className = "zh-say ok"; m.style.left = "50%"; m.style.top = Math.max(10, b.el.getBoundingClientRect().top - sky.getBoundingClientRect().top) + "px"; m.textContent = wordPinyin(b.w); sky.appendChild(m); setTimeout(() => m.remove(), 1500);
    b.el.classList.add("pop"); setTimeout(() => b.el.remove(), 380); if (voice) speakZh(b.w.w); setHud();
  }
  function hit(tone: Tone) {
    if (boss && !boss.done) return hitBoss(tone);
    const live = balls.filter(b => !b.dead && b.z.tone === tone);
    if (!live.length) { sky.classList.remove("shake"); void sky.offsetWidth; sky.classList.add("shake"); sfx("click"); haptic(12); return; }
    for (const b of live) {
      b.dead = true; popped++; o.wrong[b.z.h] = Math.max(0, (o.wrong[b.z.h] ?? 0) - 1);
      say(b, "ok", withTone(b.z.py, b.z.tone)); b.el.classList.add("pop"); setTimeout(() => b.el.remove(), 380);
    }
    sfx("coin"); haptic(live.length > 1 ? [10, 30, 10] : 10); setHud();
    if (voice) speakZh(live[0]!.z.h);
  }

  const pos = (e: PointerEvent): Pt => { const r = sky.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const draw = () => trail.setAttribute("points", pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
  const down = (e: PointerEvent) => { if (!running || finishing || pid >= 0) return; pid = e.pointerId; pts = [pos(e)]; sky.setPointerCapture(pid); sky.classList.add("drawing"); draw(); };
  const move = (e: PointerEvent) => { if (e.pointerId !== pid) return; pts.push(pos(e)); draw(); };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pid) return; pid = -1; sky.classList.remove("drawing");
    const t = recognizeTone(pts); trail.setAttribute("points", ""); pts = [];
    if (t === null) { sky.classList.remove("shake"); void sky.offsetWidth; sky.classList.add("shake"); return; }
    hit(t);
  };
  sky.addEventListener("pointerdown", down); sky.addEventListener("pointermove", move);
  sky.addEventListener("pointerup", up); sky.addEventListener("pointercancel", up);

  host.querySelector("[data-start]")!.addEventListener("click", e => {
    e.stopPropagation(); host.querySelector("[data-ready]")!.remove(); running = true; nextAt = performance.now() + 400; sfx("click");
  });
  host.querySelector("[data-voice]")!.addEventListener("click", e => {
    voice = !voice; (e.currentTarget as HTMLElement).classList.toggle("off", !voice); o.onVoice?.(voice);
    if (voice) speakZh("你好");
  });
  host.querySelector("[data-exit]")!.addEventListener("click", () => { stop(); o.onExit(); });

  function stop() { dead = true; cancelAnimationFrame(raf); try { window.speechSynthesis?.cancel(); } catch { /* bỏ qua */ } host._mg = undefined; }
  host._mg = stop;
  raf = requestAnimationFrame(frame);
  return stop;
}
