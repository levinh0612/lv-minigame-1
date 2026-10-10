import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rollDay } from "../src/engine/progress";
import { GOAL_TICKETS_PER_DAY, createShift, finishShift, goalTicketsLeft } from "../src/engine/shift";
import { S, resetState } from "../src/engine/state";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 27, 10)); resetState(); rollDay(); });
afterEach(() => vi.useRealTimers());

/** ca đạt đủ mục tiêu (phục vụ đủ khách, nhớ 3 công thức, không ai giận) */
const perfectShift = () => {
  const sh = createShift();
  Object.assign(sh, { served: sh.goals[0].n, memo: 3, left: 0 });
  return sh;
};

describe("vé triệu hồi từ mục tiêu ca: giới hạn theo ngày", () => {
  it("đạt hết mục tiêu thì được vé, cho tới khi hết hạn mức trong ngày", () => {
    const before = S.gacha.tickets;
    for (let i = 0; i < GOAL_TICKETS_PER_DAY; i++) {
      const sh = perfectShift();
      finishShift(sh);
      expect(sh.ticket).toBe(true);
      expect(sh.ticketCapped).toBe(false);
    }
    expect(S.gacha.tickets).toBe(before + GOAL_TICKETS_PER_DAY);
    expect(goalTicketsLeft()).toBe(0);
  });

  it("quá hạn mức: ca tiếp theo không có vé, đánh dấu ticketCapped, xu thưởng vẫn được", () => {
    for (let i = 0; i < GOAL_TICKETS_PER_DAY; i++) finishShift(perfectShift());
    const tickets = S.gacha.tickets, coins = S.coins;
    const sh = perfectShift();
    finishShift(sh);
    expect(sh.ticket).toBe(false);
    expect(sh.ticketCapped).toBe(true);
    expect(S.gacha.tickets).toBe(tickets);
    expect(S.coins).toBe(coins + 120);
  });

  it("sang ngày mới thì hạn mức được làm mới", () => {
    for (let i = 0; i < GOAL_TICKETS_PER_DAY; i++) finishShift(perfectShift());
    expect(goalTicketsLeft()).toBe(0);
    vi.setSystemTime(new Date(2026, 8, 28, 10));
    rollDay();
    expect(goalTicketsLeft()).toBe(GOAL_TICKETS_PER_DAY);
  });

  it("không đạt đủ mục tiêu thì không có vé và không bị tính là chạm trần", () => {
    const sh = createShift();
    Object.assign(sh, { served: 0, memo: 0, left: 1 });
    finishShift(sh);
    expect(sh.ticket).toBe(false);
    expect(sh.ticketCapped).toBe(false);
    expect(goalTicketsLeft()).toBe(GOAL_TICKETS_PER_DAY);
  });

  it("người chơi cũ chưa có goalTickets trong save vẫn chạy được", () => {
    delete S.daily.goalTickets;
    expect(goalTicketsLeft()).toBe(GOAL_TICKETS_PER_DAY);
  });
});
