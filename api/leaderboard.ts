/* GET /api/leaderboard?code=...: top 50 tiệm theo tài sản, hạng của mình và người đã ghép đôi */
import { db, hashCode, json, normCode, validCode } from "./_lib.js";

const pub = (r: Record<string, unknown>) => ({ name: String(r.name), lv: Number(r.lv), assets: Number(r.assets), earned: Number(r.earned), savedAt: r.updated_at });

export async function GET(req: Request) {
  const sql = db(), code = normCode(new URL(req.url).searchParams.get("code"));
  const top = await sql`SELECT id, name, lv, assets, earned, updated_at FROM shops WHERE name <> '' ORDER BY assets DESC, id LIMIT 50`;
  let me = null, partner = null, meId = -1;
  if (validCode(code)) {
    const r = await sql`
      SELECT s.id, s.name, s.lv, s.assets, s.earned, s.updated_at, s.pair_code, s.partner_id,
        (SELECT count(*) FROM shops o WHERE o.name <> '' AND (o.assets > s.assets OR (o.assets = s.assets AND o.id < s.id)))::int + 1 AS rank
      FROM shops s WHERE s.code_hash = ${hashCode(code)}`;
    if (r.length) {
      meId = Number(r[0].id);
      me = { ...pub(r[0]), rank: r[0].name ? r[0].rank : null, pairCode: r[0].pair_code };
      if (r[0].partner_id) {
        const p = await sql`SELECT name, lv, assets, earned, updated_at FROM shops WHERE id = ${r[0].partner_id} AND partner_id = ${r[0].id}`;
        if (p.length) partner = pub(p[0]);
      }
    }
  }
  return json({ top: top.map((r, i) => ({ rank: i + 1, ...pub(r), me: Number(r.id) === meId })), me, partner });
}
