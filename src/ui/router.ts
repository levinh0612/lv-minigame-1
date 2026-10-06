/* Router theo hash: mỗi màn có đường dẫn riêng, nút Back của điện thoại hoạt động đúng.
   Thêm màn mới: thêm một dòng vào ROUTES. */
export type ShopTab = "decor" | "pets" | "gift";
export type Route =
  | { name: "home" } | { name: "goals" } | { name: "roadmap" } | { name: "prep" }
  | { name: "shop"; tab: ShopTab } | { name: "play" } | { name: "result" } | { name: "rank" } | { name: "visit"; user: string } | { name: "gacha" };

const ROUTES: [string, Route][] = [
  ["/", { name: "home" }],
  ["/muc-tieu", { name: "goals" }],
  ["/cua-hang", { name: "shop", tab: "decor" }],
  ["/cua-hang/thu-cung", { name: "shop", tab: "pets" }],
  ["/cua-hang/qua-tang", { name: "shop", tab: "gift" }],
  ["/sap-ra-mat", { name: "roadmap" }],
  ["/xep-hang", { name: "rank" }],
  ["/gacha", { name: "gacha" }],
  ["/chuan-bi", { name: "prep" }],
  ["/choi", { name: "play" }],
  ["/ket-qua", { name: "result" }]
];

export const currentPath = () => location.hash.replace(/^#/, "") || "/";
export const resolve = (path: string): Route =>
  path.startsWith("/ghe-tham/") && path.length > 10 ? { name: "visit", user: decodeURIComponent(path.slice(10)) } : ROUTES.find(([p]) => p === path)?.[1] ?? { name: "home" };

/* replace = không thêm vào lịch sử (đổi tab, sang màn kết quả) */
export function navigate(path: string, replace = false) {
  if (currentPath() === path) { window.dispatchEvent(new HashChangeEvent("hashchange")); return; }
  if (replace) location.replace("#" + path); else location.hash = path;
}
