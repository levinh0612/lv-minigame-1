/* Minigame luyện viết chữ Hán: xem nghĩa và pinyin, viết lại chữ từng nét trên ô tập viết (Hanzi Writer chấm nét và thứ tự nét).
   Bậc thấp có khung mờ và chạy mẫu thứ tự nét trước. Luật ở engine/hanzi.ts; dùng chung cho Storybook và màn Học chữ. */
import type HanziWriter from "hanzi-writer";
import { sfx } from "../../audio/sound";
import type { Hanzi } from "../../content/hanzi";
import { pickWriteSet, starsOf, withTone, writeParams, writeResult, type WriteResult } from "../../engine/hanzi";
import type { Rng } from "../../engine/minigame";
import { esc, haptic } from "../dom";
import { speakZh } from "./hanzi";

export interface WriteOpts { tier: number; wrong: Record<string, number>; voice: boolean; onDone: (r: WriteResult) => void; onExit: () => void; onVoice?: (on: boolean) => void; rng?: Rng }

/** dữ liệu nét nạp lười một lần (không nằm trong bản chính) */
let strokeData: Promise<Record<string, unknown>> | null = null;
const loadStrokes = () => (strokeData ??= import("../../content/hanzi-strokes.json").then(m => m.default as Record<string, unknown>));

type Host = HTMLElement & { _mg?: () => void };
export function mountHanziWrite(host: Host, o: WriteOpts): () => void {
  host._mg?.();   // host này đang chạy một ván cũ thì dừng hẳn trước
  const P = writeParams(o.tier), set: Hanzi[] = pickWriteSet(o.tier, o.wrong, o.rng ?? Math.random);
  const got: { h: string; mistakes: number }[] = [];
  let voice = o.voice, i = 0, dead = false, mist = 0, busy = false, qid = 0, writer: HanziWriter | null = null, timer = 0;   // qid: mã lượt chấm; huỷ lượt thì Hanzi Writer vẫn gọi onComplete, nên chỉ nhận lượt còn mới

  host.innerHTML = `<div class="zh-game zh-wr">
    <div class="zh-hud"><div class="zh-dots" data-dots></div><div class="zh-cnt" data-cnt></div>
      <button type="button" class="zh-voice ${voice ? "" : "off"}" data-voice aria-label="Giọng đọc">♪</button></div>
    <div class="zh-ask" data-ask></div>
    <div class="zh-pad" data-pad></div>
    <div class="zh-msg" data-msg></div>
    <div class="mg-foot"><button type="button" class="mg-skip" data-demo>Xem mẫu (tính 1 lỗi)</button><button type="button" class="mg-skip" data-skip>Bỏ qua chữ này</button><button type="button" class="mg-skip" data-exit>Thoát</button></div></div>`;
  const $ = (s: string) => host.querySelector<HTMLElement>(s)!;
  const msg = (t: string, cls = "") => { const m = $("[data-msg]"); m.textContent = t; m.className = "zh-msg " + cls; };
  const dots = () => { $("[data-dots]").innerHTML = set.map((_, k) => `<i class="${k < i ? "ok" : k === i ? "on" : ""}"></i>`).join(""); $("[data-cnt]").textContent = `${Math.min(i + 1, set.length)}/${set.length}`; };
  const later = (ms: number, f: () => void) => { busy = true; timer = window.setTimeout(() => { busy = false; if (!dead) f(); }, ms); };
  const advance = () => (i >= set.length ? o.onDone(writeResult(got)) : void load());

  function endChar(z: Hanzi, mistakes: number, skipped: boolean) {
    got.push({ h: z.h, mistakes }); i++;
    if (skipped) o.wrong[z.h] = (o.wrong[z.h] ?? 0) + 1; else if (mistakes === 0) o.wrong[z.h] = Math.max(0, (o.wrong[z.h] ?? 0) - 1);
    const st = starsOf(mistakes);
    msg(`${skipped ? "" : "★".repeat(st) + "☆".repeat(3 - st) + "  "}${withTone(z.py, z.tone)} · ${z.vi}`, skipped ? "bad" : "ok");
    if (!skipped) { sfx("coin"); haptic(12); }
    if (voice) speakZh(z.h);
    later(skipped ? 1500 : 1300, advance);
  }

  function quiz(z: Hanzi) {
    msg("Viết từng nét theo đúng thứ tự"); const id = ++qid;
    void writer!.quiz({
      leniency: P.leniency, showHintAfterMisses: P.hintAfter, highlightOnComplete: true,
      onMistake: () => { mist++; sfx("click"); haptic(14); msg(`Chưa đúng nét, thử lại (${mist} lỗi)`, "bad"); },
      onCorrectStroke: () => { sfx("tap"); msg("Đúng rồi!", "ok"); },
      onComplete: () => { if (id === qid && !dead) endChar(z, mist, false); }
    });
  }

  async function load() {
    const z = set[i]!; mist = 0; dots(); msg("");
    $("[data-ask]").innerHTML = `<b>${esc(z.vi)}</b><span>${esc(withTone(z.py, z.tone))}</span><small>Viết chữ Hán này</small>`;
    const pad = $("[data-pad]"), size = Math.min(pad.clientWidth || 300, 340);
    pad.innerHTML = ""; pad.style.height = size + "px";
    const [{ default: HW }, data] = await Promise.all([import("hanzi-writer"), loadStrokes()]);
    if (dead) return;
    writer = HW.create(pad, z.h, {
      width: size, height: size, padding: 14, showCharacter: false, showOutline: P.outline,
      strokeColor: getComputedStyle(host).getPropertyValue("--pink-d").trim() || "#E0567A", outlineColor: "#E9DCE2", highlightColor: "#5DBE95", drawingColor: "#4A3438", drawingWidth: 12,
      strokeAnimationSpeed: 1.4, delayBetweenStrokes: 180, strokeFadeDuration: 250,
      charDataLoader: (c, ok, bad) => data[c] ? ok(data[c] as never) : bad(new Error("thiếu dữ liệu nét " + c))
    });
    if (voice) speakZh(z.h);
    if (P.demo) { msg("Xem thứ tự các nét…"); busy = true; void writer.animateCharacter({ onComplete: () => { busy = false; if (!dead) quiz(z); } }); } else quiz(z);
  }

  $("[data-voice]").addEventListener("click", e => { voice = !voice; (e.currentTarget as HTMLElement).classList.toggle("off", !voice); o.onVoice?.(voice); if (voice) speakZh(set[Math.min(i, set.length - 1)]!.h); });
  $("[data-exit]").addEventListener("click", () => { stop(); o.onExit(); });
  $("[data-skip]").addEventListener("click", () => {
    const z = set[i]; if (!z || busy || !writer) return;
    qid++; writer.cancelQuiz(); void writer.showCharacter(); endChar(z, mist + 3, true);
  });
  $("[data-demo]").addEventListener("click", () => {
    const z = set[i]; if (!z || busy || !writer) return;
    mist++; qid++; writer.cancelQuiz(); busy = true; msg("Xem kỹ thứ tự nét rồi viết lại nhé…");
    void writer.hideCharacter({ duration: 0 }); void writer.animateCharacter({ onComplete: () => { busy = false; if (dead) return; void writer!.hideCharacter(); quiz(z); } });
  });

  function stop() { dead = true; qid++; clearTimeout(timer); try { writer?.cancelQuiz(); window.speechSynthesis?.cancel(); } catch { /* bỏ qua */ } host._mg = undefined; }
  host._mg = stop;
  void load();
  return stop;
}
