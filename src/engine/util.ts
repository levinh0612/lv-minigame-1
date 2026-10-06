export const DAY = 86400000;
export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const fmtD = (d: Date) => pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
export const fmtN = (n: number) => n.toLocaleString("vi-VN");
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
export const nameList = (s: string | undefined) => { const l = String(s || "").split(",").map(x => x.trim()).filter(Boolean); return l.length ? l : ["Khách"]; };

/** số La Mã cho bậc nhân viên (1 đến 10) */
export const roman = (n: number) => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][Math.max(0, Math.min(10, Math.floor(n)))] ?? String(n);
