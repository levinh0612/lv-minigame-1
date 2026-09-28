/* Dùng chung cho các API: kết nối Neon (khởi tạo lười), băm mã tiệm, trả JSON */
import { createHash, randomInt } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;
export const db = () => (_sql ??= neon(process.env.DATABASE_URL!));

/* mã tiệm: 16 ký tự A-Z2-9 (có thể kèm dấu gạch); lưu bản băm, không lưu mã gốc */
const CODE_RE = /^[A-HJ-NP-Z2-9]{16}$/;
export const normCode = (c: unknown) => String(c ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const validCode = (c: string) => CODE_RE.test(c);
export const hashCode = (c: string) => createHash("sha256").update("tiem-banh:" + c).digest("hex");

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export const bad = (msg: string, status = 400) => json({ error: msg }, status);

export async function body<T>(req: Request, max = 256 * 1024): Promise<T | null> {
  const t = await req.text();
  if (t.length > max) return null;
  try { return JSON.parse(t) as T; } catch { return null; }
}
/* tên hiện trên bảng xếp hạng: gọn, không ký tự điều khiển */
export const cleanName = (s: unknown) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24);
/* mã ngắn 6 ký tự (ghép đôi, chuyển máy): không có I, O, 0, 1 cho khỏi nhầm */
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newToken = () => Array.from({ length: 6 }, () => ALPHA[randomInt(ALPHA.length)]).join("");
