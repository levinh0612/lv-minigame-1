/* Lõi tìm kiếm, lọc, sắp xếp dùng chung cho mọi danh sách (bánh, công thức, nguyên liệu, đội ngũ, bộ sưu tập).
   Thuần dữ liệu, không đụng giao diện; phần vẽ ở ui/components/listtools.ts. */

/** bỏ dấu tiếng Việt, hạ chữ thường: "Bánh Dâu" → "banh dau" (gõ không dấu vẫn tìm ra) */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

/** mọi từ trong ô tìm đều phải xuất hiện (không cần đúng thứ tự) ở một trong các chuỗi của món */
export function matchQuery(q: string, texts: string[]): boolean {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = texts.map(fold).join(" ");
  return words.every(w => hay.includes(w));
}

export interface ListView { q: string; f: Record<string, string>; sort: string; desc: boolean }
export const newView = (sort = ""): ListView => ({ q: "", f: {}, sort, desc: false });

export interface ListCfg<T> {
  text: (t: T) => string[];                                             // chuỗi để tìm
  groups?: Record<string, Record<string, (t: T) => boolean>>;           // nhóm lọc → từng lựa chọn (không có lựa chọn = "all", qua hết)
  sorts?: Record<string, (a: T, b: T) => number>;                       // kiểu sắp xếp tăng dần; "" hoặc không có = giữ thứ tự gốc
}

/** lọc theo ô tìm và các nhóm lọc, rồi sắp xếp (sort ổn định: bằng nhau thì giữ thứ tự gốc) */
export function applyView<T>(items: readonly T[], v: ListView, cfg: ListCfg<T>): T[] {
  const tests = Object.entries(v.f).map(([g, id]) => cfg.groups?.[g]?.[id]).filter((x): x is (t: T) => boolean => !!x);
  const out = items.filter(t => tests.every(f => f(t)) && matchQuery(v.q, cfg.text(t)));
  const cmp = v.sort ? cfg.sorts?.[v.sort] : undefined;
  if (!cmp) return out;
  const idx = new Map(out.map((t, i) => [t, i] as const));
  return out.sort((a, b) => (v.desc ? -cmp(a, b) : cmp(a, b)) || idx.get(a)! - idx.get(b)!);
}

/** đếm số món khớp từng lựa chọn của một nhóm (đã áp ô tìm và các nhóm khác, để con số trên chip luôn đúng với kết quả) */
export function countBy<T>(items: readonly T[], v: ListView, cfg: ListCfg<T>, group: string): Record<string, number> {
  const g = cfg.groups?.[group] ?? {}, rest = { ...v, f: { ...v.f } }; delete rest.f[group];
  const base = applyView(items, { ...rest, sort: "" }, cfg), r: Record<string, number> = { all: base.length };
  for (const [id, f] of Object.entries(g)) r[id] = base.filter(f).length;
  return r;
}

export const byNum = <T>(f: (t: T) => number) => (a: T, b: T) => f(a) - f(b);
export const byText = <T>(f: (t: T) => string) => (a: T, b: T) => f(a).localeCompare(f(b), "vi");
