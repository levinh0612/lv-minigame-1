/* Tài khoản: username + PIN 4 số + câu hỏi bí mật (quên PIN). Tất cả là POST {action, ...}
   check {username}                      -> {free}
   register {username, pin, question, answer, state?} -> {token, username}
   login {username, pin}                 -> {token, username, state, rev, savedAt}
   question {username}                   -> {question}
   reset {username, answer, pin}         -> {token, username, state, rev, savedAt}   (đặt PIN mới)
   pin {pin} (đã đăng nhập)              -> đổi PIN
   follow {username | ""} (đã đăng nhập)  -> theo dõi người ấy / bỏ theo dõi
   logout (đã đăng nhập)                 -> xoá phiên */
import { authUser, bad, body, checkSecret, cleanText, db, endSession, hashSecret, ipOf, json, newSession, normAnswer, normUser, tokenOf, validPin, validUser } from "./_lib.js";
import { lockMinutes, PER_IP_ANY_FAILS, PER_IP_FAILS, PER_IP_WINDOW_MIN, PER_USER_FAILS, PER_USER_WINDOW_MIN } from "./limits.js";

interface Req { action: string; username?: string; pin?: string; question?: string; answer?: string; state?: Record<string, unknown> }
const LOCK_MSG = "Nhập sai nhiều lần quá, tài khoản tạm khoá 15 phút nha";

/* kiểm tra PIN / câu trả lời. Chống dò mà không cho người lạ khoá nhầm tài khoản:
   - một IP sai 5 lần / 15 phút bị chặn riêng IP đó (chủ tài khoản ở IP khác vẫn vào được)
   - một IP sai 20 lần / giờ bị chặn với mọi tài khoản
   - cả tài khoản sai 30 lần / giờ (nhiều IP) thì khoá chung, thời gian leo thang 15p → 1h → 4h … */
async function verify(u: string, ip: string, check: (row: Record<string, unknown>) => Promise<boolean>) {
  const sql = db();
  const r = await sql`SELECT id, username, pin_hash, answer_hash, question, state, rev, updated_at, lock_level, locked_until > now() AS locked FROM users WHERE username = ${u}`;
  if (!r.length) return { err: bad("Chưa có tiệm nào tên này", 404) };
  const id = r[0].id;
  if (r[0].locked) return { err: bad(LOCK_MSG, 429) };
  const c = await sql`SELECT
      count(*) FILTER (WHERE user_id = ${id} AND ip = ${ip} AND at > now() - make_interval(mins => ${PER_IP_WINDOW_MIN})) AS here,
      count(*) FILTER (WHERE ip = ${ip}) AS anyone
    FROM auth_fails WHERE (ip = ${ip} OR user_id = ${id}) AND at > now() - interval '1 hour'`;
  if (Number(c[0].here) >= PER_IP_FAILS || Number(c[0].anyone) >= PER_IP_ANY_FAILS) return { err: bad(LOCK_MSG, 429) };
  if (!(await check(r[0]))) {
    await sql`INSERT INTO auth_fails (user_id, ip) VALUES (${id}, ${ip})`;
    await sql`DELETE FROM auth_fails WHERE at < now() - interval '1 day' AND user_id = ${id}`;
    const t = await sql`SELECT count(*) AS n FROM auth_fails WHERE user_id = ${id} AND at > now() - make_interval(mins => ${PER_USER_WINDOW_MIN})`;
    if (Number(t[0].n) >= PER_USER_FAILS) {
      await sql`UPDATE users SET locked_until = now() + make_interval(mins => ${lockMinutes(Number(r[0].lock_level))}), lock_level = lock_level + 1 WHERE id = ${id}`;
      await sql`DELETE FROM auth_fails WHERE user_id = ${id}`;
      return { err: bad(LOCK_MSG, 429) };
    }
    return { err: bad(`Sai rồi, còn ${Math.max(0, PER_IP_FAILS - 1 - Number(c[0].here))} lần thử`, 401) };
  }
  await sql`DELETE FROM auth_fails WHERE user_id = ${id} AND ip = ${ip}`;
  await sql`UPDATE users SET locked_until = NULL, lock_level = 0 WHERE id = ${id} AND (lock_level > 0 OR locked_until IS NOT NULL)`;
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
      // earned/lv do máy khách tự báo nên không tin lúc đăng ký: bắt đầu từ 0, sync sẽ nâng dần theo thời gian (api/limits.ts)
      const r = await sql`
        INSERT INTO users (username, pin_hash, question, answer_hash, state)
        VALUES (${u}, ${await hashSecret(String(b.pin))}, ${q}, ${await hashSecret(a)}, ${st ? JSON.stringify(st) : null}::jsonb)
        ON CONFLICT (username) DO NOTHING RETURNING id`;
      if (!r.length) return bad("Tên này có người dùng rồi, chọn tên khác nha", 409);
      return json({ token: await newSession(Number(r[0].id)), username: u });
    }
    case "login": {
      if (!validUser(u) || !validPin(b.pin)) return bad("Nhập tên tiệm và PIN 4 số nha");
      const v = await verify(u, ipOf(req), row => checkSecret(String(b.pin), String(row.pin_hash)));
      return v.err ?? loggedIn(v.row!);
    }
    case "question": {
      const r = await sql`SELECT question FROM users WHERE username = ${u}`;
      return r.length ? json({ question: r[0].question }) : bad("Chưa có tiệm nào tên này", 404);
    }
    case "reset": {
      if (!validPin(b.pin)) return bad("PIN mới gồm đúng 4 số");
      const v = await verify(u, ipOf(req), row => checkSecret(normAnswer(b.answer), String(row.answer_hash)));
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
