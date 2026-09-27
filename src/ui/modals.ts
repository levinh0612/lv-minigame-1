/* Các hộp thoại: thư, quà, cài đặt, tạm dừng, Anh ghé tiệm */
import { Sound, sfx } from "../audio/sound";
import { CFG } from "../content/couple";
import { FOODS, HIM, PETS, RECIPES, WELCOME } from "../content/game";
import { claimWelcome } from "../engine/economy";
import { daysTogether, eventNote, todayEvents } from "../engine/dates";
import { giftReady } from "../engine/progress";
import { closeEarly, type Customer } from "../engine/shift";
import { KEY, S, loadState, petName, resetState, save } from "../engine/state";
import { fmtN, nameList, pick } from "../engine/util";
import { cakeSVG, critterSVG, foodSVG, guestSVG } from "./art";
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
      ${"vibrate" in navigator ? `<label class="tg"><input id="fVibe" type="checkbox" ${S.vibe ? "checked" : ""}>Rung khi giao bánh</label>` : ""}
      <div class="setlinks"><button type="button" class="mini pk" data-act="tutorial">Xem lại hướng dẫn</button><button type="button" class="mini" data-act="backup">Sao lưu</button><button type="button" class="mini" data-act="restore">Khôi phục</button></div>
      <div class="mbtns"><button class="b3" type="submit">Lưu</button><button class="b3 w" type="button" id="resetBtn" style="font-size:16px;color:var(--red)">Chơi lại từ đầu</button></div>
    </form>`, render);
  const v = (id: string) => $<HTMLInputElement>(id)!.value.trim();
  $("#setForm")!.addEventListener("submit", e => {
    e.preventDefault();
    S.names.her = v("#fHer") || CFG.herName; S.names.his = v("#fHis") || CFG.hisName;
    S.names.girls = v("#fGirls") || CFG.girlNames; S.names.boys = v("#fBoys") || CFG.boyNames;
    CFG.pets.forEach(p => { S.names.pets[p.id] = v("#fPet_" + p.id) || p.name; });
    S.sound = $<HTMLInputElement>("#fSound")!.checked; const vb = $<HTMLInputElement>("#fVibe"); if (vb) S.vibe = vb.checked;
    const m = $<HTMLInputElement>("#fMusic")!.checked; if (m !== S.music) Sound.setMusic(m);
    save(); closeModal(); toast("Đã lưu");
  });
  $("#resetBtn")!.addEventListener("click", e => {
    if (!resetArm) { resetArm = true; (e.target as HTMLElement).textContent = "Bấm lần nữa để xoá hết tiến trình"; return; }
    resetState(); closeModal(); toast("Đã chơi lại từ đầu");
  });
}

/* ===== Hướng dẫn lần đầu ===== */
const TUT = [
  { art: () => `<div class="tart">${critterSVG(PETS.dog, 64)}${critterSVG({ ...PETS.gold, mood: "love" }, 72)}${critterSVG({ ...PETS.white, mood: "open", wave: true }, 64)}</div>`,
    t: "Chào chủ tiệm!", d: "Mỗi ngày tiệm mở cửa, khách ghé mua bánh. Thẻ gọi món ghi rõ tên bánh, thành phần và độ ngọt khách muốn." },
  { art: () => `<div class="tart">${cakeSVG({ base: 0, cream: 0, top: 0, sweet: 0 }, { size: 150 })}</div>`,
    t: "Ghép bánh", d: "Chạm Đế → Kem → Topping → Độ ngọt. Dấu ✓ xanh là đúng, ✕ đỏ là sai. Đủ rồi thì bấm Giao bánh. Giao nhanh được nhiều sao và tip." },
  { art: () => `<div class="tart">${cakeSVG({ base: RECIPES[1].base, cream: RECIPES[1].cream, top: RECIPES[1].top, sweet: 1 }, { size: 110, still: true })}${critterSVG({ ...PETS.dog, mood: "wink" }, 70)}</div>`,
    t: "Đi chợ & thú cưng đi làm", d: "Mỗi bánh dùng 1 đế, 1 kem, 1 topping trong kho, nhớ nhập hàng trước ca. Lên cấp thì Milo, Siro, Cacao xin vào làm thợ bánh, tự nhận đơn làm bánh cho khách. Lương của các bé là Hạt, Pate, Ức gà, mua ở mục Thú cưng." },
  { art: () => `<div class="tart"><div class="env big"></div></div>`,
    t: "Mỗi ngày một lá thư", d: "Mở thư mỗi ngày, xong 3 mục tiêu để nhận thêm thư bí mật. Ngày đặc biệt được nhân đôi xu." }
];
export function tutorial(step = 0) {
  const x = TUT[step], last = step === TUT.length - 1;
  modal(`${x.art()}<h2>${x.t}</h2><p class="tdesc">${x.d}</p>
    <div class="tdots">${TUT.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div>
    <div class="mbtns"><button class="b3" id="tNext">${last ? "Bắt đầu thôi" : "Tiếp"}</button>${last ? "" : '<button class="b3 w" data-close>Bỏ qua</button>'}</div>`,
    () => { S.tut = true; save(); welcome(); });
  $("#tNext")!.addEventListener("click", () => { if (last) closeModal(); else tutorial(step + 1); });
}

/* ===== Sao lưu / khôi phục: một đoạn mã copy được, dán lại trên máy khác ===== */
const encode = (s: string) => { const b = new TextEncoder().encode(s); let bin = ""; b.forEach(c => { bin += String.fromCharCode(c); }); return btoa(bin); };
const decode = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.trim()), c => c.charCodeAt(0)));

export function backup() {
  const code = encode(JSON.stringify(S));
  modal(`<h2>Sao lưu tiến trình</h2><p class="sub">Copy đoạn mã này cất đi (gửi vào Zalo cho chính mình chẳng hạn). Đổi máy thì dán vào Khôi phục.</p>
    <label class="field"><textarea id="bkCode" rows="5" readonly>${code}</textarea></label>
    <div class="mbtns"><button class="b3" id="bkCopy">Copy mã</button><button class="b3 w" data-close>Xong</button></div>`, render);
  $("#bkCopy")!.addEventListener("click", async () => {
    const ta = $<HTMLTextAreaElement>("#bkCode")!;
    try { await navigator.clipboard.writeText(code); toast("Đã copy mã sao lưu"); }
    catch { ta.select(); toast("Mã đã được bôi đen, bấm Copy nhé"); }
  });
}
export function restore() {
  modal(`<h2>Khôi phục tiến trình</h2><p class="sub">Dán mã sao lưu vào đây. Tiến trình hiện tại trên máy này sẽ bị thay thế.</p>
    <label class="field"><textarea id="rsCode" rows="5" placeholder="Dán mã vào đây"></textarea></label>
    <div class="mbtns"><button class="b3" id="rsGo">Khôi phục</button><button class="b3 w" data-close>Huỷ</button></div>`, render);
  $("#rsGo")!.addEventListener("click", () => {
    try {
      const json = decode($<HTMLTextAreaElement>("#rsCode")!.value);
      const s = loadState(json);
      if (typeof JSON.parse(json).coins !== "number") throw new Error("thiếu dữ liệu");
      localStorage.setItem(KEY, JSON.stringify(s));
      toast("Đã khôi phục, đang tải lại tiệm…"); setTimeout(() => location.reload(), 700);
    } catch { toast("Mã không đúng. Kiểm tra lại xem đã copy đủ chưa nhé"); }
  });
}

/* ===== Quà khai trương: vốn làm ăn, nhận một lần ===== */
export function welcome() {
  if (S.welcome || !claimWelcome()) return;
  const food = (Object.entries(WELCOME.food) as [keyof typeof S.food, number][]).map(([id, n]) => ({ f: FOODS.find(x => x.id === id)!, n }));
  modal(`<div class="tart">${critterSVG({ ...PETS.gold, mood: "love" }, 80)}<div class="gift"><span class="coin-i big"></span><b>+${WELCOME.coins}</b></div>${food.map(x => `<div class="gift">${foodSVG(x.f.id, 44)}<b>+${x.n}</b></div>`).join("")}</div>
    <h2>Quà khai trương!</h2>
    <p class="tdesc">Tặng chủ tiệm ${WELCOME.coins} xu và ${food.map(x => `${x.n} gói ${x.f.n}`).join(", ")} làm vốn. Đi chợ nhập nguyên liệu, và dành đồ ăn làm lương cho các bé nha.</p>
    <div class="mbtns"><button class="b3" data-close>Nhận vốn</button></div>`, render);
  floatHearts(innerWidth / 2, innerHeight / 2, 10); sfx("level");
}
