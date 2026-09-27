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
  content/   dữ liệu: couple.ts (tên, ngày, thư tình), game.ts (bánh, khách, đồ trang trí), roadmap.ts (trang Sắp ra mắt)
  engine/    luật chơi, không đụng DOM: state (lưu + chuyển dữ liệu cũ), dates (ngày đặc biệt), progress (cấp, mục tiêu), economy (kho, nhân viên, lương), shift (một ca bán)
  audio/     nhạc nền và hiệu ứng tổng hợp bằng Web Audio
  ui/        art (vẽ SVG), router (đường dẫn theo hash), modals, screens/*
  storybook/ trang /storybook.html (không ghi vào tiến trình thật)
tests/       vitest cho engine
scripts/     capture.mjs: chụp Storybook bằng Chrome headless
public/      icon app
```

## Đường dẫn

| Đường dẫn | Màn |
|---|---|
| `#/` | Bắt đầu |
| `#/muc-tieu` | Mục tiêu, công thức, đánh giá |
| `#/cua-hang`, `#/cua-hang/thu-cung`, `#/cua-hang/qua-tang` | Cửa hàng |
| `#/chuan-bi` | Chuẩn bị ca: đi chợ, nhân viên |
| `#/sap-ra-mat` | Lộ trình nâng cấp + Có gì mới |
| `#/choi`, `#/ket-qua` | Ca bán, kết quả (chỉ vào được từ trong game) |

## Cập nhật lộ trình

Sửa `src/content/roadmap.ts`: đổi `status` (`done` / `doing` / `soon` / `later`), thêm mục, thêm bản vào `CHANGELOG`, rồi push.
