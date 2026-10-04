/* Tài khoản (username + PIN 4 số) và lưu tiến trình theo tài khoản.
   - Đăng nhập một lần trên mỗi máy; các lần mở app sau chỉ hỏi PIN (so trên máy, không cần mạng).
   - Tiến trình tự lưu lên server khi có thay đổi; mở app thì tải bản mới hơn (máy khác chơi) về.
   - Không có mạng vẫn chơi được, có mạng lại thì tự đẩy lên. */
import { lvl } from "../engine/progress";
import type { VisitShop } from "../engine/visit";
import { KEY, S, loadState, replaceState, save, whenSaved, type State } from "../engine/state";

const AUTH = "tiem-auth";
interface Auth { user: string; token: string; pin: string; fails: number; dirty: boolean }
let A: Auth | null = (() => { try { return JSON.parse(localStorage.getItem(AUTH) || "null"); } catch { return null; } })();
/* vừa mở khoá rồi tự cập nhật (tải lại trang) thì không hỏi PIN lại trong 2 phút */
let unlocked = (() => { try { return Number(sessionStorage.getItem("tiem-unlock") || 0) > Date.now(); } catch { return false; } })();
export function keepUnlock() { try { if (unlocked) sessionStorage.setItem("tiem-unlock", String(Date.now() + 120000)); } catch { /* bỏ qua */ } }
const store = () => { try { if (A) localStorage.setItem(AUTH, JSON.stringify(A)); else localStorage.removeItem(AUTH); } catch { /* riêng tư */ } };

export const account = () => A?.user ?? "";
export const loggedIn = () => !!A?.token;

/* PIN chỉ lưu dạng băm trên máy (để mở khoá khi không có mạng) */
async function pinHash(user: string, pin: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("tiem-banh|" + user + "|" + pin));
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, "0")).join("");
}

class ApiError extends Error { constructor(msg: string, public status: number) { super(msg); } }
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let r: Response;
  try { r = await fetch("/api/" + path, { ...init, headers: { "content-type": "application/json", ...(A?.token ? { authorization: "Bearer " + A.token } : {}) } }); }
  catch { throw new ApiError("Không có mạng, kiểm tra kết nối rồi thử lại nha", 0); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError((d as { error?: string }).error || "Server đang bận, thử lại sau nha", r.status);
  return d as T;
}
const post = <T>(path: string, data: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(data) });

/* ===== Đăng ký / đăng nhập ===== */
export const checkName = (username: string) => post<{ free: boolean; error?: string }>("auth", { action: "check", username });

async function signedIn(user: string, token: string, pin: string, state?: unknown, rev?: number) {
  A = { user, token, pin: await pinHash(user, pin), fails: 0, dirty: false }; store(); unlocked = true;
  if (state) adopt(state, rev ?? 0);
  S.cloud.name = user; S.cloud.named = true; S.cloud.at = new Date().toISOString(); save();
}
/* đăng ký: tiến trình đang có trên máy được đưa lên tài khoản mới */
export async function register(username: string, pin: string, question: string, answer: string) {
  S.cloud.name = username.toLowerCase(); S.cloud.named = true;
  const r = await post<{ token: string; username: string }>("auth", { action: "register", username, pin, question, answer, state: S });
  await signedIn(r.username, r.token, pin);
  await cloudSave();
}
/* đăng nhập trên máy mới: lấy tiệm từ server về (thay tiến trình trên máy) */
export async function login(username: string, pin: string) {
  const r = await post<{ token: string; username: string; state: unknown; rev: number }>("auth", { action: "login", username, pin });
  await signedIn(r.username, r.token, pin, r.state, r.rev);
}
export const question = (username: string) => post<{ question: string }>("auth", { action: "question", username });
/* quên PIN: trả lời câu hỏi bí mật, đặt PIN mới */
export async function resetPin(username: string, answer: string, pin: string) {
  const r = await post<{ token: string; username: string; state: unknown; rev: number }>("auth", { action: "reset", username, answer, pin });
  await signedIn(r.username, r.token, pin, r.state, r.rev);
}
export async function changePin(pin: string) {
  await post("auth", { action: "pin", pin });
  if (A) { A.pin = await pinHash(A.user, pin); store(); }
}
/* đăng xuất: lưu nốt rồi xoá dữ liệu trên máy (đã có trên server) */
export async function logout() {
  await cloudSave().catch(() => {});
  await post("auth", { action: "logout" }).catch(() => {});
  A = null; store();
  try { localStorage.removeItem(KEY); } catch { /* bỏ qua */ }
}

/* ===== Khoá PIN khi mở app ===== */
let hiddenAt = 0;
export const isLocked = () => loggedIn() && !unlocked;
export async function unlock(pin: string): Promise<"ok" | "wrong" | "out"> {
  if (!A) return "out";
  if ((await pinHash(A.user, pin)) === A.pin) { A.fails = 0; store(); unlocked = true; return "ok"; }
  A.fails++; store();
  if (A.fails >= 5) { A.token = ""; store(); return "out"; }       // sai 5 lần: đăng nhập lại
  return "wrong";
}
export const pinTriesLeft = () => 5 - (A?.fails ?? 0);
/* rời app quá 10 phút thì khoá lại */
export function trackHidden(hidden: boolean) {
  if (hidden) hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > 600000) unlocked = false;
}

/* ===== Lưu tiến trình ===== */
function adopt(state: unknown, rev: number) {
  const s: State = loadState(JSON.stringify(state));
  s.cloud.rev = rev;
  replaceState(s);
}
let busy = false, muted = false;
export async function cloudSave(): Promise<boolean> {
  if (!A?.token || busy || !navigator.onLine) return false;
  busy = true;
  try {
    const r = await post<{ rev: number; savedAt: string }>("sync", { state: S, earned: S.earned, lv: lvl(), base: S.cloud.rev });
    muted = true; S.cloud.rev = r.rev; S.cloud.at = r.savedAt; save(); muted = false;
    A.dirty = false; store();
    dispatchEvent(new Event("cloud:saved"));
    return true;
  } catch (e) {
    const st = (e as ApiError).status;
    if (st === 401) { A.token = ""; store(); dispatchEvent(new Event("cloud:logout")); }
    // máy khác vừa lưu bản mới hơn: tải bản đó về (không đè lên)
    if (st === 409 && !inShift()) { busy = false; A.dirty = false; store(); await pull(true); }
    return false;
  } finally { busy = false; muted = false; }
}
/* tự lưu: gộp thay đổi trong 8 giây, mỗi phút tối đa một lần */
let timer = 0, last = 0;
function scheduleSave() {
  if (muted || !A?.token) return;
  if (!A.dirty) { A.dirty = true; store(); }
  clearTimeout(timer);
  timer = window.setTimeout(() => { last = Date.now(); void cloudSave(); }, Math.max(8000, 60000 - (Date.now() - last)));
}
/* lưu ngay (rời app, đổi ảnh…) */
export function flushSave(force = false) { if (A?.dirty || force) { clearTimeout(timer); last = Date.now(); if (A) { A.dirty = true; store(); } void cloudSave(); } }
export function startAutoSave() { whenSaved(scheduleSave); }
/* mở app / quay lại app / mỗi 20 giây: máy khác lưu mới hơn thì tải về (bản mới thắng);
   không có gì mới mà máy này có thay đổi chưa gửi thì gửi lên */
let pulling = false;
/* đang trong ca thì không thay tiến trình (main.ts cho biết) */
let inShift = () => false;
export const setInShift = (f: () => boolean) => { inShift = f; };
export async function pull(adoptAnyway = false): Promise<boolean> {
  if (!A?.token || !navigator.onLine || pulling || inShift()) return false;
  pulling = true;
  try {
    const r = await api<{ state?: unknown; rev: number; savedAt?: string; same?: boolean }>(`sync${adoptAnyway ? "" : `?since=${S.cloud.rev}`}`);
    if (!r.same && r.state && (adoptAnyway || r.rev > S.cloud.rev)) {
      clearTimeout(timer); A.dirty = false; store();
      muted = true; adopt(r.state, r.rev); S.cloud.at = r.savedAt ?? new Date().toISOString(); save(); muted = false;
      dispatchEvent(new Event("cloud:pulled"));
      return true;
    }
    if (A.dirty) void cloudSave();
  } catch (e) { if ((e as ApiError).status === 401) { A.token = ""; store(); dispatchEvent(new Event("cloud:logout")); } }
  finally { pulling = false; muted = false; }
  return false;
}
export function savedAgo() {
  if (!S.cloud.at) return "";
  const m = Math.round((Date.now() - +new Date(S.cloud.at)) / 60000);
  return m < 1 ? "vừa xong" : m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`;
}

/* ===== Bảng xếp hạng & theo dõi người ấy ===== */
export interface Rank { rank: number; username: string; lv: number; earned: number; me?: boolean }
export interface Board { period: "week" | "all"; top: Rank[]; me: { username: string; lv: number; earned: number; rank: number | null } | null; follow: { username: string; lv: number; earned: number; savedAt: string } | null }
export const leaderboard = (period: "week" | "all") => api<Board>("leaderboard?period=" + period);
/* ===== Ghé thăm tiệm hàng xóm ===== */
export interface VisitQuote { username: string; lv: number; fee: number; free: boolean; coins: number }
export const visitQuote = (username: string) => api<VisitQuote>("visit?user=" + encodeURIComponent(username));
export const visitEnter = (username: string) => post<{ fee: number; shop: VisitShop }>("visit", { user: username });
export const visitPending = () => api<{ pending: number; total: number }>("visit?inbox=1");
export const visitClaim = () => post<{ gifts: { visitor: string; gift: number }[] }>("visit", { claim: true });
export const follow = (username: string) => post<{ username?: string }>("auth", { action: "follow", username });

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
  const reg = await navigator.serviceWorker.ready;
  const { key } = await api<{ key: string }>("push");
  const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
  await post("push", { sub: sub.toJSON(), her: S.names.her, morning: S.cloud.morning, night: S.cloud.night });
  S.cloud.push = true; save();
  return "";
}
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub) { await api("push", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {}); await sub.unsubscribe(); }
  } catch { /* bỏ qua */ }
  S.cloud.push = false; save();
}
