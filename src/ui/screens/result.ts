/* Màn Kết quả sau mỗi ca: tấm bảng giơ lên, sao, sổ lãi. Hàm *HTML thuần để Storybook dùng lại.
   Kết quả ca được play.ts đặt vào bằng setResult() lúc hết ca. */
import type { PetId } from "../../content/couple";
import { PETS, RECIPES, STAFF } from "../../content/game";
import { daysTogether } from "../../engine/dates";
import { giftReady } from "../../engine/progress";
import { mouseRank } from "../../engine/mouse";
import { goalDone, summary, type ledger, type Shift } from "../../engine/shift";
import { S, petName } from "../../engine/state";
import { fmtN } from "../../engine/util";
import { petSVG } from "../art";
import { esc } from "../dom";

export type Result = { sh: Shift; lv: number; led: ReturnType<typeof ledger> };
let result: Result | null = null;
export const hasResult = () => !!result;
export const getResult = () => result;
export const setResult = (r: Result | null) => { result = r; };
/** cho Storybook: đặt kết quả mẫu */
export const _setResult = setResult;

const STAR = (on: boolean, w: number, y: number, r: number, d: number) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 40 40" style="transform:translateY(${y}px) rotate(${r}deg);animation-delay:${d}s" aria-hidden="true"><path d="M20 3.5 L24.6 13.4 L35.5 14.7 L27.4 22.1 L29.6 32.9 L20 27.5 L10.4 32.9 L12.6 22.1 L4.5 14.7 L15.4 13.4 Z" fill="${on ? "#FFC53D" : "#FFFFFF"}" stroke="${on ? "#E08A1E" : "#3E3A4A"}" stroke-width="2.6" stroke-linejoin="round"/>${on ? `<path d="M20 9 L22.6 14.8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>` : ""}</svg>`;
const FACE = (happy: boolean) => `<svg class="sface" width="74" height="74" viewBox="0 0 74 74" aria-hidden="true"><circle cx="37" cy="37" r="33" fill="${happy ? "#FFD84D" : "#F25C5C"}" stroke="#3E3A4A" stroke-width="3"/><path d="M18 24 Q24 20 30 25" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".6"/>${happy
  ? `<path d="M22 34 Q27 27 32 34 M42 34 Q47 27 52 34" stroke="#3E3A4A" stroke-width="3.2" stroke-linecap="round" fill="none"/><path d="M19 42 Q37 44 55 42 Q53 60 37 60 Q21 60 19 42 Z" fill="#fff" stroke="#3E3A4A" stroke-width="3" stroke-linejoin="round"/><path d="M24 52 Q37 56 50 52" stroke="#FF8FAB" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="16" cy="44" rx="4.5" ry="3" fill="#FF9FB6" opacity=".8"/><ellipse cx="58" cy="44" rx="4.5" ry="3" fill="#FF9FB6" opacity=".8"/>`
  : `<circle cx="27" cy="33" r="3.8" fill="#3E3A4A"/><circle cx="47" cy="33" r="3.8" fill="#3E3A4A"/><path d="M21 24 L31 27 M53 24 L43 27" stroke="#3E3A4A" stroke-width="3" stroke-linecap="round"/><path d="M26 54 Q37 44 48 54" stroke="#3E3A4A" stroke-width="3.2" stroke-linecap="round" fill="none"/><path d="M52 40 C49 45 49 49 52 49 C55 49 55 45 52 40 Z" fill="#9FD8F5" stroke="#3E3A4A" stroke-width="2"/>`}</svg>`;
const SIGN = [
  null,
  { bg: "#F58E8E", sh: "#D96A6A", r: 4, page: "#F2E9EC", t: "Cố lên nha!" },
  { bg: "#9FE0C0", sh: "#62BD93", r: -3, page: "#E3F6EC", t: "Giỏi lắm!" },
  { bg: "#8FCFF2", sh: "#5FAED8", r: -4, page: "#CFEAF2", t: "Tuyệt vời!" }
];
export function resultHTML(r: Result | null = result) {
  if (!r) return "";
  const { sh, lv, led } = r, { total, stars } = summary(sh), sg = SIGN[stars]!, good = stars >= 2;
  const newR = RECIPES.filter(x => x.lv > sh.lv0 && x.lv <= lv);
  const conf = good ? `<div class="conf" aria-hidden="true">${Array.from({ length: 34 }, (_, i) => {
    const d = 3.5 + Math.random() * 3;
    return `<i style="left:${Math.random() * 100}%;width:${7 + Math.random() * 6}px;height:${10 + Math.random() * 8}px;background:${["#FF8FAB", "#8FD9B6", "#FFD66B", "#FFFFFF", "#C9B8F0"][i % 5]};border-radius:${Math.random() > 0.6 ? "50%" : "3px"};animation-duration:${d}s;animation-delay:${-Math.random() * d}s"></i>`;
  }).join("")}</div>` : "";
  const sparks = [[-18, 20, 14, 1.8], [258, 34, 18, 2.3], [-8, 150, 12, 2.1], [262, 150, 14, 1.6], [228, -10, 12, 2.6]]
    .map(([x, y, s2, d]) => `<svg class="spk" width="${s2}" height="${s2}" viewBox="0 0 20 20" style="left:${x}px;top:${y}px;animation-duration:${d}s" aria-hidden="true"><path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z" fill="#fff"/></svg>`).join("");
  const done = sh.goals.filter(g => goalDone(sh, g)).length;
  const row = (n: string, v: number, plus: boolean) => v ? `<div class="lg"><span>${n}</span><b class="${plus ? "p" : "m"}">${plus ? "+" : "−"}${fmtN(v)}</b></div>` : "";
  const mood = good ? "love" : "open";
  const note = giftReady() ? unlockCard()
    : lv > sh.lv0 ? `<div class="rnote"><span class="env"></span><div>Lên Lv ${lv}!${newR.length ? " Mở khoá: " + newR.map(x => esc(x.n)).join(", ") : ""}${STAFF.filter(d => d.unlock > sh.lv0 && d.unlock <= lv).map(d => ` · ${esc(petName(d.id))} xin vào làm`).join("")}</div></div>`
    : !good ? `<div class="rnote soft"><span class="env"></span><div>Mai thử bấm "Xem công thức" trước khi giao nhé, Milo tin em mà!</div></div>`
    : unlockCard() || `<div class="rnote"><span class="env"></span><div>Ngày ${fmtN(daysTogether())} bên nhau · tiệm vẫn đông khách nè</div></div>`;
  return `<div class="scr res" style="--page:${sg.page}">
    ${conf}
    <div class="sign-wrap"><small>Kết thúc ca ${S.shifts}</small>
      <div class="sign" style="transform:rotate(${sg.r}deg)"><div class="stick"></div>
        <div class="board" style="background:${sg.bg};box-shadow:0 6px 0 ${sg.sh}">
          <div class="stars">${[0, 1, 2].map(i => STAR(i < stars, i === 1 ? 54 : 44, i === 1 ? -6 : 0, (i - 1) * 10, 0.25 + i * 0.15)).join("")}</div>
          ${FACE(good)}<b>${sg.t}</b></div>${sparks}</div></div>
    <div class="rcard">
      <div class="pets">${(["dog", "gold", "white"] as PetId[]).map((id, i) => petSVG({ ...PETS[id], mood, ledge: false }, i === 1 ? 80 : 70)).join("")}</div>
      <div class="rbanner"><span>Lãi ca này</span><b class="${led.profit >= 0 ? "p" : "m"}">${led.profit >= 0 ? "+" : "−"}${fmtN(Math.abs(led.profit))} xu</b><small>${done}/${sh.goals.length} mục tiêu${sh.goalCoins ? ` · +${fmtN(sh.goalCoins)} xu thưởng` : ""}${sh.ticket ? " · 🎟 +1 vé" : ""}${sh.bestCombo >= 3 ? ` · 🔥 ×${sh.bestCombo}` : ""}</small></div>
      <div class="kp"><div class="k1"><b>${sh.served}/${total}</b><small>Khách vui</small></div><div class="k2"><b>${sh.memo}</b><small>Tự nhớ công thức</small></div><div class="k3"><b>${sh.helped}</b><small>Bé làm hộ</small></div></div>
      <div class="ledger"><h4>Sổ lãi hôm nay</h4>
        ${row("Tiền bánh", sh.coins, true)}${row("Tip", sh.tips, true)}${row("Thưởng tự nhớ (+50%)", sh.bonus, true)}${sh.tierBonus ? row("Thưởng bánh nhiều tầng", sh.tierBonus, true) : ""}${row(`Mục tiêu ca (${done}/${sh.goals.length})`, sh.goalCoins, true)}
        ${row("Nhập nguyên liệu", led.ingUsed + led.quick, false)}${row("Lương các bé", led.wages, false)}
        <div class="lg tot ${led.profit >= 0 ? "" : "neg"}"><span>Lãi</span><b>${led.profit >= 0 ? "+" : "−"}${fmtN(Math.abs(led.profit))} xu</b></div>
      </div>
      ${sh.ticket ? `<p class="rticket">🎟 Đạt hết mục tiêu ca: +1 vé triệu hồi</p>` : ""}${sh.shutdown ? `<p class="rticket bad">🚨 Sở y tế đóng cửa tiệm vì có chuột: phạt ${fmtN(sh.mouseFine)} xu. Lần sau nhớ bắt chuột sớm nha</p>` : ""}${sh.mouseKills ? `<p class="rticket">🐭 Vua diệt chuột hạng ${mouseRank().name}: +${sh.mouseReward} xu${mouseRank().next ? ` · cần ${mouseRank().next} lần để lên hạng` : ""}</p>` : ""}${sh.mousePaid ? `<p class="rticket">Đã chi ${fmtN(sh.mousePaid)} xu xử lý chuột nhanh</p>` : ""}${sh.comboPaid ? `<p class="rticket">🔥 Combo dài nhất ×${sh.bestCombo}: +${fmtN(sh.comboPaid)} xu thưởng${sh.comboLost ? ` (mất ${fmtN(sh.comboLost)} xu vì đứt chuỗi)` : ""}</p>` : sh.comboLost ? `<p class="rticket">Đứt combo: mất ${fmtN(sh.comboLost)} xu thưởng dồn, ca sau giữ chuỗi nha</p>` : ""}${sh.bondUp ? `<p class="rticket">💞 Linh vật thân thiết cấp ${sh.bondUp}: chỉ số linh vật tăng thêm 12%</p>` : ""}${note}
    </div>
    <div class="rbtns"><button class="b3 w" style="flex:1" data-go="/">Về tiệm</button><button class="b3" style="flex:1.6" data-go="/chuan-bi" data-replace>${good ? "Ca tiếp theo" : "Chơi lại ca"}</button></div>
  </div>`;
}
export const unlockCard = () => giftReady()
  ? `<button class="unlock" data-act="claim"><div class="env"></div><div><b>Mở khoá thư tình mới</b><small>Chạm để nhận quà hôm nay</small></div></button>`
  : S.daily.claimed ? `<div class="unlock"><div class="env"></div><div><b>Đã mở thư tình hôm nay</b><small>Đọc lại ở mục Quà tặng</small></div></div>` : "";
