/* Dùng chung cho các API: kết nối Neon (khởi tạo lười), băm PIN, phiên đăng nhập, trả JSON */
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;
export const db = () => (_sql ??= neon(process.env.DATABASE_URL!));

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export const bad = (msg: string, status = 400) => json({ error: msg }, status);
export async function body<T>(req: Request, max = 256 * 1024): Promise<T | null> {
  const t = await req.text();
  if (t.length > max) return null;
  try { return JSON.parse(t) as T; } catch { return null; }
}

/* username: chữ thường không dấu, số, dấu chấm, gạch dưới; 3–20 ký tự */
export const normUser = (u: unknown) => String(u ?? "").trim().toLowerCase();
export const validUser = (u: string) => /^[a-z0-9._]{3,20}$/.test(u);
export const validPin = (p: unknown) => /^\d{4}$/.test(String(p ?? ""));
/* câu trả lời bí mật: bỏ dấu, chữ thường, gọn khoảng trắng */
export const normAnswer = (a: unknown) => String(a ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ").trim();
export const cleanText = (s: unknown, max: number) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);

/* băm bằng scrypt: "salt:hash" */
const kdf = (v: string, salt: Buffer) => new Promise<Buffer>((ok, no) => scrypt(v, salt, 32, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? no(e) : ok(k))));
export async function hashSecret(v: string) { const salt = randomBytes(16); return salt.toString("hex") + ":" + (await kdf(v, salt)).toString("hex"); }
export async function checkSecret(v: string, stored: string) {
  const [s, h] = stored.split(":"); if (!s || !h) return false;
  const k = await kdf(v, Buffer.from(s, "hex")), H = Buffer.from(h, "hex");
  return k.length === H.length && timingSafeEqual(k, H);
}

/* phiên đăng nhập: token ngẫu nhiên trên máy, server chỉ giữ sha256 */
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
export async function newSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  await db()`INSERT INTO sessions (token_hash, user_id) VALUES (${sha(token)}, ${userId})`;
  return token;
}
export async function endSession(token: string) { await db()`DELETE FROM sessions WHERE token_hash = ${sha(token)}`; }
export const tokenOf = (req: Request) => (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
/* người dùng của request (null nếu chưa đăng nhập / phiên đã bị đăng xuất) */
export async function authUser(req: Request): Promise<{ id: number; username: string } | null> {
  const t = tokenOf(req); if (!t) return null;
  const r = await db()`UPDATE sessions s SET seen_at = now() FROM users u WHERE s.token_hash = ${sha(t)} AND u.id = s.user_id RETURNING u.id, u.username`;
  return r.length ? { id: Number(r[0].id), username: String(r[0].username) } : null;
}
/* IP máy khách (Vercel đặt sẵn header); không có thì gộp chung "?" */
export const ipOf = (req: Request) =>
  (req.headers.get("x-vercel-forwarded-for") || req.headers.get("x-forwarded-for") || "?").split(",")[0]!.trim().slice(0, 64);
/* tuần hiện tại (thứ Hai) theo giờ Việt Nam */
export const WEEK = `date_trunc('week', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;
