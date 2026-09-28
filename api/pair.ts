/* Ghép đôi 2 tiệm (hai máy của hai người): POST {code, partner: mã ghép đôi của người kia}; DELETE {code} */
import { bad, body, db, hashCode, json, normCode, validCode } from "./_lib.js";

export async function POST(req: Request) {
  const b = await body<{ code: string; partner: string }>(req, 1024);
  const code = normCode(b?.code), pc = normCode(b?.partner);
  if (!validCode(code) || pc.length !== 6) return bad("Mã không hợp lệ");
  const sql = db();
  const me = await sql`SELECT id FROM shops WHERE code_hash = ${hashCode(code)}`;
  const other = await sql`SELECT id, name FROM shops WHERE pair_code = ${pc}`;
  if (!me.length) return bad("Tiệm chưa được lưu lên mây", 404);
  if (!other.length) return bad("Không tìm thấy tiệm với mã ghép đôi này", 404);
  if (other[0].id === me[0].id) return bad("Đây là mã của chính tiệm mình mà");
  const a = me[0].id, o = other[0].id;
  // bỏ cặp cũ của cả hai rồi ghép cặp mới (hai chiều)
  await sql`UPDATE shops SET partner_id = NULL WHERE partner_id IN (${a}, ${o}) OR id IN (${a}, ${o})`;
  await sql`UPDATE shops SET partner_id = CASE WHEN id = ${a} THEN ${o}::bigint ELSE ${a}::bigint END WHERE id IN (${a}, ${o})`;
  return json({ ok: true, partner: other[0].name });
}
export async function DELETE(req: Request) {
  const code = normCode((await body<{ code: string }>(req, 1024))?.code);
  if (!validCode(code)) return bad("Mã không hợp lệ");
  const sql = db();
  const me = await sql`SELECT id FROM shops WHERE code_hash = ${hashCode(code)}`;
  if (me.length) await sql`UPDATE shops SET partner_id = NULL WHERE id = ${me[0].id} OR partner_id = ${me[0].id}`;
  return json({ ok: true });
}
