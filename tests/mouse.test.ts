import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rollDay } from "../src/engine/progress";
import { createShift, tick } from "../src/engine/shift";
import { FINE_MAX, FINE_MIN, catchMouse, mouseFine, mousePay, mouseRank, payMouse, planMouse, tickMouse } from "../src/engine/mouse";
import { S, resetState } from "../src/engine/state";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 27, 10)); resetState(); rollDay(); });
afterEach(() => vi.useRealTimers());

const withMouse = () => { const sh = createShift(); sh.mouse = { age: 0, warned: false, fainted: null }; sh.mouseDone = true; return sh; };
const close = () => { /* closeEarly giả */ };

describe("chuột vào tiệm", () => {
  it("kế hoạch: ca đầu và hai ca liền không có chuột; còn lại theo tỉ lệ 35%", () => {
    S.shifts = 0; expect(planMouse(20, () => 0)).toBe(-1);                  // ca đầu tiên
    S.shifts = 5; S.mouse = { king: 0, last: 4 }; expect(planMouse(20, () => 0)).toBe(-1);   // ca liền sau ca có chuột
    S.mouse = { king: 0, last: 1 };
    expect(planMouse(20, () => 0.9)).toBe(-1);                              // trượt tỉ lệ
    expect(planMouse(20, () => 0.1)).toBeGreaterThanOrEqual(2);              // trúng, không sớm hơn khách thứ 2
  });

  it("tiền phạt 8% số xu, thấp nhất 100, cao nhất 1.000, không quá số xu đang có", () => {
    S.coins = 5000; expect(mouseFine()).toBe(400);
    S.coins = 600; expect(mouseFine()).toBe(100); S.coins = 40; expect(mouseFine()).toBe(40);
    S.coins = 99999; expect(mouseFine()).toBe(FINE_MAX); expect(FINE_MIN).toBe(100);
    S.coins = 5000; expect(mousePay()).toBe(160);                           // 40% tiền phạt
  });

  it("bắt kịp trong 10 giây: thưởng và tăng hạng; sau 10 giây bắt được thì không thưởng", () => {
    S.coins = 1000; const sh = withMouse(); sh.mouse!.age = 4;
    const a = catchMouse(sh)!; expect(a.kind).toBe("perfect"); expect(a.rankUp).toBe(true); expect(a.rank).toBe("F"); expect(S.coins).toBe(1030); expect(sh.mouse).toBeNull();
    const sh2 = withMouse(); sh2.mouse!.age = 20; const b = catchMouse(sh2)!; expect(b.kind).toBe("ok"); expect(S.coins).toBe(1030); expect(mouseRank().king).toBe(1);
    S.mouse!.king = 3; expect(mouseRank().name).toBe("E");
  });

  it("giây 30: mèo đi làm bị ngất; không có mèo thì khách sốt ruột nhanh hơn", () => {
    const sh = withMouse(); sh.working = ["dog", "gold"]; tickMouse(sh, 30, close);
    expect(sh.fainted).toEqual(["gold"]);
    const sh2 = withMouse(); sh2.working = ["dog"]; tickMouse(sh2, 30, close);
    expect(sh2.fainted).toEqual([]); expect(sh2.patMul).toBe(1.3);
  });

  it("giây 45 cảnh báo một lần; giây 60 bị đóng ca và phạt xu", () => {
    S.coins = 2000; const sh = withMouse(); sh.working = ["dog"];
    const w = tickMouse(sh, 45, close); expect(w.warn).toBe(true); expect(tickMouse(sh, 1, close).warn).toBeUndefined();
    let closed = 0; const out = tickMouse(sh, 15, () => { closed++; });
    expect(out.shutdown).toBe(true); expect(closed).toBe(1); expect(sh.shutdown).toBe(true); expect(sh.mouseFine).toBe(160); expect(S.coins).toBe(1840);
  });

  it("xử lý nhanh từ giây 10 tốn 40% tiền phạt và làm chuột biến mất", () => {
    S.coins = 2000; const sh = withMouse(); sh.mouse!.age = 5; expect(payMouse(sh)).toBeNull();
    sh.mouse!.age = 12; expect(payMouse(sh)).toBe(64); expect(S.coins).toBe(1936); expect(sh.mouse).toBeNull();
  });

  it("tick của ca: chuột xuất hiện khi đủ số khách theo kế hoạch", () => {
    const sh = createShift(); sh.mousePlan = 1; sh.spawned = 0;
    expect(tick(sh, 0.1).mouse.appeared).toBeUndefined();
    sh.spawned = 1; expect(tick(sh, 0.1).mouse.appeared).toBe(true); expect(sh.mouse).not.toBeNull();
    expect(tick(sh, 0.1).mouse.appeared).toBeUndefined();                   // không xuất hiện lại
  });
});
