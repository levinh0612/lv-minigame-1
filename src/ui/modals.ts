/* Các hộp thoại: thư, quà, cài đặt, tạm dừng, Anh ghé tiệm */
import { Sound, sfx } from "../audio/sound";
import { CFG } from "../content/couple";
import { HIM } from "../content/game";
import { daysTogether, eventNote, todayEvents } from "../engine/dates";
import { giftReady } from "../engine/progress";
import { closeEarly, type Customer } from "../engine/shift";
import { S, petName, resetState, save } from "../engine/state";
import { fmtN, nameList, pick } from "../engine/util";
import { guestSVG } from "./art";
import { $, closeModal, dropModal, esc, floatHearts, modal, toast } from "./dom";
import { render } from "./app";
import { SH, endShift, pause, resume, unlockCard } from "./screens/play";

const paper = (txt: string) => `<div class="paper">${esc(txt)}<span class="sig">${esc(S.names.his)}</span></div>`;

export function openLetter() {
  const day = S.daily.day;
  let l = S.letters.find(x => x.day === day && !x.bonus);
  if (!l) {
    const te = todayEvents();
    l = te.length ? { day, txt: eventNote(te[0]), tag: te[0].t } : { day, txt: CFG.notes[(daysTogether() - 1) % CFG.notes.length] };
    S.letters.push(l); save();
  }
  modal(`<h2>Gửi ${esc(S.names.her)}</h2><p class="sub">Ngày thứ ${fmtN(daysTogether())} bên nhau${l.tag ? " · " + esc(l.tag) : ""}</p>
    ${paper(l.txt)}<div class="mbtns"><button class="b3" data-close>Thương ghê</button></div>`, render);
  floatHearts(innerWidth / 2, innerHeight / 2, 8); sfx("letter");
}

export function claimGoals() {
  if (!giftReady()) return;
  S.daily.claimed = true; S.coins += 60;
  const used = new Set(S.letters.map(l => l.txt));
  const txt = CFG.notes.find(n => !used.has(n)) || pick(CFG.notes);
  S.letters.push({ day: S.daily.day, txt, tag: "Thư bí mật", bonus: true }); save();
  // ở màn kết quả chỉ đổi thẻ quà, không vẽ lại cả màn (giữ confetti)
  const back = location.hash === "#/ket-qua" ? () => { const b = document.querySelector(".unlock"); if (b) b.outerHTML = unlockCard(); } : render;
  modal(`<h2>Xong hết mục tiêu rồi!</h2><p class="sub">+60 xu và một lá thư bí mật</p>
    ${paper(txt)}<div class="mbtns"><button class="b3" data-close>Nhận nè</button></div>`, back);
  floatHearts(innerWidth / 2, innerHeight / 2, 10); sfx("level");
}

export function himNote(c: Customer) {
  modal(`<div style="display:flex;justify-content:center">${guestSVG({ ...HIM, mood: "love" }, 120)}</div>
    <h2>${esc(S.names.his)} ghé tiệm nè!</h2><p class="sub">Mua bánh ít ngọt, để lại lời nhắn cho chủ tiệm:</p>
    ${paper(c.note || pick(CFG.notes))}<div class="mbtns"><button class="b3" data-close>Bán tiếp thôi</button></div>`, resume);
}

export function pauseMenu() {
  if (!SH || SH.paused) return;
  pause();
  modal(`<h2>Tạm nghỉ xíu</h2><p class="sub">Khách vẫn ngồi chờ, không ai bỏ về đâu.</p>
    <label class="tg" style="justify-content:center"><input type="checkbox" id="pMusic" ${S.music ? "checked" : ""}>Nhạc nền</label>
    <div class="mbtns"><button class="b3" data-close>Bán tiếp</button><button class="b3 w" id="quitBtn">Đóng cửa sớm</button></div>`, resume);
  $<HTMLInputElement>("#pMusic")!.addEventListener("change", e => Sound.setMusic((e.target as HTMLInputElement).checked));
  $("#quitBtn")!.addEventListener("click", () => { dropModal(); if (SH) { closeEarly(SH); endShift(); } });
}

let resetArm = false;
export function settings() {
  resetArm = false;
  modal(`<h2>Cài đặt tiệm</h2>
    <form id="setForm">
      <label class="field">Tên chủ tiệm (bạn nữ)<input id="fHer" value="${esc(S.names.her)}" maxlength="20"></label>
      <label class="field">Tên người gửi thư (bạn nam)<input id="fHis" value="${esc(S.names.his)}" maxlength="20"></label>
      ${CFG.pets.map(p => `<label class="field">Tên bé ${p.id === "dog" ? "cún trắng" : p.id === "gold" ? "mèo vàng" : "mèo trắng"}<input id="fPet_${p.id}" value="${esc(petName(p.id))}" maxlength="16"></label>`).join("")}
      <label class="field">Tên khách nữ (${nameList(S.names.girls).length}) · cách nhau bằng dấu phẩy<textarea id="fGirls" rows="2">${esc(S.names.girls)}</textarea></label>
      <label class="field">Tên khách nam (${nameList(S.names.boys).length})<textarea id="fBoys" rows="2">${esc(S.names.boys)}</textarea></label>
      <label class="tg"><input id="fMusic" type="checkbox" ${S.music ? "checked" : ""}>Nhạc nền</label>
      <label class="tg"><input id="fSound" type="checkbox" ${S.sound ? "checked" : ""}>Hiệu ứng âm thanh</label>
      <div class="mbtns"><button class="b3" type="submit">Lưu</button><button class="b3 w" type="button" id="resetBtn" style="font-size:16px;color:var(--red)">Chơi lại từ đầu</button></div>
    </form>`, render);
  const v = (id: string) => $<HTMLInputElement>(id)!.value.trim();
  $("#setForm")!.addEventListener("submit", e => {
    e.preventDefault();
    S.names.her = v("#fHer") || CFG.herName; S.names.his = v("#fHis") || CFG.hisName;
    S.names.girls = v("#fGirls") || CFG.girlNames; S.names.boys = v("#fBoys") || CFG.boyNames;
    CFG.pets.forEach(p => { S.names.pets[p.id] = v("#fPet_" + p.id) || p.name; });
    S.sound = $<HTMLInputElement>("#fSound")!.checked;
    const m = $<HTMLInputElement>("#fMusic")!.checked; if (m !== S.music) Sound.setMusic(m);
    save(); closeModal(); toast("Đã lưu");
  });
  $("#resetBtn")!.addEventListener("click", e => {
    if (!resetArm) { resetArm = true; (e.target as HTMLElement).textContent = "Bấm lần nữa để xoá hết tiến trình"; return; }
    resetState(); closeModal(); toast("Đã chơi lại từ đầu");
  });
}
