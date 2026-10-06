import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { entityInfo, bakeText } from "../src/engine/entityinfo";
import { hire, treat } from "../src/engine/economy";
import { placeStaff } from "../src/engine/gacha";
import { rollDay } from "../src/engine/progress";
import { GACHA_ITEMS } from "../src/content/gacha";
import { S, resetState } from "../src/engine/state";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 5, 10)); resetState(); rollDay(); S.xp = 40 * 20 * 20; });
afterEach(() => vi.useRealTimers());

describe("entityInfo: nguồn thông tin chung cho mọi thẻ", () => {
  it("id lạ thì null", () => { expect(entityInfo("khong-co")).toBeNull(); });

  it("thú cưng 3 bé: là thợ bánh, có bậc, tốc độ, bữa ăn, không có độ hiếm", () => {
    S.food.kibble = 3;
    const i = entityInfo("dog")!;
    expect(i.kind).toBe("pet"); expect(i.rarity).toBeNull(); expect(i.staff).toBe(true);
    expect(i.tier).toBe(S.staff.dog.lv); expect(i.bake).toBe(bakeText(S.staff.dog.lv)); expect(i.meal?.id).toBe("kibble");
    expect(i.status?.t).toMatch(/Đi làm|Nghỉ|Đói/);
  });

  it("linh thú chưa thuê: có độ hiếm, chưa là thợ; thuê xong thì có bậc và buff làm thợ", () => {
    const m = GACHA_ITEMS.find(x => x.mascot)!;
    S.gacha.owned[m.id] = 1;
    let i = entityInfo(m.id)!;
    expect(i.kind).toBe("mascot"); expect(i.rarity).toBe(m.rarity); expect(i.owned).toBe(true); expect(i.staff).toBe(false); expect(i.tier).toBeNull();
    expect(i.fxChips.length).toBeGreaterThan(0);
    S.coins = 100000; expect(hire(m.id)).toBe(true);
    i = entityInfo(m.id)!;
    expect(i.staff).toBe(true); expect(i.tier).toBe(1); expect(i.workChips.map(c => c.tone)).toEqual(["price", "tip"]); expect(i.bond).not.toBeNull();
  });

  it("quản lý: chưa có thì Chưa có; đặt vào tầng thì ghi tầng", () => {
    const g = GACHA_ITEMS.find(x => x.mgr)!;
    expect(entityInfo(g.id)!.status?.t).toBe("Chưa có");
    S.gacha.owned[g.id] = 1;
    expect(entityInfo(g.id)!.status?.t).toBe("Rảnh");
    expect(placeStaff("mgr", g.id, 0)).toBe(true);
    const i = entityInfo(g.id)!;
    expect(i.kind).toBe("manager"); expect(i.floor).toBe(0); expect(i.status?.t).toBe("Tầng 1"); expect(i.role?.n).toBe("Quản lý");
  });

  it("khách quen Hiếm trở lên làm quản lý được: có chỉ số khi đứng tầng; Thường thì không", () => {
    const rare = GACHA_ITEMS.find(x => x.char && x.rarity === "rare")!, common = GACHA_ITEMS.find(x => x.char && x.rarity === "common")!;
    expect(entityInfo(rare.id)!.kind).toBe("regular"); expect(entityInfo(rare.id)!.fxChips.length).toBeGreaterThan(0);
    expect(entityInfo(common.id)!.fxChips).toEqual([]);
  });

  it("cho ăn thưởng thì linh thú tăng thân thiết (bond) trong thông tin", () => {
    const m = GACHA_ITEMS.find(x => x.mascot)!; S.gacha.owned[m.id] = 1; S.coins = 100000; hire(m.id);
    S.food.kibble = 5; const before = entityInfo(m.id)!.bond!;
    treat(m.id, "kibble");
    expect(entityInfo(m.id)!.bond!).toBeGreaterThanOrEqual(before);
  });
});
