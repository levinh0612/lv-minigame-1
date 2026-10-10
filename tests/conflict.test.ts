import { describe, expect, it } from "vitest";
import { ahead, lossLines, snapOf } from "../src/engine/conflict";

const A = { lv: 5, coins: 100, shifts: 10, earned: 5000, served: 80, at: "" };
describe("so sánh hai bản lưu", () => {
  it("đọc các số từ bản lưu, thiếu thì là 0", () => {
    expect(snapOf({ xp: 160, coins: 7, shifts: 3, earned: 99, served: 4, cloud: { at: "2026-10-10T10:00:00Z" } })).toEqual({ lv: 3, coins: 7, shifts: 3, earned: 99, served: 4, at: "2026-10-10T10:00:00Z" });
    expect(snapOf({})).toMatchObject({ lv: 1, coins: 0, shifts: 0 });
    expect(snapOf(null)).toBeNull();
  });
  it("bản nào tiến xa hơn: cấp trước, rồi xu kiếm được, rồi số ca", () => {
    expect(ahead({ ...A, lv: 6 }, A)).toBe("mine");
    expect(ahead(A, { ...A, lv: 7, earned: 1 })).toBe("cloud");
    expect(ahead({ ...A, earned: 6000 }, A)).toBe("mine");
    expect(ahead({ ...A, shifts: 9 }, A)).toBe("cloud");
    expect(ahead(A, { ...A })).toBe("same");
  });
  it("liệt kê phần sẽ mất", () => {
    expect(lossLines({ ...A, lv: 3, earned: 1000, shifts: 4 }, A)).toEqual(["2 cấp (Lv 5 → 3)", "4.000 xu đã kiếm", "6 ca đã chơi"]);
    expect(lossLines({ ...A, lv: 9 }, A)).toEqual([]);
  });
});
