/* Gắn cảnh tiệm 3D (scene/shop3d.ts) vào màn chính.
   - Tải lười: Three.js chỉ tải khi mở màn chính; trong lúc chờ (hoặc khi máy không có WebGL) vẫn hiện cảnh 2D cũ.
   - Giữ cảnh: render() vẽ lại cả trang mỗi lần xu đổi; cảnh 3D được giữ nguyên nếu dữ liệu cảnh không đổi.
   - Chạm: các nút trong suốt đặt đúng chỗ vật thể (thú cưng, menu, tủ bánh, ảnh, hộp quà), dùng lại data-act / data-pet / data-go sẵn có. */
import { RECIPES } from "../content/game";
import type { PetId } from "../content/couple";
import { S, petName } from "../engine/state";
import { account } from "../net/cloud";
import type { Hotspot, ShopOpts, ShopScene } from "../scene/shop3d";
import { roomHTML, type RoomOpts } from "./room";

interface Live { el: HTMLElement; sig: string; scene: ShopScene; btns: [Hotspot, HTMLButtonElement][]; timer: number; raf: number; ro: ResizeObserver }
let live: Live | null = null, kept: Live | null = null, token = 0;
/** vùng chứa cảnh: bên trong là cảnh 2D cũ làm dự phòng */
export function room3dHTML(r: Parameters<typeof roomHTML>[0], o: RoomOpts) {
  const data = `data-event="${o.event ? 1 : 0}" data-guests="${o.guests ?? 2}" data-gift="${o.giftDot ? 1 : 0}" data-recipes="${o.recipes ?? 4}"`;
  return `<div class="room3d" ${data}>${roomHTML(r, o)}</div>`;
}

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
function optsOf(el: HTMLElement): ShopOpts {
  const n = +(el.dataset.recipes || 4), g = S.me, look = (l: Record<string, string>) => ({ skin: l.skin, hair: l.hair, coat: l.coat, shirt: l.shirt, eye: l.eye });
  return {
    room: S.room as unknown as Record<string, string>, event: el.dataset.event === "1", guests: +(el.dataset.guests || 0), giftDot: el.dataset.gift === "1", photo: S.photo, menuCount: n, shopName: S.shop.trim() || account() || "Matcha",
    cakes: RECIPES.slice(0, Math.min(n, 6)).map(r => [r.base, r.cream, r.top] as [number, number, number]),
    me: { sprite: g.sprite, look: look(g as unknown as Record<string, string>) },
    guestLooks: [
      { sprite: "g2", look: { skin: "#FFE9DA", hair: "#C98B5A", coat: "#8A3D55", shirt: "#F2E6D0", eye: "#7A5A3E" } },
      { sprite: "b3", look: { skin: "#FFE3D0", hair: "#E7B872", coat: "#2E4A7A", shirt: "#C9962E", eye: "#4F9A6B" } }
    ]
  };
}
const sigOf = (el: HTMLElement) => JSON.stringify([S.room, el.dataset, S.me, hash(S.photo), S.photo.length, S.shop, account()]);

/** chạy cảnh + vòng cập nhật vị trí nút chạm + đồng hồ + theo dõi kích thước */
function run(l: Live) {
  const fit = () => { const r = l.el.getBoundingClientRect(); if (r.width) l.scene.resize(Math.round(r.width), Math.round(r.height)); };
  l.el.prepend(l.scene.dom); fit(); l.scene.start();
  l.ro.observe(l.el);
  l.timer = window.setInterval(() => l.scene.setHour(new Date().getHours() + new Date().getMinutes() / 60), 60000);
  let last = 0;
  const loop = (now: number) => {
    l.raf = requestAnimationFrame(loop);
    if (now - last < 33 || document.hidden) return; last = now;
    l.btns.forEach(([h, b]) => { const p = l.scene.project(h); b.hidden = !p.show; b.style.transform = `translate(${p.x}px,${p.y}px)`; });
  };
  l.raf = requestAnimationFrame(loop);
}
function halt(l: Live) { l.scene.stop(); l.ro.disconnect(); clearInterval(l.timer); cancelAnimationFrame(l.raf); }
function drop(l: Live | null) { if (!l) return; halt(l); l.scene.dispose(); l.el.remove(); }

/** gọi trước khi render() thay nội dung trang: cất cảnh đang chạy ra khỏi trang */
export function keepRoom() {
  if (!live) return;
  halt(live); live.el.remove(); kept = live; live = null;
}

/** gọi sau khi render() đã vẽ trang: dựng hoặc dùng lại cảnh 3D cho vùng chứa mới */
export async function mountRooms() {
  const box = document.querySelector<HTMLElement>(".room3d"), my = ++token;
  if (!box || !S.scene3d) { drop(kept); kept = null; return; }
  const sig = sigOf(box);
  if (kept && kept.sig === sig) {                      // dữ liệu cảnh không đổi: đặt lại đúng cảnh cũ
    box.replaceWith(kept.el); live = kept; kept = null; live.ro = new ResizeObserver(() => 0); fixObserver(live); run(live); return;
  }
  drop(kept); kept = null;
  let mod: typeof import("../scene/shop3d");
  try { mod = await import("../scene/shop3d"); if (!mod.webglOK()) return; } catch { return; }
  if (my !== token || !box.isConnected) return;       // trang đã đổi trong lúc tải
  try {
    const scene = mod.createShop(optsOf(box));
    box.classList.add("live"); box.innerHTML = "";
    const layer = document.createElement("div"); layer.className = "hs-layer"; box.appendChild(layer);
    const btns = scene.hotspots.map(h => button(layer, h, scene));
    box.insertAdjacentHTML("beforeend", `<div class="rot3d"><button data-rot="-1" aria-label="Xoay sang trái">⟲</button><button data-rot="1" aria-label="Xoay sang phải">⟳</button></div>`);
    box.insertAdjacentHTML("beforeend", `<div class="zoom3d"><button data-zoom="1.3" aria-label="Phóng to">＋</button><button data-zoom="0.77" aria-label="Thu nhỏ">－</button><button data-view aria-label="Xem ngoài tiệm" class="vw">🏪</button></div>`);
    box.querySelector<HTMLElement>("[data-view]")!.addEventListener("click", e => { e.stopPropagation(); const b = e.currentTarget as HTMLElement, on = !scene.isExterior(); scene.setExterior(on); b.textContent = on ? "🛋" : "🏪"; b.setAttribute("aria-label", on ? "Vào trong tiệm" : "Xem ngoài tiệm"); });
    box.querySelectorAll<HTMLElement>("[data-zoom]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); scene.zoomBy(+b.dataset.zoom!); }));
    box.querySelectorAll<HTMLElement>("[data-rot]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); scene.rotate(+b.dataset.rot!); }));
    /* vuốt ngang = xoay; vuốt dọc = di chuyển khi đã phóng to; chụm 2 ngón / lăn chuột = zoom; chạm đúp = về mặc định */
    const ptr = new Map<number, { x: number; y: number }>(); let pinch = 0, lastTap = 0;
    scene.dom.addEventListener("pointerdown", e => {
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); scene.dom.setPointerCapture(e.pointerId); scene.dragStart();
      if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      if (e.timeStamp - lastTap < 300) scene.resetView(); lastTap = e.timeStamp;
      scene.dom.style.touchAction = scene.zoomLevel() > 1.1 ? "none" : "pan-y";
    });
    scene.dom.addEventListener("pointermove", e => {
      const p = ptr.get(e.pointerId); if (!p) return;
      if (ptr.size === 2) { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) scene.zoomBy(d / pinch); pinch = d; return; }
      scene.drag(e.clientX - p.x, e.clientY - p.y); p.x = e.clientX; p.y = e.clientY;
    });
    const up = (e: PointerEvent) => { ptr.delete(e.pointerId); pinch = 0; if (!ptr.size) scene.dragEnd(); scene.dom.style.touchAction = scene.zoomLevel() > 1.1 ? "none" : "pan-y"; };
    scene.dom.addEventListener("pointerup", up); scene.dom.addEventListener("pointercancel", up);
    scene.dom.addEventListener("wheel", e => { e.preventDefault(); scene.zoomBy(Math.exp(-e.deltaY * .0015)); scene.dom.style.touchAction = scene.zoomLevel() > 1.1 ? "none" : "pan-y"; }, { passive: false });
    live = { el: box, sig, scene, btns, timer: 0, raf: 0, ro: new ResizeObserver(() => 0) };
    fixObserver(live); run(live);
  } catch (e) { console.warn("Không dựng được cảnh 3D, dùng cảnh 2D", e); }
}
/** ResizeObserver riêng cho mỗi cảnh: đổi cỡ khung thì đổi cỡ canvas */
function fixObserver(l: Live) {
  l.ro = new ResizeObserver(() => { const r = l.el.getBoundingClientRect(); if (r.width) l.scene.resize(Math.round(r.width), Math.round(r.height)); });
}
function button(layer: HTMLElement, h: Hotspot, scene: ShopScene): [Hotspot, HTMLButtonElement] {
  const b = document.createElement("button"); b.className = "hs"; b.setAttribute(h.attr, h.value);
  const pid = h.id.startsWith("pet-") ? h.id.slice(4) : "";
  b.setAttribute("aria-label", pid ? "Vuốt ve " + petName(pid as PetId) : h.label);
  if (pid) b.addEventListener("click", () => scene.bounce(pid));
  layer.appendChild(b); return [h, b];
}
