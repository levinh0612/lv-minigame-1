/* Sưu tập (sticker, tủ đồ cho các bé, truyện khách quen) và Sự kiện & thử thách ngày */
import { sfx } from "../audio/sound";
import { OUTFITS, PAGES, SEASON_TIERS, STICKERS, STORIES, outfitHow } from "../content/collection";
import { CFG } from "../content/couple";
import { buyOutfit, ex, hasOutfit, hasSticker, pageCount, pageTotal, wear, wornBy } from "../engine/collection";
import { challengeActive, challengeDone, challengeOn, setChallenge } from "../engine/challenge";
import { seasonNext, seasonNow, seasonServed, seasonTierDone, tierCoins } from "../engine/season";
import { storyDone, storyProg } from "../engine/story";
import { S, petName } from "../engine/state";
import { fmtN } from "../engine/util";
import { esc, modal, toast } from "./dom";
import { staffAvatar } from "./staffav";

type Tab = "sticker" | "outfit" | "story";
let tab: Tab = "sticker";

const tabs = () => `<div class="coltabs">${([["sticker", "Sticker"], ["outfit", "Tủ đồ"], ["story", "Truyện"]] as const).map(([k, n]) => `<button type="button" data-ctab="${k}" class="${tab === k ? "on" : ""}">${n}</button>`).join("")}</div>`;

function stickerTab() {
  return PAGES.map(p => `<div class="sh2"><b>${esc(p.n)}</b><span class="lav">${pageCount(p.id)}/${pageTotal(p.id)}${S.extra?.pages.includes(p.id) ? " ✓" : ` · thưởng ${p.tickets} vé`}</span></div>
    <div class="stkgrid">${STICKERS.filter(s => s.page === p.id).map(s => hasSticker(s.id) ? `<div class="stk on" title="${esc(s.n)}"><span>${s.e}</span><small>${esc(s.n)}</small></div>` : `<div class="stk"><span>❔</span><small>Chưa có</small></div>`).join("")}</div>`).join("");
}

function outfitTab() {
  const pets = CFG.pets.map(p => p.id);
  const crew = `<div class="outpets">${pets.map(id => { const w = wornBy(id); return `<div class="outpet"><span class="oa">${staffAvatar(id as never, 56)}</span><b>${esc(petName(id))}</b><small>${w ? esc(w.n) : "Chưa mặc gì"}</small></div>`; }).join("")}</div>`;
  const list = OUTFITS.map(o => {
    const own = hasOutfit(o.id), by = pets.find(id => wornBy(id)?.id === o.id), buy = "buy" in o.src ? o.src.buy : 0;
    const act = own ? `<div class="outbtns">${pets.map(id => `<button type="button" class="${by === id ? "on" : ""}" data-wear="${id}:${by === id ? "" : o.id}">${esc(petName(id))}</button>`).join("")}</div>`
      : buy ? `<button type="button" class="b3 sm" data-buyout="${o.id}" ${S.coins < buy ? "disabled" : ""}>Mua ${fmtN(buy)} xu</button>` : `<small class="how">${esc(outfitHow(o))}</small>`;
    return `<div class="outrow ${own ? "" : "lock"}"><span class="oe">${o.e}</span><div><b>${esc(o.n)}</b>${act}</div></div>`;
  }).join("");
  return `${crew}<p class="sub">Chạm tên một bé để mặc đồ. Bấm lại để cởi.</p><div class="outlist">${list}</div>`;
}

function storyTab() {
  return STORIES.map(s => {
    const k = storyProg(s.id), done = storyDone(s);
    return `<div class="story"><div class="sh"><span class="se">${s.e}</span><div><b>${esc(s.who)}</b><small>${esc(s.bio)}</small></div><em>${k}/${s.chapters.length}${done ? " ✓" : ""}</em></div>
      ${s.chapters.slice(0, k).map(c => `<p class="chap"><b>${esc(c.t)}</b>${esc(c.text)}</p>`).join("")}
      ${done ? "" : `<p class="chap next">Chương ${k + 1} mở khi ${esc(s.who)} ghé tiệm và hài lòng với bánh (từ 2 sao).</p>`}</div>`;
  }).join("");
}

export function collectionSheet(t?: Tab) {
  if (t) tab = t;
  const e = ex(), body = tab === "sticker" ? stickerTab() : tab === "outfit" ? outfitTab() : storyTab();
  modal(`<h2>Sưu tập</h2><p class="sub">${e.stickers.length}/${STICKERS.length} sticker · ${e.outfits.length}/${OUTFITS.length} món đồ</p>${tabs()}<div class="colbody">${body}</div>
    <div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
  document.querySelectorAll<HTMLButtonElement>("[data-ctab]").forEach(b => b.addEventListener("click", () => { sfx("click"); collectionSheet(b.dataset.ctab as Tab); }));
  document.querySelectorAll<HTMLButtonElement>("[data-wear]").forEach(b => b.addEventListener("click", () => { const [pet, id] = b.dataset.wear!.split(":"); wear(pet!, id!); sfx("tap"); collectionSheet(); }));
  document.querySelectorAll<HTMLButtonElement>("[data-buyout]").forEach(b => b.addEventListener("click", () => { if (buyOutfit(b.dataset.buyout!)) { sfx("coin"); toast("Đã mua!"); } else toast("Không đủ xu"); collectionSheet(); }));
}

const fmtDay = (d: string) => d.split("-").reverse().join("/");
export function eventSheet() {
  const now = seasonNow(), next = seasonNext(), c = challengeOn(), on = challengeActive(), done = challengeDone(), ch = ex().ch;
  const season = now ? (() => {
    const served = seasonServed(now.key), got = seasonTierDone(now.key);
    return `<div class="evcard" style="--ev:#FF9F5A"><div class="eh"><span>${now.def.e}</span><div><b>${esc(now.def.n)}</b><small>Đến hết ${fmtDay(now.end)} · ${esc(now.def.blurb)}</small></div></div>
      <div class="evtiers">${SEASON_TIERS.map((t, i) => `<div class="${i < got ? "ok" : ""}"><b>${t.n}</b><small>khách</small><i>${i < got ? "✓" : `+${fmtN(tierCoins(t))} xu${t.tickets ? ` +${t.tickets} vé` : ""}${t.sticker ? " +sticker" : ""}${t.outfit ? " +đồ" : ""}`}</i></div>`).join("")}</div>
      <div class="evbar"><i style="width:${Math.min(100, served / SEASON_TIERS[SEASON_TIERS.length - 1]!.n * 100)}%"></i></div><small>Đã phục vụ ${served} khách trong sự kiện</small></div>`;
  })() : `<div class="evcard idle"><b>Hiện chưa có sự kiện mùa</b>${next ? `<small>Sắp tới: ${next.def.e} ${esc(next.def.n)} từ ${fmtDay(next.start)}</small>` : ""}</div>`;
  modal(`<h2>Sự kiện & thử thách</h2><p class="sub">Có việc mới mỗi ngày</p>${season}
    <div class="evcard" style="--ev:#8E6FD6"><div class="eh"><span>${c.e}</span><div><b>Thử thách hôm nay: ${esc(c.n)}</b><small>${esc(c.desc)}</small></div></div>
      <p class="goal">🎯 ${esc(c.goalText)}</p>
      <small>${ch.wins ? `Đã đạt ${ch.wins} lần · chuỗi ${ch.streak} ngày` : "Đạt lần đầu trong ngày nhận xu, 1 vé và 1 sticker"}</small>
      <button type="button" class="b3 w" id="chTog" ${done ? "disabled" : ""}>${done ? "Đã đạt hôm nay ✓" : on ? "Đang bật · bấm để tắt" : "Bật cho ca tiếp theo"}</button></div>
    <div class="mbtns"><button class="b3" data-close>Đóng</button></div>`);
  document.getElementById("chTog")?.addEventListener("click", () => { setChallenge(!on); sfx("tap"); eventSheet(); });
}
