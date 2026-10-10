import { beforeEach, describe, expect, it } from "vitest";
import { GACHA_ITEMS } from "../src/content/gacha";
import { placeStaff } from "../src/engine/gacha";
import { RECIPES } from "../src/content/game";
import { SHOP_UPGRADES } from "../src/content/progression";
import { FX_CAP, buffSources, fx, fxRaw, newestRecipe } from "../src/engine/progress";
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

describe("trần buff", () => {
  it("cộng nhiều tầng vượt trần thì fx bị chặn, fxRaw vẫn là tổng thật", () => {
    S.venue.floors = 8; SHOP_UPGRADES.forEach(u => { S.prog.up[u.id] = u.max; });
    const mgrs = GACHA_ITEMS.filter(i => i.kind === "manager"), pets = GACHA_ITEMS.filter(i => i.kind === "mascot");
    for (let f = 0; f < 8; f++) { const m = mgrs[f % mgrs.length]!, p = pets[f % pets.length]!; S.gacha.owned[m.id] = 1; S.gacha.owned[p.id] = 1; placeStaff("mgr", m.id, f); placeStaff("mascot", p.id, f); }
    (["price", "tip", "pat"] as const).forEach(k => { expect(fx(k)).toBeLessThanOrEqual(FX_CAP[k]!); expect(fx(k)).toBe(Math.min(fxRaw(k), FX_CAP[k]!)); });
    expect((["price", "tip", "pat"] as const).some(k => fxRaw(k) > FX_CAP[k]!)).toBe(true);
  });
  it("số khách cộng thêm không có trần", () => { expect(FX_CAP.cust).toBeUndefined(); });
});

describe("món mới nhất", () => {
  it("là món mở khoá cao cấp nhất theo cấp, không phải công thức Gacha/bánh tuỳ chỉnh nằm cuối danh sách", () => {
    const base = RECIPES.filter(r => r.lv <= 20);
    const special = { ...RECIPES[0]!, id: "gacha-x", lv: 1 };
    const newest = newestRecipe([...base, special]);
    expect(newest.lv).toBe(Math.max(...base.map(r => r.lv)));
    expect(newest.id).not.toBe("gacha-x");
  });
});
