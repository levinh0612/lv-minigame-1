/* Ngày đặc biệt: kỷ niệm, tròn tháng, sinh nhật, mốc 100 ngày, lễ. */
import { CFG, type EventKey } from "../content/couple";
import { S } from "./state";
import { DAY, parse, today } from "./util";

export interface SpecialDay { key: EventKey; date: Date; t: string; v: Record<string, number>; in: number }

export const daysTogether = () => Math.floor((+today() - +parse(CFG.metDate)) / DAY) + 1;
function nextOn(m: number, d: number) {
  const t = today(); let x = new Date(t.getFullYear(), m - 1, d);
  if (x < t) x = new Date(t.getFullYear() + 1, m - 1, d);
  return x;
}
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export function events(): SpecialDay[] {
  const t = today(), met = parse(CFG.metDate), her = parse(CFG.herBirthday), his = parse(CFG.hisBirthday);
  const list: Omit<SpecialDay, "in">[] = [];
  const an = nextOn(met.getMonth() + 1, met.getDate()), years = an.getFullYear() - met.getFullYear();
  list.push({ key: "anniversary", date: an, t: `Kỷ niệm ${years} năm yêu nhau`, v: { n: years } });
  const hb = nextOn(her.getMonth() + 1, her.getDate());
  list.push({ key: "herBirthday", date: hb, t: "Sinh nhật " + S.names.her, v: { age: hb.getFullYear() - her.getFullYear() } });
  const sb = nextOn(his.getMonth() + 1, his.getDate());
  list.push({ key: "hisBirthday", date: sb, t: "Sinh nhật " + S.names.his, v: { age: sb.getFullYear() - his.getFullYear() } });
  // tròn tháng (cùng ngày với ngày quen), bỏ qua tháng trùng kỷ niệm năm
  let mo = new Date(t.getFullYear(), t.getMonth(), met.getDate());
  if (mo < t) mo = new Date(t.getFullYear(), t.getMonth() + 1, met.getDate());
  const months = (mo.getFullYear() - met.getFullYear()) * 12 + mo.getMonth() - met.getMonth();
  if (months % 12) list.push({ key: "monthly", date: mo, t: `Tròn ${months} tháng`, v: { n: months } });
  const nextHund = Math.ceil(daysTogether() / 100) * 100 || 100;
  list.push({ key: "milestone", date: new Date(met.getFullYear(), met.getMonth(), met.getDate() + nextHund - 1), t: `Ngày thứ ${nextHund} bên nhau`, v: {} });
  list.push({ key: "valentine", date: nextOn(2, 14), t: "Valentine", v: {} });
  list.push({ key: "women83", date: nextOn(3, 8), t: "Quốc tế Phụ nữ 8/3", v: {} });
  list.push({ key: "women2010", date: nextOn(10, 20), t: "Phụ nữ Việt Nam 20/10", v: {} });
  return list.map(e => ({ ...e, in: Math.round((+e.date - +t) / DAY) })).sort((a, b) => a.in - b.in);
}
export const todayEvents = () => events().filter(e => e.in === 0);
export const coinMult = () => (todayEvents().length ? 2 : 1);
export const eventNote = (e: SpecialDay) => fill(CFG.eventNotes[e.key] || "", { ...e.v, d: daysTogether(), her: S.names.her, his: S.names.his });
