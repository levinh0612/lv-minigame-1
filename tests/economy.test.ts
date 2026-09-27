import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPES } from "../src/content/game";
import {
  buy, buySuggested, dutyWages, hire, outOfStock, packPrice, quickBuy, suggestion, toggleDuty, train
} from "../src/engine/economy";
import { rollDay } from "../src/engine/progress";
import { autoPrep, createShift, finishShift, serve, tick, type Customer } from "../src/engine/shift";
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
    expect(sug.some(x => x.k === "base" && x.i === 1)).toBe(false);   // Tart chưa mở ở Lv1
    S.coins = 1000; buySuggested();
    expect(suggestion()).toEqual([]);
    expect(outOfStock()).toEqual([]);
  });
});

describe("nhân viên", () => {
  it("chưa đủ cấp thì không thuê được", () => {
    expect(hire("dog")).toBe(false);
    lvUp(2);
    expect(hire("dog")).toBe(true);
    expect(dutyWages()).toBe(10);
  });

  it("cho nghỉ thì không trả lương; huấn luyện tăng lương", () => {
    lvUp(4); S.coins = 1000;
    hire("dog"); hire("white");
    toggleDuty("white");
    expect(dutyWages()).toBe(10);
    train("dog");
    expect(S.staff.dog.lv).toBe(2);
    expect(dutyWages()).toBe(14);
  });

  it("hết ca trả lương nhưng không làm xu âm", () => {
    lvUp(2); hire("dog");
    const sh = createShift(); sh.served = 3; S.coins = 4;
    const l = finishShift(sh);
    expect(l.wages).toBe(4);
    expect(S.coins).toBe(0);
  });

  it("ca không có khách nào thì không trả lương", () => {
    lvUp(2); hire("dog"); S.coins = 50;
    finishShift(createShift());
    expect(S.coins).toBe(50);
  });

  it("Milo chọn sẵn đế cho khách mới, không ghi đè khi đổi ý", () => {
    lvUp(2); hire("dog");
    const sh = createShift();
    sh.seats[0] = customer({ r: RECIPES[1] });
    expect(autoPrep(sh)).toEqual(["base"]);
    expect(sh.build.base).toBe(2);
    sh.build.base = null;
    expect(autoPrep(sh)).toEqual([]);
  });

  it("Siro tăng tip, Cacao dỗ khách một lần", () => {
    lvUp(4); hire("gold"); hire("white");
    const sh = createShift(); sh.next = 999;
    sh.seats[0] = customer({ pat: 11, max: 40 });
    const ev = tick(sh, 0.1);
    expect(ev.rescued).toEqual([0]);
    expect(sh.seats[0]!.pat).toBeCloseTo(10.9 + 8);
    expect(tick(sh, 0.1).rescued).toEqual([]);
  });
});
