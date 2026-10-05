/* Icon giao diện mới: Lucide (nét đều, bo tròn). Chỉ import icon nào dùng để bundle gọn.
   Màu lấy theo `color` của phần tử cha (stroke = currentColor), nên đổi theo màu chính của người chơi. */
import {
  Armchair, BookOpen, CalendarDays, ChevronRight, Coins, Crown, Flame, Heart, Hourglass, Menu, PawPrint, Plus,
  ShoppingBasket, Star, Store, Trophy, UserPlus, UserRound, Users, Sprout, Layers, ChefHat, Handshake
} from "lucide";
import type { IconNode } from "lucide";

const mk = (node: IconNode) => (size = 20, sw = 2, fill = "none") =>
  `<svg class="lu" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
    node.map(([tag, a]) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("")}</svg>`;

export const ic = {
  seat: mk(Armchair), book: mk(BookOpen), cal: mk(CalendarDays), chevron: mk(ChevronRight), coins: mk(Coins), crown: mk(Crown),
  fire: mk(Flame), heart: mk(Heart), hourglass: mk(Hourglass), menu: mk(Menu), paw: mk(PawPrint), plus: mk(Plus),
  basket: mk(ShoppingBasket), star: mk(Star), store: mk(Store), trophy: mk(Trophy), userPlus: mk(UserPlus), user: mk(UserRound),
  users: mk(Users), sprout: mk(Sprout), layers: mk(Layers), chef: mk(ChefHat), deal: mk(Handshake)
};
