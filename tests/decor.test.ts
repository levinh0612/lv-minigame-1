import { describe, expect, it } from "vitest";
import { fxDiff, roomItem } from "../src/content/room";

describe("fxDiff", () => {
  it("nêu rõ tăng và giảm so với món đang dùng", () => {
    expect(fxDiff(roomItem("lamp", "2"), roomItem("lamp", "3"))).toBe("tip +1%");
    expect(fxDiff(roomItem("lamp", "3"), roomItem("lamp", "4"))).toBe("kiên nhẫn +6%, tip −9%");
  });
  it("rỗng khi chỉ số giống nhau", () => expect(fxDiff(roomItem("wall", "mint"), roomItem("wall", "peach"))).toBe(""));
});
