/* Bộ icon giao diện: Lucide (nét đều, bo tròn) được chỉnh riêng cho game.
   - Mỗi icon có sẵn tông màu riêng (hồng, vàng, bạc hà, tím...), truyền tone = "" để lấy màu chữ của cha.
   - Icon hình khối (tim, sao, quà...) tô nhạt cùng màu bên trong (duotone) và có bóng đổ nhẹ cho bóng bẩy.
   - Nét mặc định 2.2, đầu và góc bo tròn. Style ở src/styles/parts/icons.css. */
import {
  Armchair, ArrowLeft, ArrowUpDown, ArrowRight, ArrowUp, Bell, BookOpen, Building2, CakeSlice, CalendarDays, ChartColumn, Check,
  ChefHat, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clover, Cloud, Coffee, Coins, CookingPot, Crown, Dices,
  DoorOpen, Droplet, Drumstick, Flame, Flower2, Gem, Gift, Handshake, Heart, Hourglass, Image, Layers, Lightbulb, Mail,
  Mars, Medal, Menu, Moon, Music, NotebookPen, Package, Palette, Pause, PawPrint, PartyPopper, Plus, Search, Settings,
  ShoppingBag, ShoppingBasket, Siren, Smile, Sofa, Sparkles, Sprout, Star, Store, Sun, Target, Ticket, TrendingUp, Trophy,
  TriangleAlert, UserPlus, UserRound, Users, Venus, Wrench, X, Zap, Castle, Cake, PiggyBank, ClockPlus, Award, House, ClipboardCheck
} from "lucide";
import type { IconNode } from "lucide";

export type Tone = "" | "pink" | "rose" | "gold" | "mint" | "violet" | "sky" | "wood" | "red" | "ink";

const mk = (node: IconNode, tone: Tone, duo = false) =>
  (size: number | string = 20, sw = 2.2, fill = "none", t: Tone = tone) =>
    `<svg class="lu${t ? " t-" + t : ""}${duo && fill === "none" ? " d" : ""}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
      node.map(([tag, a]) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("")}</svg>`;

export const ic = {
  /* đã dùng từ trước */
  seat: mk(Armchair, "wood", true), book: mk(BookOpen, "violet"), cal: mk(CalendarDays, "sky"), chevron: mk(ChevronRight, ""),
  coins: mk(PiggyBank, "gold", true), coin: mk(Coins, "gold", true), crown: mk(Crown, "gold", true), fire: mk(Flame, "red", true), heart: mk(Heart, "pink", true),
  hourglass: mk(Hourglass, "wood"), clockPlus: mk(ClockPlus, "sky"), award: mk(Award, "gold", true), home: mk(House, "", true), mission: mk(ClipboardCheck, "mint"), menu: mk(Menu, ""), paw: mk(PawPrint, "wood", true), plus: mk(Plus, ""),
  basket: mk(ShoppingBasket, "wood", true), star: mk(Star, "gold", true), store: mk(Store, "pink", true), trophy: mk(Trophy, "gold", true),
  userPlus: mk(UserPlus, "violet"), user: mk(UserRound, "violet", true), users: mk(Users, "violet", true), sprout: mk(Sprout, "mint", true),
  layers: mk(Layers, "violet", true), chef: mk(ChefHat, "wood", true), deal: mk(Handshake, "mint"),
  /* thao tác */
  check: mk(Check, "mint"), x: mk(X, ""), up: mk(ArrowUp, ""), left: mk(ArrowLeft, ""), right: mk(ArrowRight, ""),
  chevL: mk(ChevronLeft, ""), chevR: mk(ChevronRight, ""), chevU: mk(ChevronUp, ""), chevD: mk(ChevronDown, ""),
  pause: mk(Pause, "", true), search: mk(Search, ""), sort: mk(ArrowUpDown, ""), warn: mk(TriangleAlert, "gold", true), bell: mk(Bell, "gold", true),
  /* trang trí, trạng thái */
  sparkle: mk(Sparkles, "gold", true), gift: mk(Gift, "pink", true), ticket: mk(Ticket, "violet", true), gem: mk(Gem, "sky", true),
  bulb: mk(Lightbulb, "gold", true), bolt: mk(Zap, "gold", true), drop: mk(Droplet, "sky", true), clover: mk(Clover, "mint", true),
  party: mk(PartyPopper, "pink"), flower: mk(Flower2, "rose", true), smile: mk(Smile, "gold"), moon: mk(Moon, "violet", true),
  sun: mk(Sun, "gold", true), cloud: mk(Cloud, "sky", true), mail: mk(Mail, "rose", true), target: mk(Target, "red"),
  medal: mk(Medal, "gold", true), trend: mk(TrendingUp, "mint"), dice: mk(Dices, "violet", true), image: mk(Image, "sky", true),
  /* đồ, nơi chốn */
  bag: mk(ShoppingBag, "pink", true), building: mk(Building2, "sky", true), castle: mk(Castle, "violet", true), door: mk(DoorOpen, "wood", true),
  cake: mk(Cake, "pink", true), slice: mk(CakeSlice, "pink", true), meat: mk(Drumstick, "wood", true), pot: mk(CookingPot, "wood", true),
  coffee: mk(Coffee, "wood", true), sofa: mk(Sofa, "wood", true), box: mk(Package, "wood", true), siren: mk(Siren, "red", true),
  stats: mk(ChartColumn, "violet"), music: mk(Music, "pink"), palette: mk(Palette, "rose", true), wrench: mk(Wrench, "wood"),
  gear: mk(Settings, "violet"), pen: mk(NotebookPen, "violet"), venus: mk(Venus, "pink"), mars: mk(Mars, "sky")
};
export type IconName = keyof typeof ic;
