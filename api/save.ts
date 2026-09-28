/* POST /api/save: lưu tiến trình lên mây.
   Chống ghi đè giữa 2 máy: rev = số lần lưu mà máy này đã biết. Trên mây mới hơn (máy khác lưu) thì trả 409
   để game hỏi người chơi giữ bản nào; force = true để ghi đè. */
import { bad, body, cleanName, db, hashCode, json, newToken, normCode, validCode } from "./_lib.js";

interface SaveReq { code: string; name?: string; earned?: number; assets?: number; lv?: number; ver?: string; state?: unknown; rev?: number; device?: string; force?: boolean }
const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

export async function POST(req: Request) {
  const b = await body<SaveReq>(req);
  if (!b) return bad("Dữ liệu quá lớn hoặc sai định dạng");
  const code = normCode(b.code);
  if (!validCode(code)) return bad("Mã tiệm không hợp lệ");
  if (!b.state || typeof b.state !== "object") return bad("Thiếu tiến trình");
  const sql = db(), h = hashCode(code), device = String(b.device ?? "").slice(0, 32), base = num(b.rev, 1e9);
  const cur = await sql`SELECT id, rev, device, lv, assets, updated_at, pair_code FROM shops WHERE code_hash = ${h}`;
  if (cur.length && !b.force && cur[0].rev > base && cur[0].device !== device)
    return json({ conflict: true, remote: { rev: cur[0].rev, lv: cur[0].lv, assets: Number(cur[0].assets), savedAt: cur[0].updated_at } }, 409);
  const rev = (cur[0]?.rev ?? 0) + 1, pair = cur[0]?.pair_code || newToken();
  const rows = await sql`
    INSERT INTO shops (code_hash, name, earned, assets, lv, state, app_ver, rev, device, pair_code)
    VALUES (${h}, ${cleanName(b.name)}, ${num(b.earned, 1e9)}, ${num(b.assets, 1e9)}, ${Math.max(1, num(b.lv, 99))},
            ${JSON.stringify(b.state)}::jsonb, ${String(b.ver ?? "").slice(0, 12)}, ${rev}, ${device}, ${pair})
    ON CONFLICT (code_hash) DO UPDATE SET
      name = EXCLUDED.name, earned = EXCLUDED.earned, assets = EXCLUDED.assets, lv = EXCLUDED.lv,
      state = EXCLUDED.state, app_ver = EXCLUDED.app_ver, rev = EXCLUDED.rev, device = EXCLUDED.device,
      pair_code = COALESCE(shops.pair_code, EXCLUDED.pair_code), updated_at = now()
    RETURNING rev, pair_code, updated_at`;
  return json({ ok: true, rev: rows[0].rev, pairCode: rows[0].pair_code, savedAt: rows[0].updated_at });
}
