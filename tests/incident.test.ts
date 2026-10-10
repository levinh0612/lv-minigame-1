import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GAP, INCIDENTS, LEVELS, LOSE_CHANCE, RETRY, applyIncident, incidentCost, incidentLeft, resetIncidentClock, shiftRevenue, tickIncident, tossCoin } from "../src/engine/incident";
import { COMP_COINS, DAILY_MAX, claimPassive, dailyReward, dayKey } from "../src/engine/passive";
import { S, resetState } from "../src/engine/state";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 27, 10)); resetState(); resetIncidentClock(); S.shifts = 5; S.coins = 1000; });
afterEach(() => vi.useRealTimers());

describe("đồng xu sự cố", () => {
  it("khoản trừ cố định theo cấp và mức, không phụ thuộc số xu đang có", () => {
    expect(incidentCost(1e9, "low", 10)).toBe(100);        // 10% doanh thu ca Lv 10 (1.000)
    expect(incidentCost(1e9, "mid", 10)).toBe(200);
    expect(incidentCost(1e9, "high", 10)).toBe(300);
    expect(incidentCost(1e6, "high", 60)).toBe(incidentCost(1e9, "high", 60));    // giàu hơn cũng không bị trừ nhiều hơn
    expect(incidentCost(1e9, "high", 60)).toBeLessThan(shiftRevenue(60));         // luôn nhỏ hơn doanh thu một ca
    expect(LEVELS.high.mult).toBeGreaterThan(LEVELS.mid.mult); expect(LEVELS.mid.mult).toBeGreaterThan(LEVELS.low.mult);
  });

  it("người ít xu: không quá 25% số xu đang có, ít nhất 1, không vượt số xu có", () => {
    expect(incidentCost(400, "high", 60)).toBe(100);
    expect(incidentCost(2, "low", 60)).toBe(1);
    expect(incidentCost(0, "high", 60)).toBe(0);
  });

  it("chơi lâu không bị âm dần: kỳ vọng mất mỗi 3 phút nhỏ hơn 10% doanh thu một ca ở mọi cấp", () => {
    for (const lv of [5, 10, 30, 60, 100]) {
      const exp = LOSE_CHANCE * (["low", "mid", "high"] as const).reduce((a, l) => a + incidentCost(1e9, l, lv), 0) / 3;
      expect(exp).toBeLessThan(shiftRevenue(lv) * 0.1);
    }
  });

  it("đang bận (trong ca / màn Kết quả): tới giờ vẫn chờ, hết bận mới hiện", () => {
    tickIncident(0); expect(tickIncident(GAP, true)).toBe(false);
    expect(incidentLeft()).toBe(0);
    expect(tickIncident(1, true)).toBe(false);
    expect(tickIncident(1, false)).toBe(true);
    expect(incidentLeft()).toBe(GAP);
  });

  it("đồng hồ: sau đúng 3 phút chơi mới hiện đồng xu, rồi đếm lại", () => {
    expect(tickIncident(0)).toBe(false); expect(incidentLeft()).toBe(GAP); expect(GAP).toBe(180);
    expect(tickIncident(GAP - 1)).toBe(false);
    expect(tickIncident(1)).toBe(true);
    expect(incidentLeft()).toBe(GAP);
  });

  it("không hiện với người mới hoặc ít xu: bỏ qua và xét lại sau ít phút", () => {
    S.shifts = 2; tickIncident(0); expect(tickIncident(GAP)).toBe(false); expect(incidentLeft()).toBe(RETRY);
    S.shifts = 5; S.coins = 99; expect(tickIncident(RETRY)).toBe(false);
    S.coins = 1000; expect(tickIncident(RETRY)).toBe(true);
  });

  it("tung đồng xu: 70% bình an, 30% gặp sự cố", () => {
    expect(LOSE_CHANCE).toBe(0.3);
    expect(tossCoin(() => 0.3)).toBeNull();                 // đúng ngưỡng 30%: bình an
    expect(tossCoin(() => 0.99)).toBeNull();
    expect(tossCoin(() => 0.29)).not.toBeNull();
    expect(tossCoin(() => 0)).not.toBeNull();
  });

  it("ba mức gặp đều nhau theo rng, tiền theo mức", () => {
    const seq = (a: number, b: number, c: number) => { const v = [a, b, c]; let i = 0; return () => v[i++ % 3]!; };
    expect(tossCoin(seq(0.1, 0.0, 0.0))!.level).toBe("low");
    expect(tossCoin(seq(0.1, 0.5, 0.0))!.level).toBe("mid");
    const hi = tossCoin(seq(0.1, 0.99, 0.0))!; expect(hi.level).toBe("high"); expect(hi.cost).toBe(incidentCost(S.coins, "high"));
  });

  it("áp dụng: trừ xu, ghi vào sổ chi 'Sự cố bất ngờ' kèm mức", () => {
    const hit = tossCoin(() => 0)!, before = S.coins;
    applyIncident(hit);
    expect(S.coins).toBe(before - hit.cost);
    expect(S.book.out.incident).toBe(hit.cost);
    expect(S.book.log[0]!.n).toContain(hit.inc.title); expect(S.book.log[0]!.v).toBe(-hit.cost);
  });

  it("mỗi sự cố có đủ tiêu đề, nội dung, hình", () => {
    INCIDENTS.forEach(i => { expect(i.title && i.text && i.emoji && i.bg && i.pet).toBeTruthy(); });
    expect(new Set(INCIDENTS.map(i => i.id)).size).toBe(INCIDENTS.length);
  });
});

describe("khoản cộng thụ động", () => {
  it("lần đầu: thưởng đăng nhập theo cấp và đền bù 3000 xu", () => {
    S.coins = 1000; S.shifts = 5;
    const c = claimPassive();
    const d = dailyReward();
    expect(c).toEqual({ daily: d, comp: COMP_COINS });
    expect(S.coins).toBe(1000 + d + 3000);
    expect(S.loginDay).toBe(dayKey()); expect(S.comp).toBe(1);
    expect(S.book.in.daily).toBe(d); expect(S.book.in.comp).toBe(3000);
  });

  it("đền bù chỉ một lần; thưởng ngày chỉ một lần mỗi ngày, qua ngày mới nhận lại", () => {
    claimPassive();
    const coins = S.coins;
    expect(claimPassive()).toEqual({ daily: 0, comp: 0 }); expect(S.coins).toBe(coins);
    vi.setSystemTime(new Date(2026, 8, 28, 9));
    const c = claimPassive(); expect(c.comp).toBe(0); expect(c.daily).toBe(dailyReward()); expect(S.coins).toBe(coins + c.daily);
  });

  it("thưởng đăng nhập tăng theo cấp (tối đa 1.500) và theo chuỗi ngày (tối đa +70%), không phụ thuộc số xu đang có", () => {
    expect(dailyReward(1, 1)).toBe(125); expect(dailyReward(10, 1)).toBe(350);
    expect(dailyReward(10, 4)).toBe(Math.round(350 * 1.3)); expect(dailyReward(10, 99)).toBe(Math.round(350 * 1.7));
    expect(dailyReward(99, 1)).toBe(DAILY_MAX); expect(DAILY_MAX).toBe(1500);
    S.coins = 5; S.comp = 1; S.streak = 1; expect(claimPassive().daily).toBe(dailyReward());
    S.coins = 900000; vi.setSystemTime(new Date(2026, 8, 28, 9)); expect(claimPassive().daily).toBe(dailyReward());
  });

  it("người chơi mới (chưa chơi ca nào) không nhận đền bù nhưng vẫn được đánh dấu để không nhận lẻ sau này", () => {
    S.shifts = 0; S.coins = 40;
    const c = claimPassive(); expect(c.comp).toBe(0); expect(c.daily).toBe(dailyReward()); expect(S.comp).toBe(1);
  });
});
