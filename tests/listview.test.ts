import { describe, expect, it } from "vitest";
import { applyView, byNum, byText, countBy, fold, matchQuery, newView, type ListCfg } from "../src/engine/listview";

interface It { n: string; price: number; own: boolean }
const items: It[] = [
  { n: "Bánh Dâu", price: 30, own: true }, { n: "Đào sữa", price: 10, own: false },
  { n: "Matcha lạnh", price: 50, own: true }, { n: "Bánh Đào", price: 10, own: true }
];
const cfg: ListCfg<It> = {
  text: t => [t.n],
  groups: { own: { yes: t => t.own, no: t => !t.own }, cheap: { c: t => t.price <= 30 } },
  sorts: { price: byNum(t => t.price), name: byText(t => t.n) }
};

describe("danh sách: tìm, lọc, sắp xếp", () => {
  it("bỏ dấu tiếng Việt, kể cả đ", () => {
    expect(fold("Bánh Đào Dâu")).toBe("banh dao dau");
    expect(matchQuery("dao", ["Đào sữa"])).toBe(true);
    expect(matchQuery("sua dao", ["Đào sữa"])).toBe(true);        // từ nào cũng được, không cần đúng thứ tự
    expect(matchQuery("xyz", ["Đào sữa"])).toBe(false);
    expect(matchQuery("   ", ["gì cũng được"])).toBe(true);
  });
  it("ô tìm rỗng và không lọc thì giữ nguyên thứ tự", () => {
    expect(applyView(items, newView(), cfg)).toEqual(items);
  });
  it("lọc nhiều nhóm cùng lúc", () => {
    const v = { ...newView(), f: { own: "yes", cheap: "c" } };
    expect(applyView(items, v, cfg).map(t => t.n)).toEqual(["Bánh Dâu", "Bánh Đào"]);
  });
  it("lựa chọn lạ (all, không có trong nhóm) thì không lọc", () => {
    expect(applyView(items, { ...newView(), f: { own: "all" } }, cfg)).toHaveLength(4);
  });
  it("sắp xếp ổn định, đảo chiều giữ nguyên thứ tự gốc khi bằng nhau", () => {
    expect(applyView(items, newView("price"), cfg).map(t => t.n)).toEqual(["Đào sữa", "Bánh Đào", "Bánh Dâu", "Matcha lạnh"]);
    expect(applyView(items, { ...newView("price"), desc: true }, cfg).map(t => t.n)).toEqual(["Matcha lạnh", "Bánh Dâu", "Đào sữa", "Bánh Đào"]);
    expect(applyView(items, newView("name"), cfg)[0]!.n).toBe("Bánh Dâu");
  });
  it("kiểu sắp xếp lạ thì giữ thứ tự gốc", () => {
    expect(applyView(items, newView("khong-co"), cfg)).toEqual(items);
  });
  it("không sửa mảng gốc", () => {
    const copy = [...items]; applyView(items, newView("price"), cfg); expect(items).toEqual(copy);
  });
  it("đếm theo nhóm: áp ô tìm và nhóm khác, bỏ qua chính nhóm đó", () => {
    const v = { ...newView(), q: "banh", f: { own: "no" } };
    expect(countBy(items, v, cfg, "own")).toEqual({ all: 2, yes: 2, no: 0 });
    expect(countBy(items, v, cfg, "cheap")).toEqual({ all: 0, c: 0 });
  });
});
