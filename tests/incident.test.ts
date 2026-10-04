import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INCIDENTS, applyIncident, incidentCost, rollIncident } from "../src/engine/incident";
import { S, resetState } from "../src/engine/state";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 27, 10)); resetState(); S.shifts = 5; S.coins = 1000; });
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

  it("không xảy ra với người mới, ít xu, hoặc ngay sau một sự cố", () => {
    S.shifts = 2; expect(rollIncident(always)).toBeNull();
    S.shifts = 5; S.coins = 99; expect(rollIncident(always)).toBeNull();
    S.coins = 1000; S.incAt = 4; expect(rollIncident(always)).toBeNull();
    S.incAt = 3; expect(rollIncident(always)).not.toBeNull();
  });

  it("xác suất 30%: rng cao thì không xảy ra", () => {
    expect(rollIncident(never)).toBeNull();
    expect(rollIncident(always)).not.toBeNull();
  });

  it("áp dụng: trừ xu, ghi vào sổ chi 'Sự cố bất ngờ' và nhớ ca gần nhất", () => {
    const hit = rollIncident(always)!, before = S.coins;
    applyIncident(hit);
    expect(S.coins).toBe(before - hit.cost);
    expect(S.book.out.incident).toBe(hit.cost);
    expect(S.book.log[0]).toMatchObject({ n: hit.inc.title, v: -hit.cost });
    expect(S.incAt).toBe(5);
    expect(rollIncident(always)).toBeNull();           // vừa gặp nên cách vài ca
  });

  it("mỗi sự cố có đủ tiêu đề, nội dung, hình", () => {
    INCIDENTS.forEach(i => { expect(i.title && i.text && i.emoji && i.bg && i.pet).toBeTruthy(); });
    expect(new Set(INCIDENTS.map(i => i.id)).size).toBe(INCIDENTS.length);
  });
});
