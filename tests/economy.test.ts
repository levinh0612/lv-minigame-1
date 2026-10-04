import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPES } from "../src/content/game";
import {
  buy, buyFood, buySuggested, buyVenue, plannedMeal, seatLevels, spareSeats, venueFame, canAffordUpgrade, capacity, demand, needUpgrade, seatsNow, spots, tableLvs, claimWelcome, crewPlan, hire, mealFor, mealOf, mealSlow, outOfStock, packPrice, quickBuy, setMeal, snack, suggestion, toggleDuty, train
} from "../src/engine/economy";
import { rollDay } from "../src/engine/progress";
import { beginShift, createShift, serve, tick, type Customer } from "../src/engine/shift";
import { fame } from "../src/engine/economy";
import { hostGift, seatsOfTables, visitFee } from "../src/engine/visit";
import { resolve } from "../src/ui/router";
import { S, loadState, resetState } from "../src/engine/state";

const customer = (over: Partial<Customer> = {}): Customer => ({
  who: "Bé Na", look: { gender: "girl", sprite: "g1" }, r: RECIPES[0], sweet: 0, max: 40, pat: 40, ...over
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

  it("chọn món thấp hơn bậc: ăn món đã chọn, làm chậm hơn; hết thì ăn món kém hơn kế tiếp", () => {
    lvUp(2); S.coins = 1000; hire("dog"); train("dog"); train("dog");
    expect(mealOf("dog")).toBe("chicken");
    setMeal("dog", "pate"); expect(mealOf("dog")).toBe("pate");
    expect(mealSlow("dog", "chicken")).toBe(1);
    expect(mealSlow("dog", "pate")).toBe(1.25);
    expect(mealSlow("dog", "kibble")).toBe(1.5);
    buyFood("kibble", 1); buyFood("chicken", 1);
    expect(mealFor("dog")).toBe("kibble");     // hết Pate -> Hạt, chưa đụng tới Ức gà
    const { sh, pay } = beginShift();
    expect(pay.fed).toEqual([{ id: "dog", meal: "kibble" }]);
    expect(sh.meals.dog).toBe("kibble");
    expect(S.food.chicken).toBe(1);
  });

  it("kho đồ ăn dùng chung: 1 phần Ức gà chỉ đủ cho 1 bé, hai bé còn lại hiện đói ngay ở màn chuẩn bị", () => {
    lvUp(4); S.coins = 1000; ["dog", "gold", "white"].forEach(id => { hire(id as never); S.staff[id as "dog"].lv = 3; });
    buyFood("chicken", 1);
    expect(crewPlan()).toEqual([{ id: "dog", meal: "chicken" }, { id: "gold", meal: null }, { id: "white", meal: null }]);
    expect(plannedMeal("dog")).toBe("chicken"); expect(plannedMeal("gold")).toBeNull();
    const { pay } = beginShift();                                       // kế hoạch khớp lúc mở ca
    expect(pay.fed.map(x => x.id)).toEqual(["dog"]); expect(pay.hungry).toEqual(["gold", "white"]);
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
    S.reviews = Array(10).fill({ who: "x", look: { gender: "girl", sprite: "g1" }, s: 3, txt: "", love: false });
    Object.assign(S.room, { curtain: "1", lamp: "1", rug: "1" });
    expect(fame().seats).toBe(4);                            // 3 sao + 3 đồ × 0.4 = 4.2 → Được biết đến
    Object.assign(S.room, { wall: "mint", floor: "wood", counter: "mint", wallItem: "1", plant: "2" });
    expect(fame().seats).toBe(6);                            // 3 + 3.2 = 6.2 → Viral
  });
});

describe("ca v4: mục tiêu, kho giữa ca, thưởng đồ ăn", () => {
  it("hết ca: mục tiêu đạt được cộng xu và tính vào lãi", async () => {
    const { finishShift, goalDone } = await import("../src/engine/shift");
    const sh = createShift();
    Object.assign(sh, { served: sh.goals[0].n, memo: 3, left: 0 });
    expect(sh.goals.every(g => goalDone(sh, g))).toBe(true);
    const coins = S.coins, led = finishShift(sh);
    expect(sh.goalCoins).toBe(120);
    expect(S.coins).toBe(coins + 120);
    expect(led.revenue).toBe(120);
  });

  it("có khách giận thì trượt mục tiêu Không để khách nào giận", async () => {
    const { goalDone } = await import("../src/engine/shift");
    const sh = createShift(); Object.assign(sh, { served: 5, left: 1 });
    expect(goalDone(sh, sh.goals.find(g => g.id === "calm")!)).toBe(false);
  });

  it("giao đúng không xem công thức thì đếm là tự nhớ", () => {
    const sh = createShift(); S.coins = 0;
    sh.seats[0] = customer(); sh.mine = 0;
    const r = RECIPES[0]; sh.build = { base: r.base, cream: r.cream, top: r.top, sweet: 0 };
    expect(serve(sh).ok).toBe(true);
    expect(sh.memo).toBe(1);
  });

  it("nhập đầy kho giữa ca theo giá nhập nhanh", async () => {
    const { refill, refillCost } = await import("../src/engine/economy");
    S.stock.base[0] = 2; S.coins = 1000;
    const cost = refillCost("base", 0);
    expect(cost).toBe(Math.ceil(2 * 8 * 1.5));
    expect(refill([{ k: "base", i: 0 }])).toBe(cost);
    expect(S.stock.base[0]).toBe(10);
    S.coins = 0; S.stock.base[1] = 0;
    expect(refill([{ k: "base", i: 1 }])).toBe(0);
  });

  it("thưởng: tủ hết thì mua 1 phần, mỗi ngày một lần", async () => {
    const { treat } = await import("../src/engine/economy");
    S.food = { kibble: 0, pate: 0, chicken: 0 }; S.coins = 100;
    expect(treat("dog", "kibble")).toBe(true);
    expect(S.coins).toBe(94);
    expect(treat("dog", "kibble")).toBe(false);
  });
});

describe("tài sản (bảng xếp hạng)", () => {
  it("xu + đồ trang trí đã mua + nguyên liệu + đồ ăn; mua đồ không làm tụt tài sản", async () => {
    const { netWorth } = await import("../src/engine/economy");
    S.coins = 500; S.owned = []; S.food = { kibble: 0, pate: 0, chicken: 0 };
    S.stock = { base: [0, 0, 0], cream: [0, 0, 0], top: [0, 0, 0] };
    expect(netWorth()).toEqual({ coins: 500, goods: 0, total: 500 });
    S.coins -= 120; S.owned.push("wall:mint"); S.food.kibble = 2; S.stock.base[0] = 3;
    expect(netWorth().total).toBe(380 + 120 + 2 * 6 + 3 * 2);
  });
});

describe("ví: sổ thu chi", () => {
  it("mua hàng, bán bánh, quà đều ghi vào sổ; tổng thu − tổng chi khớp với số dư", async () => {
    const { totalIn, totalOut, freshBook } = await import("../src/engine/wallet");
    S.coins = 0; S.book = freshBook();
    claimWelcome();                                   // +300
    expect(buy("cream", 0, 5)).toBe(true);            // −15
    const sh = createShift(); sh.seats[0] = customer(); sh.mine = 0;
    const r = RECIPES[0]; sh.build = { base: r.base, cream: r.cream, top: r.top, sweet: 0 };
    expect(serve(sh).ok).toBe(true);
    expect(S.coins).toBe(totalIn() - totalOut());
    expect(S.book.out.stock).toBe(15);
    expect(S.book.in.welcome).toBe(300);
    expect(S.book.in.sales).toBeGreaterThan(0);
    expect(S.book.log[S.book.log.length - 1].n).toBe("Quà khai trương");
  });

  describe("sức chứa tiệm", () => {
    it("người chơi mới có 2 bàn cấp 1 (4 ghế), 1 lầu, 4 chỗ đặt bàn", () => {
      expect(tableLvs()).toEqual([1, 1]); expect(capacity()).toBe(4); expect(spots()).toBe(4); expect(needUpgrade()).toBe(false);
    });

    it("người chơi cũ được tặng đủ ghế đang có (bản 2.52 lưu số ghế)", () => {
      S.venue.tbl = []; S.venue.tables = 5;
      expect(tableLvs()).toEqual([1, 1, 1]); expect(capacity()).toBe(6); expect(S.venue.tables).toBeUndefined();
    });

    it("giá bàn 300/600/1000, nâng bàn 400/800, lầu 1000 gấp đôi, mở rộng ngang 2000 gấp đôi", () => {
      S.coins = 100000; tableLvs();
      const c0 = S.coins; buyVenue("table"); expect(c0 - S.coins).toBe(300); expect(tableLvs().length).toBe(3);
      const c1 = S.coins; buyVenue("up"); expect(c1 - S.coins).toBe(400); expect(tableLvs()).toEqual([2, 1, 1]);
      expect(capacity()).toBe(3 + 2 + 2);
      const c2 = S.coins; buyVenue("floor"); expect(c2 - S.coins).toBe(1000); expect(S.venue.floors).toBe(2);
      const c3 = S.coins; buyVenue("floor"); expect(c3 - S.coins).toBe(2000);
      const c4 = S.coins; buyVenue("wide"); expect(c4 - S.coins).toBe(2000);
      const c5 = S.coins; buyVenue("wide"); expect(c5 - S.coins).toBe(4000);
      expect(spots()).toBe(3 * (4 + 4));
    });

    it("nâng bàn lên cấp 3 là tối đa, sau đó không nâng nữa", () => {
      S.coins = 100000; tableLvs();
      for (let i = 0; i < 4; i++) buyVenue("up");           // 2 bàn x 2 lần nâng
      expect(tableLvs()).toEqual([3, 3]); expect(capacity()).toBe(8);
      expect(buyVenue("up")).toBe(false);
    });

    it("hết chỗ đặt bàn thì không mua bàn được, phải lầu hoặc mở rộng", () => {
      S.coins = 100000; tableLvs();
      buyVenue("table"); buyVenue("table");
      expect(buyVenue("table")).toBe(false);
      expect(buyVenue("floor")).toBe(true);
      expect(buyVenue("table")).toBe(true);
    });

    it("thiếu xu thì không nâng cấp; số khách trong ca = min(khách cao điểm, ghế)", () => {
      S.coins = 10; tableLvs();
      expect(canAffordUpgrade()).toBe(false); expect(buyVenue("table")).toBe(false);
      expect(seatsNow()).toBe(Math.min(demand(), 4));
    });
  });

  describe("đầu tư tiệm sinh lời", () => {
    it("lầu, mở rộng và bàn cấp cao cộng điểm nổi tiếng", () => {
      S.coins = 1e6; tableLvs();
      expect(venueFame()).toBe(0);
      buyVenue("floor"); expect(venueFame()).toBeCloseTo(0.8);
      buyVenue("wide"); expect(venueFame()).toBeCloseTo(1.3);
      buyVenue("up"); expect(venueFame()).toBeCloseTo(1.55);
    });

    it("khách ngồi bàn cao trước; bàn cao khách kiên nhẫn hơn", () => {
      S.coins = 1e6; tableLvs(); buyVenue("up");                   // [2,1], 5 ghế, cao điểm 3
      expect(seatLevels()).toEqual([2, 2, 2]);
      const sh = createShift(); sh.next = 0; tick(sh, 1);
      const c = sh.seats[0]!; expect(c.seatLv).toBe(2); expect(c.max).toBeGreaterThanOrEqual(26 * 1.15 - 0.01);
    });

    it("ghế dư thì giữa ca có giờ vàng, thêm khách tối đa bằng ghế dư", () => {
      S.coins = 1e6; tableLvs(); for (let i = 0; i < 4; i++) buyVenue("up");   // [3,3]: 8 ghế, cao điểm 3 -> dư 5
      expect(spareSeats()).toBe(capacity() - demand());
      expect(spareSeats()).toBeGreaterThanOrEqual(4);
      const sh = createShift(), total0 = sh.total;
      expect(sh.rushExtra).toBeGreaterThanOrEqual(1); expect(sh.rushExtra).toBeLessThanOrEqual(spareSeats());
      sh.spawned = sh.rushAt;
      const out = tick(sh, 0.1);
      expect(out.rush).toBe(sh.rushExtra); expect(sh.total).toBe(total0 + sh.rushExtra);
      expect(tick(sh, 0.1).rush).toBe(0);                                         // chỉ một lần mỗi ca
    });

    it("không có ghế dư thì không có giờ vàng", () => {
      tableLvs(); S.venue.tbl = [1];                  // 2 ghế < cao điểm 3: không dư
      expect(spareSeats()).toBe(0); expect(createShift().rushExtra).toBe(0);
    });
  });

  describe("ghé thăm tiệm hàng xóm", () => {
    it("phí vé 2% số xu, tối thiểu 10, tối đa 100", () => {
      expect(visitFee(0)).toBe(10); expect(visitFee(200)).toBe(10); expect(visitFee(1000)).toBe(20);
      expect(visitFee(5000)).toBe(100); expect(visitFee(1e7)).toBe(100);
    });

    it("chủ tiệm nhận 70% phí làm tiền mừng", () => {
      expect(hostGift(10)).toBe(7); expect(hostGift(100)).toBe(70); expect(hostGift(33)).toBe(23);
    });

    it("sức chứa của tiệm hàng xóm tính theo cấp bàn", () => {
      expect(seatsOfTables([1, 1])).toBe(4); expect(seatsOfTables([3, 2, 1])).toBe(9);
    });

    it("đường dẫn ghé thăm nhận tên tiệm", () => {
      expect(resolve("/ghe-tham/ban.thu")).toEqual({ name: "visit", user: "ban.thu" });
      expect(resolve("/ghe-tham/")).toEqual({ name: "home" });
    });
  });
});
