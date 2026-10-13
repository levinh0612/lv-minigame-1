import { beforeEach, describe, expect, it } from "vitest";
import { SHOP } from "../src/content/game";
import { buyTables, buyUps, capacity, fameLevel, maxTables, maxUps, needUpgrade, planToNext, quoteTables, runPlan, spots, tableLvs, tablesAt } from "../src/engine/economy";
import { S, resetState } from "../src/engine/state";

beforeEach(() => { resetState(); S.coins = 100000; S.venue.floors = 4; tableLvs(); });

describe("mua nhiều bàn", () => {
  it("giá = giá bàn tăng dần + giá nâng lên cấp chọn", () => {
    const have = tableLvs().length;
    expect(quoteTables(2, 1)).toBe(SHOP.tableCost(have + 1) + SHOP.tableCost(have + 2));
    expect(quoteTables(1, 3)).toBe(SHOP.tableCost(have + 1) + SHOP.upCost(1) + SHOP.upCost(2));
  });
  it("mua 3 bàn cấp 2: trừ đúng xu, thêm đúng ghế, bàn cấp cao đứng trước", () => {
    const c0 = S.coins, cap0 = capacity(), cost = quoteTables(3, 2);
    expect(buyTables(3, 2)).toBe(true);
    expect(c0 - S.coins).toBe(cost);
    expect(capacity() - cap0).toBe(3 * SHOP.seatsOf(2));
    expect(tablesAt(2)).toBe(3);
    expect([...tableLvs()]).toEqual([...tableLvs()].sort((a, b) => b - a));
  });
  it("không mua quá chỗ đặt hay quá xu", () => {
    const free = spots() - tableLvs().length;
    expect(buyTables(free + 1, 1)).toBe(false);
    S.coins = 0; expect(maxTables(1)).toBe(0); expect(buyTables(1, 1)).toBe(false);
  });
});

describe("nâng nhiều bàn", () => {
  it("nâng n bàn cấp 1 lên cấp 2", () => {
    buyTables(4, 1);
    const n1 = tablesAt(1), c0 = S.coins;
    expect(buyUps(3, 1)).toBe(false);
    expect(buyUps(1, 3)).toBe(true);
    expect(c0 - S.coins).toBe(3 * SHOP.upCost(1));
    expect(tablesAt(1)).toBe(n1 - 3); expect(tablesAt(2)).toBe(3);
  });
  it("maxUps bị giới hạn bởi xu và số bàn", () => {
    S.coins = SHOP.upCost(1) * 2 + 1; expect(maxUps(1)).toBe(2);
  });
});

describe("lộ trình lên bậc", () => {
  it("làm theo lộ trình thì lên đúng bậc danh tiếng kế và không thiếu ghế", () => {
    S.coins = 10 ** 7;
    const lv0 = fameLevel(), plan = planToNext()!;
    expect(plan.cost).toBeGreaterThan(0);
    const c0 = S.coins;
    expect(runPlan(plan.steps)).toBe(true);
    expect(c0 - S.coins).toBe(plan.cost);
    expect(fameLevel()).toBe(lv0 + 1);
    expect(needUpgrade()).toBe(false);
  });
});
