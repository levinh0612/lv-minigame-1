/* Lưu / tải tiến trình theo tài khoản
   GET ?since=N -> bản trên server chưa mới hơn N: {rev, same: true}; mới hơn: {state, rev, savedAt}
   POST {state, earned, lv, base} -> {rev, savedAt}
     base = phiên máy này đã biết; server đã có phiên mới hơn (máy khác lưu) thì trả 409 để máy này tải bản mới về,
     không cho bản cũ đè bản mới. Tiền bán hàng tăng thêm được cộng vào bảng tuần */
import { authUser, bad, body, db, json, WEEK } from "./_lib.js";

export async function GET(req: Request) {
  const me = await authUser(req);
  if (!me) return bad("Phiên đăng nhập đã hết, đăng nhập lại nha", 401);
  const since = new URL(req.url).searchParams.get("since");
  const r = await db()`SELECT rev, updated_at FROM users WHERE id = ${me.id}`;
  if (since !== null && r[0].rev <= Number(since)) return json({ rev: r[0].rev, same: true });
  const s = await db()`SELECT state FROM users WHERE id = ${me.id}`;
  return json({ state: s[0].state, rev: r[0].rev, savedAt: r[0].updated_at });
}

export async function POST(req: Request) {
  const me = await authUser(req);
  if (!me) return bad("Phiên đăng nhập đã hết, đăng nhập lại nha", 401);
  const b = await body<{ state: unknown; earned?: number; lv?: number; base?: number }>(req);
  if (!b?.state || typeof b.state !== "object") return bad("Thiếu tiến trình");
  const earned = Math.max(0, Math.min(1e9, Math.floor(Number(b.earned) || 0)));
  const lv = Math.max(1, Math.min(100, Math.floor(Number(b.lv) || 1)));
  const base = b.base == null ? null : Math.floor(Number(b.base));
  const sql = db();
  const old = await sql`SELECT earned, rev FROM users WHERE id = ${me.id}`;
  if (base !== null && old[0].rev > base) return json({ conflict: true, rev: old[0].rev }, 409);
  const delta = Math.max(0, Math.min(50000, earned - Number(old[0].earned)));   // chặn số tăng bất thường
  // chỉ ghi nếu trong lúc đó không có máy khác vừa lưu (so rev)
  const r = await sql`
    UPDATE users SET state = ${JSON.stringify(b.state)}::jsonb, earned = GREATEST(earned, ${earned}), lv = ${lv}, rev = rev + 1, updated_at = now()
    WHERE id = ${me.id} AND rev = ${old[0].rev} RETURNING rev, updated_at`;
  if (!r.length) return json({ conflict: true }, 409);
  if (delta > 0) await sql.query(
    `INSERT INTO week_earn (week, user_id, earned) VALUES (${WEEK}, $1, $2)
     ON CONFLICT (week, user_id) DO UPDATE SET earned = week_earn.earned + EXCLUDED.earned`, [me.id, delta]);
  return json({ rev: r[0].rev, savedAt: r[0].updated_at });
}
