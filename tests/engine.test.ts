import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPES } from "../src/content/game";
import { coinMult, daysTogether, events, todayEvents } from "../src/engine/dates";
import { goals, rollDay } from "../src/engine/progress";
import { closeEarly, createShift, serve, tick, type Customer } from "../src/engine/shift";
import { S, fresh, loadState, resetState } from "../src/engine/state";

const at = (y: number, m: number, d: number) => vi.setSystemTime(new Date(y, m - 1, d, 10, 0, 0));
const customer = (over: Partial<Customer> = {}): Customer => ({
  who: "Bé Na", look: { kind: "cat", fur: "#FFFFFF" }, r: RECIPES[0], sweet: 0, max: 40, pat: 40, ...over
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
    expect(s.v).toBe(3);
    expect(s.refund).toBe(410);
    expect(s.coins).toBe(100 + 60 + 350);
    expect(s.decor).toEqual([]);
    expect(s.names.pets).toEqual({ dog: "Milo", gold: "Siro", white: "Cacao" });
  });

  it("bản 2.0 lỗi: đồ cũ sót lại được hoàn xu, đồ trùng tên giữ lại, đánh giá hình cũ bỏ đi", () => {
    const s = loadState(JSON.stringify({ v: 2, coins: 10, decor: ["plant", "lights", "ribbon"], reviews: [
      { who: "Mèo mướp", look: { kind: "goldcat", fur: "#fff" }, s: 5, txt: "", love: false },
      { who: "Bé Na", look: { gender: "girl" }, s: 3, txt: "", love: false }] }));
    expect(s.coins).toBe(10 + 120 + 900);
    expect(s.decor).toEqual(["plant"]);
    expect(s.reviews.map(r => r.who)).toEqual(["Bé Na"]);
  });

  it("người chơi mới không bị hoàn xu", () => {
    const s = loadState(null);
    expect(s.v).toBe(3);
    expect(s.refund).toBeUndefined();
  });

  it("giữ tên thú cưng người chơi tự đặt", () => {
    const s = loadState(JSON.stringify({ v: 2, names: { pets: { dog: "Bơ" } } }));
    expect(s.names.pets.dog).toBe("Bơ");
    expect(s.names.pets.gold).toBe("Siro");
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
    expect(S.coins).toBe(coins + r.price + r.tip);
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

  it("đóng cửa sớm: khách đang chờ tính là bỏ về", () => {
    const sh = createShift();
    sh.seats[0] = customer(); sh.spawned = 1;
    closeEarly(sh);
    expect(sh.left).toBe(1);
    expect(S.daily.angry).toBe(1);
  });
});
