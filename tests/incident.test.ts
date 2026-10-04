import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INCIDENTS, MAX_GAP, MIN_GAP, RETRY, applyIncident, incidentCost, incidentLeft, resetIncidentClock, tickIncident } from "../src/engine/incident";
import { S, resetState } from "../src/engine/state";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 27, 10)); resetState(); resetIncidentClock(); S.shifts = 5; S.coins = 1000; });
afterEach(() => vi.useRealTimers());
const always = () => 0;          // rng luôn trúng xác suất
const never = () => 0.99;

describe("sự cố bất ngờ", () => {
  it("số xu bị trừ khoảng 1/10, ít nhất 10 và không vượt số xu có", () => {
    expect(incidentCost(1000, () => 0)).toBe(80);
    expect(incidentCost(1000, () => 0.999)).toBe(120);
    expect(incidentCost(100, () => 0.5)).toBe(10);
    expect(incidentCost(12, () => 0.5)).toBe(10);
    expect(incidentCost(5, () => 0.5)).toBe(5);
  });

  it("đồng hồ: lần xét đầu sau đúng 1 phút chơi, chưa tới giờ thì không có gì", () => {
    expect(tickIncident(0, () => 0)).toBeNull();
    expect(incidentLeft()).toBe(MIN_GAP);
    expect(tickIncident(MIN_GAP - 1, () => 0)).toBeNull();
    resetIncidentClock(); tickIncident(0, () => 0.9999); expect(incidentLeft()).toBe(MAX_GAP);
    expect(MAX_GAP).toBe(60);
  });

  it("tới giờ thì xảy ra giữa lúc chơi (không cần hết ca), rồi đặt lại đồng hồ", () => {
    tickIncident(0, always);
    const hit = tickIncident(MIN_GAP, always);
    expect(hit).not.toBeNull();
    expect(incidentLeft()).toBeGreaterThanOrEqual(MIN_GAP - 1);
  });

  it("không xảy ra với người mới hoặc ít xu: bỏ qua và xét lại sau ít phút", () => {
    S.shifts = 2; tickIncident(0, always); expect(tickIncident(MIN_GAP, always)).toBeNull(); expect(incidentLeft()).toBe(RETRY);
    S.shifts = 5; S.coins = 99; expect(tickIncident(RETRY, always)).toBeNull();
    S.coins = 1000; expect(tickIncident(RETRY, always)).not.toBeNull();
  });

  it("xác suất 50%: rng từ 0.5 trở lên thì tới giờ cũng không xảy ra", () => {
    tickIncident(0, never); expect(tickIncident(MAX_GAP, never)).toBeNull();
    resetIncidentClock(); tickIncident(0, () => 0.49); expect(tickIncident(MAX_GAP, () => 0.49)).not.toBeNull();
    resetIncidentClock(); tickIncident(0, () => 0.5); expect(tickIncident(MAX_GAP, () => 0.5)).toBeNull();
  });

  it("áp dụng: trừ xu, ghi vào sổ chi 'Sự cố bất ngờ'", () => {
    tickIncident(0, always); const hit = tickIncident(MIN_GAP, always)!, before = S.coins;
    applyIncident(hit);
    expect(S.coins).toBe(before - hit.cost);
    expect(S.book.out.incident).toBe(hit.cost);
    expect(S.book.log[0]).toMatchObject({ n: hit.inc.title, v: -hit.cost });
  });

  it("mỗi sự cố có đủ tiêu đề, nội dung, hình", () => {
    INCIDENTS.forEach(i => { expect(i.title && i.text && i.emoji && i.bg && i.pet).toBeTruthy(); });
    expect(new Set(INCIDENTS.map(i => i.id)).size).toBe(INCIDENTS.length);
  });
});
