import { beforeEach, describe, expect, it } from "vitest";
import { RECIPES } from "../src/content/game";
import { MAX_PINS, PIN_SHARE, isPinned, pickMenu, togglePin } from "../src/engine/progress";
import { S, resetState } from "../src/engine/state";

beforeEach(() => resetState());

describe("ghim món ruột", () => {
  it("ghim và bỏ ghim", () => {
    expect(isPinned("r1")).toBe(false);
    expect(togglePin("r1")).toBe(true); expect(isPinned("r1")).toBe(true);
    expect(togglePin("r1")).toBe(true); expect(isPinned("r1")).toBe(false);
  });
  it("tối đa MAX_PINS món, ghim thêm bị từ chối", () => {
    RECIPES.slice(0, MAX_PINS).forEach(r => expect(togglePin(r.id)).toBe(true));
    expect(togglePin(RECIPES[MAX_PINS]!.id)).toBe(false);
    expect(S.pins).toHaveLength(MAX_PINS);
    expect(togglePin(RECIPES[0]!.id)).toBe(true);           // bỏ ghim luôn được
  });
  it("khách gọi món ruột khoảng PIN_SHARE số lần, chưa ghim thì chọn đều", () => {
    const rs = RECIPES.slice(0, 20);
    expect(PIN_SHARE).toBe(0.5);
    const seq = (v: number[]) => { let i = 0; return () => v[i++ % v.length]!; };
    togglePin(rs[3]!.id);
    expect(pickMenu(rs, seq([0.4, 0.9])).id).toBe(rs[3]!.id);      // rng < PIN_SHARE: chọn trong món ruột
    expect(pickMenu(rs, seq([0.6, 0.0])).id).toBe(rs[0]!.id);      // ngoài: chọn đều trong cả menu
    resetState();
    expect(pickMenu(rs, seq([0.1, 0.5])).id).toBe(rs[2]!.id);      // không ghim: chọn đều theo rng (0.1 × 20 = ô 2)
  });
  it("món đã ghim mà chưa mở bán thì bỏ qua", () => {
    togglePin("khong-co");
    const rs = RECIPES.slice(0, 5);
    expect(rs).toContain(pickMenu(rs, () => 0.1));
  });
});
