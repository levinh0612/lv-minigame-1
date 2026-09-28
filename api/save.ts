/* POST /api/save {code, name, earned, lv, ver, state}: lưu tiến trình lên mây (tạo mới nếu chưa có) */
import { bad, body, cleanName, db, hashCode, json, normCode, validCode } from "./_lib";

interface SaveReq { code: string; name?: string; earned?: number; lv?: number; ver?: string; state?: unknown }

export async function POST(req: Request) {
  const b = await body<SaveReq>(req);
  if (!b) return bad("Dữ liệu quá lớn hoặc sai định dạng");
  const code = normCode(b.code);
  if (!validCode(code)) return bad("Mã tiệm không hợp lệ");
  if (!b.state || typeof b.state !== "object") return bad("Thiếu tiến trình");
  const earned = Math.max(0, Math.min(1e9, Math.floor(Number(b.earned) || 0)));
  const lv = Math.max(1, Math.min(99, Math.floor(Number(b.lv) || 1)));
  const rows = await db()`
    INSERT INTO shops (code_hash, name, earned, lv, state, app_ver)
    VALUES (${hashCode(code)}, ${cleanName(b.name)}, ${earned}, ${lv}, ${JSON.stringify(b.state)}::jsonb, ${String(b.ver ?? "").slice(0, 12)})
    ON CONFLICT (code_hash) DO UPDATE SET
      name = EXCLUDED.name, earned = GREATEST(shops.earned, EXCLUDED.earned), lv = EXCLUDED.lv,
      state = EXCLUDED.state, app_ver = EXCLUDED.app_ver, updated_at = now()
    RETURNING id, updated_at`;
  return json({ ok: true, savedAt: rows[0].updated_at });
}
