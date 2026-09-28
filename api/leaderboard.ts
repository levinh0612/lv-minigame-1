/* GET /api/leaderboard?period=week|all (gửi kèm token thì có hạng của mình và người ấy)
   Xếp theo tiền bán hàng: tiền bánh + tip + thưởng trong ca */
import { authUser, db, json, WEEK } from "./_lib.js";

export async function GET(req: Request) {
  const sql = db(), week = new URL(req.url).searchParams.get("period") === "week";
  const me = await authUser(req);
  const top = week
    ? await sql.query(`SELECT u.id, u.username, u.lv, w.earned FROM week_earn w JOIN users u ON u.id = w.user_id
        WHERE w.week = ${WEEK} AND w.earned > 0 ORDER BY w.earned DESC, u.id LIMIT 50`)
    : await sql`SELECT id, username, lv, earned FROM users WHERE earned > 0 ORDER BY earned DESC, id LIMIT 50`;
  const score = async (id: number) => week
    ? Number((await sql.query(`SELECT earned FROM week_earn WHERE week = ${WEEK} AND user_id = $1`, [id]))[0]?.earned ?? 0)
    : Number((await sql`SELECT earned FROM users WHERE id = ${id}`)[0].earned);
  let mine = null, follow = null;
  if (me) {
    const s = await score(me.id);
    const above = week
      ? await sql.query(`SELECT count(*)::int n FROM week_earn WHERE week = ${WEEK} AND (earned > $1 OR (earned = $1 AND user_id < $2)) AND earned > 0`, [s, me.id])
      : await sql`SELECT count(*)::int n FROM users WHERE earned > ${s} OR (earned = ${s} AND id < ${me.id} AND earned > 0)`;
    const u = await sql`SELECT lv, follow_id FROM users WHERE id = ${me.id}`;
    mine = { username: me.username, lv: u[0].lv, earned: s, rank: s > 0 ? above[0].n + 1 : null };
    if (u[0].follow_id) {
      const f = await sql`SELECT id, username, lv, updated_at FROM users WHERE id = ${u[0].follow_id}`;
      if (f.length) follow = { username: f[0].username, lv: f[0].lv, earned: await score(Number(f[0].id)), savedAt: f[0].updated_at };
    }
  }
  return json({ period: week ? "week" : "all", top: top.map((r, i) => ({ rank: i + 1, username: r.username, lv: r.lv, earned: Number(r.earned), me: Number(r.id) === me?.id })), me: mine, follow });
}
