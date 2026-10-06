/* Ghé thăm tiệm hàng xóm
   GET  ?user=ten    -> báo giá {username, lv, fee, free, coins}: free = hôm nay đã ghé tiệm này rồi
   POST {user}       -> vào tham quan: tính phí (lần đầu mỗi ngày mỗi tiệm), ghi lượt ghé, trả ảnh chụp công khai của tiệm
   GET  ?inbox=1     -> số tiền mừng chủ tiệm chưa nhận
   POST {claim:true} -> đánh dấu đã nhận và trả danh sách [{visitor, gift}]
   Phí vé = 2% số xu của khách (tối thiểu 10, tối đa 100); chủ tiệm nhận 70% phí làm tiền mừng.
   Luật phí phải khớp src/engine/visit.ts */
import { authUser, bad, body, db, json, normUser, validUser } from "./_lib.js";

const FEE_PCT = 0.02, FEE_MIN = 10, FEE_MAX = 100, GIFT_PCT = 0.7;
const feeOf = (coins: number) => Math.min(FEE_MAX, Math.max(FEE_MIN, Math.round(coins * FEE_PCT)));
const TODAY = `(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;

const str = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, "").slice(0, max);
const strMap = (o: unknown, max: number) => {
  const out: Record<string, string> = {};
  if (o && typeof o === "object") for (const [k, v] of Object.entries(o as Record<string, unknown>)) if (/^[a-zA-Z0-9_]{1,24}$/.test(k) && typeof v === "string") out[k] = str(v, max);
  return out;
};
/** sao trung bình 20 đánh giá gần nhất (mặc định 2 khi chưa có), để màn ghé thăm tính độ viral như màn của chủ tiệm */
const starsOf = (r: unknown) => {
  const a = (Array.isArray(r) ? r : []).slice(0, 20).map(x => Number((x as { s?: unknown })?.s)).filter(n => Number.isFinite(n));
  return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100) / 100 : 2;
};
/* chỉ gửi phần công khai của tiệm: không xu, kho, PIN hay thư */
function publicShop(u: { username: string; lv: number; earned: unknown; state: unknown }) {
  const s = (u.state ?? {}) as Record<string, unknown>;
  const v = (s.venue ?? {}) as { tbl?: unknown; tables?: unknown; floors?: unknown; wide?: unknown };
  let tbl = Array.isArray(v.tbl) ? v.tbl.map(n => Math.max(1, Math.min(3, Math.floor(Number(n) || 1)))).slice(0, 24) : [];
  if (!tbl.length) tbl = Array(Math.max(2, Math.ceil((Number(v.tables) || 5) / 2))).fill(1);
  const staff = (s.staff ?? {}) as Record<string, { hired?: boolean }>;
  return {
    username: u.username, lv: u.lv, earned: Number(u.earned),
    shop: str(s.shop, 20), room: strMap(s.room, 24), me: strMap(s.me, 24),
    served: Math.max(0, Math.floor(Number(s.served) || 0)), decor: Array.isArray(s.owned) ? s.owned.length : 0,
    stars: starsOf(s.reviews),
    hired: Object.values(staff).filter(x => x?.hired).length,
    venue: { tbl, floors: Math.max(1, Math.min(4, Math.floor(Number(v.floors) || 1))), wide: Math.max(0, Math.min(4, Math.floor(Number(v.wide) || 0))) }
  };
}

export async function GET(req: Request) {
  const me = await authUser(req);
  if (!me) return bad("Phiên đăng nhập đã hết, đăng nhập lại nha", 401);
  const q = new URL(req.url).searchParams, sql = db();
  if (q.get("inbox")) {
    const r = await sql`SELECT count(*)::int n, coalesce(sum(gift), 0)::int total FROM visits WHERE host_id = ${me.id} AND claimed = false`;
    return json({ pending: r[0].n, total: r[0].total });
  }
  const name = normUser(q.get("user"));
  if (!validUser(name)) return bad("Tên tiệm không hợp lệ");
  const host = await sql`SELECT id, username, lv FROM users WHERE username = ${name}`;
  if (!host.length) return bad("Không tìm thấy tiệm này", 404);
  if (Number(host[0].id) === me.id) return bad("Đây là tiệm của bạn mà", 400);
  const seen = await sql.query(`SELECT 1 FROM visits WHERE visitor_id = $1 AND host_id = $2 AND day = ${TODAY}`, [me.id, host[0].id]);
  const mine = await sql`SELECT state->>'coins' AS coins FROM users WHERE id = ${me.id}`;
  const coins = Math.max(0, Math.floor(Number(mine[0]?.coins) || 0));
  return json({ username: host[0].username, lv: host[0].lv, fee: seen.length ? 0 : feeOf(coins), free: seen.length > 0, coins });
}

export async function POST(req: Request) {
  const me = await authUser(req);
  if (!me) return bad("Phiên đăng nhập đã hết, đăng nhập lại nha", 401);
  const b = await body<{ user?: string; claim?: boolean }>(req);
  if (!b) return bad("Dữ liệu không hợp lệ");
  const sql = db();
  if (b.claim) {
    const r = await sql`
      WITH got AS (UPDATE visits SET claimed = true WHERE host_id = ${me.id} AND claimed = false RETURNING id, visitor_id, gift)
      SELECT u.username AS visitor, g.gift FROM got g JOIN users u ON u.id = g.visitor_id ORDER BY g.id`;
    return json({ gifts: r.map(x => ({ visitor: String(x.visitor), gift: Number(x.gift) })) });
  }
  const name = normUser(b.user);
  if (!validUser(name)) return bad("Tên tiệm không hợp lệ");
  const host = await sql`SELECT id, username, lv, earned, state FROM users WHERE username = ${name}`;
  if (!host.length) return bad("Không tìm thấy tiệm này", 404);
  if (Number(host[0].id) === me.id) return bad("Đây là tiệm của bạn mà", 400);
  const seen = await sql.query(`SELECT 1 FROM visits WHERE visitor_id = $1 AND host_id = $2 AND day = ${TODAY}`, [me.id, host[0].id]);
  let fee = 0;
  if (!seen.length) {
    const mine = await sql`SELECT state->>'coins' AS coins FROM users WHERE id = ${me.id}`;
    const coins = Math.max(0, Math.floor(Number(mine[0]?.coins) || 0));
    fee = feeOf(coins);
    if (coins < fee) return bad(`Cần ${fee} xu để ghé thăm, bạn chưa đủ xu`, 402);
    const gift = Math.floor(fee * GIFT_PCT);
    const ins = await sql.query(
      `INSERT INTO visits (host_id, visitor_id, day, fee, gift) VALUES ($1, $2, ${TODAY}, $3, $4) ON CONFLICT DO NOTHING RETURNING id`,
      [host[0].id, me.id, fee, gift]);
    if (!ins.length) fee = 0;           // hai lượt cùng lúc: chỉ tính phí một lần
  }
  return json({ fee, shop: publicShop({ username: host[0].username, lv: host[0].lv, earned: host[0].earned, state: host[0].state }) });
}
