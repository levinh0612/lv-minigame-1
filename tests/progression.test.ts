import { beforeEach, describe, expect, it } from "vitest";
import { RECIPES, SEASONAL, partsOfRecipe, tiersOf } from "../src/content/game";
import { ACHIEVEMENTS, CRAFT_AT, SHOP_UPGRADES, WEEKLY_COUNT, upgradeCost } from "../src/content/progression";
import { achReached, claimAch } from "../src/engine/achievements";
import { craftBonus, craftStars, recordMade } from "../src/engine/craft";
import { fx } from "../src/engine/progress";
import { S, resetState } from "../src/engine/state";
import { buyUpgrade, upgradeFx } from "../src/engine/upgrades";
import { claimChest, claimWeekly, ensureWeek, bumpWeekly, weekId } from "../src/engine/weekly";

beforeEach(() => resetState());
const key = (r: { base: number; cream: number; top: number }) => [r.base, r.cream, r.top].join("-");

describe("công thức mới (Lv 26–60)", () => {
  it("mỗi công thức có id và tổ hợp duy nhất, không trùng món theo mùa", () => {
    expect(new Set(RECIPES.map(r => r.id)).size).toBe(RECIPES.length);
    expect(new Set(RECIPES.map(key)).size).toBe(RECIPES.length);
    const taken = new Set(RECIPES.map(key));
    SEASONAL.forEach(s => expect(taken.has(key(s))).toBe(false));
  });
  it("cấp mở và giá tăng dần, có bánh 2 và 3 tầng", () => {
    const hi = RECIPES.filter(r => r.lv >= 26);
    expect(hi.length).toBeGreaterThanOrEqual(20);
    expect(Math.max(...RECIPES.map(r => r.lv))).toBe(60);
    expect(hi.some(r => tiersOf(r) === 2) && hi.some(r => tiersOf(r) === 3)).toBe(true);
    hi.forEach(r => expect(r.price).toBeGreaterThan(r.lv > 40 ? 90 : 50));
    RECIPES.forEach(r => partsOfRecipe(r).forEach(p => expect(p.i).toBeGreaterThanOrEqual(0)));
  });
});

describe("tay nghề công thức", () => {
  it("đủ số bánh thì lên sao, thưởng xu một lần, giá tăng 4%/sao", () => {
    for (let i = 0; i < CRAFT_AT[0] - 1; i++) expect(recordMade("r1", 20)).toBeNull();
    const coins = S.coins, up = recordMade("r1", 20);
    expect(up).toEqual({ star: 1, reward: 160 }); expect(craftStars("r1")).toBe(1); expect(craftBonus("r1")).toBeCloseTo(.04);
    expect(S.coins).toBe(coins + 160);
  });
});

describe("danh hiệu", () => {
  it("đạt mốc thì nhận thưởng từng bậc, không nhận hai lần", () => {
    const a = ACHIEVEMENTS[0]; S.served = a.need[1];
    expect(achReached(a)).toBe(2);
    const c = S.coins;
    expect(claimAch(a.id)?.coins).toBe(a.reward[0].coins); expect(claimAch(a.id)?.coins).toBe(a.reward[1].coins); expect(claimAch(a.id)).toBeNull();
    expect(S.coins).toBeGreaterThan(c);
  });
});

describe("nhiệm vụ tuần", () => {
  it("cố định theo tuần, thứ Hai là đầu tuần, nhận thưởng và rương", () => {
    expect(new Date(weekId(new Date(2026, 9, 11))).getDay()).toBe(1);      // CN 11/10/2026 → thứ Hai 5/10
    const w = ensureWeek(30); expect(w.missions).toHaveLength(WEEKLY_COUNT);
    expect(ensureWeek(30)).toBe(w);
    w.missions.forEach(m => { expect(claimWeekly(m.key)).toBe(false); bumpWeekly(m.key as never, m.n); });
    expect(claimChest()).toBe(false);
    w.missions.forEach(m => expect(claimWeekly(m.key)).toBe(true));
    const t = S.gacha.tickets; expect(claimChest()).toBe(true); expect(claimChest()).toBe(false); expect(S.gacha.tickets).toBeGreaterThan(t);
  });
  it("món cao cấp chỉ xuất hiện khi đủ Lv 26", () => {
    expect(ensureWeek(10).missions.some(m => m.key === "elite")).toBe(false);
  });
});

describe("nâng cấp tiệm cao cấp", () => {
  it("cần đủ cấp và xu, cộng buff vào fx()", () => {
    const u = SHOP_UPGRADES[0];
    expect(buyUpgrade(u.id, u.lv - 1)).toBe("lv"); expect(buyUpgrade(u.id, u.lv)).toBe("coin");
    S.coins = 1e6; expect(buyUpgrade(u.id, u.lv)).toBe("ok");
    expect(S.coins).toBe(1e6 - upgradeCost(u, 0));
    expect(upgradeFx(u.fx)).toBeCloseTo(u.per); expect(fx(u.fx)).toBeCloseTo(u.per);
  });
  it("tới cấp tối đa thì dừng, giá tăng dần", () => {
    const u = SHOP_UPGRADES[0]; S.coins = 1e9;
    for (let i = 0; i < u.max; i++) expect(buyUpgrade(u.id, 100)).toBe("ok");
    expect(buyUpgrade(u.id, 100)).toBe("max");
    expect(upgradeCost(u, 1)).toBeGreaterThan(upgradeCost(u, 0));
  });
});

describe("Bạch Chi là nhân vật (quản lý), không phải linh thú", () => {
  it("vật phẩm là quản lý, dữ liệu cũ của linh thú chuyển sang", async () => {
    const { gachaItem } = await import("../src/content/gacha");
    const { loadState } = await import("../src/engine/state");
    expect(gachaItem("g_baizhi")?.kind).toBe("manager"); expect(gachaItem("m_baizhi")).toBeUndefined();
    const s = loadState(JSON.stringify({ v: 6, gacha: { owned: { m_baizhi: 2 }, mascots: ["m_baizhi"], mgrs: [], bond: { m_baizhi: 5 } }, pets: { m_baizhi: { aff: 3, petDay: "", pets: 0, fedDay: "" } } }));
    expect(s.gacha.owned).toMatchObject({ g_baizhi: 2 }); expect(s.gacha.owned.m_baizhi).toBeUndefined();
    expect(s.gacha.mgrs?.[0]).toBe("g_baizhi"); expect(s.gacha.mascots?.[0]).toBe(""); expect(s.gacha.bond?.g_baizhi).toBe(5); expect(s.pets.g_baizhi.aff).toBe(3);
  });
});

describe("hàng đợi theo bàn và lầu", () => {
  const seatsOf = (lv: number) => 1 + lv;
  it("ghế đánh số liên tục theo thứ tự bàn, không bỏ sót hay trùng", async () => {
    const { groupTables } = await import("../src/ui/screens/queue-tables");
    const g = groupTables([3, 3, 2, 1], seatsOf, 1, 4);
    expect(g).toHaveLength(1);
    expect(g[0]!.tables.map(t => t.seats.length)).toEqual([4, 4, 3, 2]);
    expect(g.flatMap(f => f.tables.flatMap(t => t.seats))).toEqual(Array.from({ length: 13 }, (_, i) => i));
  });
  it("bàn chia đều cho các tầng như cảnh 3D (bàn k ở tầng k % số tầng), tầng đánh số từ 1", async () => {
    const { groupTables } = await import("../src/ui/screens/queue-tables");
    const g = groupTables([3, 3, 2, 2, 1, 1, 1], seatsOf, 3, 4);
    expect(g.map(f => f.floor)).toEqual([1, 2, 3]);
    expect(g.map(f => f.tables.map(t => t.n))).toEqual([[1, 4, 7], [2, 5], [3, 6]]);
  });
  it("mỗi tầng chứa tối đa số bàn cho phép", async () => {
    const { groupTables } = await import("../src/ui/screens/queue-tables");
    const g = groupTables([1, 1, 1, 1, 1], seatsOf, 1, 4);
    expect(g[0]!.tables).toHaveLength(4);
  });
  it("cỡ thu nhỏ nằm trong [K_MIN, 1]", async () => {
    const { fitK, K_MIN } = await import("../src/ui/screens/queue-tables");
    expect(fitK(300, 600)).toBe(1); expect(fitK(1000, 330)).toBe(K_MIN); expect(fitK(400, 330)).toBeCloseTo(330 / 400);
  });
});

describe("nhịp khách đến theo bậc danh tiếng", () => {
  it("mọi bậc đều ra số hợp lệ, giảm dần, không thấp hơn 0,22 (bậc mới không làm khách ngừng đến)", async () => {
    const { arrivalMul } = await import("../src/engine/shift");
    const { FAME } = await import("../src/content/game");
    const v = FAME.map((_, i) => arrivalMul(i));
    v.forEach(x => { expect(Number.isFinite(x)).toBe(true); expect(x).toBeGreaterThanOrEqual(0.22); });
    v.slice(1).forEach((x, i) => expect(x).toBeLessThanOrEqual(v[i]!));
  });
});

describe("100 bậc danh tiếng", () => {
  it("đủ 100 bậc, tên không trùng, điểm và khách cao điểm tăng dần", async () => {
    const { FAME, FAME_AT } = await import("../src/content/game");
    expect(FAME.length).toBe(100);
    expect(FAME_AT.length).toBe(99);
    expect(new Set(FAME.map(x => x.n)).size).toBe(100);
    FAME_AT.slice(1).forEach((x, i) => expect(x).toBeGreaterThan(FAME_AT[i]!));
    FAME.slice(1).forEach((x, i) => expect(x.seats).toBeGreaterThan(FAME[i]!.seats));
  });
  it("giá lầu và mở rộng không tụt khi qua mốc đổi công thức", async () => {
    const { SHOP } = await import("../src/content/game");
    for (let b = 1; b < 30; b++) { expect(SHOP.floorCost(b)).toBeGreaterThan(SHOP.floorCost(b - 1)); expect(SHOP.wideCost(b)).toBeGreaterThan(SHOP.wideCost(b - 1)); }
    expect(SHOP.floorCost(3)).toBe(8000); expect(SHOP.wideCost(6)).toBe(128000);
  });
});
