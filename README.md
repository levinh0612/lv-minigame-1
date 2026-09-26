# Tiệm Bánh Matcha

Game mini chơi mỗi ngày trên điện thoại: mở tiệm bánh matcha ít ngọt, phục vụ khách, nuôi Milo, Siro, Cacao và mở thư tình mỗi ngày.

- `game.html`: toàn bộ game (HTML/CSS/JS thuần, không cần thư viện). Sửa tên, ngày kỷ niệm, thư tình trong object `CFG` ở đầu script.
- `build.sh`: tạo `dist/index.html` + manifest để deploy.
- Deploy: Vercel tự chạy `sh build.sh` và phục vụ thư mục `dist/` mỗi lần push lên `main`.

Chạy thử local: `./build.sh && open dist/index.html`
