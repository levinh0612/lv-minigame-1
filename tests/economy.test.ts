import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPES } from "../src/content/game";
import {
  buy, buyFood, buySuggested, claimWelcome, crewPlan, hire, mealOf, outOfStock, packPrice, quickBuy, snack, suggestion, toggleDuty, train
} from "../src/engine/economy";
import { rollDay } from "../src/engine/progress";
import { beginShift, createShift, serve, tick, type Customer } from "../src/engine/shift";
import { fame } from "../src/engine/economy";
import { S, loadState, resetState } from "../src/engine/state";

const customer = (over: Partial<Customer> = {}): Customer => ({
  who: "Bé Na", look: { kind: "cat", fur: "#FFFFFF" }, r: RECIPES[0], sweet: 0, max: 40, pat: 40, ...over
});
const lvUp = (L: number) => { S.xp = 40 * (L - 1) * (L - 1); };

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 27, 10)); resetState(); rollDay(); });
afterEach(() => vi.useRealTimers());

describe("nguyên liệu", () => {
  it("người chơi cũ được tặng kho khởi đầu", () => {
    const s = loadState(JSON.stringify({ v: 3, coins: 5 }));
    expect(s.stock.base).toEqual([8, 8, 8]);
  });

  it("gói 10 rẻ hơn 10%, mua xong tăng kho và trừ xu", () => {
    expect(packPrice("cream", 0, 5)).toBe(15);
    expect(packPrice("cream", 0, 10)).toBe(27);
    S.coins = 100;
    expect(buy("cream", 0, 10)).toBe(true);
    expect(S.coins).toBe(73);
    expect(S.stock.cream[0]).toBe(18);
  });

  it("không đủ xu thì không mua", () => {
    S.coins = 1;
    expect(buy("base", 1, 5)).toBe(false);
    expect(S.stock.base[1]).toBe(8);
  });

  it("nhập nhanh đắt hơn 50%", () => {
    S.coins = 10;
    quickBuy("base", 1);
    expect(S.coins).toBe(10 - 5);
  });

  it("giao bánh trừ kho; hết hàng thì tự nhập nhanh", () => {
    const sh = createShift();
    S.stock.top[0] = 0; S.coins = 50;
    sh.seats[0] = customer();
    sh.build = { base: 0, cream: 0, top: 0, sweet: 0 };
    const r = serve(sh);
    expect(r.ok && r.quick).toBe(5);
    expect(S.stock.base[0]).toBe(7);
    expect(S.stock.top[0]).toBe(0);
    expect(sh.ingUsed).toBe(2 + 3);
  });

  it("gợi ý nhập hàng chỉ gồm nguyên liệu của công thức đã mở và đang thiếu", () => {
    S.stock.base[0] = 0;
    const sug = suggestion();
    expect(sug.find(x => x.k === "base" && x.i === 0)!.n).toBeGreaterThan(0);
    S.coins = 1000; buySuggested();
    expect(suggestion()).toEqual([]);
    expect(outOfStock()).toEqual([]);
  });
});

describe("quà khai trương", () => {
  it("tặng 300 xu + 5 Hạt, chỉ một lần", () => {
    const c = S.coins;
    expect(claimWelcome()).toBe(true);
    expect(S.coins).toBe(c + 300);
    expect(S.food.kibble).toBe(5);
    expect(claimWelcome()).toBe(false);
    expect(S.coins).toBe(c + 300);
  });
});

describe("thú cưng làm nhân viên", () => {
  it("chưa đủ cấp thì không nhận vào làm được", () => {
    expect(hire("dog")).toBe(false);
    lvUp(2);
    expect(hire("dog")).toBe(true);
    expect(crewPlan()).toEqual([{ id: "dog", meal: null }]);
  });

  it("lương theo bậc: bậc 1 Hạt, bậc 2 Pate, bậc 3 Ức gà", () => {
    lvUp(2); S.coins = 1000; hire("dog");
    expect(mealOf("dog")).toBe("kibble");
    train("dog"); expect(mealOf("dog")).toBe("pate");
    train("dog"); expect(mealOf("dog")).toBe("chicken");
    expect(train("dog")).toBe(false);
  });

  it("đầu ca các bé ăn lương; thiếu món thì ăn món ngon hơn", () => {
    lvUp(4); S.coins = 1000; hire("dog"); hire("gold");
    buyFood("kibble", 1); buyFood("chicken", 1);
    S.staff.gold.lv = 2;                       // cần Pate nhưng không có -> ăn Ức gà
    const { sh, pay } = beginShift();
    expect(pay.fed).toEqual([{ id: "dog", meal: "kibble" }, { id: "gold", meal: "chicken" }]);
    expect(sh.wages).toBe(6 + 15);
    expect(S.food).toEqual({ kibble: 0, pate: 0, chicken: 0 });
  });

  it("hết đồ ăn thì bé đói và nghỉ ca đó", () => {
    lvUp(2); hire("dog");
    const { pay } = beginShift();
    expect(pay.hungry).toEqual(["dog"]);
    expect(S.staff.dog.onDuty).toBe(false);
  });

  it("cho nghỉ thì không ăn lương", () => {
    lvUp(2); S.coins = 100; hire("dog"); buyFood("kibble", 2); toggleDuty("dog");
    const { pay } = beginShift();
    expect(pay.fed).toEqual([]);
    expect(S.food.kibble).toBe(2);
  });

  it("thưởng đồ ăn mỗi ngày một lần, món ngon thân hơn", () => {
    S.coins = 100; buyFood("chicken", 2);
    expect(snack("white", "chicken")).toBe(true);
    expect(S.pets.white.aff).toBe(8);
    expect(snack("white", "chicken")).toBe(false);
    expect(S.food.chicken).toBe(1);
  });

  it("mua đồ ăn trừ xu, thiếu xu thì không mua", () => {
    S.coins = 20;
    expect(buyFood("pate", 2)).toBe(true);
    expect(S.coins).toBe(0);
    expect(buyFood("kibble", 1)).toBe(false);
  });

  it("bé đi làm tự nhận đơn chưa ai làm, không lấy đơn chủ tiệm đang làm", () => {
    lvUp(2); S.coins = 100; hire("dog"); buyFood("kibble", 1);
    const { sh } = beginShift(); sh.next = 999;
    sh.seats[0] = customer({ pat: 10 });                    // chủ tiệm đã nhận đơn này
    sh.seats[1] = customer({ who: "Mèo Bơ", r: RECIPES[1] });
    sh.mine = 0;
    const ev = tick(sh, 0.1);
    expect(ev.claimed.map(b => [b.id, b.seat])).toEqual([["dog", 1]]);
    expect(sh.seats[1]!.by).toBe("dog");
    expect(S.stock.base[2]).toBe(7);                         // Mochi đã lấy ra kho
  });

  it("bé làm xong (10 giây ở bậc 1) thì tự giao, xu vào tiệm", () => {
    lvUp(2); S.coins = 100; hire("dog"); buyFood("kibble", 1);
    const { sh } = beginShift(); sh.next = 999;
    sh.seats[1] = customer({ who: "Mèo Bơ", r: RECIPES[1] });
    S.autoTake = false;                                      // chủ tiệm rảnh tay
    const coins = S.coins;
    let baked = 0;
    for (let i = 0; i < 105; i++) baked += tick(sh, 0.1).baked.length;   // 10 giây + chút dư số thực
    expect(baked).toBe(1);
    expect(sh.seats[1]!.gone).toBe(true);
    expect(S.coins).toBeGreaterThan(coins);
    expect(sh.served).toBe(1);
  });

  it("chủ tiệm chưa đụng tay thì bé nhận luôn đơn chờ lâu nhất", () => {
    lvUp(2); S.coins = 100; hire("dog"); buyFood("kibble", 1);
    const { sh } = beginShift(); sh.next = 999;
    S.autoTake = false;
    sh.seats[0] = customer({ pat: 30 }); sh.seats[2] = customer({ pat: 12 });
    expect(tick(sh, 0.1).claimed.map(b => b.seat)).toEqual([2]);
  });

  it("người chơi không giao được cho đơn bé đang làm", () => {
    const sh = createShift();
    sh.seats[0] = customer({ by: "dog" });
    sh.build = { base: 0, cream: 0, top: 0, sweet: 0 };
    expect(serve(sh).ok).toBe(false);
  });

  it("bé đói (không có đồ ăn) thì không làm bánh", () => {
    lvUp(2); hire("dog");
    const { sh } = beginShift(); sh.next = 999;
    sh.seats[1] = customer();
    expect(tick(sh, 0.1).claimed).toEqual([]);
  });

  it("thiếu nguyên liệu thì bé tự nhập nhanh rồi làm", () => {
    lvUp(2); S.coins = 100; hire("dog"); buyFood("kibble", 1); S.stock.top[0] = 0; S.autoTake = false;
    const { sh } = beginShift(); sh.next = 999;
    sh.seats[1] = customer();                                // cần Dâu tây
    const coins = S.coins, ev = tick(sh, 0.1);
    expect(ev.restock).toEqual([{ id: "dog", what: "Dâu tây" }]);
    expect(ev.claimed.map(b => b.seat)).toEqual([1]);
    expect(S.coins).toBe(coins - 5);
  });

  it("thiếu nguyên liệu mà hết xu thì bé báo thiếu gì, không kẹt im lặng", () => {
    lvUp(2); S.coins = 100; hire("dog"); buyFood("kibble", 1); S.stock.top[0] = 0; S.autoTake = false;
    const { sh } = beginShift(); sh.next = 999; S.coins = 0;
    sh.seats[1] = customer();
    expect(tick(sh, 0.1).claimed).toEqual([]);
    expect(sh.lack.dog).toBe("Dâu tây");
  });

  it("độ nổi tiếng tăng số bàn", () => {
    expect(fame().seats).toBe(3);
    S.reviews = Array(10).fill({ who: "x", look: { kind: "cat", fur: "#fff" }, s: 3, txt: "", love: false });
    S.decor = ["curtain", "lamp", "chair"];
    expect(fame().seats).toBe(4);                            // 3 sao + 3 đồ × 0.4 = 4.2 → Được biết đến
    S.decor = ["curtain", "lamp", "chair", "plant", "flags", "teapot", "bell", "frame"];
    expect(fame().seats).toBe(6);                            // 3 + 3.2 = 6.2 → Viral
  });
});
