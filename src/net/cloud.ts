/* Lưu tiệm lên mây (Neon qua /api), bảng xếp hạng, thông báo đẩy.
   Không có mạng hoặc server lỗi thì bỏ qua lặng lẽ: game vẫn chơi offline như cũ. */
import { KEY, S, loadState, save } from "../engine/state";
import { lvl } from "../engine/progress";

declare const __APP_VERSION__: string;
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // bỏ I, O, 0, 1 cho khỏi nhầm

export const fmtCode = (c: string) => c.replace(/(.{4})(?=.)/g, "$1-");
export const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
export function ensureCode() {
  if (S.cloud.code) return S.cloud.code;
  const b = crypto.getRandomValues(new Uint8Array(16));
  S.cloud.code = Array.from(b, x => ALPHA[x % ALPHA.length]).join("");
  if (!S.cloud.name) S.cloud.name = `Tiệm của ${S.names.her}`.slice(0, 24);
  save(); return S.cloud.code;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch("/api/" + path, { ...init, headers: { "content-type": "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { error?: string }).error || "Server đang bận, thử lại sau nha");
  return d as T;
}

/* lưu ngay (sau mỗi ca, khi rời app). Trả về true nếu lưu được */
let busy = false;
export async function cloudSave(): Promise<boolean> {
  if (busy || !navigator.onLine) return false;
  busy = true;
  try {
    const code = ensureCode();
    await call("save", { method: "POST", body: JSON.stringify({
      code, name: S.cloud.show ? S.cloud.name : "", earned: S.earned, lv: lvl(), ver: __APP_VERSION__, state: S }) });
    S.cloud.at = new Date().toISOString(); save();
    return true;
  } catch { return false; } finally { busy = false; }
}
/* tự lưu: không quá 1 lần / 2 phút */
let last = 0;
export function autoSave() { if (Date.now() - last < 120000) return; last = Date.now(); void cloudSave(); }

/* đổi máy / cài lại app: nhập mã tiệm để lấy lại tiến trình */
export async function cloudRestore(code: string) {
  const c = normCode(code);
  const d = await call<{ state: unknown }>("load", { method: "POST", body: JSON.stringify({ code: c }) });
  const s = loadState(JSON.stringify(d.state));
  s.cloud.code = c;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export interface Rank { rank: number; name: string; lv: number; earned: number; me?: boolean }
export const leaderboard = () =>
  call<{ top: Rank[]; me: { rank: number | null; name: string; lv: number; earned: number } | null }>("leaderboard?code=" + encodeURIComponent(S.cloud.code));

/* ===== Thông báo 7g sáng / 11g tối ===== */
export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
// iPhone chỉ nhận thông báo khi game đã được thêm vào màn hình chính
export const isStandalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const b64 = (s: string) => { const p = "=".repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, c => c.charCodeAt(0)); };

/* bật / cập nhật giờ nhắc. Phải gọi trong lúc người chơi chạm (iOS yêu cầu) */
export async function enablePush(): Promise<string> {
  if (!pushSupported()) return isStandalone() ? "Máy này chưa hỗ trợ thông báo" : "Thêm game vào màn hình chính trước (Chia sẻ → Thêm vào MH chính), rồi mở từ đó để bật thông báo";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Chưa được cho phép thông báo. Vào Cài đặt iPhone → Thông báo → Tiệm Bánh để bật";
  if (!(await cloudSave())) return "Chưa lưu được tiệm lên mây, kiểm tra mạng rồi thử lại";
  const reg = await navigator.serviceWorker.ready;
  const { key } = await call<{ key: string }>("push");
  const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
  await call("push", { method: "POST", body: JSON.stringify({ code: S.cloud.code, sub: sub.toJSON(), her: S.names.her, morning: S.cloud.morning, night: S.cloud.night }) });
  S.cloud.push = true; save();
  return "";
}
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub) { await call("push", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {}); await sub.unsubscribe(); }
  } catch { /* bỏ qua */ }
  S.cloud.push = false; save();
}
