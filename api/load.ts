/* POST /api/load {code}: lấy tiến trình đã lưu (đổi máy, cài lại app) */
import { bad, body, db, hashCode, json, normCode, validCode } from "./_lib.js";

export async function POST(req: Request) {
  const b = await body<{ code: string }>(req, 1024);
  const code = normCode(b?.code);
  if (!validCode(code)) return bad("Mã tiệm không hợp lệ");
  const rows = await db()`SELECT state, rev, updated_at FROM shops WHERE code_hash = ${hashCode(code)}`;
  if (!rows.length) return bad("Không tìm thấy tiệm với mã này", 404);
  return json({ state: rows[0].state, rev: rows[0].rev, savedAt: rows[0].updated_at });
}
