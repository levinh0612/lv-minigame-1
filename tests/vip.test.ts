import { beforeEach, describe, expect, it } from "vitest";
import { VIPS, planVip, vipBonus, vipRecipe } from "../src/engine/vip";
import { RECIPES } from "../src/content/game";
import { S, resetState } from "../src/engine/state";

beforeEach(() => { resetState(); S.shifts = 5; });

describe("khách đặc biệt", () => {
  it("người mới, ca quá ngắn hoặc xui thì không có VIP", () => {
    S.shifts = 1; expect(planVip(10, () => 0)).toBeNull();
    S.shifts = 5; expect(planVip(4, () => 0)).toBeNull();
    expect(planVip(10, () => 0.9)).toBeNull();
  });
  it("VIP ghé trong khoảng khách thứ 1 tới áp chót, không bao giờ là khách cuối", () => {
    for (let t = 5; t < 30; t++) for (const r of [0, 0.3, 0.99]) {
      const p = planVip(t, () => r === 0.99 ? 0.69 : r)!; expect(p.at).toBeGreaterThanOrEqual(1); expect(p.at).toBeLessThanOrEqual(t - 2);
    }
  });
  it("chọn đủ cả ba loại", () => {
    expect(new Set([0, 0.4, 0.7].map(k => planVip(8, (() => { let n = 0; return () => [0.1, 0.2, k][n++ % 3]!; })())!.kind)).size).toBe(3);
  });
  it("phê bình gọi món mới nhất, đại gia gọi món đắt nhất, bé sinh nhật gọi món thường", () => {
    const rs = RECIPES.slice(0, 6);
    expect(vipRecipe("critic", rs)!.lv).toBe(Math.max(...rs.map(r => r.lv)));
    expect(vipRecipe("tycoon", rs)!.price).toBe(Math.max(...rs.map(r => r.price)));
    expect(vipRecipe("kid", rs)).toBeNull(); expect(vipRecipe("critic", [])).toBeNull();
  });
  it("thưởng chỉ khi giao đủ sao", () => {
    expect(vipBonus("critic", 3, 100)).toBe(100); expect(vipBonus("critic", 2, 100)).toBe(0);
    expect(vipBonus("kid", 2, 100)).toBe(60); expect(vipBonus("kid", 1, 100)).toBe(0);
    expect(vipBonus("tycoon", 3, 100)).toBe(0);
    expect(VIPS.critic.pat).toBeLessThan(1);
  });
});
