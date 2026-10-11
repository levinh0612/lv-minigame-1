/* Nội dung sưu tầm: sticker, đồ cho thú cưng, truyện khách quen, sự kiện mùa, thử thách ngày. Luật tính ở engine/collection.ts, story.ts, season.ts, challenge.ts. */

/* ===== Sticker: 4 trang, mỗi trang 6 hình; đủ trang được thưởng ===== */
export interface Sticker { id: string; n: string; e: string; page: string }
export interface StickerPage { id: string; n: string; tickets: number; outfit?: string }
export const PAGES: StickerPage[] = [
  { id: "guest", n: "Khách quen", tickets: 1 },
  { id: "cake", n: "Bánh ngọt", tickets: 1 },
  { id: "shop", n: "Tiệm xinh", tickets: 1 },
  { id: "fest", n: "Mùa lễ hội", tickets: 2, outfit: "crown" }
];
const row = (page: string, xs: [string, string][]): Sticker[] => xs.map(([e, n]) => ({ id: `${page}-${e}`, n, e, page }));
export const STICKERS: Sticker[] = [
  ...row("guest", [["🐻", "Gấu nâu"], ["🦊", "Cáo cam"], ["🐰", "Thỏ trắng"], ["🐼", "Gấu trúc"], ["🐸", "Ếch xanh"], ["🦉", "Cú mèo"]]),
  ...row("cake", [["🍰", "Bánh kem"], ["🧁", "Cupcake"], ["🍡", "Dango"], ["🍵", "Trà matcha"], ["🍓", "Dâu tây"], ["🍪", "Bánh quy"]]),
  ...row("shop", [["🌸", "Hoa anh đào"], ["⭐", "Ngôi sao"], ["🎀", "Nơ hồng"], ["🕯️", "Nến thơm"], ["🪴", "Chậu cây"], ["🎈", "Bóng bay"]]),
  ...row("fest", [["🎃", "Bí ngô"], ["🏮", "Đèn lồng"], ["🎄", "Cây thông"], ["🧧", "Lì xì"], ["❄️", "Bông tuyết"], ["🎆", "Pháo hoa"]])
];
export const stickerOf = (id: string) => STICKERS.find(s => s.id === id);

/* ===== Đồ cho Milo, Siro, Cacao (mỗi bé mặc một món) ===== */
export type OutfitSlot = "head" | "neck" | "face";
export type OutfitSrc = { buy: number } | { page: string } | { event: string } | { story: string };
export interface Outfit { id: string; n: string; e: string; slot: OutfitSlot; src: OutfitSrc }
export const OUTFITS: Outfit[] = [
  { id: "bow", n: "Nơ hồng", e: "🎀", slot: "head", src: { buy: 300 } },
  { id: "scarf", n: "Khăn len", e: "🧣", slot: "neck", src: { buy: 500 } },
  { id: "glasses", n: "Kính râm", e: "🕶️", slot: "face", src: { buy: 800 } },
  { id: "crown", n: "Vương miện", e: "👑", slot: "head", src: { page: "fest" } },
  { id: "pumpkin", n: "Mũ bí ngô", e: "🎃", slot: "head", src: { event: "halloween" } },
  { id: "santa", n: "Mũ ông già Noel", e: "🎅", slot: "head", src: { event: "noel" } },
  { id: "lantern", n: "Đèn lồng nhỏ", e: "🏮", slot: "neck", src: { event: "trungthu" } },
  { id: "envelope", n: "Bao lì xì", e: "🧧", slot: "neck", src: { event: "tet" } },
  { id: "flower", n: "Hoa cài đầu", e: "🌼", slot: "head", src: { story: "co-may" } },
  { id: "beret", n: "Mũ nồi họa sĩ", e: "🎨", slot: "head", src: { story: "chu-gau" } }
];
export const outfitOf = (id: string) => OUTFITS.find(o => o.id === id);
export const outfitHow = (o: Outfit) => "buy" in o.src ? `Mua ${o.src.buy} xu` : "page" in o.src ? `Đủ trang sticker ${PAGES.find(p => p.id === (o.src as { page: string }).page)?.n}` : "event" in o.src ? `Sự kiện ${SEASONS.find(s => s.id === (o.src as { event: string }).event)?.n}` : `Truyện ${STORIES.find(s => s.id === (o.src as { story: string }).story)?.who}`;

/* ===== Truyện khách quen: mỗi vị khách 3 lần ghé, mỗi lần một mẩu chuyện ===== */
export interface Chapter { t: string; text: string; coins: number; sticker?: string; outfit?: string; tickets?: number }
export interface Story { id: string; who: string; e: string; bio: string; chapters: Chapter[] }
export const STORIES: Story[] = [
  { id: "co-may", who: "Cô Mây", e: "👵", bio: "Bán hoa ở đầu phố, ghé tiệm mỗi chiều.", chapters: [
    { t: "Bó hoa buổi chiều", text: "Cô Mây đặt một bó cúc họa mi lên quầy: \"Tiệm thơm mùi bánh quá, cô tặng hoa cho đỡ trống.\"", coins: 120 },
    { t: "Chuyện chiếc xe đạp", text: "Cô kể hồi trẻ cô đạp xe qua cả thành phố để mua đúng một chiếc bánh mochi. \"Bánh ngon thì đáng đi xa.\"", coins: 200, sticker: "guest-🐰" },
    { t: "Lời cảm ơn", text: "Cô để lại một chiếc kẹp hoa: \"Cho bé thú cưng của con, cô tự làm đó.\"", coins: 300, outfit: "flower", tickets: 1 }
  ] },
  { id: "chu-gau", who: "Chú Gấu", e: "🧔", bio: "Họa sĩ truyện tranh, hay ngồi vẽ ở góc tiệm.", chapters: [
    { t: "Trang giấy trắng", text: "Chú Gấu vẽ nguệch ngoạc cả buổi: \"Bế tắc quá. Bánh của con ngọt đúng độ chú cần.\"", coins: 120 },
    { t: "Nhân vật mới", text: "Chú khoe bản phác thảo: một chú chó trắng trong tiệm bánh. \"Giống bé nhà con ghê.\"", coins: 200, sticker: "guest-🐻" },
    { t: "Tranh tặng tiệm", text: "Chú treo một bức tranh nhỏ lên tường và để lại chiếc mũ nồi: \"Cảm ơn con đã giữ cho chú một góc yên tĩnh.\"", coins: 300, outfit: "beret", tickets: 1 }
  ] },
  { id: "be-na", who: "Bé Na", e: "👧", bio: "Học sinh lớp 5, dành tiền tiêu vặt để mua bánh.", chapters: [
    { t: "Điểm mười", text: "Bé Na khoe bài kiểm tra: \"Con được điểm mười! Mẹ cho con thưởng một chiếc bánh.\"", coins: 120 },
    { t: "Bí mật nhỏ", text: "Na thì thầm: \"Con muốn mở tiệm bánh giống chị. Chị chỉ con làm kem được không?\"", coins: 200, sticker: "cake-🧁" },
    { t: "Tiệm bánh của Na", text: "Na mang đến một hộp bánh tự làm, hơi cháy một góc. \"Chị nếm thử đi, con làm cả ngày đó!\"", coins: 300, sticker: "shop-🎈", tickets: 1 }
  ] },
  { id: "bac-moc", who: "Bác Mộc", e: "👴", bio: "Thợ mộc về hưu, hay ngồi đọc báo cạnh cửa sổ.", chapters: [
    { t: "Chiếc ghế gãy", text: "Bác Mộc gõ gõ vào chân ghế: \"Lung lay rồi. Để bác sửa cho, miễn phí.\"", coins: 120 },
    { t: "Món quà bằng gỗ", text: "Bác tặng một khay gỗ tự đẽo: \"Khay này đựng bánh thì đẹp lắm.\"", coins: 200, sticker: "shop-🪴" },
    { t: "Ngày xưa", text: "Bác kể về người vợ cũng hay mua bánh ở tiệm nhỏ như thế này. \"Cảm ơn con, bác thấy như ở nhà.\"", coins: 300, sticker: "guest-🦉", tickets: 1 }
  ] }
];
export const storyOf = (id: string) => STORIES.find(s => s.id === id);

/* ===== Sự kiện mùa: đếm số khách phục vụ trong thời gian sự kiện, đạt mốc thì nhận thưởng ===== */
export interface SeasonTier { n: number; coinsPerLv: number; tickets: number; sticker?: boolean; outfit?: boolean }
export interface SeasonDef { id: string; n: string; e: string; blurb: string; sticker: string; outfit: string; windows: [string, string][] }
export const SEASON_TIERS: SeasonTier[] = [
  { n: 20, coinsPerLv: 20, tickets: 0 },
  { n: 50, coinsPerLv: 40, tickets: 1, sticker: true },
  { n: 100, coinsPerLv: 80, tickets: 2, outfit: true }
];
/** windows: [từ ngày, tới ngày] dạng YYYY-MM-DD (tính cả hai đầu); Tết và Trung thu theo lịch âm nên ghi từng năm */
export const SEASONS: SeasonDef[] = [
  { id: "halloween", n: "Lễ hội Bí Ngô", e: "🎃", blurb: "Tiệm trang trí ma mị dễ thương, khách đóng giả hóa trang ghé chơi.", sticker: "fest-🎃", outfit: "pumpkin", windows: [["2026-10-10", "2026-11-02"], ["2027-10-10", "2027-11-02"]] },
  { id: "noel", n: "Noel ấm áp", e: "🎄", blurb: "Mùa của bánh quy gừng và ly cacao nóng.", sticker: "fest-🎄", outfit: "santa", windows: [["2026-12-15", "2026-12-27"], ["2027-12-15", "2027-12-27"]] },
  { id: "tet", n: "Tết sum vầy", e: "🧧", blurb: "Khách mang lì xì và chúc năm mới cho cả tiệm.", sticker: "fest-🧧", outfit: "envelope", windows: [["2027-01-30", "2027-02-14"], ["2028-01-19", "2028-02-03"]] },
  { id: "trungthu", n: "Trung thu rằm", e: "🏮", blurb: "Lồng đèn lung linh và bánh trung thu phiên bản mochi.", sticker: "fest-🏮", outfit: "lantern", windows: [["2027-09-10", "2027-09-20"], ["2028-09-29", "2028-10-08"]] }
];
export const seasonOf = (id: string) => SEASONS.find(s => s.id === id);

/* ===== Thử thách ngày: mỗi ngày một thể lệ, bật trước ca, làm đạt mục tiêu thì nhận thưởng một lần ===== */
export type ChallengeGoal = { kind: "served"; share: number } | { kind: "calm" } | { kind: "combo"; n: number };
export interface Challenge { id: string; n: string; e: string; desc: string; pat: number; price: number; goal: ChallengeGoal; goalText: string }
export const CHALLENGES: Challenge[] = [
  { id: "rush", n: "Giờ cao điểm", e: "🔥", desc: "Khách sốt ruột hơn 25%, nhưng bánh bán giá ×1,5.", pat: 0.75, price: 1.5, goal: { kind: "served", share: 0.8 }, goalText: "Phục vụ ít nhất 80% số khách" },
  { id: "calm", n: "Chiều thong thả", e: "🍵", desc: "Khách kiên nhẫn hơn 40%, giá bình thường.", pat: 1.4, price: 1, goal: { kind: "calm" }, goalText: "Không để khách nào giận bỏ về" },
  { id: "gold", n: "Ngày vàng", e: "✨", desc: "Bánh bán giá ×1,3, khách kiên nhẫn ít hơn 10%.", pat: 0.9, price: 1.3, goal: { kind: "served", share: 0.9 }, goalText: "Phục vụ ít nhất 90% số khách" },
  { id: "perfect", n: "Tay nghề cao", e: "🎯", desc: "Bánh bán giá ×2, nhưng phải giao thật nhanh.", pat: 0.9, price: 2, goal: { kind: "combo", n: 3 }, goalText: "Đạt combo Hoàn hảo ×3" }
];
export const challengeOf = (id: string) => CHALLENGES.find(c => c.id === id);
