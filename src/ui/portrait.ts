/* Ảnh đại diện 3D: vẽ ngay ảnh 2D làm dự phòng, khi ảnh chụp từ model 3D xong thì thay vào. */
import { S } from "../engine/state";
import type { PersonLook } from "../scene/people";

/** khung ảnh `px` vuông; `fallback` là HTML 2D hiện trong lúc chờ (hoặc khi máy không vẽ được 3D) */
export function portraitHTML(sprite: string, look: PersonLook, px: number, fallback: string, cls = "") {
  return `<span class="p3 ${cls}" data-p3="${sprite}" data-p3l='${JSON.stringify(look).replace(/'/g, "&#39;")}' style="display:inline-block;width:${px}px;height:${px}px">${fallback}</span>`;
}

let mod: Promise<typeof import("../scene/portrait3d")> | null = null;
const seen = new WeakSet<Element>();   // theo phần tử (không theo thuộc tính HTML) để bản sao DOM vẫn được xử lý
/** thay ảnh 2D bằng ảnh chụp 3D cho mọi khung chưa xử lý trong `root` */
export function hydratePortraits(root: ParentNode = document) {
  if (!S.scene3d) return;
  root.querySelectorAll<HTMLElement>("[data-p3]").forEach(el => {
    if (seen.has(el)) return; seen.add(el);
    const sprite = el.dataset.p3!, look = JSON.parse(el.dataset.p3l || "{}");
    mod ??= import("../scene/portrait3d");
    void mod.then(m => m.portrait3d(sprite, look)).then(url => {
      if (!url || !el.isConnected) return;
      const px = parseInt(el.style.width) || 64;
      el.innerHTML = `<img src="${url}" alt="" width="${px}" height="${px}" style="display:block;width:${px}px;height:${px}px">`;
    }).catch(() => 0);
  });
}
