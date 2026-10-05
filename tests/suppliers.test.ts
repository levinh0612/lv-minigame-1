import { beforeEach, describe, expect, it } from "vitest";
import { CATS, RECIPES, SUPPLIERS, STOCK_KEYS } from "../src/content/game";
import { buy } from "../src/engine/economy";
import { lvl, rollDay, unlocked, usedIdx } from "../src/engine/progress";
import { S, fresh, loadState, resetState } from "../src/engine/state";
import { availableIdx, ingAvailable, ingsOf, recipeReady, signState, signSupplier } from "../src/engine/suppliers";

beforeEach(() => { resetState(); rollDay(); });

describe("nhà cung cấp", () => {
  it("đồ có từ đầu luôn dùng được, đồ mới thì chưa", () => {
    expect(availableIdx("base")).toEqual([0, 1, 2]);
    expect(ingAvailable("base", 3)).toBe(false);
    RECIPES.slice(0, 9).forEach(r => expect(recipeReady(r)).toBe(true));          // 9 món gốc dùng đồ có từ đầu
    RECIPES.slice(9).forEach(r => expect(recipeReady(r)).toBe(false));           // món mới cần ký nhà cung cấp
  });

  it("kho mới: 3 món đầu có 8 phần, món mới từ 0", () => {
    const s = fresh();
    STOCK_KEYS.forEach(k => { expect(s.stock[k]).toHaveLength(CATS[k].length); expect(s.stock[k].slice(0, 3)).toEqual([8, 8, 8]); expect(s.stock[k].slice(3).every(n => n === 0)).toBe(true); });
  });

  it("ký hợp đồng cần đủ cấp rồi đủ xu, trừ xu một lần", () => {
    const a = SUPPLIERS[0];
    expect(signState(a, a.lv - 1)).toBe("lv");
    S.coins = a.cost - 1; expect(signState(a, a.lv)).toBe("coin"); expect(signSupplier(a.id, a.lv)).toBe("coin"); expect(S.suppliers).toEqual([]);
    S.coins = a.cost + 10; expect(signSupplier(a.id, a.lv)).toBe("ok");
    expect(S.coins).toBe(10); expect(S.suppliers).toEqual([a.id]);
    expect(signSupplier(a.id, a.lv)).toBe("done"); expect(S.coins).toBe(10);
    ingsOf(a.id).forEach(x => expect(ingAvailable(x.k, x.i)).toBe(true));
  });

  it("chưa ký thì không nhập được nguyên liệu của nhà đó", () => {
    S.coins = 1000;
    expect(buy("base", 3, 5)).toBe(false); expect(S.coins).toBe(1000);
    S.suppliers.push("alpine");
    expect(buy("base", 3, 5)).toBe(true); expect(S.stock.base[3]).toBe(5);
  });

  it("công thức chỉ bán được khi đủ nguyên liệu", () => {
    const fake = { id: "x", n: "x", base: 3, cream: 0, top: 0, lv: 1, price: 30 };
    expect(recipeReady(fake)).toBe(false);
    S.suppliers.push("alpine"); expect(recipeReady(fake)).toBe(true);
    expect(unlocked().length).toBeGreaterThan(0);
  });

  it("save cũ có kho 3 phần được đệm thêm, không bị NaN", () => {
    const old = { ...fresh(), stock: { base: [4, 5, 6], cream: [1, 2, 3], top: [7, 8, 9] } } as unknown as ReturnType<typeof fresh>;
    delete (old as { suppliers?: string[] }).suppliers;
    const s = loadState(JSON.stringify(old));
    STOCK_KEYS.forEach(k => expect(s.stock[k]).toHaveLength(CATS[k].length));
    expect(s.stock.base.slice(0, 3)).toEqual([4, 5, 6]); expect(s.stock.base[3]).toBe(0);
    expect(s.suppliers).toEqual([]);
  });

  it("món mới chỉ mở khi đủ cấp VÀ đã ký nhà cung cấp", () => {
    const croissant = RECIPES.find(r => r.n === "Croissant Vani Dâu tây")!;
    const has = () => unlocked().some(r => r.id === croissant.id);
    S.xp = 40 * (croissant.lv - 1) * (croissant.lv - 1); expect(lvl()).toBe(croissant.lv);
    expect(has()).toBe(false);                                                // đủ cấp, chưa ký
    S.suppliers.push("alpine"); expect(has()).toBe(true);                     // đủ cả hai
    S.xp = 0; expect(has()).toBe(false);                                      // ký rồi nhưng chưa đủ cấp
  });

  it("màn làm bánh chỉ hiện nguyên liệu mà các món đang bán dùng", () => {
    expect(usedIdx("base")).toEqual(expect.not.arrayContaining([3, 4]));
    S.xp = 40 * 9 * 9; S.suppliers.push("alpine");                              // Lv 10: Croissant và Cheesecake đã mở
    expect(usedIdx("base")).toEqual(expect.arrayContaining([3, 4]));
    expect(usedIdx("cream")).toContain(3);
  });
});
