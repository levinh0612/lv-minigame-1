import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIXED_GUESTS, RECIPES, SPRITES } from "../src/content/game";
import { coinMult, daysTogether, events, todayEvents } from "../src/engine/dates";
import { goals, rollDay } from "../src/engine/progress";
import { closeEarly, createShift, makeCustomer, mineIdx, peek, serve, take, tick, type Customer } from "../src/engine/shift";
import { S, fresh, loadState, petName, resetState } from "../src/engine/state";
import { CFG } from "../src/content/couple";
import { applyGameConfig, cleanGameConfig } from "../src/content/gameconfig";

const at = (y: number, m: number, d: number) => vi.setSystemTime(new Date(y, m - 1, d, 10, 0, 0));
const customer = (over: Partial<Customer> = {}): Customer => ({
  who: "Bé Na", look: { gender: "girl", sprite: "g1" }, r: RECIPES[0], sweet: 0, max: 40, pat: 40, ...over
});

beforeEach(() => { vi.useFakeTimers(); at(2026, 9, 27); resetState(); rollDay(); });
afterEach(() => vi.useRealTimers());

describe("ngày đặc biệt", () => {
  it("đếm ngày yêu tính cả ngày quen là ngày 1", () => {
    at(2023, 8, 10); expect(daysTogether()).toBe(1);
    at(2026, 9, 27); expect(daysTogether()).toBe(1145);
  });

  it("sự kiện gần nhất sau 27/9/2026 là tròn 38 tháng vào 10/10", () => {
    const [first] = events();
    expect(first.key).toBe("monthly");
    expect(first.t).toBe("Tròn 38 tháng");
    expect(first.in).toBe(13);
  });

  it("bỏ qua tròn tháng khi trùng kỷ niệm năm", () => {
    at(2027, 7, 20);
    expect(events().some(e => e.key === "monthly")).toBe(false);
    expect(events().find(e => e.key === "anniversary")!.t).toBe("Kỷ niệm 4 năm yêu nhau");
  });

  it("sinh nhật bạn nữ nhân đôi xu và đúng tuổi", () => {
    at(2026, 12, 28);
    const e = todayEvents().find(x => x.key === "herBirthday");
    expect(e?.v.age).toBe(28);
    expect(coinMult()).toBe(2);
  });

  it("mốc 100 ngày rơi đúng ngày thứ 1200", () => {
    const m = events().find(e => e.key === "milestone")!;
    expect(m.t).toBe("Ngày thứ 1200 bên nhau");
    at(m.date.getFullYear(), m.date.getMonth() + 1, m.date.getDate());
    expect(daysTogether()).toBe(1200);
  });
});

describe("dữ liệu lưu", () => {
  it("bản v1: hoàn xu đồ trang trí cũ và đổi tên thú cưng mặc định", () => {
    const s = loadState(JSON.stringify({ coins: 100, decor: ["plant", "bell"], names: { pets: { dog: "Bông", gold: "Mơ", white: "Tuyết" } } }));
    expect(s.v).toBe(6);
    expect(s.refund).toBe(410);
    expect(s.coins).toBe(100 + 60 + 350);
    expect(s.decor).toEqual([]);
    expect(petName("dog")).toBe("Milo");
  });

  it("bản 2.0 lỗi: đồ cũ sót lại được hoàn xu, đồ trùng tên giữ lại, đánh giá hình cũ bỏ đi", () => {
    const s = loadState(JSON.stringify({ v: 2, coins: 10, decor: ["plant", "lights", "ribbon"], reviews: [
      { who: "Mèo mướp", look: { kind: "goldcat", fur: "#fff" }, s: 5, txt: "", love: false },
      { who: "Bé Na", look: { gender: "girl" }, s: 3, txt: "", love: false }] }));
    expect(s.coins).toBe(10 + 120 + 900);
    expect(s.owned).toEqual(["plant:1"]);
    expect(s.room.plant).toBe("1");
    expect(s.reviews.map(r => r.who)).toEqual(["Bé Na"]);
  });

  it("hồ sơ cá nhân: người chơi cũ có nhân vật, tên tiệm, theme mặc định; dữ liệu lưu giữ nguyên", () => {
    const old = loadState(JSON.stringify({ v: 6, coins: 5 }));
    expect(old.me.sprite in SPRITES).toBe(true);
    expect(old.shop).toBe(""); expect(old.theme).toBe("pink");
    const mine = loadState(JSON.stringify({ v: 6, me: { sprite: "b3", hair: "#6B4A3A" }, shop: "Vinh", theme: "blue" }));
    expect(mine.me).toMatchObject({ sprite: "b3", hair: "#6B4A3A" }); expect(mine.me.coat).toBeTruthy();
    expect(mine.shop).toBe("Vinh"); expect(mine.theme).toBe("blue");
    expect(loadState(JSON.stringify({ v: 6, me: { sprite: "không-có" } })).me.sprite in SPRITES).toBe(true);
  });

  it("hình khách trong đánh giá đã lưu được chuyển sang ảnh mới, hình con vật và thú cưng bỏ đi", () => {
    const s = loadState(JSON.stringify({ v: 6, reviews: [
      { who: "Bé Na", look: { gender: "girl", hairStyle: "buns", hair: "#6B4A3A", skin: "#FFE3D0" }, s: 3, txt: "", love: false },
      { who: "Mèo Bơ", look: { kind: "cat", fur: "#FFFFFF", pattern: "patch" }, s: 2, txt: "", love: false },
      { who: "Siro", look: { kind: "brit", fur: "#F3DDAE" }, s: 3, txt: "", love: false },
      { who: "Anh", look: { gender: "boy", sprite: "boy" }, s: 3, txt: "", love: true }] }));
    expect(s.reviews.map(r => r.who)).toEqual(["Bé Na", "Anh"]);
    expect(s.reviews.every(r => r.look.sprite in SPRITES)).toBe(true);
  });

  it("khách thường chỉ là nam hoặc nữ, mỗi người có ảnh và bộ màu riêng", () => {
    resetState(); const sh = createShift();
    for (let i = 0; i < 80; i++) {
      const c = makeCustomer(sh);
      if (c.him) continue;
      expect(c.look.sprite in SPRITES).toBe(true);
      const fixed = FIXED_GUESTS[c.look.gender === "girl" ? "girl" : "boy"];          // khách 3D làm sẵn đúng giới tính, còn lại g1..g6 / b1..b6
      expect(fixed.includes(c.look.sprite) || c.look.sprite[0] === (c.look.gender === "girl" ? "g" : "b")).toBe(true);
      expect(c.look.coat).toBeTruthy();
    }
  });

  it("bản 2.x -> v4: đồ trang trí cũ thành kiểu trong 8 nhóm và được dùng luôn", () => {
    const s = loadState(JSON.stringify({ v: 3, coins: 10, decor: ["curtain", "lamp", "bell", "teapot"] }));
    expect(s.owned).toEqual(["curtain:1", "lamp:1", "lamp:2", "counter:mint"]);
    expect(s.room).toMatchObject({ curtain: "1", lamp: "1", counter: "mint", wall: "pink" });
    expect(s.decor).toEqual([]);
    expect(s.refund).toBeUndefined();
  });

  it("người chơi mới không bị hoàn xu", () => {
    const s = loadState(null);
    expect(s.v).toBe(6);
    expect(s.refund).toBeUndefined();
  });

  it("tên thú cưng, người gửi, khách do cấu hình admin quyết định và khôi phục được mặc định", () => {
    applyGameConfig({ his: "Bin", pets: { dog: "Bơ" }, girls: "A, B" });
    expect(petName("dog")).toBe("Bơ"); expect(petName("gold")).toBe("Siro"); expect(CFG.hisName).toBe("Bin"); expect(CFG.girlNames).toBe("A, B");
    applyGameConfig({});
    expect(petName("dog")).toBe("Milo"); expect(CFG.hisName).toBe("Anh");
  });
  it("làm sạch cấu hình: cắt độ dài, bỏ thẻ HTML, bỏ trường rỗng", () => {
    const c = cleanGameConfig({ his: "  <b>Bin</b>  ", pets: { dog: "x".repeat(40), cat: "no" }, notes: ["ok", "", 5], morning: [] , lạ: 1 });
    expect(c.his).toBe("bBin/b"); expect(c.pets?.dog).toHaveLength(16); expect(c.pets).not.toHaveProperty("cat");
    expect(c.notes).toEqual(["ok", "5"]); expect(c.morning).toBeUndefined(); expect(c).not.toHaveProperty("lạ");
  });

  it("dữ liệu hỏng thì bắt đầu lại", () => {
    expect(loadState("{không phải json").coins).toBe(fresh().coins);
  });

  it("ngày đang dở từ bản cũ không bị NaN ở mục tiêu", () => {
    S.daily = { day: S.daily.day, feat: NaN } as never;
    rollDay();
    expect(goals().map(g => g.cur)).toEqual([0, 0, 0]);
  });
});

describe("ca bán", () => {
  it("giao đúng bánh: thưởng xu, 3 sao, cộng mục tiêu", () => {
    const sh = createShift(), coins = S.coins;
    sh.seats[0] = customer();
    sh.build = { base: 0, cream: 0, top: 0, sweet: 0 };
    const r = serve(sh);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stars).toBe(3);
    expect(S.coins).toBe(coins + r.price + r.tip + r.bonus);
    expect(S.daily.served).toBe(1);
  });

  it("giao sai: báo đúng phần sai và không mất bánh", () => {
    const sh = createShift();
    sh.seats[0] = customer();
    sh.build = { base: 0, cream: 0, top: 0, sweet: 2 };
    const r = serve(sh);
    expect(r).toEqual({ ok: false, msg: "Sai độ ngọt rồi: Bé Na gọi Ít ngọt, không phải Ngọt lịm" });
    expect(sh.build.sweet).toBe(2);
  });

  it("bánh khớp khách khác thì giao cho khách đó", () => {
    const sh = createShift();
    sh.seats[0] = customer({ pat: 5 });
    sh.seats[1] = customer({ who: "Anh Tùng", sweet: 1 });
    sh.build = { base: 0, cream: 0, top: 0, sweet: 1 };
    const r = serve(sh);
    expect(r.ok && r.idx).toBe(1);
  });

  it("hai khách cùng món: ưu tiên khách chờ lâu hơn", () => {
    const sh = createShift();
    sh.seats[0] = customer({ pat: 30 });
    sh.seats[2] = customer({ pat: 8 });
    sh.build = { base: 0, cream: 0, top: 0, sweet: 0 };
    const r = serve(sh);
    expect(r.ok && r.idx).toBe(2);
  });

  it("hết kiên nhẫn thì khách bỏ về và tính là khách giận", () => {
    const sh = createShift();
    sh.next = 999; sh.seats[1] = customer({ pat: 0.05 });
    const ev = tick(sh, 0.1);
    expect(ev.left).toEqual([1]);
    expect(S.daily.angry).toBe(1);
    expect(goals()[2].cur).toBe(0);
  });

  it("Tự nhận đơn bật: rảnh tay thì được gán khách chờ lâu nhất", () => {
    const sh = createShift(); sh.next = 999;
    sh.seats[0] = customer({ pat: 30 }); sh.seats[1] = customer({ pat: 10 });
    expect(tick(sh, 0.1).assigned).toBe(1);
    expect(mineIdx(sh)).toBe(1);
  });

  it("Tự nhận đơn tắt: rảnh tay, chạm vào khách mới nhận đơn", () => {
    S.autoTake = false;
    const sh = createShift(); sh.next = 999;
    sh.seats[0] = customer();
    expect(tick(sh, 0.1).assigned).toBe(-1);
    expect(take(sh, 0)).toBe(true);
    expect(mineIdx(sh)).toBe(0);
    sh.seats[1] = customer({ by: "dog" });
    expect(take(sh, 1)).toBe(false);                         // đơn của bé thì không nhận được
  });

  it("không xem công thức mà giao đúng: thưởng +50% tiền bánh", () => {
    const sh = createShift();
    sh.seats[0] = customer(); take(sh, 0);
    sh.build = { base: 0, cream: 0, top: 0, sweet: 0 };
    const r = serve(sh);
    expect(r.ok && r.bonus).toBe(Math.round(RECIPES[0].price * 0.5));
    expect(mineIdx(sh)).toBe(-1);                            // giao xong thì rảnh tay
  });

  it("đã xem công thức hoặc giao sai thì mất thưởng", () => {
    const sh = createShift();
    sh.seats[0] = customer(); take(sh, 0); peek(sh);
    sh.build = { base: 0, cream: 0, top: 0, sweet: 0 };
    const r = serve(sh);
    expect(r.ok && r.bonus).toBe(0);
    const sh2 = createShift();
    sh2.seats[0] = customer(); take(sh2, 0);
    sh2.build = { base: 0, cream: 0, top: 0, sweet: 2 };
    expect(serve(sh2).ok).toBe(false);
    expect(sh2.peek).toBe(true);
  });

  it("đóng cửa sớm: khách đang chờ tính là bỏ về", () => {
    const sh = createShift();
    sh.seats[0] = customer(); sh.spawned = 1;
    closeEarly(sh);
    expect(sh.left).toBe(1);
    expect(S.daily.angry).toBe(1);
  });
});
