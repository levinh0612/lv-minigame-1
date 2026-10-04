import { describe, expect, it } from "vitest";
import { STYLES, STYLE_NAME, STYLE_OF, styleOf } from "../src/content/game";

describe("kiểu đầu 3D", () => {
  it("người chơi cũ: mã nhân vật cũ ánh xạ sang kiểu đầu tương ứng", () => {
    expect(styleOf({ sprite: "b2" })).toBe("beanie");
    expect(styleOf({ sprite: "g5" })).toBe("glasses");
    expect(styleOf({ sprite: "b1" })).toBe("");          // b1, g1: tóc gốc
  });
  it("đã chọn kiểu riêng thì ưu tiên kiểu đó, kể cả 'Gốc'", () => {
    expect(styleOf({ sprite: "b2", style: "bun" })).toBe("bun");
    expect(styleOf({ sprite: "b2", style: "" })).toBe("");
  });
  it("mọi mã cũ đều trỏ tới một kiểu có trong danh sách", () => {
    const ids = new Set(STYLES.map(([id]) => id));
    Object.values(STYLE_OF).forEach(k => expect(ids.has(k)).toBe(true));
    STYLES.forEach(([id, n]) => expect(STYLE_NAME[id]).toBe(n));
  });
});
