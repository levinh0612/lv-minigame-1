/* Tài khoản: username + PIN 4 số + câu hỏi bí mật (quên PIN). Tất cả là POST {action, ...}
   check {username}                      -> {free}
   register {username, pin, question, answer, state?} -> {token, username}
   login {username, pin}                 -> {token, username, state, rev, savedAt}
   question {username}                   -> {question}
   reset {username, answer, pin}         -> {token, username, state, rev, savedAt}   (đặt PIN mới)
   pin {pin} (đã đăng nhập)              -> đổi PIN
   follow {username | ""} (đã đăng nhập)  -> theo dõi người ấy / bỏ theo dõi
   logout (đã đăng nhập)                 -> xoá phiên */
import { authUser, bad, body, checkSecret, cleanText, db, endSession, hashSecret, json, newSession, normAnswer, normUser, tokenOf, validPin, validUser } from "./_lib.js";

interface Req { action: string; username?: string; pin?: string; question?: string; answer?: string; state?: Record<string, unknown> }
const LOCK_MSG = "Nhập sai nhiều lần quá, tài khoản tạm khoá 15 phút nha";

/* kiểm tra PIN / câu trả lời, đếm lần sai: sai 5 lần khoá 15 phút */
async function verify(u: string, check: (row: Record<string, unknown>) => Promise<boolean>) {
  const sql = db();
  const r = await sql`SELECT id, username, pin_hash, answer_hash, question, state, rev, updated_at, locked_until > now() AS locked FROM users WHERE username = ${u}`;
  if (!r.length) return { err: bad("Chưa có tiệm nào tên này", 404) };
  if (r[0].locked) return { err: bad(LOCK_MSG, 429) };
  if (!(await check(r[0]))) {
    const f = await sql`UPDATE users SET fails = fails + 1, locked_until = CASE WHEN fails + 1 >= 5 THEN now() + interval '15 minutes' END WHERE id = ${r[0].id} RETURNING fails`;
    if (f[0].fails >= 5) { await sql`UPDATE users SET fails = 0 WHERE id = ${r[0].id}`; return { err: bad(LOCK_MSG, 429) }; }
    return { err: bad(`Sai rồi, còn ${5 - f[0].fails} lần thử`, 401) };
  }
  await sql`UPDATE users SET fails = 0, locked_until = NULL WHERE id = ${r[0].id}`;
  return { row: r[0] };
}
const loggedIn = async (row: Record<string, unknown>) =>
  json({ token: await newSession(Number(row.id)), username: row.username, state: row.state, rev: row.rev, savedAt: row.updated_at });

export async function POST(req: Request) {
  const b = await body<Req>(req);
  if (!b) return bad("Dữ liệu sai định dạng");
  const sql = db(), u = normUser(b.username);
  switch (b.action) {
    case "check": {
      if (!validUser(u)) return json({ free: false, error: "Tên gồm 3–20 chữ thường không dấu, số, dấu chấm hoặc gạch dưới" });
      const r = await sql`SELECT 1 FROM users WHERE username = ${u}`;
      return json({ free: !r.length });
    }
    case "register": {
      if (!validUser(u)) return bad("Tên gồm 3–20 chữ thường không dấu, số, dấu chấm hoặc gạch dưới");
      if (!validPin(b.pin)) return bad("PIN gồm đúng 4 số");
      const q = cleanText(b.question, 80), a = normAnswer(b.answer);
      if (!q || a.length < 2) return bad("Chọn câu hỏi bí mật và trả lời để lấy lại PIN khi quên");
      const st = b.state && typeof b.state === "object" ? b.state : null;
      const earned = Math.max(0, Math.floor(Number(st?.earned) || 0));
      const r = await sql`
        INSERT INTO users (username, pin_hash, question, answer_hash, state, earned)
        VALUES (${u}, ${await hashSecret(String(b.pin))}, ${q}, ${await hashSecret(a)}, ${st ? JSON.stringify(st) : null}::jsonb, ${earned})
        ON CONFLICT (username) DO NOTHING RETURNING id`;
      if (!r.length) return bad("Tên này có người dùng rồi, chọn tên khác nha", 409);
      return json({ token: await newSession(Number(r[0].id)), username: u });
    }
    case "login": {
      if (!validUser(u) || !validPin(b.pin)) return bad("Nhập tên tiệm và PIN 4 số nha");
      const v = await verify(u, row => checkSecret(String(b.pin), String(row.pin_hash)));
      return v.err ?? loggedIn(v.row!);
    }
    case "question": {
      const r = await sql`SELECT question FROM users WHERE username = ${u}`;
      return r.length ? json({ question: r[0].question }) : bad("Chưa có tiệm nào tên này", 404);
    }
    case "reset": {
      if (!validPin(b.pin)) return bad("PIN mới gồm đúng 4 số");
      const v = await verify(u, row => checkSecret(normAnswer(b.answer), String(row.answer_hash)));
      if (v.err) return v.err;
      await sql`UPDATE users SET pin_hash = ${await hashSecret(String(b.pin))} WHERE id = ${v.row!.id}`;
      await sql`DELETE FROM sessions WHERE user_id = ${v.row!.id}`;          // đăng xuất các máy khác
      return loggedIn(v.row!);
    }
  }
  // các thao tác cần đăng nhập
  const me = await authUser(req);
  if (!me) return bad("Phiên đăng nhập đã hết, đăng nhập lại nha", 401);
  switch (b.action) {
    case "pin":
      if (!validPin(b.pin)) return bad("PIN gồm đúng 4 số");
      await sql`UPDATE users SET pin_hash = ${await hashSecret(String(b.pin))} WHERE id = ${me.id}`;
      return json({ ok: true });
    case "follow": {
      if (!u) { await sql`UPDATE users SET follow_id = NULL WHERE id = ${me.id}`; return json({ ok: true }); }
      if (u === me.username) return bad("Đây là tiệm của chính mình mà");
      const r = await sql`UPDATE users SET follow_id = (SELECT id FROM users WHERE username = ${u}) WHERE id = ${me.id} RETURNING follow_id`;
      return r[0]?.follow_id ? json({ ok: true, username: u }) : bad("Không tìm thấy tiệm tên này", 404);
    }
    case "logout":
      await endSession(tokenOf(req));
      return json({ ok: true });
  }
  return bad("Thiếu action");
}
