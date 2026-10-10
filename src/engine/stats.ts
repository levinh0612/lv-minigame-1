/* Chỉ số tiệm hiển thị trong hộp thoại "Xem chỉ số": dùng chung cho tiệm của mình (đủ chỉ số cá nhân) và tiệm hàng xóm (chỉ phần công khai).
   Mỗi nhóm xếp theo độ quan trọng; thêm chỉ số mới chỉ cần thêm một dòng ở statGroups(). */
import { RECIPES } from "../content/game";
import { SHOP_UPGRADES } from "../content/progression";
import { daysTogether } from "./dates";
import { capacity, demand, fameScore } from "./economy";
import { ownedCount } from "./gacha";
import { lvl, unlocked, xpFor } from "./progress";
import { masteredCount } from "./craft";
import { S } from "./state";
import { upgradeLv } from "./upgrades";
import type { VisitShop } from "./visit";

/** số liệu công khai của một tiệm (của mình hoặc hàng xóm) */
export interface ShopStats {
  lv: number; earned: number; served: number; recipes: number; shifts: number; streak: number; made: number; perfect: number; tower: number; elite: number;
  mastered: number; upgrades: number; decor: number; floors: number; wide: number; seats: number; hired: number; viral: number; stars: number; collected: number;
}
export interface StatRow { icon: string; label: string; value: string | number }
export interface StatGroup { title: string; rows: StatRow[] }

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, n) => a + n, 0);

/** chỉ số công khai của chính mình */
export function myStats(): ShopStats {
  const r = S.reviews.slice(0, 20);
  return {
    lv: lvl(), earned: S.earned, served: S.served, recipes: unlocked().length, shifts: S.shifts, streak: Math.max(S.prog.bestStreak, S.streak),
    made: sum(S.prog.made), perfect: S.prog.stat.perfect ?? 0, tower: S.prog.stat.tower ?? 0, elite: S.prog.stat.elite ?? 0, mastered: masteredCount(),
    upgrades: SHOP_UPGRADES.reduce((a, u) => a + upgradeLv(u.id), 0), decor: S.owned.length, floors: S.venue.floors, wide: S.venue.wide, seats: capacity(),
    hired: Object.values(S.staff).filter(x => x.hired).length, viral: demand(), stars: r.length ? r.reduce((a, x) => a + x.s, 0) / r.length : 2, collected: ownedCount()
  };
}
/** chỉ số công khai của tiệm hàng xóm (server chưa gửi trường nào thì coi là 0) */
export function visitStats(v: VisitShop, seats: number, viral: number): ShopStats {
  return {
    lv: v.lv, earned: v.earned, served: v.served, recipes: RECIPES.filter(r => r.lv <= v.lv).length, shifts: v.shifts ?? 0, streak: v.streak ?? 0, made: v.made ?? 0,
    perfect: v.perfect ?? 0, tower: v.tower ?? 0, elite: v.elite ?? 0, mastered: v.mastered ?? 0, upgrades: v.upgrades ?? 0, decor: v.decor, floors: v.venue.floors,
    wide: v.venue.wide, seats, hired: v.hired, viral, stars: v.stars ?? 2, collected: v.collected ?? 0
  };
}

const n = (x: number) => x.toLocaleString("vi-VN");
/** các nhóm chỉ số, xếp từ quan trọng nhất; `self` thêm nhóm chỉ số cá nhân (chỉ tiệm của mình) */
export function statGroups(s: ShopStats, self: boolean): StatGroup[] {
  const groups: StatGroup[] = [
    { title: "Tổng quan", rows: [
      { icon: "⭐", label: "Cấp người chơi", value: `Lv ${s.lv}` },
      { icon: "🪙", label: "Xu bán được", value: n(s.earned) },
      { icon: "🧑‍🍳", label: "Khách đã phục vụ", value: n(s.served) },
      { icon: "🍰", label: "Món bánh bán được", value: `${n(s.recipes)}/${RECIPES.length}` },
      { icon: "🚪", label: "Số ca đã mở", value: n(s.shifts) },
      { icon: "🔥", label: "Chuỗi ngày dài nhất", value: `${n(s.streak)} ngày` }
    ] },
    { title: "Tay nghề", rows: [
      { icon: "🎂", label: "Tổng bánh đã làm", value: n(s.made) },
      { icon: "⚡", label: "Giao Hoàn hảo", value: n(s.perfect) },
      { icon: "🏰", label: "Bánh nhiều tầng", value: n(s.tower) },
      { icon: "💎", label: "Món cao cấp (Lv 26+)", value: n(s.elite) },
      { icon: "🌟", label: "Công thức đủ 5 sao", value: n(s.mastered) },
      { icon: "😊", label: "Đánh giá trung bình", value: `${s.stars.toFixed(1)} / 3 sao` }
    ] },
    { title: "Tiệm", rows: [
      { icon: "🔥", label: "Khách cao điểm", value: `${s.viral} khách` },
      { icon: "🪑", label: "Sức chứa", value: `${s.seats} ghế` },
      { icon: "🏢", label: "Số lầu", value: s.floors },
      { icon: "↔️", label: "Mở rộng ngang", value: s.wide },
      { icon: "🛠️", label: "Cấp nâng cấp tiệm", value: `${n(s.upgrades)}/${SHOP_UPGRADES.reduce((a, u) => a + u.max, 0)}` },
      { icon: "🛍", label: "Đồ trang trí", value: n(s.decor) },
      { icon: "🐾", label: "Nhân viên", value: s.hired },
      { icon: "🎴", label: "Bộ sưu tập Gacha", value: n(s.collected) }
    ] }
  ];
  if (self) {
    const L = lvl(), need = xpFor(L + 1) - xpFor(L);
    groups.push({ title: "Cá nhân", rows: [
      { icon: "💰", label: "Xu hiện có", value: n(S.coins) },
      { icon: "📈", label: "Kinh nghiệm", value: `${n(S.xp - xpFor(L))}/${n(need)}` },
      { icon: "🎟", label: "Vé triệu hồi", value: n(S.gacha.tickets) },
      { icon: "✨", label: "Bụi sao", value: n(S.gacha.dust) },
      { icon: "🎰", label: "Lượt triệu hồi", value: n(S.gacha.pulls) },
      { icon: "📅", label: "Ngày bên nhau", value: n(daysTogether()) },
      { icon: "🎯", label: "Độ nổi tiếng", value: fameScore().toFixed(1) },
      { icon: "🏆", label: "Chuỗi ngày hiện tại", value: `${n(S.streak)} ngày` }
    ] });
  }
  return groups;
}
