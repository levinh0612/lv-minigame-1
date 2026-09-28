/* Lưu / tải tiến trình theo tài khoản
   GET  -> {state, rev, savedAt}
   POST {state, earned, lv} -> {rev, savedAt}; tiền bán hàng tăng thêm được cộng vào bảng tuần */
import { authUser, bad, body, db, json, WEEK } from "./_lib.js";

export async function GET(req: Request) {
  const me = await authUser(req);
  if (!me) return bad("Phiên đăng nhập đã hết, đăng nhập lại nha", 401);
  const r = await db()`SELECT state, rev, updated_at FROM users WHERE id = ${me.id}`;
  return json({ state: r[0].state, rev: r[0].rev, savedAt: r[0].updated_at });
}

export async function POST(req: Request) {
  const me = await authUser(req);
  if (!me) return bad("Phiên đăng nhập đã hết, đăng nhập lại nha", 401);
  const b = await body<{ state: unknown; earned?: number; lv?: number }>(req);
  if (!b?.state || typeof b.state !== "object") return bad("Thiếu tiến trình");
  const earned = Math.max(0, Math.min(1e9, Math.floor(Number(b.earned) || 0)));
  const lv = Math.max(1, Math.min(99, Math.floor(Number(b.lv) || 1)));
  const sql = db();
  const old = await sql`SELECT earned FROM users WHERE id = ${me.id}`;
  const delta = Math.max(0, Math.min(50000, earned - Number(old[0].earned)));   // chặn số tăng bất thường
  const r = await sql`
    UPDATE users SET state = ${JSON.stringify(b.state)}::jsonb, earned = GREATEST(earned, ${earned}), lv = ${lv}, rev = rev + 1, updated_at = now()
    WHERE id = ${me.id} RETURNING rev, updated_at`;
  if (delta > 0) await sql.query(
    `INSERT INTO week_earn (week, user_id, earned) VALUES (${WEEK}, $1, $2)
     ON CONFLICT (week, user_id) DO UPDATE SET earned = week_earn.earned + EXCLUDED.earned`, [me.id, delta]);
  return json({ rev: r[0].rev, savedAt: r[0].updated_at });
}
