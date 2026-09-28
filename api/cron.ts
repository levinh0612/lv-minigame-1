/* GET /api/cron?slot=morning|night — Vercel Cron gọi lúc 0:00 UTC (7:00 VN) và 16:00 UTC (23:00 VN).
   Gửi thông báo đẩy cho các máy đã bật nhắc; đăng ký hết hạn (404/410) thì xoá. */
import webpush from "web-push";
import { CFG, type EventKey } from "../src/content/couple.js";
import { bad, db, json } from "./_lib.js";

const MORNING = [
  "Thư hôm nay đã đến tiệm rồi, Milo đang đợi {her} mở cửa nè ☀️",
  "Dậy thôi {her} ơi, Siro nướng xong mẻ bánh matcha đầu tiên rồi 🍵",
  "Chào buổi sáng! Cacao giữ chỗ đẹp nhất trong tiệm cho {her} rồi đó 💌"
];
const NIGHT = [
  "11 giờ rồi, đi ngủ thôi {her}. Milo tắt đèn tiệm nha 🌙",
  "Tiệm đóng cửa rồi, Siro cuộn tròn ngủ trên tủ bánh. {her} cũng ngủ ngon nha 💤",
  "Cất điện thoại đi ngủ thôi, mai tiệm còn đông khách lắm đó ✨"
];
const fill = (s: string, her: string) => s.replace(/\{her\}/g, her || "Em");

/* ngày đặc biệt hôm nay theo giờ Việt Nam (chỉ đọc cấu hình cặp đôi, không kéo cả engine của game) */
function todayEvent(): { t: string; note: string } | null {
  const vn = new Date(Date.now() + 7 * 3600e3), y = vn.getUTCFullYear(), m = vn.getUTCMonth() + 1, d = vn.getUTCDate();
  const md = (s: string) => { const [, mm, dd] = s.split("-").map(Number); return mm === m && dd === d; };
  const yr = (s: string) => y - Number(s.slice(0, 4));
  const met = Date.UTC(...(CFG.metDate.split("-").map((x, i) => Number(x) - (i === 1 ? 1 : 0)) as [number, number, number]));
  const days = Math.floor((Date.UTC(y, m - 1, d) - met) / 864e5) + 1;
  const note = (k: EventKey, v: Record<string, string | number>) =>
    CFG.eventNotes[k].replace(/\{(\w+)\}/g, (_, x) => String(v[x] ?? "")).replace(/\n/g, " ");
  const v = { d: days, her: "Em", his: CFG.hisName };
  if (md(CFG.herBirthday)) return { t: "Sinh nhật Em", note: note("herBirthday", { ...v, age: yr(CFG.herBirthday) }) };
  if (md(CFG.metDate)) return { t: `Kỷ niệm ${yr(CFG.metDate)} năm yêu nhau`, note: note("anniversary", { ...v, n: yr(CFG.metDate) }) };
  if (md(CFG.hisBirthday)) return { t: `Sinh nhật ${CFG.hisName}`, note: note("hisBirthday", v) };
  if (days % 100 === 0) return { t: `Ngày thứ ${days} bên nhau`, note: note("milestone", v) };
  if (m === 2 && d === 14) return { t: "Valentine", note: note("valentine", v) };
  if (m === 3 && d === 8) return { t: "Quốc tế Phụ nữ 8/3", note: note("women83", v) };
  if (m === 10 && d === 20) return { t: "Phụ nữ Việt Nam 20/10", note: note("women2010", v) };
  return null;
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return bad("Không có quyền", 401);
  const slot = new URL(req.url).searchParams.get("slot") === "night" ? "night" : "morning";
  webpush.setVapidDetails("mailto:noreply@lv-minigame-1.vercel.app", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const sql = db();
  const subs = slot === "morning"
    ? await sql`SELECT endpoint, sub, her FROM push_subs WHERE morning`
    : await sql`SELECT endpoint, sub, her FROM push_subs WHERE night`;
  const ev = slot === "morning" ? todayEvent() : null;
  const day = new Date().getUTCDate();
  let sent = 0, gone = 0;
  await Promise.all(subs.map(async s => {
    const her = String(s.her || "Em");
    const payload = ev
      ? { title: `${ev.t.replace(/\bEm\b/g, her)} 🎉`, body: ev.note.replace(/\bEm\b/g, her), tag: "event" }
      : { title: slot === "morning" ? `Chào buổi sáng ${her} ☀️` : `Ngủ ngon ${her} 🌙`, body: fill((slot === "morning" ? MORNING : NIGHT)[day % 3], her), tag: slot };
    try { await webpush.sendNotification(s.sub as webpush.PushSubscription, JSON.stringify({ ...payload, url: "/" }), { TTL: 3600 }); sent++; }
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { await sql`DELETE FROM push_subs WHERE endpoint = ${s.endpoint}`; gone++; }
    }
  }));
  return json({ slot, sent, gone, total: subs.length });
}
