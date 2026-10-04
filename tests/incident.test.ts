import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GAP, INCIDENTS, LEVELS, LOSE_CHANCE, RETRY, applyIncident, incidentCost, incidentLeft, resetIncidentClock, tickIncident, tossCoin } from "../src/engine/incident";
import { COMP_COINS, claimPassive, dayKey } from "../src/engine/passive";
import { S, resetState } from "../src/engine/state";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 27, 10)); resetState(); resetIncidentClock(); S.shifts = 5; S.coins = 1000; });
afterEach(() => vi.useRealTimers());

describe("đồng xu sự cố", () => {
  it("số xu bị trừ theo mức: thấp 3%, trung bình 6%, cao 8%", () => {
    expect(incidentCost(1000, "low")).toBe(30);
    expect(incidentCost(1000, "mid")).toBe(60);
    expect(incidentCost(1000, "high")).toBe(80);
    expect(incidentCost(10, "low")).toBe(1);               // ít nhất 1
    expect(incidentCost(0, "high")).toBe(0);               // không vượt số xu có
    expect(LEVELS.high.pct).toBeGreaterThan(LEVELS.mid.pct); expect(LEVELS.mid.pct).toBeGreaterThan(LEVELS.low.pct);
  });

  it("đồng hồ: sau đúng 1 phút chơi mới hiện đồng xu, rồi đếm lại", () => {
    expect(tickIncident(0)).toBe(false); expect(incidentLeft()).toBe(GAP); expect(GAP).toBe(60);
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
    const hi = tossCoin(seq(0.1, 0.99, 0.0))!; expect(hi.level).toBe("high"); expect(hi.cost).toBe(80);
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
  it("lần đầu: thưởng đăng nhập 10% xu (tính trước khi cộng đền bù) và đền bù 3000 xu", () => {
    S.coins = 1000; S.shifts = 5;
    const c = claimPassive();
    expect(c).toEqual({ daily: 100, comp: COMP_COINS });
    expect(S.coins).toBe(1000 + 100 + 3000);
    expect(S.loginDay).toBe(dayKey()); expect(S.comp).toBe(1);
    expect(S.book.in.daily).toBe(100); expect(S.book.in.comp).toBe(3000);
  });

  it("đền bù chỉ một lần; thưởng ngày chỉ một lần mỗi ngày, qua ngày mới nhận lại", () => {
    claimPassive();
    const coins = S.coins;
    expect(claimPassive()).toEqual({ daily: 0, comp: 0 }); expect(S.coins).toBe(coins);
    vi.setSystemTime(new Date(2026, 8, 28, 9));
    const c = claimPassive(); expect(c.comp).toBe(0); expect(c.daily).toBe(Math.floor(coins * 0.1)); expect(S.coins).toBe(coins + c.daily);
  });

  it("người chơi mới (chưa chơi ca nào) không nhận đền bù nhưng vẫn được đánh dấu để không nhận lẻ sau này", () => {
    S.shifts = 0; S.coins = 40;
    const c = claimPassive(); expect(c.comp).toBe(0); expect(c.daily).toBe(4); expect(S.comp).toBe(1);
  });
});
