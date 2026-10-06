/* Cấu hình game dùng chung cho mọi máy (tên, tên khách, thư, thông báo).
   GET ?since=N -> ai cũng đọc được: {rev, same:true} nếu chưa có bản mới, ngược lại {rev, config, updatedAt}
   POST {config} -> chỉ tài khoản admin (levinh) được lưu; config rỗng {} = khôi phục mặc định */
import { cleanGameConfig } from "../src/content/gameconfig.js";
import { authUser, bad, body, db, json } from "./_lib.js";

export const ADMIN = "levinh";
async function ensure() {
  await db()`CREATE TABLE IF NOT EXISTS app_config (
    key text PRIMARY KEY, value jsonb NOT NULL DEFAULT '{}'::jsonb, rev integer NOT NULL DEFAULT 0,
    updated_by text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now())`;
}

export async function GET(req: Request) {
  await ensure();
  const r = await db()`SELECT value, rev, updated_at FROM app_config WHERE key = 'game'`;
  const rev = r.length ? Number(r[0].rev) : 0, since = new URL(req.url).searchParams.get("since");
  if (since !== null && rev <= Number(since)) return json({ rev, same: true });
  return json({ rev, config: r.length ? r[0].value : {}, updatedAt: r.length ? r[0].updated_at : null });
}

export async function POST(req: Request) {
  const me = await authUser(req);
  if (!me) return bad("Phiên đăng nhập đã hết, đăng nhập lại nha", 401);
  if (me.username !== ADMIN) return bad("Chỉ admin mới chỉnh được cấu hình game", 403);
  const b = await body<{ config: unknown }>(req, 128 * 1024);
  if (!b || typeof b.config !== "object") return bad("Thiếu cấu hình");
  await ensure();
  const cfg = cleanGameConfig(b.config);
  const r = await db()`
    INSERT INTO app_config (key, value, rev, updated_by) VALUES ('game', ${JSON.stringify(cfg)}::jsonb, 1, ${me.username})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, rev = app_config.rev + 1, updated_by = EXCLUDED.updated_by, updated_at = now()
    RETURNING rev, value, updated_at`;
  return json({ rev: Number(r[0].rev), config: r[0].value, updatedAt: r[0].updated_at });
}
