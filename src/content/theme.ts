/* Theme màu giao diện. Màu thật nằm trong styles/themes.css (tạo bằng `npm run themes`);
   `pink` là bản gốc nên không có luật riêng. `dot` là màu chấm tròn trong bảng chọn. */
export interface Theme { id: string; name: string; dot: string }
export const THEMES: Theme[] = [
  { id: "pink", name: "Hồng", dot: "#FF7FA1" },
  { id: "blue", name: "Xanh dương", dot: "#5D9AD9" },
  { id: "green", name: "Xanh lá", dot: "#4FB27E" },
  { id: "purple", name: "Tím", dot: "#8F72D9" },
  { id: "orange", name: "Cam", dot: "#F29A4A" },
  { id: "slate", name: "Xám than", dot: "#6B7C8F" }
];
export const themeOf = (id: string) => THEMES.find(t => t.id === id) || THEMES[0];

/** Áp theme cho cả trang (và màu thanh trình duyệt trên điện thoại) */
export function applyTheme(id: string) {
  const t = themeOf(id).id, root = document.documentElement;
  if (t === "pink") root.removeAttribute("data-theme"); else root.dataset.theme = t;
  const bar = document.querySelector('meta[name="theme-color"]');
  if (bar) bar.setAttribute("content", getComputedStyle(root).getPropertyValue("--pink-l").trim() || "#FFD6E0");
}
