/* Màn Học chữ Hán (#/hoc-chu): danh hiệu, tiến độ, chữ cần ôn, và ván chơi bóng bay thanh điệu.
   Hub, ván chơi, kết quả đều nằm trong cùng một trang; chuyển qua lại bằng cách vẽ lại #zhBody. */
import { HANZI_TITLES } from "../../content/hanzi";
import { TIER_XP } from "../../content/minigames";
import { hanziTier, hanziTitle, hanziToNext, starsOf, weakHanzi, withTone, wordPinyin, zhState, type HanziResult, type WriteResult } from "../../engine/hanzi";
import { HANZI_TONES } from "../../content/hanzi";
import { save } from "../../engine/state";
import { backBtn, esc } from "../dom";
import { mountHanzi } from "../minigames/hanzi";
import { mountHanziWrite } from "../minigames/hanziwrite";

const body = () => document.getElementById("zhBody");

export function hanziHTML() {
  return `<div class="scr zh-scr"><div class="shead">${backBtn}<h2>Học chữ Hán</h2></div><div class="zh-page" id="zhBody"></div></div>`;
}

function hubHTML() {
  const z = zhState(), t = hanziTier(), lo = TIER_XP[t]!, hi = TIER_XP[t + 1], left = hanziToNext(), weak = weakHanzi();
  return `<div class="zh-card">
      <div class="zh-seal" aria-hidden="true">字</div>
      <div class="zh-tt"><small>Danh hiệu</small><b>${esc(hanziTitle())}</b>
        <span class="zh-pb"><i style="width:${hi ? Math.min(100, (z.xp - lo) / (hi - lo) * 100) : 100}%"></i></span>
        <small>${left === null ? "Đã đạt danh hiệu cao nhất" : `Còn ${left} điểm để lên “${esc(HANZI_TITLES[t + 1]!)}”`}</small></div>
    </div>
    <div class="zh-card col"><h3>Bóng bay thanh điệu</h3>
      <p>Mỗi bóng chở một chữ HSK 1. Đoán thanh điệu rồi vẽ nét tương ứng lên màn hình để làm nổ bóng, đừng để bóng chạm đất. Từ bậc “Học trò chăm” cuối ván có boss từ ghép hai chữ: vẽ lần lượt hai thanh.</p>
      <button type="button" class="b3" data-start>Chơi ngay</button>
      ${z.best ? `<small>Nổ nhiều nhất một ván: ${z.best} bóng</small>` : ""}</div>
    <div class="zh-card col"><h3>Luyện viết chữ</h3>
      <p>Xem nghĩa và pinyin rồi viết lại chữ Hán từng nét, đúng thứ tự. Bậc thấp có khung mờ và chạy mẫu cho bạn xem trước.</p>
      <button type="button" class="b3" data-write>Viết chữ</button></div>
    <div class="zh-card col"><h3>Chữ cần ôn</h3>
      ${weak.length ? `<div class="zh-weak">${weak.map(w => `<span><b>${w.h}</b><em>${esc(withTone(w.py, w.tone))}</em><small>${esc(w.vi)}</small></span>`).join("")}</div>`
        : `<p class="empty">Chưa có chữ nào sai. Những chữ bạn để bóng rơi sẽ hiện ở đây và xuất hiện nhiều hơn trong ván sau.</p>`}</div>`;
}

function resultHTML(r: HanziResult, up: string) {
  return `<div class="zh-card col zh-res ${r.ok ? "win" : "lose"}">
    <h3>${r.ok ? "Giỏi lắm!" : "Hết mạng rồi"}</h3>
    <div class="zh-big">${r.popped}<small>/${r.total} bóng</small></div>
    ${r.word ? `<p class="zh-boss-res">Boss: <b>${r.word.w}</b> · ${esc(wordPinyin(r.word))} · ${esc(r.word.vi)} — ${r.boss === "won" ? "đã hạ! (+1 điểm)" : "chạm đất, mất 2 mạng"}</p>` : ""}
    <p>${r.xp ? `Được +${r.xp} điểm danh hiệu${r.xp > 1 ? " (không mất mạng nào)" : ""}.` : r.ok ? "Nổ ít hơn 70% nên chưa được điểm danh hiệu." : "Thử lại nhé, lần này chưa được điểm danh hiệu."}</p>
    ${upLine(up)}
    <button type="button" class="b3" data-start>Chơi lại</button>
    <button type="button" class="zh-link" data-hub>Về màn Học chữ</button></div>`;
}

const upLine = (up: string) => up ? `<div class="zh-up">Danh hiệu mới: <b>${esc(up)}</b></div>` : "";
function writeResultHTML(r: WriteResult, up: string) {
  const vi = (h: string) => HANZI_TONES.find(z => z.h === h)!;
  return `<div class="zh-card col zh-res win">
    <h3>${r.perfect === r.total ? "Hoàn hảo!" : "Xong rồi!"}</h3>
    <div class="zh-big">${r.perfect}<small>/${r.total} chữ không sai nét</small></div>
    <div class="zh-weak">${r.chars.map(c => { const z = vi(c.h), st = starsOf(c.mistakes); return `<span><b>${c.h}</b><em>${esc(withTone(z.py, z.tone))}</em><small>${"★".repeat(st)}${"☆".repeat(3 - st)}</small></span>`; }).join("")}</div>
    <p>${r.xp ? `Được +${r.xp} điểm danh hiệu${r.xp > 1 ? " (không sai nét nào)" : ""}.` : "Cần viết đúng ít nhất một nửa số chữ mới được điểm danh hiệu."}</p>
    ${upLine(up)}
    <button type="button" class="b3" data-write>Viết tiếp</button>
    <button type="button" class="zh-link" data-hub>Về màn Học chữ</button></div>`;
}

export function mountHanziScreen() {
  const show = (html: string) => { const el = body(); if (!el) return null; el.innerHTML = html; return el; };
  const hub = () => { const el = show(hubHTML()); el?.querySelector("[data-start]")?.addEventListener("click", play); el?.querySelector("[data-write]")?.addEventListener("click", write); };
  function write() {
    const el = show(`<div id="zhHost"></div>`)!, host = el.firstElementChild as HTMLElement, z = zhState(), before = hanziTier();
    mountHanziWrite(host, {
      tier: before, wrong: z.wrong, voice: z.voice,
      onVoice: on => { z.voice = on; save(); },
      onExit: () => { save(); hub(); },
      onDone: r => {
        z.xp += r.xp; save();
        const after = hanziTier(), e2 = show(writeResultHTML(r, after > before ? hanziTitle() : ""));
        e2?.querySelector("[data-write]")?.addEventListener("click", write);
        e2?.querySelector("[data-hub]")?.addEventListener("click", hub);
      }
    });
  }
  function play() {
    const el = show(`<div id="zhHost"></div>`)!, host = el.firstElementChild as HTMLElement, z = zhState(), before = hanziTier();
    mountHanzi(host, {
      tier: before, wrong: z.wrong, voice: z.voice,
      onVoice: on => { z.voice = on; save(); },
      onExit: () => { save(); hub(); },
      onDone: r => {
        z.xp += r.xp; z.best = Math.max(z.best, r.popped); save();
        const after = hanziTier(), e2 = show(resultHTML(r, after > before ? hanziTitle() : ""));
        e2?.querySelector("[data-start]")?.addEventListener("click", play);
        e2?.querySelector("[data-hub]")?.addEventListener("click", hub);
      }
    });
  }
  hub();
}
