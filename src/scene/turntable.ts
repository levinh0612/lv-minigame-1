/* Mở bàn xoay model 3D khi cần: three.js và model chỉ tải lúc gọi, không nằm trong gói chính */
import { webglOK } from "./webgl";

/** như mountTurntable (glbview) nhưng tải mã 3D theo yêu cầu; trả hàm gỡ, gọi được cả khi mã chưa tải xong */
export function mountTurntableLazy(host: HTMLElement, modelId: string, px: number): () => void {
  if (!webglOK()) return () => { };
  let off = () => { }, gone = false;
  void import("./glbview").then(m => { if (!gone) off = m.mountTurntable(host, modelId, px); }).catch(() => { });
  return () => { gone = true; off(); };
}
