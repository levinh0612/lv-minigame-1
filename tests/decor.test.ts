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
  const base = { wall: "pink", floor: "check", counter: "pink", curtain: "0", lamp: "0", wallItem: "0", plant: "0", rug: "0", sign: "0", awning: "0", flower: "0" };
  it("đồ mặc định không tính vào bộ nào", () => expect(setStates(base)).toEqual([]));
  it("đủ 3 món thì nhận thưởng bậc 1, đủ 5 thì thay bằng bậc 2", () => {
    const three = setStates({ ...base, curtain: "1", lamp: "1", plant: "4" }).find(s => s.set.id === "pink")!;
    expect(three.count).toBe(3); expect(three.fx).toEqual({ tip: .03 }); expect(three.next).toBe(5);
    const five = setStates({ ...base, curtain: "1", lamp: "1", plant: "4", rug: "2", flower: "1" }).find(s => s.set.id === "pink")!;
    expect(five.fx).toEqual({ tip: .06 });
  });
  it("chưa đủ 3 món thì chưa có thưởng", () => expect(setStates({ ...base, curtain: "1" })[0]!.fx).toEqual({}));
});
