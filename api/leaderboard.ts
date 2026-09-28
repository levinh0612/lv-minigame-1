/* GET /api/leaderboard?code=...: top 50 tiệm theo tổng xu kiếm được, kèm hạng của mình */
import { db, hashCode, json, normCode, validCode } from "./_lib";

export async function GET(req: Request) {
  const sql = db(), code = normCode(new URL(req.url).searchParams.get("code"));
  const top = await sql`
    SELECT id, name, lv, earned FROM shops WHERE name <> '' ORDER BY earned DESC, id LIMIT 50`;
  type Me = { id: number; name: string; lv: number; earned: number; rank: number };
  let me: Me | null = null;
  if (validCode(code)) {
    const r = await sql`
      SELECT s.id, s.name, s.lv, s.earned,
        (SELECT count(*) FROM shops o WHERE o.name <> '' AND (o.earned > s.earned OR (o.earned = s.earned AND o.id < s.id)))::int + 1 AS rank
      FROM shops s WHERE s.code_hash = ${hashCode(code)}`;
    if (r.length) me = r[0] as Me;
  }
  const meId = me?.id;
  return json({
    top: top.map((r, i) => ({ rank: i + 1, name: r.name, lv: r.lv, earned: Number(r.earned), me: r.id === meId })),
    me: me && { rank: me.name ? me.rank : null, name: me.name, lv: me.lv, earned: Number(me.earned) }
  });
}
