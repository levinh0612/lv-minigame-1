/* Storybook: bày mọi màn hình, hộp thoại và thành phần của game với dữ liệu mẫu.
   Dùng chính code vẽ của game nên luôn khớp. Mở /storybook.html, hoặc ?story=<id> để xem một mục.
   `npm run capture` chụp từng mục ra design-kit/ để gửi Claude Design. */
import "../styles/main.css";
import "./sb.css";
import { CFG } from "../content/couple";
import {
  CATS, CRITTERS, FOODS, HIM, KEYS, PETS, RECIPES, STAFF,
  type CritterLook, type GuestLook, type Mood, type PartKey
} from "../content/game";
import { rollDay } from "../engine/progress";
import { createShift, type Customer, type Shift } from "../engine/shift";
import { S, resetState, setPersist, type State } from "../engine/state";
import { cakeSVG, critterSVG, foodSVG, guestSVG, ingSVG } from "../ui/art";
import { coinPill, esc, levelChip } from "../ui/dom";
import { backup, claimGoals, himNote, openLetter, pauseMenu, settings, tutorial, welcome } from "../ui/modals";
import { goalsHTML } from "../ui/screens/goals";
import { homeHTML } from "../ui/screens/home";
import { _setResult, _setShift, playHTML, resultHTML, slotHTML } from "../ui/screens/play";
import { prepHTML } from "../ui/screens/prep";
import { roadmapHTML } from "../ui/screens/roadmap";
import { shopHTML, tryDecor } from "../ui/screens/shop";
import { fitRooms, roomHTML } from "../ui/room";
import { ROOM_CATS } from "../content/room";

setPersist(false);   // không bao giờ ghi vào tiến trình thật

/* ================= Dữ liệu mẫu ================= */
const xpForLv = (L: number) => 40 * (L - 1) * (L - 1) + 25;
function state(f: (s: State) => void = () => {}) {
  resetState(); S.tut = true; S.coins = 1240; S.streak = 5; S.shifts = 11;
  f(S); rollDay();
}
function withDate<T>(y: number, m: number, d: number, fn: () => T): T {
  const Real = Date, fixed = new Real(y, m - 1, d, 10).getTime();
  class Fake extends Real {
    constructor(...a: []) { if (a.length) super(...(a as [])); else super(fixed); }
    static now() { return fixed; }
  }
  (globalThis as { Date: DateConstructor }).Date = Fake as DateConstructor;
  try { return fn(); } finally { (globalThis as { Date: DateConstructor }).Date = Real; }
}
const G = (gender: "girl" | "boy", hairStyle: GuestLook["hairStyle"], hair: string, accent: string, gesture: GuestLook["gesture"] = "rest"): GuestLook =>
  ({ gender, hairStyle, hair, skin: "#FFE3D0", accent, gesture });
const cust = (who: string, look: CritterLook | GuestLook, r: number, sweet: number, pat: number, extra: Partial<Customer> = {}): Customer =>
  ({ who, look, r: RECIPES[r], sweet, max: 40, pat, ...extra });
const REVIEWS = [
  { who: CFG.hisName, look: HIM, s: 3, txt: CFG.notes[2], love: true },
  { who: "Bé Na", look: G("girl", "buns", "#6B4A3A", "#8FD9B6"), s: 3, txt: "Ngon xỉu, mai tui ghé nữa!", love: false },
  { who: "Mèo Bơ", look: CRITTERS[0], s: 2, txt: "Ngon nè, chờ hơi lâu xíu thôi.", love: false },
  { who: "Anh Tùng", look: G("boy", "cap", "#3B2A26", "#9FD8F5"), s: 0, txt: "Chờ lâu quá tui đi mất tiêu...", love: false }
];
function busyShift(): Shift {
  const sh = createShift();
  sh.seats = [
    cust("Mèo Bơ", CRITTERS[0], 1, 0, 30, { by: "dog" }),
    cust("Bé Na", G("girl", "buns", "#6B4A3A", "#8FD9B6", "wave"), 3, 1, 20),
    cust(CFG.hisName, HIM, 0, 0, 8, { him: true, mood: "impatient" }),
    cust("Anh Tùng", G("boy", "cap", "#3B2A26", "#9FD8F5"), 2, 2, 34, { by: "gold" })
  ];
  sh.working = ["dog", "gold"];
  sh.bakers = [{ id: "dog", seat: 0, done: 4.5, need: 7.5 }, { id: "gold", seat: 3, done: 2, need: 10 }];
  sh.spawned = 7; sh.served = 2; sh.total = 13; sh.mine = 2;
  sh.build = { base: 0, cream: 0, top: null, sweet: 1 };
  return sh;
}
const lvState = (L: number, more: (s: State) => void = () => {}) => state(s => { s.xp = xpForLv(L); more(s); });
const staffed = (s: State) => {
  s.food = { kibble: 5, pate: 3, chicken: 1 };
  s.staff.dog = { hired: true, lv: 2, onDuty: true };
  s.staff.gold = { hired: true, lv: 1, onDuty: true };
  s.staff.white = { hired: true, lv: 1, onDuty: true };
};

/* lấy HTML của một hộp thoại (các hàm hộp thoại ghi vào #layer) */
function modalOver(screen: string, open: () => void) {
  const layer = document.createElement("div"); layer.id = "layer"; document.body.appendChild(layer);
  open();
  const html = layer.innerHTML; layer.remove();
  document.querySelectorAll(".fh,.toast").forEach(e => e.remove());
  return screen + html;
}

/* ================= Danh sách story ================= */
type Kind = "screen" | "modal" | "comp";
interface Story { id: string; sec: string; title: string; desc: string; kind: Kind; long?: boolean; resBg?: boolean; html: () => string }
const SECTIONS: [string, string, string][] = [
  ["screens", "Màn hình", "Khung 390×844 (iPhone 14). Màn dài hơn một trang được bày nguyên chiều cao."],
  ["modals", "Hộp thoại", "Hộp thoại hiện đè lên màn hình."],
  ["cakes", "Bánh", "Bánh có mặt cười: 3 đế × 3 kem × 3 topping, độ ngọt, các bước ghép."],
  ["chars", "Nhân vật", "Khách con vật, khách người và ba bé nhà mình ở mọi biểu cảm."],
  ["ui", "Nút & thành phần", "Nút, chip nguyên liệu, thẻ gọi món, thẻ thông tin."],
  ["decor", "Trang trí", "Đồ trang trí trong cửa hàng và trong phòng."]
];

const STORIES: Story[] = [
  /* ---------- Màn hình ---------- */
  { id: "home", sec: "screens", title: "Bắt đầu", desc: "Người chơi Lv 3, có thư mới chưa đọc", kind: "screen",
    html: () => { lvState(3); return homeHTML(); } },
  { id: "home-named", sec: "screens", title: "Bắt đầu · đã đặt tên tiệm", desc: "Tiêu đề theo tên người chơi đặt: Tiệm của Vinh", kind: "screen",
    html: () => { lvState(2, s => { s.cloud.named = true; s.cloud.name = "Tiệm của Vinh"; s.cloud.at = new Date().toISOString(); }); return homeHTML(); } },
  { id: "home-event", sec: "screens", title: "Bắt đầu · ngày đặc biệt", desc: "Sinh nhật bạn nữ (28/12): thẻ sự kiện, xu x2; thư đã đọc", kind: "screen",
    html: () => withDate(2026, 12, 28, () => { lvState(5, s => { s.letters = [{ day: "2026-12-28", txt: "…" }]; }); return homeHTML(); }) },
  { id: "prep", sec: "screens", title: "Chuẩn bị ca", desc: "Lv 4: kho thiếu Dâu tây; Milo đi làm (có Pate), Siro đói (thiếu Hạt), Cacao nghỉ", kind: "screen", long: true,
    html: () => { lvState(4, s => { s.stock.top[0] = 0; s.stock.cream[0] = 2; s.food = { kibble: 0, pate: 3, chicken: 1 };
      s.staff.dog = { hired: true, lv: 2, onDuty: true }; s.staff.gold = { hired: true, lv: 1, onDuty: true }; s.staff.white = { hired: true, lv: 1, onDuty: false }; }); return prepHTML(); } },
  { id: "play-empty", sec: "screens", title: "Chơi · đầu ca", desc: "Chưa có khách, đĩa trống", kind: "screen",
    html: () => { lvState(1); const sh = createShift(); _setShift(sh); return playHTML(sh); } },
  { id: "play-busy", sec: "screens", title: "Chơi · đông khách", desc: "4 bàn trong một hàng; Milo làm cho Mèo Bơ 60%, Siro làm cho Anh Tùng 20%; chủ tiệm nhận đơn của Anh (sắp giận), chưa xem công thức; Hạt dẻ hết hàng", kind: "screen",
    html: () => { lvState(5, s => { staffed(s); s.stock.top[2] = 0; }); const sh = busyShift(); _setShift(sh); return playHTML(sh, { states: ["", "", "low", ""] }); } },
  { id: "play-peek", sec: "screens", title: "Chơi · đã xem công thức", desc: "Bấm Xem công thức: hiện 3 nguyên liệu và dấu ✓/✕ trên nút; mất thưởng nhớ bài", kind: "screen",
    html: () => { lvState(5, s => { staffed(s); }); const sh = busyShift(); sh.peek = true; _setShift(sh); return playHTML(sh, { states: ["", "", "low", ""] }); } },
  { id: "play-idle", sec: "screens", title: "Chơi · rảnh tay", desc: "Tắt Tự nhận đơn: chủ tiệm không giữ đơn nào, các bé nhận hết; Cacao thiếu Matcha", kind: "screen",
    html: () => { lvState(5, s => { staffed(s); s.autoTake = false; }); const sh = busyShift(); sh.mine = -1; sh.build = { base: null, cream: null, top: null, sweet: null }; sh.working = ["dog", "gold", "white"]; sh.lack = { white: "Matcha" }; _setShift(sh); return playHTML(sh); } },
  { id: "play-served", sec: "screens", title: "Chơi · vừa giao bánh", desc: "Thẻ gọi món thành xanh, khách thả tim, bánh nhắm mắt cười", kind: "screen",
    html: () => { lvState(5, staffed); const sh = busyShift(); sh.build = { base: 0, cream: 0, top: 0, sweet: 0 }; sh.mine = -1; _setShift(sh); return playHTML(sh, { done: true, states: ["", "", "ok", ""] }); } },
  { id: "play-collapsed", sec: "screens", title: "Chơi · thu gọn phiếu", desc: "Kéo phiếu xuống: thấy cả quầy, thanh nhỏ ở đáy để mở lại", kind: "screen",
    html: () => { lvState(5, staffed); const sh = busyShift(); _setShift(sh); return playHTML(sh, { sheet: false }); } },
  { id: "play-stock", sec: "screens", title: "Chơi · kho nguyên liệu", desc: "Nút hộp ở góc trên: chọn sẵn món sắp hết, nhập đầy 10", kind: "screen",
    html: () => { lvState(5, s => { staffed(s); s.stock.top[2] = 0; s.stock.base[1] = 1; s.stock.cream[0] = 2; }); const sh = busyShift(); _setShift(sh); return playHTML(sh, { stock: true }); } },
  { id: "result-great", sec: "screens", title: "Kết quả · tuyệt vời", desc: "3 sao, lên cấp, bảng lãi, mở khoá thư", kind: "screen", resBg: true, long: true,
    html: () => {
      lvState(5, s => { s.daily.served = 12; s.daily.feat = 3; s.daily.angry = 0; s.daily.day = ""; });
      S.daily.served = 12; S.daily.feat = 3;
      const sh = createShift(); Object.assign(sh, { served: 12, left: 0, coins: 320, tips: 85, bonus: 96, memo: 6, helped: 4, goalCoins: 120, ingUsed: 66, quickCost: 6, wages: 15, lv0: 4 });
      _setResult({ sh, lv: 5, led: { revenue: 621, ingUsed: 66, quick: 6, wages: 15, profit: 534 } }); return resultHTML();
    } },
  { id: "result-low", sec: "screens", title: "Kết quả · cố lên", desc: "1 sao, nhiều khách bỏ về, chưa xong mục tiêu", kind: "screen", resBg: true, long: true,
    html: () => {
      lvState(2, s => { s.daily.served = 3; s.daily.angry = 4; });
      S.daily.served = 3; S.daily.angry = 4;
      const sh = createShift(); Object.assign(sh, { served: 3, left: 5, coins: 60, tips: 6, memo: 1, helped: 2, ingUsed: 24, wages: 10, lv0: 2 });
      _setResult({ sh, lv: 2, led: { revenue: 66, ingUsed: 24, quick: 0, wages: 10, profit: 32 } }); return resultHTML();
    } },
  { id: "goals", sec: "screens", title: "Mục tiêu", desc: "Mục tiêu ngày, ngày sắp tới, công thức, đánh giá", kind: "screen", long: true,
    html: () => { lvState(4, s => { s.reviews = REVIEWS as State["reviews"]; }); S.daily.served = 5; S.daily.feat = 1; return goalsHTML(); } },
  { id: "shop-decor", sec: "screens", title: "Trang trí tiệm", desc: "Đang dùng Rèm ren và Đèn mây; đang thử tường Sọc bạc hà", kind: "screen",
    html: () => { lvState(4, s => { s.room.curtain = "1"; s.room.lamp = "1"; s.room.plant = "1"; s.owned = ["curtain:1", "lamp:1", "plant:1"]; }); tryDecor("wall", "mint"); const h = shopHTML("decor"); tryDecor("wall", "pink"); return h; } },
  { id: "shop-pets", sec: "screens", title: "Thú cưng (kiêm nhân viên)", desc: "Tủ đồ ăn; Milo đi làm bậc 2, Siro chờ nhận vào làm, Cacao chưa đủ cấp; thưởng đồ ăn mỗi ngày", kind: "screen", long: true,
    html: () => { lvState(3, s => { s.pets.dog.aff = 32; s.pets.gold.aff = 14; s.food = { kibble: 4, pate: 2, chicken: 0 }; s.staff.dog = { hired: true, lv: 2, onDuty: true }; });
      S.pets.dog.fedDay = S.daily.day; return shopHTML("pets"); } },
  { id: "shop-gift", sec: "screens", title: "Cửa hàng · Quà tặng", desc: "Quà hôm nay và hộp thư", kind: "screen", long: true,
    html: () => { lvState(3, s => { s.letters = [{ day: "2026-09-25", txt: CFG.notes[0] }, { day: "2026-09-26", txt: CFG.notes[1], tag: "Thư bí mật", bonus: true }, { day: "2026-09-27", txt: CFG.notes[3] }]; }); return shopHTML("gift"); } },
  { id: "roadmap", sec: "screens", title: "Sắp ra mắt", desc: "Lộ trình nâng cấp và Có gì mới", kind: "screen", long: true,
    html: () => { lvState(3); return roadmapHTML(); } },

  /* ---------- Hộp thoại ---------- */
  { id: "m-letter", sec: "modals", title: "Thư hôm nay", desc: "Mở từ thẻ thư ở màn Bắt đầu", kind: "modal",
    html: () => { lvState(3); return modalOver(homeHTML(), openLetter); } },
  { id: "m-gift", sec: "modals", title: "Nhận quà mục tiêu", desc: "Xong 3 mục tiêu: +60 xu và thư bí mật", kind: "modal",
    html: () => { lvState(3); S.daily.served = 9; S.daily.feat = 3; return modalOver(homeHTML(), claimGoals); } },
  { id: "m-welcome", sec: "modals", title: "Quà khai trương", desc: "Lần đầu chơi: 300 xu + 5 Hạt làm vốn", kind: "modal",
    html: () => { lvState(1, s => { s.welcome = false; }); return modalOver(homeHTML(), welcome); } },
  { id: "m-tut-1", sec: "modals", title: "Hướng dẫn 1/4", desc: "Lần đầu mở game", kind: "modal",
    html: () => { lvState(1); return modalOver(homeHTML(), () => tutorial(0)); } },
  { id: "m-tut-3", sec: "modals", title: "Hướng dẫn 3/4", desc: "Đi chợ và nhân viên", kind: "modal",
    html: () => { lvState(1); return modalOver(homeHTML(), () => tutorial(2)); } },
  { id: "m-him", sec: "modals", title: "Anh ghé tiệm", desc: "Khách đặc biệt để lại lời nhắn", kind: "modal",
    html: () => { lvState(5, staffed); const sh = busyShift(); _setShift(sh); return modalOver(playHTML(sh), () => himNote(cust(CFG.hisName, HIM, 0, 0, 30, { note: CFG.notes[5] }))); } },
  { id: "m-pause", sec: "modals", title: "Tạm dừng", desc: "Nút ❚❚ hoặc bấm Back giữa ca", kind: "modal",
    html: () => { lvState(5, staffed); const sh = busyShift(); _setShift(sh); return modalOver(playHTML(sh), pauseMenu); } },
  { id: "m-settings", sec: "modals", title: "Cài đặt", desc: "Tên, tên khách, âm thanh, rung, sao lưu", kind: "modal",
    html: () => { lvState(3); return modalOver(homeHTML(), settings); } },
  { id: "m-backup", sec: "modals", title: "Sao lưu", desc: "Mã sao lưu để chuyển sang máy khác", kind: "modal",
    html: () => { lvState(3); return modalOver(homeHTML(), backup); } },

  /* ---------- Bánh ---------- */
  { id: "c-cakes", sec: "cakes", title: "27 tổ hợp bánh", desc: "Đế × Kem × Topping (độ ngọt Vừa)", kind: "comp",
    html: () => `<div class="board">${[0, 1, 2].map(b => `<div class="sblabel">Đế ${CATS.base[b][0]}</div><div class="sbrow">${[0, 1, 2].flatMap(c => [0, 1, 2].map(t => {
      const r = RECIPES.find(x => x.base === b && x.cream === c && x.top === t);
      return `<div class="sbcell">${cakeSVG({ base: b, cream: c, top: t, sweet: 1 }, { size: 96, still: true })}<b>${r ? esc(r.n) : "&nbsp;"}</b>${CATS.cream[c][0]} · ${CATS.top[t][0]}</div>`;
    })).join("")}</div>`).join("")}</div>` },
  { id: "c-cake-steps", sec: "cakes", title: "Các bước ghép & độ ngọt", desc: "Đĩa trống → đế → kem → topping → độ ngọt → giao xong", kind: "comp",
    html: () => `<div class="board"><div class="sbrow">${[
      [{}, "Đĩa trống"], [{ base: 0 }, "Đế"], [{ base: 0, cream: 0 }, "+ Kem"], [{ base: 0, cream: 0, top: 0 }, "+ Topping"],
      [{ base: 0, cream: 0, top: 0, sweet: 0 }, "Ít ngọt"], [{ base: 0, cream: 0, top: 0, sweet: 1 }, "Vừa"], [{ base: 0, cream: 0, top: 0, sweet: 2 }, "Ngọt lịm"]
    ].map(([p, n]) => `<div class="sbcell">${cakeSVG(p as object, { size: 120 })}<b>${n}</b></div>`).join("")}
      <div class="sbcell">${cakeSVG({ base: 2, cream: 1, top: 0, sweet: 1 }, { size: 120, done: true })}<b>Giao xong</b></div></div></div>` },

  /* ---------- Nhân vật ---------- */
  { id: "c-critters", sec: "chars", title: "Khách con vật", desc: "Mỗi hàng là một khách, mỗi cột một biểu cảm", kind: "comp",
    html: () => { const moods: Mood[] = ["happy", "open", "wink", "impatient", "love"];
      return `<div class="board"><div class="sbrow" style="margin-bottom:6px">${["", ...moods].map(m => `<div class="sbcell" style="width:${m ? 96 : 80}px"><b>${m}</b></div>`).join("")}</div>
        ${CRITTERS.map(k => `<div class="sbrow"><div class="sbcell" style="width:80px"><b>${esc(k.n)}</b></div>${moods.map(m => `<div class="sbcell" style="width:96px">${critterSVG({ ...k, mood: m }, 84)}</div>`).join("")}</div>`).join("")}</div>`; } },
  { id: "c-pets", sec: "chars", title: "Milo, Siro, Cacao", desc: "Thú cưng nhà mình (kiêm nhân viên)", kind: "comp",
    html: () => { const moods: Mood[] = ["happy", "open", "wink", "impatient", "love"];
      return `<div class="board">${CFG.pets.map(p => `<div class="sbrow"><div class="sbcell" style="width:80px"><b>${esc(p.name)}</b>${STAFF.find(s => s.id === p.id)!.role}</div>${moods.map(m => `<div class="sbcell" style="width:110px">${critterSVG({ ...PETS[p.id], mood: m }, 100)}${m}</div>`).join("")}<div class="sbcell">${critterSVG({ ...PETS[p.id], wave: true, mood: "open" }, 100)}vẫy tay</div></div>`).join("")}</div>`; } },
  { id: "c-guests", sec: "chars", title: "Khách người", desc: "Kiểu tóc × biểu cảm × cử chỉ; Anh (khách đặc biệt) ở hàng cuối", kind: "comp",
    html: () => { const moods: Mood[] = ["happy", "open", "wink", "impatient", "love"];
      const rows: [string, GuestLook][] = [["Nữ tóc dài", G("girl", "long", "#6B4A3A", "#FF8FAB")], ["Nữ búi tóc", G("girl", "buns", "#C98B5A", "#8FD9B6", "wave")],
        ["Nam tóc ngắn", G("boy", "short", "#3B2A26", "#FFD166")], ["Nam đội mũ", G("boy", "cap", "#5C7A99", "#C9B8F0", "cheek")], ["Anh", HIM]];
      return `<div class="board">${rows.map(([n, l]) => `<div class="sbrow"><div class="sbcell" style="width:80px"><b>${n}</b></div>${moods.map(m => `<div class="sbcell" style="width:100px">${guestSVG({ ...l, mood: m }, 90)}${m}</div>`).join("")}</div>`).join("")}</div>`; } },

  { id: "c-foods", sec: "chars", title: "Đồ ăn thú cưng", desc: "Hạt (lương bậc 1), Pate (bậc 2), Ức gà (bậc 3); cũng dùng để thưởng", kind: "comp",
    html: () => `<div class="board"><div class="sbrow">${FOODS.map(f => `<div class="sbcell" style="width:120px">${foodSVG(f.id, 72)}<b>${f.n}</b>${f.cost} xu · +${f.aff} ♥</div>`).join("")}</div></div>` },

  /* ---------- Nút & thành phần ---------- */
  { id: "c-buttons", sec: "ui", title: "Nút", desc: "Nút 3D chính/phụ/khoá, nút nhỏ, mua, gói nhập, đi làm/nghỉ, tròn, huy hiệu", kind: "comp",
    html: () => `<div class="board w390" style="display:flex;flex-direction:column;gap:14px">
      <button class="b3" style="height:62px">Mở tiệm</button><button class="b3 w" style="height:56px;font-size:18px">Về tiệm</button><button class="b3" disabled style="height:56px;font-size:20px">Giao bánh (chưa đủ)</button>
      <div class="sbrow"><button class="mini">Cho ăn · 5 xu</button><button class="mini pk">Thuê · 10 xu/ca</button><button class="mini" disabled>Đã no bụng</button><button class="buy" style="padding:7px 16px">180 xu</button></div>
      <div class="sbrow"><button class="pk">+5<small>15 xu</small></button><button class="pk">+10<small>27 xu</small></button><button class="pk" disabled>+10<small>27 xu</small></button><button class="duty on">Đi làm</button><button class="duty">Nghỉ</button></div>
      <div class="sbrow"><button class="rbtn">♫</button><button class="rbtn">⚙︎</button><button class="rbtn">❚❚</button><button class="rbtn">←</button>${coinPill()}<div class="pill love"><span>♥︎</span>1.145 ngày yêu</div></div>
      <div class="sbrow">${levelChip(3, 85, 200)}<button class="soon-link" style="margin:0">✦ Sắp ra mắt</button><span class="tag use" style="padding:6px 12px">Đang dùng</span><span class="tag lk" style="padding:6px 12px">Mở ở Lv 9</span></div>
      <div class="seg" style="margin:0"><button class="on">Trang trí</button><button>Thú cưng</button><button>Quà tặng</button></div></div>` },
  { id: "c-chips", sec: "ui", title: "Nút nguyên liệu", desc: "Bình thường · đang chọn · đúng ✓ · sai · hết hàng (nhập nhanh) · sắp hết", kind: "comp",
    html: () => { const b = (cls: string, k: PartKey, i: number, tail: string) =>
        `<div class="sbcell" style="width:118px"><button class="ing ${cls}" style="width:112px">${ingSVG(k, i, 24, cls === "out")}<span class="cn">${CATS[k][i][0]}</span>${tail}</button>${cls || "bình thường"}</div>`;
      return `<div class="board"><div class="sbrow" style="padding-top:10px">${b("", "base", 0, `<b class="q">8</b>`)}${b("on", "cream", 1, `<b class="q">5</b>`)}${b("ok", "cream", 0, `<b class="q">7</b><em class="ck"><svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6.5 L5 9 L10 3" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg></em>`)}${b("bad", "sweet", 2, "")}${b("out", "top", 2, `<em class="tag">+5 xu</em>`)}${b("", "base", 1, `<b class="q low">1</b>`)}</div>
        <div class="sbrow">${KEYS.map(k => CATS[k].map((_, i) => ingSVG(k, i, 40)).join("")).join("")}</div></div>`; } },
  { id: "c-orders", sec: "ui", title: "Khách trong hàng đợi", desc: "Bình thường · đơn của bạn · sắp giận · bé đang làm (40%) · đã giao", kind: "comp",
    html: () => { lvState(5, staffed); const sh = createShift();
      sh.seats = [cust("Bé Kem", G("girl", "long", "#E7B872", "#FF8FAB"), 5, 0, 36), cust("Mèo Bơ", CRITTERS[0], 1, 1, 30), cust("Cún Bơ", CRITTERS[4], 2, 2, 6), cust("Gấu Mật", CRITTERS[2], 4, 1, 28, { by: "dog" }), cust("Bé Na", G("girl", "buns", "#6B4A3A", "#8FD9B6"), 0, 0, 30)];
      sh.bakers = [{ id: "dog", seat: 3, done: 3, need: 7.5 }]; sh.mine = 1;
      const st: ("" | "low" | "ok")[] = ["", "", "low", "", "ok"], lab = ["Bình thường", "Đơn của bạn", "Sắp giận", "Bé đang làm", "Đã giao"];
      return `<div class="board"><div class="queue" style="--n:5;width:560px;padding:0">${sh.seats.map((x, i) => `<div class="slot ${i === 1 ? "mine" : ""} ${x!.by ? "taken" : ""} ${st[i] === "low" ? "low" : ""}" style="height:152px">${slotHTML(sh, i, st[i])}</div>`).join("")}</div>
        <div class="queue" style="--n:5;width:560px;padding:6px 0 0">${lab.map(l => `<div class="sbcell"><b>${l}</b></div>`).join("")}</div></div>`; } },
  { id: "c-cards", sec: "ui", title: "Thẻ & thông báo", desc: "Thẻ thư, sự kiện, cảnh báo hết hàng, bảng lãi, mở khoá thư, lên cấp, toast", kind: "comp",
    html: () => `<div class="board w390" style="display:flex;flex-direction:column;gap:14px;position:relative;transform:translateZ(0)">
      <button class="letter" style="margin:0;width:100%"><div class="env"></div><div class="tx"><b>Thư hôm nay đã đến</b><small>Chạm để mở thư</small></div><div class="dot"></div></button>
      <div class="evt" style="margin:0"><b>Hôm nay: Sinh nhật Em · xu x2</b><p>Chúc mừng sinh nhật Em!</p></div>
      <p class="warnbox">Đang hết Dâu tây. Khách gọi món có nguyên liệu này sẽ phải nhập nhanh, giá cao hơn 50%.</p>
      <div class="ledger"><div class="lg"><span>Tiền bánh + tip</span><b>+405</b></div><div class="lg"><span>Nguyên liệu đã dùng</span><b>−96</b></div><div class="lg"><span>Lương thú cưng (đồ ăn)</span><b>−16</b></div><div class="lg tot"><span>Lãi ca này</span><b>+293 xu</b></div></div>
      <button class="unlock"><div class="env"></div><div><b>Mở khoá thư tình mới</b><small>Chạm để nhận quà hôm nay</small></div></button>
      <div class="lvup">Lên Lv 5! Mở khoá: Mochi Matcha Đậu đỏ</div>
      <div class="toast" style="position:static;transform:none;align-self:center">Sai độ ngọt rồi: Bé Na gọi Ít ngọt, không phải Vừa</div></div>` },

  /* ---------- Trang trí ---------- */
  { id: "c-room", sec: "decor", title: "Cảnh tiệm với đủ đồ", desc: "Tường kem, sàn gỗ, quầy matcha, rèm caro, dây đèn sao, đồng hồ mèo, monstera, thảm dâu", kind: "comp",
    html: () => { lvState(9); return `<div class="board w390" style="padding:20px 16px">${roomHTML({ wall: "cream", floor: "wood", counter: "mint", curtain: "2", lamp: "2", wallItem: "2", plant: "2", rug: "2" }, { recipes: 9, giftDot: true })}</div>`; } },
  { id: "c-decor", sec: "decor", title: "Ô đồ trang trí", desc: "Mẫu màu của từng kiểu trong 8 nhóm", kind: "comp",
    html: () => `<div class="board">${ROOM_CATS.map(c => `<div class="sbrow"><b style="width:80px">${c.n}</b>${c.items.map(it => `<div class="sbcell" style="width:90px"><span class="sw" style="display:block;width:80px;height:46px;border-radius:12px;border:2px solid #4A3438;background:${it.sw};background-size:${it.sws || "auto"}"></span>${esc(it.n)}</div>`).join("")}</div>`).join("")}</div>` }
];

/* ================= Hiển thị ================= */
const q = new URLSearchParams(location.search), one = q.get("story"), root = document.getElementById("sb")!;
const wrap = (s: Story) => s.kind === "comp" ? s.html() : `<div class="frame ${s.long ? "long" : ""} ${s.resBg ? "res-bg" : ""}">${s.html()}</div>`;

if (q.has("list")) {
  // cho script chụp ảnh đọc danh sách
  root.innerHTML = `<pre id="list">${JSON.stringify(STORIES.map(s => ({ id: s.id, kind: s.kind })))}</pre>`;
} else if (one) {
  document.body.classList.add("one");
  const s = STORIES.find(x => x.id === one);
  root.innerHTML = `<div class="sbw" id="shot">${s ? wrap(s) : "Không có story này"}</div>`;
  fitRooms();
  // báo kích thước thật cho script chụp ảnh
  void document.fonts.ready.then(() => setTimeout(() => {
    const r = document.getElementById("shot")!.getBoundingClientRect();
    document.title = `size=${Math.ceil(r.width)}x${Math.ceil(r.height)}`;
  }, 300));
} else {
  root.innerHTML = `<div class="sbw">
    <div class="sbh"><h1>Tiệm Bánh Storybook</h1><p>Mọi màn hình, hộp thoại và thành phần của game, vẽ bằng chính code của game với dữ liệu mẫu. Trang này không đụng tới tiến trình chơi thật. Chạm “mở riêng” để xem một mục ở kích thước thật.</p></div>
    <nav class="sbnav">${SECTIONS.map(([id, n]) => `<a href="#${id}">${n}</a>`).join("")}</nav>
    ${SECTIONS.map(([id, n, d]) => `<section class="sbsec" id="${id}"><h2>${n}</h2><p>${d}</p><div class="sbgrid">
      ${STORIES.filter(s => s.sec === id).map(s => `<div class="story"><div class="cap">${esc(s.title)} <a href="?story=${s.id}">mở riêng</a><small>${esc(s.desc)}</small></div>${wrap(s)}</div>`).join("")}
    </div></section>`).join("")}
  </div>`;
  fitRooms();
}
_setShift(null);
