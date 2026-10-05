import { beforeEach, describe, expect, it } from "vitest";
import { GACHA_ITEMS } from "../src/content/gacha";
import { placeStaff } from "../src/engine/gacha";
import { buffSources, fx } from "../src/engine/progress";
import { S, resetState } from "../src/engine/state";

const KEYS = ["price", "tip", "pat", "cust"] as const;
const sum = (k: (typeof KEYS)[number]) => buffSources().reduce((a, r) => a + (r.fx[k] ?? 0), 0);

beforeEach(() => resetState());

describe("buff đang có", () => {
  it("tiệm mới chưa có buff nào", () => {
    expect(buffSources()).toEqual([]);
    KEYS.forEach(k => expect(fx(k)).toBe(0));
  });

  it("cộng các nguồn đúng bằng tổng buff của game (quản lý, linh thú, trang trí)", () => {
    S.venue.floors = 3;
    const mgrs = GACHA_ITEMS.filter(i => i.kind === "manager"), pets = GACHA_ITEMS.filter(i => i.kind === "mascot");
    [0, 1, 2].forEach(f => { S.gacha.owned[mgrs[f].id] = 1; S.gacha.owned[pets[f].id] = 1; placeStaff("mgr", mgrs[f].id, f); placeStaff("mascot", pets[f].id, f); });
    S.room.wall = "starry"; S.room.counter = "gold";
    const rows = buffSources();
    expect(rows.filter(r => r.src === "mgr")).toHaveLength(3);
    expect(rows.filter(r => r.src === "mascot")).toHaveLength(3);
    expect(rows.filter(r => r.src === "decor").length).toBeGreaterThanOrEqual(2);
    KEYS.forEach(k => expect(sum(k)).toBeCloseTo(fx(k), 10));
  });

  it("tầng chưa mở thì quản lý ở tầng đó không tính", () => {
    S.venue.floors = 1;
    const m = GACHA_ITEMS.find(i => i.kind === "manager")!;
    S.gacha.owned[m.id] = 1; placeStaff("mgr", m.id, 0);
    expect(buffSources().filter(r => r.src === "mgr")).toHaveLength(1);
    KEYS.forEach(k => expect(sum(k)).toBeCloseTo(fx(k), 10));
  });
});
