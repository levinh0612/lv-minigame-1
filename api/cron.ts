/* GET /api/cron?slot=morning|night — Vercel Cron gọi lúc 0:00 UTC (7:00 VN) và 16:00 UTC (23:00 VN).
   Gửi thông báo đẩy cho các máy đã bật nhắc; đăng ký hết hạn (404/410) thì xoá. */
import webpush from "web-push";
import { eventNote, todayEvents } from "../src/engine/dates";
import { bad, db, json } from "./_lib";

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

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return bad("Không có quyền", 401);
  const slot = new URL(req.url).searchParams.get("slot") === "night" ? "night" : "morning";
  webpush.setVapidDetails("mailto:noreply@lv-minigame-1.vercel.app", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const sql = db();
  const subs = slot === "morning"
    ? await sql`SELECT endpoint, sub, her FROM push_subs WHERE morning`
    : await sql`SELECT endpoint, sub, her FROM push_subs WHERE night`;
  const ev = slot === "morning" ? todayEvents()[0] : undefined;
  const day = new Date().getUTCDate();
  let sent = 0, gone = 0;
  await Promise.all(subs.map(async s => {
    const her = String(s.her || "Em");
    const payload = ev
      ? { title: `${ev.t} 🎉`, body: eventNote(ev).replace(/\bEm\b/g, her), tag: "event" }
      : { title: slot === "morning" ? `Chào buổi sáng ${her} ☀️` : `Ngủ ngon ${her} 🌙`, body: fill((slot === "morning" ? MORNING : NIGHT)[day % 3], her), tag: slot };
    try { await webpush.sendNotification(s.sub as webpush.PushSubscription, JSON.stringify({ ...payload, url: "/" }), { TTL: 3600 }); sent++; }
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { await sql`DELETE FROM push_subs WHERE endpoint = ${s.endpoint}`; gone++; }
    }
  }));
  return json({ slot, sent, gone, total: subs.length });
}
