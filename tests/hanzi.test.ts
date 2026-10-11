import { beforeEach, describe, expect, it } from "vitest";
import { HANZI_TONES, HANZI_WORDS } from "../src/content/hanzi";
import { hanziParams, hanziResult, hanziTier, hanziTitle, pickHanzi, pickWord, pickWriteSet, recognizeTone, starsOf, strokeCount, weakHanzi, withTone, wordPinyin, writeParams, writeResult, zhState, type Pt } from "../src/engine/hanzi";
import { resetState } from "../src/engine/state";

/** nét vẽ qua các điểm mốc, nội suy thêm điểm để giống ngón tay kéo */
const stroke = (...k: [number, number][]): Pt[] => {
  const out: Pt[] = [];
  for (let i = 1; i < k.length; i++) for (let s = 0; s < 10; s++) out.push({ x: k[i - 1]![0] + (k[i]![0] - k[i - 1]![0]) * s / 10, y: k[i - 1]![1] + (k[i]![1] - k[i - 1]![1]) * s / 10 });
  out.push({ x: k.at(-1)![0], y: k.at(-1)![1] }); return out;
};

describe("nhận dạng thanh điệu", () => {
  it("gạch ngang = thanh 1 (cả hai chiều, lệch nhẹ vẫn được)", () => {
    expect(recognizeTone(stroke([20, 100], [220, 100]))).toBe(1);
    expect(recognizeTone(stroke([220, 100], [20, 104]))).toBe(1);
    expect(recognizeTone(stroke([20, 100], [220, 70]))).toBe(1);
  });
  it("gạch lên phải = thanh 2, gạch xuống phải = thanh 4", () => {
    expect(recognizeTone(stroke([20, 180], [200, 40]))).toBe(2);
    expect(recognizeTone(stroke([20, 40], [200, 180]))).toBe(4);
  });
  it("xuống rồi lên = thanh 3 (chữ V và nét cong)", () => {
    expect(recognizeTone(stroke([20, 60], [100, 160], [200, 50]))).toBe(3);
    expect(recognizeTone(stroke([20, 60], [60, 140], [110, 160], [160, 120], [200, 50]))).toBe(3);
  });
  it("chạm một cái hoặc nét rất ngắn = thanh nhẹ", () => {
    expect(recognizeTone([{ x: 50, y: 50 }])).toBe(0);
    expect(recognizeTone(stroke([50, 50], [58, 54]))).toBe(0);
  });
  it("nét lung tung hoặc rỗng thì không nhận", () => {
    expect(recognizeTone([])).toBeNull();
    expect(recognizeTone(stroke([20, 100], [120, 100], [20, 100], [120, 100], [20, 100]))).toBeNull();
    expect(recognizeTone(stroke([100, 40], [100, 180]))).toBe(4);   // gạch thẳng xuống vẫn tính thanh 4
  });
  it("nét lên mà đầu cuối đi ngược lại (trái xuống) không bị nhầm thanh 2", () => {
    expect(recognizeTone(stroke([200, 40], [20, 180]))).toBeNull();
  });
});

describe("pinyin có dấu", () => {
  it.each([["ma", 1, "mā"], ["hao", 3, "hǎo"], ["liu", 4, "liù"], ["shui", 3, "shuǐ"], ["xue", 2, "xué"], ["gou", 3, "gǒu"], ["zhong", 1, "zhōng"], ["guo", 2, "guó"], ["ni", 3, "nǐ"], ["de", 0, "de"]] as const)(
    "%s thanh %d → %s", (s, t, r) => expect(withTone(s, t)).toBe(r));
});

describe("dữ liệu HSK 1", () => {
  it("mỗi chữ có pinyin viết thường không dấu, không trùng chữ, đủ cả 5 thanh", () => {
    expect(new Set(HANZI_TONES.map(z => z.h)).size).toBe(HANZI_TONES.length);
    for (const z of HANZI_TONES) expect(z.py).toMatch(/^[a-z]+$/);
    expect(new Set(HANZI_TONES.map(z => z.tone))).toEqual(new Set([0, 1, 2, 3, 4]));
  });
});

describe("chọn chữ và kết quả", () => {
  it("chỉ chọn chữ có thanh được phép, không lặp chữ vừa ra", () => {
    let i = 0; const rng = () => ((i++ * 0.37) % 1);
    for (let n = 0; n < 60; n++) { const z = pickHanzi([2, 3], {}, rng, "我"); expect([2, 3]).toContain(z.tone); expect(z.h).not.toBe("我"); }
  });
  it("chữ hay sai được chọn nhiều hơn hẳn", () => {
    let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let hit = 0; for (let n = 0; n < 600; n++) if (pickHanzi([1, 2, 3, 4], { 大: 3 }, rng).h === "大") hit++;
    expect(hit).toBeGreaterThan(600 / 52 * 3);   // trọng số 7 so với 1: gấp xa mức đều
  });
  it("thông số khó dần theo bậc", () => {
    expect(hanziParams(0).tones).not.toContain(0);
    expect(hanziParams(1).tones).toContain(0);
    expect(hanziParams(6).fall).toBeLessThan(hanziParams(0).fall);
    expect(hanziParams(6).total).toBeGreaterThan(hanziParams(0).total);
    expect(hanziParams(0).legend).toBe(true);
    expect(hanziParams(6).legend).toBe(false);
  });
  it("tính điểm: thắng cần còn mạng, 70% bóng được 1 điểm, không mất mạng được 2", () => {
    const P = hanziParams(0);   // 8 bóng, 3 mạng
    expect(hanziResult(P, 8, 0)).toMatchObject({ ok: true, xp: 2, lives: 3 });
    expect(hanziResult(P, 6, 2)).toMatchObject({ ok: true, xp: 1, lives: 1 });
    expect(hanziResult(P, 4, 1)).toMatchObject({ ok: true, xp: 0 });
    expect(hanziResult(P, 5, 3)).toMatchObject({ ok: false, xp: 0, lives: 0 });
  });
});

describe("tiến độ và danh hiệu", () => {
  beforeEach(() => resetState());
  it("điểm tăng thì lên danh hiệu", () => {
    expect(hanziTitle()).toBe("Học trò mới");
    zhState().xp = 5; expect(hanziTier()).toBe(1); expect(hanziTitle()).toBe("Học trò chăm");
    zhState().xp = 200; expect(hanziTitle()).toBe("Văn thánh");
  });
  it("chữ sai nhiều nhất xếp trước", () => {
    zhState().wrong = { 大: 1, 我: 4, 不: 2 };
    expect(weakHanzi().map(z => z.h)).toEqual(["我", "不", "大"]);
  });
});

describe("luyện viết chữ", () => {
  let seed = 11; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  it("mọi chữ HSK đều có dữ liệu số nét", () => { for (const z of HANZI_TONES) expect(strokeCount(z.h), z.h).toBeGreaterThan(0); });
  it("bậc thấp chỉ ra chữ ít nét, đủ số chữ và không trùng", () => {
    for (const tier of [0, 3, 6]) {
      const P = writeParams(tier), set = pickWriteSet(tier, {}, rng);
      expect(set).toHaveLength(P.count); expect(new Set(set.map(z => z.h)).size).toBe(P.count);
      for (const z of set) expect(strokeCount(z.h)).toBeLessThanOrEqual(P.maxStrokes);
    }
  });
  it("chữ hay sai được ưu tiên vào bộ chữ", () => {
    let hit = 0; for (let n = 0; n < 200; n++) if (pickWriteSet(0, { 水: 3 }, rng).some(z => z.h === "水")) hit++;
    expect(hit).toBeGreaterThan(200 * 4 / 24 * 1.6);   // gấp xa mức đều (4 trong 24 chữ)
  });
  it("sao theo số lỗi, điểm danh hiệu theo số chữ viết không sai", () => {
    expect([starsOf(0), starsOf(2), starsOf(3)]).toEqual([3, 2, 1]);
    const c = (...m: number[]) => m.map((mistakes, i) => ({ h: "大不是去四"[i]!, mistakes }));
    expect(writeResult(c(0, 0, 0, 0)).xp).toBe(2);
    expect(writeResult(c(0, 0, 1, 3)).xp).toBe(1);
    expect(writeResult(c(0, 1, 1, 3)).xp).toBe(0);
  });
  it("bậc thấp có khung mờ và chạy mẫu, bậc cao thì không", () => {
    expect(writeParams(0)).toMatchObject({ outline: true, demo: true });
    expect(writeParams(5)).toMatchObject({ outline: false, demo: false });
  });
});

describe("boss từ ghép", () => {
  it("từ có dữ liệu hợp lệ, không trùng", () => {
    expect(new Set(HANZI_WORDS.map(w => w.w)).size).toBe(HANZI_WORDS.length);
    for (const w of HANZI_WORDS) { expect([...w.w]).toHaveLength(2); expect(w.a + w.b).toMatch(/^[a-z]+$/); }
  });
  it("pinyin có dấu cả hai âm tiết", () => { expect(wordPinyin(HANZI_WORDS[0]!)).toBe("nǐ hǎo"); });
  it("từ hay sai được chọn nhiều hơn", () => {
    let seed = 5; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let hit = 0; for (let n = 0; n < 600; n++) if (pickWord({ 你好: 3 }, rng).w === "你好") hit++;
    expect(hit).toBeGreaterThan(600 / HANZI_WORDS.length * 3);
  });
  it("boss chỉ từ bậc 1; hạ boss +1 điểm, thua boss mất 2 mạng", () => {
    expect(hanziParams(0).boss).toBe(false); expect(hanziParams(1).boss).toBe(true);
    const P = hanziParams(1);
    expect(hanziResult(P, P.total, 0, "won")).toMatchObject({ ok: true, xp: 3, boss: "won" });
    expect(hanziResult(P, P.total, 2, "lost")).toMatchObject({ ok: true, xp: 1, lives: 1 });
    expect(hanziResult(P, P.total, 3, "lost")).toMatchObject({ ok: false, xp: 0 });
  });
});
