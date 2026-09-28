/* Thông báo đẩy
   GET  /api/push                          -> khoá công khai VAPID
   POST /api/push {code, sub, her, morning, night} -> đăng ký / cập nhật giờ nhắc
   DELETE /api/push {endpoint}             -> huỷ */
import { bad, body, cleanName, db, hashCode, json, normCode, validCode } from "./_lib.js";

export function GET() { return json({ key: process.env.VAPID_PUBLIC_KEY ?? "" }); }

interface SubReq { code: string; sub: { endpoint: string; keys: { p256dh: string; auth: string } }; her?: string; morning?: boolean; night?: boolean }
export async function POST(req: Request) {
  const b = await body<SubReq>(req, 8 * 1024);
  const code = normCode(b?.code);
  if (!b || !validCode(code)) return bad("Mã tiệm không hợp lệ");
  const ep = String(b.sub?.endpoint ?? "");
  if (!/^https:\/\//.test(ep) || !b.sub.keys?.p256dh || !b.sub.keys?.auth) return bad("Đăng ký thông báo không hợp lệ");
  const sql = db();
  const shop = await sql`SELECT id FROM shops WHERE code_hash = ${hashCode(code)}`;
  if (!shop.length) return bad("Tiệm chưa được lưu lên mây", 404);
  await sql`
    INSERT INTO push_subs (endpoint, shop_id, sub, her, morning, night)
    VALUES (${ep}, ${shop[0].id}, ${JSON.stringify(b.sub)}::jsonb, ${cleanName(b.her)}, ${b.morning !== false}, ${b.night !== false})
    ON CONFLICT (endpoint) DO UPDATE SET shop_id = EXCLUDED.shop_id, sub = EXCLUDED.sub, her = EXCLUDED.her,
      morning = EXCLUDED.morning, night = EXCLUDED.night`;
  return json({ ok: true });
}
export async function DELETE(req: Request) {
  const b = await body<{ endpoint: string }>(req, 4 * 1024);
  if (!b?.endpoint) return bad("Thiếu endpoint");
  await db()`DELETE FROM push_subs WHERE endpoint = ${b.endpoint}`;
  return json({ ok: true });
}
