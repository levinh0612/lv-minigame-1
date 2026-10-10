import { describe, expect, it } from "vitest";
import { genRows, giftParams, giftResult, judge, pickService, serviceQuota, shipParams, shipResult, sweepPos, tierOf, toNextTier, zoneRange } from "../src/engine/minigame";

const seq = (v: number[]) => { let i = 0; return () => v[i++ % v.length]!; };
const lcg = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

describe("tỉ lệ khách có yêu cầu", () => {
  it("khoảng 25%, tối thiểu 1, tối đa 1/3", () => {
    expect(serviceQuota(0)).toBe(0);
    expect(serviceQuota(2)).toBe(1);
    expect(serviceQuota(4)).toBe(1);
    expect(serviceQuota(12)).toBe(3);
    expect(serviceQuota(20)).toBe(5);
    for (let n = 1; n <= 60; n++) { const q = serviceQuota(n); expect(q).toBeGreaterThanOrEqual(1); expect(q).toBeLessThanOrEqual(Math.max(1, Math.floor(n / 3))); }
  });
  it("loại yêu cầu 40/40/20", () => {
    expect(pickService(seq([0.1]))).toBe("gift"); expect(pickService(seq([0.5]))).toBe("ship"); expect(pickService(seq([0.9]))).toBe("both");
  });
});
describe("bậc danh hiệu", () => {
  it("lên bậc theo số lần", () => {
    expect(tierOf(0)).toBe(0); expect(tierOf(5)).toBe(1); expect(tierOf(199)).toBe(5); expect(tierOf(200)).toBe(6); expect(tierOf(9999)).toBe(6);
    expect(toNextTier(3)).toBe(2); expect(toNextTier(200)).toBeNull();
  });
});
describe("gói quà", () => {
  it("con trỏ chạy đi rồi chạy về", () => {
    expect(sweepPos(0, 1)).toBe(0); expect(sweepPos(0.5, 1)).toBeCloseTo(0.5); expect(sweepPos(1, 1)).toBeCloseTo(1); expect(sweepPos(1.5, 1)).toBeCloseTo(0.5); expect(sweepPos(2, 1)).toBeCloseTo(0);
  });
  it("vùng xanh luôn nằm trong thanh", () => {
    const [a, b] = zoneRange(14, 4, 0.99); expect(b).toBeCloseTo(1); expect(b - a).toBeCloseTo(4 / 14);
    expect(zoneRange(14, 2, 0)[0]).toBe(0);
  });
  it("chấm điểm bấm", () => {
    const z: [number, number] = [0.4, 0.6];
    expect(judge(0.5, z)).toBe("perfect"); expect(judge(0.43, z)).toBe("good"); expect(judge(0.7, z)).toBe("miss");
  });
  it("càng lên bậc càng khó", () => {
    expect(giftParams(6).zone1).toBeLessThan(giftParams(0).zone1); expect(giftParams(6).sweep).toBeGreaterThan(giftParams(0).sweep); expect(giftParams(6).pickMs).toBeLessThan(giftParams(0).pickMs);
  });
  it("thưởng 15 đến 30% giá bánh, một lỗi giảm nửa, hai lỗi hỏng", () => {
    expect(giftResult(100, ["good", "good", "good"], 0).fee).toBe(15);
    expect(giftResult(100, ["perfect", "perfect", "perfect"], 0).fee).toBe(30);
    expect(giftResult(100, ["perfect", "miss", "good"], 0)).toMatchObject({ ok: true, fee: 10, grade: "B" });
    expect(giftResult(100, ["miss", "miss", "perfect"], 0)).toMatchObject({ ok: false, fee: 0, grade: "fail" });
    expect(giftResult(100, ["perfect", "perfect", "perfect"], 6).fee).toBe(37);
  });
});
describe("giao hàng", () => {
  it("chạy 6 đến 10 giây theo quãng đường", () => {
    expect(shipParams(0, 0.5).dur).toBe(6); expect(shipParams(0, 3).dur).toBeCloseTo(9.8); expect(shipParams(0, 9).dur).toBe(10);
  });
  it("hàng chướng ngại luôn chừa làn trống, làn trống cách hàng trước tối đa 1 làn", () => {
    for (let tier = 0; tier < 7; tier++) for (let s = 1; s <= 20; s++) {
      const rows = genRows(shipParams(tier, 2), lcg(s * 7 + tier)); let reach = new Set([1]);
      expect(rows.length).toBeGreaterThan(3);
      for (const r of rows) {
        const free = [0, 1, 2].filter(l => !r.blocked.includes(l));
        expect(free.length).toBeGreaterThanOrEqual(1);
        reach = new Set(free.filter(l => [...reach].some(x => Math.abs(x - l) <= 1)));
        expect(reach.size).toBeGreaterThan(0);
      }
    }
  });
  it("không bao giờ hai hàng liền chặn 2 làn, bậc D không chặn 2 làn", () => {
    for (let s = 1; s <= 30; s++) {
      const rows = genRows(shipParams(6, 2.5), lcg(s)); rows.forEach((r, i) => { if (i) expect(r.blocked.length === 2 && rows[i - 1]!.blocked.length === 2).toBe(false); });
      genRows(shipParams(0, 2.5), lcg(s)).forEach(r => expect(r.blocked).toHaveLength(1));
    }
  });
  it("phí ship tăng theo quãng đường, va chạm giảm phí, 3 va là hỏng", () => {
    expect(shipResult(100, 1, 0, 0).fee).toBe(27); expect(shipResult(100, 3, 0, 0).fee).toBe(41);
    expect(shipResult(100, 1, 1, 0).fee).toBe(19); expect(shipResult(100, 1, 2, 0).fee).toBe(11);
    expect(shipResult(100, 1, 3, 0)).toMatchObject({ ok: false, fee: 0, grade: "fail" });
  });
});

import { applyService, planService } from "../src/engine/shift";
import { S } from "../src/engine/state";
describe("khách xin dịch vụ trong ca", () => {
  it("planService: 25%, ít nhất 1, không trùng, nằm trong số khách", () => {
    for (const n of [1, 3, 8, 12, 20]) {
      const p = planService(n);
      expect(p.length).toBe(serviceQuota(n)); expect(new Set(p).size).toBe(p.length);
      expect(p.every(i => i >= 0 && i < n)).toBe(true);
    }
    expect(planService(0)).toEqual([]);
  });
  it("applyService: thành công cộng xu, thất bại tính khách giận", () => {
    const sh = { svcFee: 0, svcDone: 0, svcFail: 0, combo: 0, comboBank: 0, comboLost: 0 } as never as Parameters<typeof applyService>[0];
    const c0 = S.coins, a0 = S.daily.angry;
    applyService(sh, 10, true); expect(S.coins).toBe(c0 + 10); expect(sh.svcFee).toBe(10);
    applyService(sh, 0, false); expect(S.daily.angry).toBe(a0 + 1); expect(sh.svcFail).toBe(1);
  });
});

import { SKILL_SHIFTS, advanceSkills, knows, staffService, teach } from "../src/engine/skills";
describe("kỹ năng nhân viên", () => {
  it("chỉ dạy được khi chủ tiệm SSS; học đủ ca thì thạo; chưa thạo thì không tự làm", () => {
    S.staff["x"] = { hired: true, lv: 1, onDuty: true }; S.coins = 5000; S.mg = { gift: 0, ship: 0 };
    expect(teach("x", "gift")).toBe(false);
    S.mg.gift = 200; expect(teach("x", "gift")).toBe(true); expect(teach("x", "gift")).toBe(false);
    expect(staffService("x", "gift", 100, 1)).toBeNull();
    for (let i = 0; i < SKILL_SHIFTS; i++) advanceSkills(["x"]);
    expect(knows("x", "gift")).toBe(true);
    expect(staffService("x", "both", 100, 1)).toBeNull();            // chưa biết giao hàng
    const r = staffService("x", "gift", 100, 1, () => 0)!; expect(r.ok && r.fee > 0).toBe(true);
    expect(staffService("x", "gift", 100, 1, () => 0.99)!.ok).toBe(false);
  });
});
