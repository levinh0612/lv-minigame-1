import { describe, expect, it } from "vitest";
import * as api from "../api/limits";
import { clampProgress, earnRate, lockMinutes, MAX_IDLE_SEC, MAX_LV_STEP } from "../api/limits";
import { CRAFT_AT } from "../src/content/progression";
import * as client from "../src/engine/visit";

describe("clampProgress (chống gian lận bảng xếp hạng)", () => {
  const old = { earned: 1000, lv: 10 };
  it("số tăng bất thường bị chặn theo thời gian", () => {
    const r = clampProgress(old, { earned: 1e9, lv: 10 }, 60);
    expect(r.gain).toBe(60 * earnRate(10));
    expect(r.earned).toBe(1000 + 60 * earnRate(10));
  });
  it("gửi liên tục không tăng thêm: lần gửi ngay sau đó (0 giây) không được cộng", () => {
    expect(clampProgress(old, { earned: 1e9, lv: 10 }, 0).gain).toBe(0);
  });
  it("số thật nhỏ hơn mức chặn thì giữ nguyên", () => {
    expect(clampProgress(old, { earned: 1500, lv: 10 }, 600).earned).toBe(1500);
  });
  it("không bao giờ giảm earned/lv", () => {
    const r = clampProgress(old, { earned: 5, lv: 2 }, 600);
    expect(r.earned).toBe(1000); expect(r.lv).toBe(10);
  });
  it("lv tăng tối đa MAX_LV_STEP mỗi lần và không quá 100", () => {
    expect(clampProgress(old, { earned: 1000, lv: 99 }, 60).lv).toBe(10 + MAX_LV_STEP);
    expect(clampProgress({ earned: 0, lv: 99 }, { earned: 0, lv: 100 }, 60).lv).toBe(100);
  });
  it("bỏ máy rất lâu: thời gian dồn có trần 24 giờ", () => {
    expect(clampProgress(old, { earned: 1e12, lv: 10 }, 99 * MAX_IDLE_SEC).gain).toBe(MAX_IDLE_SEC * earnRate(10));
  });
});

describe("lockMinutes", () => {
  it("leo thang 15p → 1h → 4h → 16h → trần 24h", () => {
    expect([0, 1, 2, 3, 4, 9].map(lockMinutes)).toEqual([15, 60, 240, 960, 1440, 1440]);
  });
});

describe("server khớp client", () => {
  it("luật phí ghé thăm", () => {
    expect([api.FEE_PCT, api.FEE_MIN, api.FEE_MAX, api.GIFT_PCT]).toEqual([client.FEE_PCT, client.FEE_MIN, client.FEE_MAX, client.GIFT_PCT]);
    for (const c of [0, 50, 500, 5000, 1e6]) expect(api.feeOf(c)).toBe(client.visitFee(c));
  });
  it("mốc sao 5", () => { expect(api.STAR5_AT).toBe(CRAFT_AT[CRAFT_AT.length - 1]); });
});
