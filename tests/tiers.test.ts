import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BAKE_TIME, MAX_CUSTOM, RECIPES, TIER_BAKE_SLOW, TIER_HAND_BONUS, customCost, customMult, customPrice, customRecipe, customValue, partsOfRecipe, tiersOf, type CustomCake, type Recipe } from "../src/content/game";
import { buyFood, hire } from "../src/engine/economy";
import { featured, rollDay, unlocked, usedIdx } from "../src/engine/progress";
import { beginShift, buildPicked, buildTotal, emptyBuild, isComplete, matches, partAt, partsOfBuild, serve, setPartAt, shortage, tick, type Customer } from "../src/engine/shift";
import { S, fresh, loadState, resetState } from "../src/engine/state";

const TOWER: CustomCake = { id: "c1", n: "Tháp Dâu Sữa", tiers: [[0, 1], [2, 0]], top: 0 };       // 2 tầng: Bông lan+Kem dâu, Mochi+Matcha, Dâu tây
const THREE: CustomCake = { id: "c2", n: "Tháp ba", tiers: [[0, 0], [0, 1], [2, 2]], top: 1 };     // 3 tầng, hai tầng cùng đế Bông lan
const customer = (r: Recipe, over: Partial<Customer> = {}): Customer => ({ who: "Bé Na", look: { gender: "girl", sprite: "g1" }, r, sweet: 0, max: 40, pat: 40, ...over });
const lvUp = (L: number) => { S.xp = 40 * (L - 1) * (L - 1); };
const fill = (r: Recipe, b = emptyBuild(tiersOf(r))) => {
  setPartAt(b, 0, "base", r.base); setPartAt(b, 0, "cream", r.cream); (r.up ?? []).forEach((u, j) => { setPartAt(b, j + 1, "base", u[0]); setPartAt(b, j + 1, "cream", u[1]); });
  b.top = r.top; b.sweet = 0; return b;
};

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 5, 10)); resetState(); rollDay(); });
afterEach(() => vi.useRealTimers());

describe("giá bánh tuỳ chỉnh", () => {
  it("giá = (giá trị các tầng + topping) × (1 + 10% mỗi tầng thêm)", () => {
    expect(customValue(TOWER.tiers, TOWER.top)).toBe(42);              // 6+6 + 10+10 + 10
    expect(customMult(2)).toBeCloseTo(1.1, 10);
    expect(customPrice(TOWER.tiers, TOWER.top)).toBe(46);
    expect(customCost(TOWER.tiers, TOWER.top)).toBe(2 + 2 + 3 + 3 + 3);   // nguyên liệu: 13 xu
    expect(customPrice([[0, 0]], 0)).toBeGreaterThan(0);
  });
  it("thêm tầng thì giá luôn cao hơn nhiều hơn phần nguyên liệu thêm vào", () => {
    const one = customPrice([[0, 1]], 0), two = customPrice(TOWER.tiers, 0), three = customPrice([[0, 1], [2, 0], [1, 2]], 0);
    expect(two).toBeGreaterThan(one); expect(three).toBeGreaterThan(two);
    expect(three - customCost([[0, 1], [2, 0], [1, 2]], 0)).toBeGreaterThan(two - customCost(TOWER.tiers, 0));
  });
  it("công thức từ mẫu: tầng dưới là base/cream, các tầng trên nằm ở up", () => {
    const r = customRecipe(TOWER);
    expect(r).toMatchObject({ base: 0, cream: 1, top: 0, up: [[2, 0]], custom: true, price: 46 });
    expect(tiersOf(r)).toBe(2); expect(tiersOf(RECIPES[0])).toBe(1);
    expect(partsOfRecipe(customRecipe(THREE)).map(p => p.k + p.i)).toEqual(["base0", "cream0", "base0", "cream1", "base2", "cream2", "top1"]);
  });
});

describe("phiếu làm bánh nhiều tầng", () => {
  it("đủ khi chọn hết Đế, Kem của mọi tầng, Topping và Độ ngọt", () => {
    const r = customRecipe(TOWER), b = emptyBuild(2);
    expect(buildTotal(b)).toBe(6); expect(isComplete(b)).toBe(false);
    setPartAt(b, 0, "base", 0); setPartAt(b, 0, "cream", 1); b.top = 0; b.sweet = 0;
    expect(isComplete(b)).toBe(false); expect(buildPicked(b)).toBe(4);       // thiếu tầng 2
    setPartAt(b, 1, "base", 2); setPartAt(b, 1, "cream", 0);
    expect(isComplete(b)).toBe(true); expect(matches(customer(r), b)).toBe(true);
    expect(partAt(b, 1, "base")).toBe(2); expect(partsOfBuild(b)).toHaveLength(5);
  });
  it("sai ở tầng trên thì không khớp đơn", () => {
    const r = customRecipe(TOWER), b = fill(r);
    setPartAt(b, 1, "cream", 2);
    expect(matches(customer(r), b)).toBe(false);
  });
  it("bánh một tầng vẫn chạy như cũ", () => {
    const b = emptyBuild(); expect(buildTotal(b)).toBe(4);
    const r = RECIPES[0]; setPartAt(b, 0, "base", r.base); setPartAt(b, 0, "cream", r.cream); b.top = r.top; b.sweet = 0;
    expect(isComplete(b)).toBe(true); expect(matches(customer(r), b)).toBe(true);
  });
});

describe("giao bánh nhiều tầng", () => {
  const setup = (cake: CustomCake) => { lvUp(10); S.custom = [cake]; S.coins = 500; const { sh } = beginShift(); sh.next = 999; sh.seats[0] = customer(customRecipe(cake)); sh.mine = 0; return sh; };

  it("giao đúng: tự tay làm được thưởng thêm theo số tầng", () => {
    const sh = setup(TOWER), r = customRecipe(TOWER); sh.build = fill(r); sh.peek = true;
    const res = serve(sh);
    expect(res.ok).toBe(true);
    if (res.ok) { expect(res.tierBonus).toBe(Math.round(r.price * TIER_HAND_BONUS)); expect(sh.tierBonus).toBe(res.tierBonus); expect(res.price).toBeGreaterThan(0); }
  });
  it("bánh một tầng không có thưởng tầng", () => {
    lvUp(2); const { sh } = beginShift(); sh.next = 999; sh.seats[0] = customer(RECIPES[0]); sh.mine = 0; sh.build = fill(RECIPES[0]);
    const res = serve(sh); expect(res.ok && res.tierBonus).toBe(0);
  });
  it("giao sai tầng thì báo đúng tầng và đứt combo", () => {
    const sh = setup(TOWER), r = customRecipe(TOWER); sh.build = fill(r); setPartAt(sh.build, 1, "base", 1);
    const res = serve(sh);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.msg).toBe("Sai đế tầng 2 rồi: Bé Na gọi Mochi, không phải Tart");
  });
  it("trừ kho từng phần, đếm trùng: hai tầng cùng đế Bông lan trừ hai", () => {
    const sh = setup(THREE), r = customRecipe(THREE), before = S.stock.base[0]; sh.build = fill(r);
    expect(serve(sh).ok).toBe(true);
    expect(S.stock.base[0]).toBe(before - 2); expect(S.stock.base[2]).toBe(7); expect(S.stock.cream[0]).toBe(7); expect(S.stock.cream[1]).toBe(7); expect(S.stock.cream[2]).toBe(7); expect(S.stock.top[1]).toBe(7);
  });
  it("kho chỉ còn 1 đế mà cần 2 thì nhập nhanh phần thiếu", () => {
    const sh = setup(THREE), r = customRecipe(THREE); S.stock.base[0] = 1; sh.build = fill(r);
    const coins = S.coins; expect(serve(sh).ok).toBe(true);
    expect(S.coins).toBeLessThanOrEqual(coins - 3 + 200);          // có tiền thu bánh, nhưng đã trừ phí nhập nhanh 1 đế (3 xu)
    expect(sh.quickCost).toBe(3); expect(S.stock.base[0]).toBe(0);
  });
  it("shortage đếm đủ số lượng thiếu", () => {
    S.stock.base[0] = 1; S.stock.cream[0] = 0;
    expect(shortage(partsOfRecipe(customRecipe(THREE)))).toEqual(expect.arrayContaining([{ k: "base", i: 0, n: 1 }, { k: "cream", i: 0, n: 1 }]));
  });
});

describe("bé thợ bánh làm bánh nhiều tầng", () => {
  it("chậm hơn theo số tầng, dùng đủ nguyên liệu và không có thưởng tầng", () => {
    lvUp(2); S.coins = 500; hire("dog"); buyFood("kibble", 1); S.autoTake = false; S.custom = [THREE];
    const { sh } = beginShift(); sh.next = 999;
    sh.seats[1] = customer(customRecipe(THREE));
    const before = S.stock.base[0], ev = tick(sh, 0.1);
    expect(ev.claimed.map(b => b.seat)).toEqual([1]);
    expect(ev.claimed[0].need).toBeCloseTo(BAKE_TIME[0] * (1 + TIER_BAKE_SLOW * 2) * 1, 5);   // 3 tầng: +100% thời gian (bữa ăn bậc 1 không làm chậm)
    expect(S.stock.base[0]).toBe(before - 2);
    expect(sh.tierBonus).toBe(0);
  });
});

describe("lưu và mở bánh tuỳ chỉnh", () => {
  it("mẫu đủ nguyên liệu thì vào danh sách bán, thiếu nhà cung cấp thì chưa", () => {
    lvUp(10); S.custom = [TOWER];
    expect(unlocked().some(r => r.id === "c1")).toBe(true);
    S.custom = [{ id: "c3", n: "x", tiers: [[3, 3]], top: 0 }];                  // Croissant + Phô mai cần Lò sữa Alpine
    expect(unlocked().some(r => r.id === "c3")).toBe(false);
    S.suppliers.push("alpine"); expect(unlocked().some(r => r.id === "c3")).toBe(true);
  });
  it("màn làm bánh hiện nguyên liệu của cả các tầng trên", () => {
    lvUp(10); S.custom = [{ id: "c4", n: "y", tiers: [[0, 0], [2, 2]], top: 1 }];
    expect(usedIdx("base")).toEqual(expect.arrayContaining([0, 2])); expect(usedIdx("cream")).toContain(2);
  });
  it("lưu rồi tải lại: giữ mẫu hợp lệ, bỏ mẫu hỏng, tối đa 3 mẫu", () => {
    const raw = JSON.stringify({ ...fresh(), custom: [TOWER, THREE, { id: "bad", n: "x", tiers: [[9, 9]], top: 0 }, { id: "c5", n: "a", tiers: [[0, 0]], top: 0 }, { id: "c6", n: "b", tiers: [[0, 0]], top: 0 }] });
    const s = loadState(raw);
    expect(s.custom.map(c => c.id)).toEqual(["c1", "c2", "c5"]); expect(s.custom.length).toBe(MAX_CUSTOM);
  });
  it("save cũ không có custom thì là danh sách rỗng", () => {
    const old = { ...fresh() } as Record<string, unknown>; delete old.custom;
    expect(loadState(JSON.stringify(old)).custom).toEqual([]);
  });
});

describe("món Viral", () => {
  it("món Viral là bánh tự làm thì featured() trả đúng món đó, không rơi về món đầu", () => {
    lvUp(10); S.custom = [TOWER]; S.daily.featId = TOWER.id;
    expect(featured().id).toBe(TOWER.id);
    expect(unlocked().some(r => r.id === featured().id)).toBe(true);
  });
});

describe("bánh theo mùa và trần khách", () => {
  it("12 món mùa, mỗi tháng một món, không trùng thành phần với món thường", async () => {
    const { SEASONAL, seasonalNow, RECIPES } = await import("../src/content/game");
    expect(SEASONAL.map(r => r.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const key = (r: { base: number; cream: number; top: number }) => `${r.base}-${r.cream}-${r.top}`;
    const taken = new Set(RECIPES.map(key)); SEASONAL.forEach(r => expect(taken.has(key(r))).toBe(false));
    expect(new Set(SEASONAL.map(key)).size).toBe(12);
    expect(seasonalNow(12).season).toBe("Noel");
  });
  it("món của tháng này chỉ bán khi đủ cấp và đủ nguyên liệu", async () => {
    const { seasonalNow } = await import("../src/content/game");
    const now = seasonalNow();      // tháng 10 trong test: Tart + Phô mai + Đậu đỏ
    lvUp(7); expect(unlocked().some(r => r.id === now.id)).toBe(false);
    lvUp(30); expect(unlocked().some(r => r.id === now.id)).toBe(false);         // chưa ký Lò sữa Alpine (Phô mai)
    S.coins = 5000; const { signSupplier } = await import("../src/engine/suppliers"); signSupplier("alpine", 30);
    expect(unlocked().some(r => r.id === now.id)).toBe(true);
  });
  it("trần khách: 30 khi mới nổi, tăng 6 mỗi bậc nổi tiếng từ bậc 2, tối đa 56", async () => {
    const { customerCap } = await import("../src/engine/economy");
    expect([0, 1, 2, 3, 4, 5, 6].map(f => customerCap(f))).toEqual([30, 30, 32, 38, 44, 50, 56]);
  });
});
