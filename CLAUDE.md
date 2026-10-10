# lv-game-mini-1 (Tiệm bánh matcha, PWA Vite + TypeScript)

## Đọc code tiết kiệm token
- Map trước, đọc sau: `ls`, `wc -l`, `grep -rn` để tìm vị trí, rồi chỉ đọc khoảng dòng cần (`offset`/`limit`). Không đọc cả file lớn nếu chỉ cần một hàm.
- Bỏ qua: `dist/`, `node_modules/`, `.vercel/`, `public/` (ảnh, âm thanh), `design-kit/`, `package-lock.json`, `.env*`.
- Không đọc lại file đã đọc trong phiên; nhớ nội dung hoặc grep lại đúng dòng.

## Cấu trúc nhanh
- `src/engine/`: luật chơi, kinh tế, trạng thái (`state.ts`, `stats.ts`, `suppliers.ts`).
- `src/ui/`: giao diện (`dom.ts` là helper HTML; `screens/` là từng màn).
- `src/styles/`: CSS (Tailwind v4 + `parts/`).
- `src/content/`: dữ liệu nội dung (`roadmap.ts` ghi lịch sử phiên bản).
- `src/storybook/`: trang xem trước component/modal.

## Lệnh
- `npm test` (vitest), `npm run typecheck`, `npm run build` (có typecheck).
- Sửa xong phải chạy `npm run typecheck` trước khi báo hoàn thành.

## Quy ước
- Giao diện và chữ hiển thị bằng tiếng Việt.
- Khi thêm tính năng người chơi thấy được, thêm một dòng vào `src/content/roadmap.ts` theo định dạng hiện có.
