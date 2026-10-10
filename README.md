# Tiệm Bánh Matcha

Game mini chơi mỗi ngày trên điện thoại: mở tiệm bánh, ghép bánh có mặt cười cho khách, nuôi Milo, Siro, Cacao và mở thư tình mỗi ngày. Giao diện theo thiết kế "Kẹo dâu phồng" (1a) từ Claude Design.

## Chạy

```bash
npm install
npm run dev        # chạy thử ở http://localhost:5173
npm test           # unit test phần luật chơi
npm run build      # kiểm tra kiểu + build ra dist/ (có service worker để chơi offline)
npm run storybook  # xem mọi màn hình / thành phần với dữ liệu mẫu
npm run capture    # chụp từng mục Storybook ra design-kit/*.png để gửi Claude Design
```

Push lên `main` là Vercel tự build và deploy.

## Cấu trúc

```
src/
  content/   dữ liệu: couple.ts (tên, ngày, thư tình), game.ts (bánh, công thức Lv 1–60, khách), progression.ts (nội dung cày: tay nghề, danh hiệu, nhiệm vụ tuần, nâng cấp tiệm), roadmap.ts (trang Sắp ra mắt)
  engine/    luật chơi, không đụng DOM: state (lưu + chuyển dữ liệu cũ), dates (ngày đặc biệt), progress (cấp, mục tiêu), economy (kho, nhân viên, lương), shift (một ca bán),
             craft / achievements / weekly / upgrades (nội dung cày), track (ghi nhận mỗi bánh giao cho các phần đó)
  audio/     nhạc nền và hiệu ứng tổng hợp bằng Web Audio
  ui/        art (vẽ SVG), router (đường dẫn theo hash), modals, screens/*
  styles/    main.css (mục lục, nạp parts/*.css vào layer "legacy"), tailwind.css (theme Tailwind v4, KHÔNG có preflight), themes.css (sinh bằng npm run themes)
  storybook/ trang /storybook.html (không ghi vào tiến trình thật)
tests/       vitest cho engine
scripts/     capture.mjs: chụp Storybook; splash.mjs: sinh màn hình chờ iPhone (public/splash)
public/      icon app
```

## Viết giao diện

- Màn/thành phần **mới** dùng class Tailwind (màu lấy từ biến theme: `bg-pink`, `text-soft`, `bg-lav`, `shadow-[0_3px_0_var(--color-line)]`...). Mẫu: `src/ui/screens/progress.ts`.
- CSS cũ giữ nguyên ở `src/styles/parts/*.css` (nằm trong `@layer legacy`, thấp hơn Tailwind nên class tiện ích luôn thắng). Trước khi thêm class thủ công, grep tên để khỏi trùng.
- Thêm nội dung cày: sửa dữ liệu trong `content/progression.ts`; logic nằm ở `engine/*.ts`, có test ở `tests/progression.test.ts`.

## Đường dẫn

| Đường dẫn | Màn |
|---|---|
| `#/` | Bắt đầu |
| `#/muc-tieu` | Mục tiêu, công thức, đánh giá |
| `#/thanh-tich` | Thành tích: nhiệm vụ tuần, danh hiệu, tay nghề, nâng cấp tiệm |
| `#/cua-hang`, `#/cua-hang/thu-cung`, `#/cua-hang/qua-tang` | Cửa hàng |
| `#/chuan-bi` | Chuẩn bị ca: đi chợ, nhân viên |
| `#/sap-ra-mat` | Lộ trình nâng cấp + Có gì mới |
| `#/choi`, `#/ket-qua` | Ca bán, kết quả (chỉ vào được từ trong game) |

## Cập nhật lộ trình

Sửa `src/content/roadmap.ts`: đổi `status` (`done` / `doing` / `soon` / `later`), thêm mục, thêm bản vào `CHANGELOG`, rồi push.
