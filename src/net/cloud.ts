/* Lưu tiệm lên mây (Neon qua /api), chuyển máy, ghép đôi, bảng xếp hạng, thông báo đẩy.
   Không có mạng hoặc server lỗi thì bỏ qua lặng lẽ: game vẫn chơi offline như cũ. */
import { netWorth } from "../engine/economy";
import { lvl } from "../engine/progress";
import { KEY, S, loadState, save, whenSaved } from "../engine/state";

declare const __APP_VERSION__: string;
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // bỏ I, O, 0, 1 cho khỏi nhầm
const rand = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => ALPHA[x % ALPHA.length]).join("");

export const fmtCode = (c: string) => c.replace(/(.{4})(?=.)/g, "$1-");
export const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const defaultName = () => `Tiệm của ${S.names.her}`.slice(0, 24);
export function ensureCode() {
  if (S.cloud.code) return S.cloud.code;
  S.cloud.code = rand(16);
  if (!S.cloud.name) S.cloud.name = defaultName();
  save(); return S.cloud.code;
}
/* mã máy: nằm ngoài tiến trình (khôi phục sang máy khác thì máy đó vẫn có mã riêng) */
function deviceId() {
  try { let d = localStorage.getItem("tiem-device"); if (!d) { d = rand(10); localStorage.setItem("tiem-device", d); } return d; }
  catch { return "private"; }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch("/api/" + path, { ...init, headers: { "content-type": "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (r.status === 409) throw Object.assign(new Error("conflict"), { remote: (d as { remote: Remote }).remote });
  if (!r.ok) throw new Error((d as { error?: string }).error || "Server đang bận, thử lại sau nha");
  return d as T;
}

/* ===== Lưu ===== */
export interface Remote { rev: number; lv: number; assets: number; savedAt: string }
let conflictUI: ((r: Remote) => void) | null = null;
/* hộp thoại hỏi giữ bản nào (modals.ts đăng ký) */
export const onConflict = (f: (r: Remote) => void) => { conflictUI = f; };
let busy = false, blocked = false;

export async function cloudSave(force = false): Promise<"ok" | "conflict" | "fail"> {
  if (busy || (blocked && !force) || !navigator.onLine) return "fail";
  busy = true;
  try {
    const code = ensureCode(), w = netWorth();
    const d = await call<{ rev: number; pairCode: string; savedAt: string }>("save", { method: "POST", body: JSON.stringify({
      code, name: S.cloud.show ? S.cloud.name : "", earned: S.earned, assets: w.total, lv: lvl(), ver: __APP_VERSION__,
      rev: S.cloud.rev, device: deviceId(), force, state: S }) });
    blocked = false;
    S.cloud.rev = d.rev; S.cloud.pair = d.pairCode; S.cloud.at = d.savedAt || new Date().toISOString();
    quiet(save);
    dispatchEvent(new Event("cloud:saved"));
    return "ok";
  } catch (e) {
    const remote = (e as { remote?: Remote }).remote;
    if (remote) { blocked = true; conflictUI?.(remote); return "conflict"; }
    return "fail";
  } finally { busy = false; }
}
/* lưu trên máy mà không kích hoạt lưu lên mây lần nữa */
let muted = false;
function quiet(f: () => void) { muted = true; try { f(); } finally { muted = false; } }

/* tự lưu: gộp các thay đổi trong 8 giây, mỗi phút tối đa một lần; rời app thì lưu ngay */
let timer = 0, last = 0;
export function scheduleSave() {
  if (muted || blocked) return;
  clearTimeout(timer);
  const wait = Math.max(8000, 60000 - (Date.now() - last));
  timer = window.setTimeout(() => { last = Date.now(); void cloudSave(); }, wait);
}
export function flushSave() { if (blocked) return; clearTimeout(timer); last = Date.now(); void cloudSave(); }
export function startAutoSave() { whenSaved(scheduleSave); }

/* mở app: so bản trên mây với máy này; máy khác lưu mới hơn thì hỏi */
export async function checkRemote() {
  if (!navigator.onLine) return;
  if (!S.cloud.code) { await cloudSave(); return; }
  try {
    const r = await call<{ exists: boolean; rev: number; device: string; lv: number; assets: number; savedAt: string; pairCode: string }>(
      "status", { method: "POST", body: JSON.stringify({ code: S.cloud.code }) });
    if (r.exists && r.rev > S.cloud.rev && r.device !== deviceId()) { blocked = true; conflictUI?.(r); return; }
    await cloudSave();
  } catch { /* offline */ }
}

/* ===== Lấy lại tiệm ===== */
function adopt(state: unknown, code: string, rev: number) {
  const s = loadState(JSON.stringify(state));
  s.cloud.code = code; s.cloud.rev = rev;
  localStorage.setItem(KEY, JSON.stringify(s));
}
export async function cloudRestore(code: string) {
  const c = normCode(code);
  const d = await call<{ state: unknown; rev: number }>("load", { method: "POST", body: JSON.stringify({ code: c }) });
  adopt(d.state, c, d.rev);
}
/* dùng bản trên mây của chính mã này (khi hai máy lệch nhau) */
export const useRemote = () => cloudRestore(S.cloud.code);
export const keepLocal = () => cloudSave(true);

/* chuyển máy bằng mã 6 ký tự */
export async function createTransfer() {
  if ((await cloudSave()) === "fail" && !S.cloud.at) throw new Error("Chưa lưu được tiệm lên mây, kiểm tra mạng nha");
  return call<{ token: string; expiresAt: string }>("transfer", { method: "POST", body: JSON.stringify({ action: "create", code: S.cloud.code }) });
}
export async function claimTransfer(token: string) {
  const d = await call<{ code: string; state: unknown; rev: number }>("transfer", { method: "POST", body: JSON.stringify({ action: "claim", token: normCode(token) }) });
  adopt(d.state, d.code, d.rev);
}
/* ô nhập chung: 6 ký tự = mã chuyển máy, 16 ký tự = mã tiệm */
export async function takeOver(input: string) {
  const c = normCode(input);
  if (c.length === 6) return claimTransfer(c);
  if (c.length === 16) return cloudRestore(c);
  throw new Error("Nhập mã chuyển máy (6 ký tự) hoặc mã tiệm (16 ký tự) nha");
}

/* ===== Ghép đôi ===== */
export async function pairWith(partner: string) {
  if ((await cloudSave()) !== "ok" && !S.cloud.at) throw new Error("Chưa lưu được tiệm lên mây, kiểm tra mạng nha");
  return call<{ partner: string }>("pair", { method: "POST", body: JSON.stringify({ code: S.cloud.code, partner: normCode(partner) }) });
}
export const unpair = () => call("pair", { method: "DELETE", body: JSON.stringify({ code: S.cloud.code }) });

/* ===== Bảng xếp hạng ===== */
export interface Rank { rank: number; name: string; lv: number; assets: number; earned: number; savedAt?: string; me?: boolean }
export interface Board { top: Rank[]; me: (Omit<Rank, "rank"> & { rank: number | null; pairCode: string }) | null; partner: Omit<Rank, "rank"> | null }
export const leaderboard = () => call<Board>("leaderboard?code=" + encodeURIComponent(S.cloud.code));

export function savedAgo() {
  if (!S.cloud.at) return "";
  const m = Math.round((Date.now() - +new Date(S.cloud.at)) / 60000);
  return m < 1 ? "vừa xong" : m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`;
}

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
  if ((await cloudSave()) !== "ok" && !S.cloud.at) return "Chưa lưu được tiệm lên mây, kiểm tra mạng rồi thử lại";
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
