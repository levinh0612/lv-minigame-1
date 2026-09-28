/* Chuyển tiệm sang máy khác bằng mã 6 ký tự (10 phút, dùng một lần)
   POST {action:"create", code} -> {token, expiresAt}
   POST {action:"claim", token} -> {code, state} */
import { bad, body, db, hashCode, json, newToken, normCode, validCode } from "./_lib.js";

export async function POST(req: Request) {
  const b = await body<{ action: string; code?: string; token?: string }>(req, 1024);
  const sql = db();
  await sql`DELETE FROM transfers WHERE expires_at < now()`;
  if (b?.action === "create") {
    const code = normCode(b.code);
    if (!validCode(code)) return bad("Mã tiệm không hợp lệ");
    const s = await sql`SELECT id FROM shops WHERE code_hash = ${hashCode(code)}`;
    if (!s.length) return bad("Tiệm chưa được lưu lên mây", 404);
    await sql`DELETE FROM transfers WHERE shop_id = ${s[0].id}`;
    const token = newToken();
    const r = await sql`INSERT INTO transfers (token, shop_id, code, expires_at) VALUES (${token}, ${s[0].id}, ${code}, now() + interval '10 minutes') RETURNING expires_at`;
    return json({ token, expiresAt: r[0].expires_at });
  }
  if (b?.action === "claim") {
    const token = normCode(b.token);
    const r = await sql`
      DELETE FROM transfers t USING shops s WHERE t.token = ${token} AND t.expires_at > now() AND s.id = t.shop_id
      RETURNING t.code, s.state, s.rev`;
    if (!r.length) return bad("Mã chuyển máy không đúng hoặc đã hết hạn", 404);
    return json({ code: r[0].code, state: r[0].state, rev: r[0].rev });
  }
  return bad("Thiếu action");
}
