/* POST /api/status {code}: bản trên mây đang ở đâu (mở app thì so với máy này) */
import { bad, body, db, hashCode, json, normCode, validCode } from "./_lib.js";

export async function POST(req: Request) {
  const code = normCode((await body<{ code: string }>(req, 1024))?.code);
  if (!validCode(code)) return bad("Mã tiệm không hợp lệ");
  const r = await db()`SELECT rev, device, lv, assets, updated_at, pair_code FROM shops WHERE code_hash = ${hashCode(code)}`;
  if (!r.length) return json({ exists: false });
  return json({ exists: true, rev: r[0].rev, device: r[0].device, lv: r[0].lv, assets: Number(r[0].assets), savedAt: r[0].updated_at, pairCode: r[0].pair_code });
}
