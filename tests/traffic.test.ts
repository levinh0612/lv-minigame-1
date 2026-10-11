import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildTraffic } from "../src/scene/vehicles";

describe("xe ngoài phố", () => {
  const run = (call: boolean) => {
    const tr = buildTraffic(new THREE.Group(), 7.3, "#f88", 1.3); if (call) tr.callVan();
    const log: { t: number; x: number; label: string }[] = []; let t = 0;
    for (let i = 0; i < 60 * 40; i++) { t += 1 / 30; tr.update(t); const v = tr.active().find(a => a.label === "Đang giao hàng"); if (v) log.push({ t, x: v.x, label: v.label }); }
    return log;
  };
  it("có đơn giao: xe giao bánh dừng trước cửa tiệm rồi đi tiếp", () => {
    const log = run(true), near = log.filter(l => Math.abs(l.x - 1.3) < .1);
    expect(near.length / 30).toBeGreaterThan(2.5);          // đứng yên ít nhất ~3 giây
    expect(Math.max(...log.map(l => l.x))).toBeLessThan(1.4); // không lố qua cửa khi còn nhãn "Đang giao hàng"
    expect(log[log.length - 1]!.x).toBeLessThan(1.4);
  });
  it("không có đơn giao: không có xe nào mang nhãn đang giao hàng", () => { expect(run(false)).toHaveLength(0); });
});
