import { beforeEach, describe, expect, it } from "vitest";
import { STICKERS, STORIES } from "../src/content/collection";
import { buyOutfit, giveSticker, hasOutfit, hasSticker, wear, wornBy } from "../src/engine/collection";
import { advanceStory, planStory, storyProg } from "../src/engine/story";
import { addSeasonServed, seasonNow } from "../src/engine/season";
import { challengeActive, challengeDone, setChallenge } from "../src/engine/challenge";
import { S, resetState } from "../src/engine/state";

beforeEach(() => { resetState(); S.shifts = 5; });

describe("sticker và tủ đồ", () => {
  it("sticker chỉ nhận một lần", () => {
    const id = STICKERS[0]!.id;
    expect(giveSticker(id)).not.toBeNull(); expect(hasSticker(id)).toBe(true);
    expect(giveSticker(id)).toBeNull();
  });
  it("mua đồ trừ xu, thiếu xu thì không mua được", () => {
    S.coins = 100; expect(buyOutfit("bow")).toBe(false);
    S.coins = 1000; expect(buyOutfit("bow")).toBe(true); expect(hasOutfit("bow")).toBe(true); expect(S.coins).toBe(700);
    expect(buyOutfit("bow")).toBe(false);
  });
  it("mặc đồ: chỉ mặc đồ đã có, mỗi món một bé, cởi bằng chuỗi rỗng", () => {
    expect(wear("a", "bow")).toBe(false);
    S.coins = 1000; buyOutfit("bow");
    wear("a", "bow"); wear("b", "bow");
    expect(wornBy("a")).toBeNull(); expect(wornBy("b")!.id).toBe("bow");
    wear("b", ""); expect(wornBy("b")).toBeNull();
  });
});

describe("truyện khách quen", () => {
  it("người mới hoặc ca ngắn thì không có truyện", () => {
    S.shifts = 1; expect(planStory(10, -1, () => 0)).toBeNull();
    S.shifts = 5; expect(planStory(4, -1, () => 0)).toBeNull();
  });
  it("lên chương lần lượt rồi dừng ở chương cuối", () => {
    const s = STORIES[0]!;
    for (let i = 1; i <= s.chapters.length; i++) { const r = advanceStory(s.id)!; expect(r.chapter).toBe(i); expect(storyProg(s.id)).toBe(i); }
    expect(advanceStory(s.id)).toBeNull();
  });
});

describe("sự kiện và thử thách", () => {
  it("ngoài mùa thì không tính khách", () => {
    expect(seasonNow("2026-01-20")).toBeNull();
    expect(addSeasonServed(10, "2026-01-20")).toEqual([]);
  });
  it("trong mùa thì cộng khách và trả thưởng khi đạt mốc", () => {
    const now = seasonNow("2026-10-15"); expect(now).not.toBeNull();
    const notes = addSeasonServed(20, "2026-10-15"); expect(notes.length).toBeGreaterThan(0);
  });
  it("bật/tắt thử thách theo ngày", () => {
    setChallenge(true, "2026-10-15"); expect(challengeActive("2026-10-15")).toBe(true);
    expect(challengeActive("2026-10-16")).toBe(false);
    setChallenge(false, "2026-10-15"); expect(challengeActive("2026-10-15")).toBe(false);
    expect(challengeDone("2026-10-15")).toBe(false);
  });
});
