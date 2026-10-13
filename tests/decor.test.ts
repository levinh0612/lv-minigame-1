import { describe, expect, it } from "vitest";
import { fxDiff, roomItem } from "../src/content/room";

describe("fxDiff", () => {
  it("nêu rõ tăng và giảm so với món đang dùng", () => {
    expect(fxDiff(roomItem("lamp", "2"), roomItem("lamp", "3"))).toBe("tip +1%");
    expect(fxDiff(roomItem("lamp", "3"), roomItem("lamp", "4"))).toBe("kiên nhẫn +6%, tip −9%");
  });
  it("rỗng khi chỉ số giống nhau", () => expect(fxDiff(roomItem("wall", "mint"), roomItem("wall", "peach"))).toBe(""));
});

import { setStates } from "../src/content/room";
describe("thưởng bộ trang trí", () => {
  const base = { wall: "pink", floor: "check", counter: "pink", curtain: "0", lamp: "0", wallItem: "0", plant: "0", rug: "0", sign: "0", awning: "0", flower: "0", bunting: "0", pot: "0", bench: "0" };
  it("đồ mặc định không tính vào bộ nào", () => expect(setStates(base)).toEqual([]));
  it("đủ 3 món thì nhận thưởng bậc 1, đủ 5 thì thay bằng bậc 2", () => {
    const three = setStates({ ...base, curtain: "1", lamp: "1", plant: "4" }).find(s => s.set.id === "pink")!;
    expect(three.count).toBe(3); expect(three.fx).toEqual({ tip: .03 }); expect(three.next).toBe(5);
    const five = setStates({ ...base, curtain: "1", lamp: "1", plant: "4", rug: "2", flower: "1" }).find(s => s.set.id === "pink")!;
    expect(five.fx).toEqual({ tip: .06 });
  });
  it("chưa đủ 3 món thì chưa có thưởng", () => expect(setStates({ ...base, curtain: "1" })[0]!.fx).toEqual({}));
});

import { beforeEach } from "vitest";
import { ROOM_CATS } from "../src/content/room";
import { applyDecor, cancelDecor, pickDecorCat, setDecorCat, stashDecor, tryDecor } from "../src/engine/decor";
import { S, resetState } from "../src/engine/state";

describe("chạm đồ, thử, mua, cất", () => {
  beforeEach(() => { resetState(); setDecorCat(0); cancelDecor(); });
  const idx = (k: string) => ROOM_CATS.findIndex(c => c.k === k);
  it("cất đồ về mặc định, đồ vẫn còn trong kho và dùng lại miễn phí", () => {
    S.coins = 1000; S.xp = 4000; setDecorCat(idx("lamp")); tryDecor("lamp", "2"); const coins0 = S.coins;
    expect(applyDecor()).toMatch(/Đã mua/); expect(S.room.lamp).toBe("2"); expect(S.coins).toBe(coins0 - 140);
    expect(stashDecor()).toMatch(/Đã cất/); expect(S.room.lamp).toBe("0"); expect(S.owned).toContain("lamp:2");
    tryDecor("lamp", "2"); expect(applyDecor()).toMatch(/Đã đổi/); expect(S.coins).toBe(coins0 - 140);
  });
  it("nhóm đang là mặc định thì không có gì để cất", () => { setDecorCat(idx("rug")); expect(stashDecor()).toBe(""); });
  it("chạm đồ cùng nhóm giữ món đang thử, khác nhóm thì bỏ thử", () => {
    S.coins = 1000; S.xp = 4000; setDecorCat(idx("lamp")); tryDecor("lamp", "2"); pickDecorCat("lamp"); expect(applyDecor()).toMatch(/Đã mua/);
    tryDecor("lamp", "1"); pickDecorCat("plant"); expect(applyDecor()).toBe("");
  });
  it("chưa đủ cấp thì không mua được", () => { S.coins = 9999; S.xp = 0; setDecorCat(idx("lamp")); tryDecor("lamp", "3"); expect(applyDecor()).toBe(""); expect(S.room.lamp).toBe("0"); });
});
