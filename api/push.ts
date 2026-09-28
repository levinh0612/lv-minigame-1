/* Thông báo đẩy
   GET  /api/push                          -> khoá công khai VAPID
   POST /api/push {sub, her, morning, night} (đã đăng nhập) -> đăng ký / cập nhật giờ nhắc
   DELETE /api/push {endpoint}             -> huỷ */
import { authUser, bad, body, cleanText, db, json } from "./_lib.js";

export function GET() { return json({ key: process.env.VAPID_PUBLIC_KEY ?? "" }); }

interface SubReq { sub: { endpoint: string; keys: { p256dh: string; auth: string } }; her?: string; morning?: boolean; night?: boolean }
export async function POST(req: Request) {
  const me = await authUser(req);
  if (!me) return bad("Đăng nhập trước để bật thông báo", 401);
  const b = await body<SubReq>(req, 8 * 1024);
  if (!b) return bad("Dữ liệu sai định dạng");
  const ep = String(b.sub?.endpoint ?? "");
  if (!/^https:\/\//.test(ep) || !b.sub.keys?.p256dh || !b.sub.keys?.auth) return bad("Đăng ký thông báo không hợp lệ");
  const sql = db();
  await sql`
    INSERT INTO push_subs (endpoint, user_id, sub, her, morning, night)
    VALUES (${ep}, ${me.id}, ${JSON.stringify(b.sub)}::jsonb, ${cleanText(b.her, 24)}, ${b.morning !== false}, ${b.night !== false})
    ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, sub = EXCLUDED.sub, her = EXCLUDED.her,
      morning = EXCLUDED.morning, night = EXCLUDED.night`;
  return json({ ok: true });
}
export async function DELETE(req: Request) {
  const b = await body<{ endpoint: string }>(req, 4 * 1024);
  if (!b?.endpoint) return bad("Thiếu endpoint");
  await db()`DELETE FROM push_subs WHERE endpoint = ${b.endpoint}`;
  return json({ ok: true });
}
