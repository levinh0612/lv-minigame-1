/* Đồng bộ cấu hình game: dùng bản đã lưu trên máy ngay lúc mở app (chơi offline vẫn đúng), rồi hỏi server xem có bản mới không. */
import { applyGameConfig, type GameConfig } from "../content/gameconfig";
import { fetchGameConfig, pushGameConfig } from "./cloud";

const KEY = "tiem-gcfg";
interface Cache { rev: number; config: GameConfig }
const read = (): Cache | null => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const write = (c: Cache) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* riêng tư */ } };
export const cfgRev = () => read()?.rev ?? 0;

/** áp bản đã lưu trên máy (gọi một lần lúc khởi động, trước khi dựng màn đầu) */
export function loadCachedConfig() { const c = read(); if (c) applyGameConfig(c.config); }

/** hỏi server; có bản mới thì áp và báo "cfg:synced". Trả true nếu có bản mới. Lỗi mạng thì im lặng giữ bản cũ. */
export async function syncGameConfig(force = false): Promise<boolean> {
  try {
    const r = await fetchGameConfig(force ? undefined : cfgRev());
    if (r.same || !r.config) return false;
    write({ rev: r.rev, config: r.config }); applyGameConfig(r.config);
    dispatchEvent(new Event("cfg:synced")); return true;
  } catch { return false; }
}

/** admin: lưu lên server rồi áp ngay trên máy này */
export async function publishGameConfig(config: GameConfig) {
  const r = await pushGameConfig(config);
  write({ rev: r.rev, config: r.config ?? {} }); applyGameConfig(r.config ?? {});
  dispatchEvent(new Event("cfg:synced")); return r;
}
