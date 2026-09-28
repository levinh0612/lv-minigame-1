/* Phát hiện bản mới và cập nhật cho chắc (iPhone mở từ màn hình chính hay "kẹt" bản cũ).
   - version.json (không cache) ghi mã build; khác mã đang chạy = có bản mới.
   - Cập nhật: lưu lên server → bảo service worker mới thay bản cũ → chờ tối đa 3 giây →
     chưa xong thì xoá service worker + cache rồi tải lại từ mạng (luôn ra bản mới).
   - Mở app mà có bản mới (không đang trong ca) thì tự cập nhật; đang trong ca thì hết ca mới cập nhật. */
import { cloudSave, keepUnlock } from "./cloud";

export interface Remote { v: string; build: string }
let remote: Remote | null = null, reg: ServiceWorkerRegistration | undefined, lastCheck = 0;
export const setRegistration = (r?: ServiceWorkerRegistration) => { reg = r; };
export const newVersion = () => remote;

/* hỏi server bản mới nhất (tối đa mỗi phút một lần, trừ khi force) */
export async function checkVersion(force = false): Promise<Remote | null> {
  if (!import.meta.env.PROD || !navigator.onLine || (!force && Date.now() - lastCheck < 60000)) return remote;
  lastCheck = Date.now();
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    const d = await r.json() as Remote;
    remote = d.build && d.build !== __BUILD__ ? d : null;
    if (remote) void reg?.update();              // cho service worker tải sẵn bản mới
  } catch { /* offline */ }
  return remote;
}

function overlay(msg: string) {
  document.getElementById("updOverlay")?.remove();
  document.body.insertAdjacentHTML("beforeend", `<div class="updov" id="updOverlay"><div class="spin"></div><b>${msg}</b><small>Tiệm đã được lưu, không mất gì đâu</small></div>`);
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/* xoá hết bản cũ trong máy rồi tải lại từ mạng */
export async function hardReload() {
  overlay("Đang tải bản mới nhất…");
  keepUnlock(); await cloudSave().catch(() => false);
  try { for (const r of await navigator.serviceWorker?.getRegistrations() ?? []) await r.unregister(); } catch { /* bỏ qua */ }
  try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* bỏ qua */ }
  location.replace(`${location.pathname}?v=${remote?.build ?? Date.now()}${location.hash}`);
}

/* cập nhật: đường nhanh (service worker mới thay bản cũ), 3 giây không xong thì hardReload */
let running = false;
/* đã thử tự cập nhật lên bản này trong 5 phút qua mà vẫn chưa lên: đừng tự thử lại (tránh tải lại liên tục) */
export function triedRecently() {
  try { const [b, t] = (sessionStorage.getItem("tiem-upd-try") || "").split("|"); return !!remote && b === remote.build && Date.now() - Number(t) < 300000; } catch { return false; }
}
export async function applyUpdate() {
  if (running) return; running = true;
  try { sessionStorage.setItem("tiem-upd-try", `${remote?.build ?? ""}|${Date.now()}`); } catch { /* bỏ qua */ }
  overlay(`Đang cập nhật lên bản ${remote?.v ?? "mới"}…`);
  try { localStorage.setItem("tiem-prev-ver", __APP_VERSION__); } catch { /* bỏ qua */ }
  keepUnlock(); await cloudSave().catch(() => false);
  const sw = navigator.serviceWorker;
  if (sw && reg) {
    const switched = new Promise<boolean>(ok => { sw.addEventListener("controllerchange", () => ok(true), { once: true }); setTimeout(() => ok(false), 3000); });
    try { await reg.update(); } catch { /* bỏ qua */ }
    for (let i = 0; i < 10 && !reg.waiting && reg.installing; i++) await wait(200);   // chờ tải xong
    reg.waiting?.postMessage({ type: "SKIP_WAITING" });
    if (await switched) { location.reload(); return; }
  }
  await hardReload();
}

/* sau khi cập nhật: bản trước là gì (để hiện "Có gì mới" một lần) */
export function justUpdated(): string | null {
  try {
    const prev = localStorage.getItem("tiem-prev-ver"), seen = localStorage.getItem("tiem-seen-ver");
    localStorage.setItem("tiem-seen-ver", __APP_VERSION__); localStorage.removeItem("tiem-prev-ver");
    if (seen && seen !== __APP_VERSION__) return seen;           // lần đầu mở bản mới
    return prev && prev !== __APP_VERSION__ ? prev : null;
  } catch { return null; }
}
