/* Các hộp thoại: thư, quà, cài đặt, tạm dừng, Anh ghé tiệm */
import { Sound, sfx, songName } from "../audio/sound";
import { CFG } from "../content/couple";
import { FOODS, HIM, PETS, RECIPES, WELCOME } from "../content/game";
import { buyVenue, canAffordUpgrade, capacity, demand, needUpgrade, seatsNow, spots, tableLvs, upgradeOptions } from "../engine/economy";
import { claimWelcome } from "../engine/economy";
import { daysTogether, eventNote, todayEvents } from "../engine/dates";
import { giftReady } from "../engine/progress";
import { closeEarly, type Customer } from "../engine/shift";
import { S, petName, resetState, save } from "../engine/state";
import { fmtN, nameList, pick } from "../engine/util";
import { cakeSVG, petSVG, foodSVG, guestSVG } from "./art";
import { $, closeModal, dropModal, esc, floatHearts, modal, toast } from "./dom";
import { render } from "./app";
import { CHANGELOG } from "../content/roadmap";
import { earn } from "../engine/wallet";
import { LEVELS, applyIncident, tossCoin, type Incident, type Level } from "../engine/incident";
import { account, changePin, disablePush, enablePush, isStandalone, logout, pushSupported, savedAgo } from "../net/cloud";
import { IN_LABEL, OUT_LABEL, totalIn, totalOut } from "../engine/wallet";
import { SH, endShift, pause, resume, unlockCard } from "./screens/play";
import { goalsBody } from "./screens/goals";
import { giftBody } from "./screens/shop";

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
  S.daily.claimed = true; earn("gift", 60, "Quà mục tiêu ngày");
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
    <label class="tg"><input type="checkbox" id="pMusic" ${S.music ? "checked" : ""}>Nhạc nền</label>
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
      <button type="button" class="b3 w cloudbtn" data-act="profile">🎨 Hồ sơ · nhân vật · tên tiệm · màu giao diện</button>
      <button type="button" class="b3 w cloudbtn" data-act="music">🎵 Chọn bài · ${esc(songName())}</button>
      <label class="tg"><input id="fScene" type="checkbox" ${S.scene3d ? "checked" : ""}>Cảnh tiệm 3D (tắt nếu máy bị nóng hoặc giật)</label>
      <label class="tg"><input id="fSound" type="checkbox" ${S.sound ? "checked" : ""}>Hiệu ứng âm thanh</label>
      ${"vibrate" in navigator ? `<label class="tg"><input id="fVibe" type="checkbox" ${S.vibe ? "checked" : ""}>Rung khi giao bánh</label>` : ""}
      <button type="button" class="b3 w cloudbtn" data-act="account">👤 Tài khoản · đổi PIN · nhắc giờ</button>
      <div class="verrow"><span>Phiên bản ${esc(__APP_VERSION__)} · build ${__BUILD__.slice(6, 8)}/${__BUILD__.slice(4, 6)} ${__BUILD__.slice(8, 10)}:${__BUILD__.slice(10, 12)} UTC</span><button type="button" class="mini pk" data-act="checkver">Kiểm tra bản mới</button><button type="button" class="mini" data-act="hardreload">Tải lại bản mới nhất</button></div>
      <div class="setlinks"><button type="button" class="mini pk" data-act="tutorial">Xem lại hướng dẫn</button></div>
      <div class="verrow" style="font-size:11px;opacity:.7"><span>Nhân vật nam 3D: “Basemesh_sd_boy” của phurit2014 (Sketchfab), giấy phép <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Nữ anime 3D: “cute anime girl” của udream studio (Sketchfab), giấy phép <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Nhân vật nữ 3D: “Cute Hiking Girl 3D Character” (<a href="https://www.cgtrader.com/items/7623397" target="_blank" rel="noopener">CGTrader</a>). Xương và chuyển động từ Mixamo.</span></div>
      <div class="mbtns"><button class="b3" type="submit">Lưu</button><button class="b3 w" type="button" id="resetBtn" style="font-size:16px;color:var(--red)">Chơi lại từ đầu</button></div>
    </form>`, render);
  const v = (id: string) => $<HTMLInputElement>(id)!.value.trim();
  $("#setForm")!.addEventListener("submit", e => {
    e.preventDefault();
    S.names.her = v("#fHer") || CFG.herName; S.names.his = v("#fHis") || CFG.hisName;
    S.names.girls = v("#fGirls") || CFG.girlNames; S.names.boys = v("#fBoys") || CFG.boyNames;
    CFG.pets.forEach(p => { S.names.pets[p.id] = v("#fPet_" + p.id) || p.name; });
    S.scene3d = $<HTMLInputElement>("#fScene")!.checked; S.sound = $<HTMLInputElement>("#fSound")!.checked; const vb = $<HTMLInputElement>("#fVibe"); if (vb) S.vibe = vb.checked;
    const m = $<HTMLInputElement>("#fMusic")!.checked; if (m !== S.music) Sound.setMusic(m);
    save(); closeModal(); toast("Đã lưu");
  });
  $("#resetBtn")!.addEventListener("click", e => {
    if (!resetArm) { resetArm = true; (e.target as HTMLElement).textContent = "Bấm lần nữa để xoá hết tiến trình"; return; }
    resetState(); closeModal(); toast("Đã chơi lại từ đầu");
  });
}

/* ===== Tài khoản: tên tiệm, đổi PIN, đăng xuất, nhắc 7g dậy / 11g ngủ ===== */
export function accountPanel() {
  const ago = savedAgo();
  const pushNote = !pushSupported() && !isStandalone() ? `<p class="sub small">Trên iPhone: bấm Chia sẻ → <b>Thêm vào MH chính</b>, mở game từ biểu tượng đó rồi mới bật được thông báo.</p>` : "";
  modal(`<h2>Tài khoản</h2>
    <div class="acc"><span>${petSVG({ ...PETS.gold, mood: "love", ledge: false }, 44)}</span><div><b>${esc(account())}</b><small>☁︎ ${ago ? `đã lưu ${ago}` : "chưa lưu"} · tự lưu khi có thay đổi</small></div></div>
    <h3 class="csec">Đổi PIN</h3>
    <div class="crow2"><input id="acPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="PIN mới"><input id="acPin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="Nhập lại"><button type="button" class="mini" id="acPinGo">Đổi</button></div>
    <h3 class="csec">Nhắc giờ</h3>
    <label class="tg"><input id="cMorning" type="checkbox" ${S.cloud.morning ? "checked" : ""}>7:00 · chào buổi sáng, thư mới</label>
    <label class="tg"><input id="cNight" type="checkbox" ${S.cloud.night ? "checked" : ""}>23:00 · nhắc đi ngủ</label>
    ${pushNote}
    <button class="b3 w cloudbtn" type="button" id="cPush">${S.cloud.push ? "Cập nhật giờ nhắc" : "🔔 Bật thông báo"}</button>
    ${S.cloud.push ? `<button type="button" class="alink" id="cOff">Tắt thông báo</button>` : ""}
    <div class="mbtns"><button class="b3" data-close>Xong</button><button class="b3 w" type="button" id="acOut" style="color:var(--red)">Đăng xuất</button></div>`, render);
  const keep = () => { S.cloud.morning = $<HTMLInputElement>("#cMorning")!.checked; S.cloud.night = $<HTMLInputElement>("#cNight")!.checked; save(); };
  ["#cMorning", "#cNight"].forEach(id => $(id)!.addEventListener("change", keep));
  $("#acPinGo")!.addEventListener("click", async () => {
    const p = $<HTMLInputElement>("#acPin")!.value, p2 = $<HTMLInputElement>("#acPin2")!.value;
    if (!/^\d{4}$/.test(p) || p !== p2) return toast("PIN mới gồm 4 số, hai lần nhập phải giống nhau");
    try { await changePin(p); toast("Đã đổi PIN ✓"); $<HTMLInputElement>("#acPin")!.value = $<HTMLInputElement>("#acPin2")!.value = ""; } catch (e) { toast((e as Error).message); }
  });
  $("#cPush")!.addEventListener("click", async () => {
    keep();
    if (!S.cloud.morning && !S.cloud.night) { await disablePush(); closeModal(); return toast("Đã tắt nhắc giờ"); }
    const err = await enablePush().catch((e: Error) => e.message);
    if (err) return toast(err);
    closeModal(); toast(`Đã bật nhắc ${[S.cloud.morning ? "7:00" : "", S.cloud.night ? "23:00" : ""].filter(Boolean).join(" và ")} ✓`);
  });
  $("#cOff")?.addEventListener("click", async () => { await disablePush(); closeModal(); toast("Đã tắt thông báo"); });
  let arm = false;
  $("#acOut")!.addEventListener("click", async e => {
    if (!arm) { arm = true; (e.target as HTMLElement).textContent = "Chạm lần nữa"; return; }
    await logout(); dropModal(); location.hash = "#/"; location.reload();
  });
}

/* ===== Ví tiền: bấm vào số xu. Số dư, tổng thu, tổng chi, lịch sử ===== */
let walletTab: "today" | "all" = "all";
export function wallet() {
  const b = S.book, tin = totalIn(), tout = totalOut();
  const rows = <K extends string>(labels: Record<K, string>, vals: Partial<Record<K, number>>, sign: string) =>
    (Object.keys(labels) as K[]).filter(k => vals[k]).map(k => `<div class="lg"><span>${labels[k]}</span><b class="${sign === "+" ? "p" : "m"}">${sign}${fmtN(vals[k]!)}</b></div>`).join("") || `<p class="sub small">Chưa có</p>`;
  const when = (t: number) => { const d = new Date(t); return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }); };
  const log = b.log.filter(x => walletTab === "all" || new Date(x.t).toDateString() === new Date().toDateString());
  modal(`<h2>Ví của tiệm</h2>
    <div class="wbal"><span class="coin-i big"></span><b>${fmtN(S.coins)}</b><small>xu đang có</small></div>
    <div class="wsum"><div class="p"><small>Tổng thu</small><b>+${fmtN(tin)}</b></div><div class="m"><small>Tổng chi</small><b>−${fmtN(tout)}</b></div></div>
    <p class="sub small">Hôm nay: <b class="pt">+${fmtN(b.day === S.daily.day ? b.dayIn : 0)}</b> · <b class="mt">−${fmtN(b.day === S.daily.day ? b.dayOut : 0)}</b>${b.start ? ` · trước khi có sổ: ${fmtN(b.start)} xu` : ""}</p>
    <div class="wcols"><div><h4>Thu</h4>${rows(IN_LABEL, b.in, "+")}</div><div><h4>Chi</h4>${rows(OUT_LABEL, b.out, "−")}</div></div>
    <div class="seg wseg"><button class="${walletTab === "today" ? "on" : ""}" id="wToday">Hôm nay</button><button class="${walletTab === "all" ? "on" : ""}" id="wAll">Gần đây</button></div>
    <div class="wlog">${log.length ? log.map(x => `<div class="lg"><span>${esc(x.n)}<small>${when(x.t)}</small></span><b class="${x.v > 0 ? "p" : "m"}">${x.v > 0 ? "+" : "−"}${fmtN(Math.abs(x.v))}</b></div>`).join("") : `<p class="sub small">Chưa có giao dịch nào</p>`}</div>
    <div class="mbtns"><button class="b3" data-close>Đóng</button></div>`, render);
  $("#wToday")!.addEventListener("click", () => { walletTab = "today"; wallet(); });
  $("#wAll")!.addEventListener("click", () => { walletTab = "all"; wallet(); });
}

/* ===== Vừa cập nhật: có gì mới (các bản sau bản cũ) ===== */
export function whatsNew(prev: string) {
  const newer = CHANGELOG.filter(c => c.v.localeCompare(prev, undefined, { numeric: true }) > 0).slice(0, 3);
  if (!newer.length) return;
  modal(`<div class="tart">${petSVG({ ...PETS.white, mood: "love", wave: true }, 80)}</div><h2>Tiệm vừa lên bản ${esc(__APP_VERSION__)}!</h2>
    ${newer.map(c => `<div class="wn"><b>Bản ${esc(c.v)}</b><ul>${c.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>`).join("")}
    <div class="mbtns"><button class="b3" data-close>Tuyệt!</button></div>`);
}

/* ===== Hướng dẫn lần đầu ===== */
const TUT = [
  { art: () => `<div class="tart">${petSVG(PETS.dog, 64)}${petSVG({ ...PETS.gold, mood: "love" }, 72)}${petSVG({ ...PETS.white, mood: "open", wave: true }, 64)}</div>`,
    t: "Chào chủ tiệm!", d: "Mỗi ngày tiệm mở cửa, khách ghé mua bánh. Thẻ gọi món ghi rõ tên bánh, thành phần và độ ngọt khách muốn." },
  { art: () => `<div class="tart">${cakeSVG({ base: 0, cream: 0, top: 0, sweet: 0 }, { size: 150 })}</div>`,
    t: "Ghép bánh", d: "Chạm Đế → Kem → Topping → Độ ngọt. Dấu ✓ xanh là đúng, ✕ đỏ là sai. Đủ rồi thì bấm Giao bánh. Giao nhanh được nhiều sao và tip." },
  { art: () => `<div class="tart">${cakeSVG({ base: RECIPES[1].base, cream: RECIPES[1].cream, top: RECIPES[1].top, sweet: 1 }, { size: 110, still: true })}${petSVG({ ...PETS.dog, mood: "wink" }, 70)}</div>`,
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

/* ===== Quà khai trương: vốn làm ăn, nhận một lần ===== */
export function welcome() {
  if (S.welcome || !claimWelcome()) return;
  const food = (Object.entries(WELCOME.food) as [keyof typeof S.food, number][]).map(([id, n]) => ({ f: FOODS.find(x => x.id === id)!, n }));
  modal(`<div class="tart">${petSVG({ ...PETS.gold, mood: "love" }, 80)}<div class="gift"><span class="coin-i big"></span><b>+${WELCOME.coins}</b></div>${food.map(x => `<div class="gift">${foodSVG(x.f.id, 44)}<b>+${x.n}</b></div>`).join("")}</div>
    <h2>Quà khai trương!</h2>
    <p class="tdesc">Tặng chủ tiệm ${WELCOME.coins} xu và ${food.map(x => `${x.n} gói ${x.f.n}`).join(", ")} làm vốn. Đi chợ nhập nguyên liệu, và dành đồ ăn làm lương cho các bé nha.</p>
    <div class="mbtns"><button class="b3" data-close>Nhận vốn</button></div>`, render);
  floatHearts(innerWidth / 2, innerHeight / 2, 10); sfx("level");
}

/* ===== Sự cố bất ngờ: hộp thoại trượt từ dưới lên báo số xu bị trừ ===== */
export function incidentArt(i: Incident, px = 84) {
  return `<div class="incart" style="--ib:${i.bg}"><span class="ie" aria-hidden="true">${i.emoji}</span><span class="ip">${petSVG({ ...PETS[i.pet], mood: "impatient" }, px)}</span></div>`;
}
export function incidentModal(i: Incident, cost: number, onClose?: () => void, level?: Level) {
  modal(`${incidentArt(i)}<h2>${esc(i.title)}</h2><p class="sub">${esc(i.text)}</p>
    ${level ? `<div class="inclv ${level}">Mức ${esc(LEVELS[level].name.toLowerCase())} · −${Math.round(LEVELS[level].pct * 100)}% số xu</div>` : ""}
    <div class="inccost"><b>−${fmtN(cost)} xu</b><small>Còn lại ${fmtN(S.coins)} xu · xem ở Ví</small></div>
    <div class="mbtns"><button class="b3" data-close>Đành chịu thôi</button></div>`, onClose, !!level);
}

/** Đồng xu may rủi: người chơi tự bấm. 70% bình an, 30% gặp sự cố (trừ 3%, 6% hoặc 8% số xu đang có). */
export function coinModal(onClose?: () => void) {
  modal(`<div class="coinwrap"><button type="button" class="tosscoin" id="coinBtn" aria-label="Tung đồng xu"><span class="cf cfa"><i>xu</i></span></button></div>
    <h2>Tung đồng xu!</h2><p class="sub">Bấm vào đồng xu. Có 30% gặp sự cố bị trừ xu, 70% bình an.</p>
    <div class="coinodds"><span>Thấp −3%</span><span>Trung bình −6%</span><span>Cao −8%</span></div>`, onClose, true);
  const btn = $<HTMLButtonElement>("#coinBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    btn.disabled = true; btn.classList.add("flip"); sfx("tap");
    setTimeout(() => {
      const hit = tossCoin();
      if (!hit) {
        sfx("level");
        modal(`<div class="coinwrap"><span class="tosscoin safe"><span class="cf">🍀</span></span></div><h2>May quá!</h2><p class="sub">Đồng xu mỉm cười, tiệm bình an vô sự. Hẹn bạn ở lần tung sau.</p>
          <div class="mbtns"><button class="b3" data-close>Tuyệt!</button></div>`, onClose, true);
        return;
      }
      applyIncident(hit); save(); sfx("untap");
      incidentModal(hit.inc, hit.cost, onClose, hit.level);
    }, 1250);
  });
}

/** Thông báo thưởng đăng nhập mỗi ngày và khoản đền bù */
export function rewardModal(c: { daily: number; comp: number }) {
  const rows = [c.comp ? `<div class="rwrow"><span>🎁 Đền bù vì trừ xu quá tay</span><b>+${fmtN(c.comp)} xu</b></div>` : "", c.daily ? `<div class="rwrow"><span>☀️ Thưởng đăng nhập hôm nay (10% số xu, tối đa 2.000)</span><b>+${fmtN(c.daily)} xu</b></div>` : ""].join("");
  modal(`<h2>${c.comp ? "Xin lỗi vì trừ hơi ghê!" : "Chào ngày mới!"}</h2><p class="sub">${c.comp ? "Tiệm gửi bạn món quà đền bù và quà đăng nhập." : "Quà cho lần đăng nhập đầu tiên trong ngày."}</p>
    <div class="rwbox">${rows}</div><div class="inccost"><small>Số xu hiện có ${fmtN(S.coins)} xu · xem ở Ví</small></div>
    <div class="mbtns"><button class="b3" data-close>Nhận luôn</button></div>`);
}

/* ===== Mục tiêu và Quà tặng: hộp thoại trượt từ dưới lên (thay cho trang riêng) ===== */
export function goalsSheet() { modal(`<h2>Mục tiêu</h2>${goalsBody()}<div class="mbtns"><button class="b3 w" data-close>Đóng</button></div>`); }
export function giftSheet() { modal(`<h2>Quà tặng</h2>${giftBody()}<div class="mbtns"><button class="b3 w" data-close>Đóng</button></div>`); }

/* ===== Nâng cấp tiệm: mua bàn, xây lầu, mở rộng ngang =====
   forced = khách đông hơn số bàn: không đóng được, phải chọn một cách nâng cấp (trừ khi không đủ xu cho cách nào) */
const VENUE_OPT = {
  table: { ic: "🪑", n: "Mua thêm bàn", d: () => `Bàn cấp 1 chứa 2 người · bàn thứ ${tableLvs().length + 1}, đang có ${tableLvs().length}/${spots()} chỗ đặt` },
  up: { ic: "⭐", n: "Nâng cấp bàn", d: () => `Bàn cấp ${Math.min(...tableLvs())} lên cấp ${Math.min(...tableLvs()) + 1}, thêm 1 ghế` },
  floor: { ic: "🏢", n: "Xây thêm lầu", d: () => `Thêm ${4 + S.venue.wide} chỗ đặt bàn · lầu ${S.venue.floors + 1}` },
  wide: { ic: "↔️", n: "Mở rộng cửa hàng", d: () => `Rộng thêm, mỗi lầu +1 chỗ đặt bàn · lần ${S.venue.wide + 1}` }
} as const;
const SPOT_FULL = "Hết chỗ đặt bàn, hãy xây lầu hoặc mở rộng";
export function upgradeModal(forced = false) {
  const need = needUpgrade(), stuck = forced && !canAffordUpgrade();
  const opts = upgradeOptions().map(o => {
    const v = VENUE_OPT[o.id], poor = S.coins < o.cost;
    return `<button class="vopt" data-venue="${o.id}:${forced ? 1 : 0}" ${!o.ok || poor ? "disabled" : ""}><span class="vi">${v.ic}</span><span class="vt"><b>${v.n}</b><small>${o.ok ? v.d() : o.id === "up" ? "Mọi bàn đã cấp cao nhất" : SPOT_FULL}</small></span><em>${fmtN(o.cost)} xu</em></button>`;
  }).join("");
  const foot = forced && !stuck ? "" : `<div class="mbtns">${stuck ? `<button class="b3" data-act="start-anyway">Chơi với ${seatsNow()} ghế</button>` : `<button class="b3" data-close>Đóng</button>`}</div>`;
  modal(`<h2>${forced ? "Tiệm đông quá rồi!" : "Nâng cấp tiệm"}</h2><p class="sub">${need ? `Giờ cao điểm có ${demand()} khách mà tiệm chỉ có ${capacity()} ghế. ${forced ? "Phải nâng cấp mới mở cửa được." : "Nâng cấp để đón đủ khách."}` : `Tiệm có ${tableLvs().length} bàn · ${S.venue.floors} lầu · mở rộng ${S.venue.wide} lần.`}</p>
    <div class="vstat"><span>🪑 ${capacity()}/${demand()} ghế</span><span>🏢 ${S.venue.floors} lầu</span><span>${tableLvs().length}/${spots()} chỗ đặt bàn</span></div>
    <div class="vopts">${opts}</div>${stuck ? `<p class="sub">Chưa đủ xu cho cách nào. Bán thêm bánh rồi quay lại nhé.</p>` : ""}${foot}`, undefined, forced && !stuck);
}
/** mua xong: còn thiếu bàn thì giữ hộp thoại bắt buộc, đủ rồi thì đóng */
export function venueBuy(id: string, forced: boolean) {
  if (!buyVenue(id as "table" | "up" | "floor" | "wide")) { toast("Không đủ xu"); return; }
  sfx("level"); render(true);                           // trừ xu và dựng lại cảnh tiệm ngay, hộp thoại vẫn mở
  toast(id === "table" ? "Đã thêm bàn!" : id === "up" ? "Đã nâng cấp bàn!" : id === "floor" ? "Đã xây thêm lầu!" : "Đã mở rộng cửa hàng!");
  if (forced && needUpgrade()) return upgradeModal(true);
  if (forced) { closeModal(); toast("Đủ bàn rồi, bắt đầu ca thôi!"); return; }
  upgradeModal(false);
}
