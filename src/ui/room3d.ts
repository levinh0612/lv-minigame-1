/* Gắn cảnh tiệm 3D (scene/shop3d.ts) vào màn chính.
   - Tải lười: Three.js chỉ tải khi mở màn chính; trong lúc chờ (hoặc khi máy không có WebGL) vẫn hiện cảnh 2D cũ.
   - Giữ cảnh: render() vẽ lại cả trang mỗi lần xu đổi; cảnh 3D được giữ nguyên nếu dữ liệu cảnh không đổi.
   - Chạm: các nút trong suốt đặt đúng chỗ vật thể (thú cưng, menu, tủ bánh, ảnh, hộp quà), dùng lại data-act / data-pet / data-go sẵn có. */
import { RECIPES, STYLE_OF } from "../content/game";
import type { PetId } from "../content/couple";
import { S, petName } from "../engine/state";
import { account } from "../net/cloud";
import { visiting } from "../engine/visit";
import type { Hotspot, ShopOpts, ShopScene } from "../scene/shop3d";
import { roomHTML, type RoomOpts } from "./room";

interface Live { el: HTMLElement; sig: string; base: string; scene: ShopScene; btns: [Hotspot, HTMLButtonElement][]; timer: number; raf: number; ro: ResizeObserver }
let live: Live | null = null, kept: Live | null = null, token = 0;
/** vùng chứa cảnh: bên trong là cảnh 2D cũ làm dự phòng */
export function room3dHTML(r: Parameters<typeof roomHTML>[0], o: RoomOpts, still = false, full = false) {
  // still: màn trang trí. Cảnh dựng theo đúng bộ đồ đang thử (r), làm nổi bật nhóm đang chọn, không có nút chạm
  const extra = still ? ` data-room="${JSON.stringify(r).replace(/"/g, "&quot;")}" data-hl="${o.hl ?? ""}" data-hs="0"` : "", fullAttr = full ? ' data-full="1"' : "";
  const data = `data-event="${o.event ? 1 : 0}" data-guests="${o.guests ?? 2}" data-tables="${o.tables ?? "1,1,1"}" data-wide="${o.wide ?? 0}" data-floors="${o.floors ?? 1}"${o.user ? ` data-user="${o.user}"` : ""} data-gift="${o.giftDot ? 1 : 0}" data-recipes="${o.recipes ?? 4}"${extra}${fullAttr}`;
  return `<div class="room3d" ${data}>${roomHTML(r, o)}</div>`;
}

/* icon điều khiển cảnh 3D: nét tròn, tô nhẹ, cùng bộ với các icon khác của game */
const IC = (body: string) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICON = {
  left: IC('<path d="M7.2 8.2A6.6 6.6 0 1 1 5.6 14"/><path d="M6.2 3.8l.9 4.9 4.9-.9" fill="currentColor" fill-opacity=".18"/>'),
  right: IC('<path d="M16.8 8.2A6.6 6.6 0 1 0 18.4 14"/><path d="M17.8 3.8l-.9 4.9-4.9-.9" fill="currentColor" fill-opacity=".18"/>'),
  plus: IC('<circle cx="10.5" cy="10.5" r="6.2" fill="currentColor" fill-opacity=".12"/><path d="M15.2 15.2l5 5"/><path d="M10.5 7.8v5.4M7.8 10.5h5.4"/>'),
  minus: IC('<circle cx="10.5" cy="10.5" r="6.2" fill="currentColor" fill-opacity=".12"/><path d="M15.2 15.2l5 5"/><path d="M7.8 10.5h5.4"/>'),
  shop: IC('<path d="M3.8 9.6 5.4 4.4h13.2l1.6 5.2c0 1.5-1.1 2.4-2.3 2.4s-2.3-.9-2.3-2.4c0 1.5-1.1 2.4-2.3 2.4S9.7 11.1 9.7 9.6c0 1.5-1.1 2.4-2.3 2.4S3.8 11.1 3.8 9.6z" fill="currentColor" fill-opacity=".15"/><path d="M5.6 12.4v7.2h12.8v-7.2"/><path d="M10 19.6v-4.6h4v4.6"/>'),
  up: IC('<path d="M4 20V9.5l6-3.3 6 3.3V20" fill="currentColor" fill-opacity=".14"/><path d="M2.8 20h14.4"/><path d="M19.5 13.5V4.8M16.8 7.4l2.7-2.7 2.7 2.7"/><path d="M8 20v-4.4h4V20"/>'),
  room: IC('<path d="M5 12V9.2A3.2 3.2 0 0 1 8.2 6h7.6A3.2 3.2 0 0 1 19 9.2V12" fill="currentColor" fill-opacity=".12"/><path d="M3 13.6a2 2 0 0 1 4 0V15h10v-1.4a2 2 0 0 1 4 0V18.4H3z" fill="currentColor" fill-opacity=".18"/><path d="M6.4 18.4v2M17.6 18.4v2"/>')
};

/** màn chính toàn màn hình: phần bị lớp phủ giao diện (trên/dưới) che để camera căn phòng vào vùng còn lại */
function insets(el: HTMLElement, scene: ShopScene) {
  if (el.dataset.full !== "1") return;
  const r = el.getBoundingClientRect(), top = document.querySelector(".h5-top")?.getBoundingClientRect(), bot = document.querySelector(".h5-bottom")?.getBoundingClientRect();
  scene.setInsets(top ? Math.max(0, top.bottom - r.top) : 0, bot ? Math.max(0, r.bottom - bot.top) : 0);
}
const el0hs = (el: HTMLElement) => el.dataset.hs !== "0";      // màn trang trí: không có nút chạm trên cảnh
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
function optsOf(el: HTMLElement): ShopOpts {
  const n = +(el.dataset.recipes || 4), vs = el.dataset.user ? visiting() : null, g = vs ? (vs.me as unknown as typeof S.me) : S.me, look = (l: Record<string, string>) => ({ skin: l.skin, hair: l.hair, coat: l.coat, shirt: l.shirt, eye: l.eye, pants: l.pants, shoes: l.shoes, style: l.style ?? STYLE_OF[l.sprite ?? ""] ?? "" });
  return {
    room: (el.dataset.room ? JSON.parse(el.dataset.room) : S.room) as Record<string, string>, hl: el.dataset.hl || undefined, event: el.dataset.event === "1", guests: +(el.dataset.guests || 0), tables: (el.dataset.tables || "1,1,1").split(",").map(Number), wide: +(el.dataset.wide || 0), floors: +(el.dataset.floors || 1), giftDot: el.dataset.gift === "1", photo: vs ? "" : S.photo, menuCount: n, shopName: vs ? vs.shop.trim() || vs.username : S.shop.trim() || account() || "Matcha",
    cakes: RECIPES.slice(0, Math.min(n, 6)).map(r => [r.base, r.cream, r.top] as [number, number, number]),
    me: { sprite: g.sprite, look: look(g as unknown as Record<string, string>) },
    guestLooks: [
      { sprite: "g2", look: { skin: "#FFE9DA", hair: "#C98B5A", coat: "#8A3D55", shirt: "#F2E6D0", eye: "#7A5A3E" } },
      { sprite: "b3", look: { skin: "#FFE3D0", hair: "#E7B872", coat: "#2E4A7A", shirt: "#C9962E", eye: "#4F9A6B" } }
    ]
  };
}
/** phần cảnh không đổi khi chỉ đổi tường / sàn / quầy (màn Trang trí) */
const baseOf = (el: HTMLElement) => JSON.stringify([document.documentElement.dataset.theme, S.me, hash(S.photo), S.photo.length, S.shop, account(), el.dataset.event, el.dataset.guests, el.dataset.user, el.dataset.tables, el.dataset.wide, el.dataset.floors, el.dataset.gift, el.dataset.recipes]);
const sigOf = (el: HTMLElement) => JSON.stringify([document.documentElement.dataset.theme, S.room, el.dataset, S.me, hash(S.photo), S.photo.length, S.shop, account()]);

/** chạy cảnh + vòng cập nhật vị trí nút chạm + đồng hồ + theo dõi kích thước */
function run(l: Live) {
  const fit = () => { const r = l.el.getBoundingClientRect(); if (r.width) { l.scene.resize(Math.round(r.width), Math.round(r.height)); insets(l.el, l.scene); } };
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
  if (box.dataset.hs === "0" && kept) {
    // màn Trang trí: đổi tường / sàn / quầy chỉ cần thay vật liệu trong cảnh đang có, không dựng lại
    if (kept.base === baseOf(box) && box.dataset.room && kept.scene.update(JSON.parse(box.dataset.room), box.dataset.hl || undefined)) {
      kept.sig = sig; box.replaceWith(kept.el); live = kept; kept = null; live.ro = new ResizeObserver(() => 0); fixObserver(live); run(live); return;
    }
    // đổi món khác (rèm, đèn, cây...): giữ cảnh cũ hiển thị, dựng cảnh mới sau một nhịp (chạm liên tiếp thì chỉ dựng lần cuối)
    const old = kept.el; box.replaceWith(old);
    await new Promise(r => setTimeout(r, 110));
    if (my !== token) return;
    old.replaceWith(box);
  }
  drop(kept); kept = null;
  let mod: typeof import("../scene/shop3d");
  try { mod = await import("../scene/shop3d"); if (!mod.webglOK()) return; } catch { return; }
  if (my !== token || !box.isConnected) return;       // trang đã đổi trong lúc tải
  try {
    const scene = mod.createShop(optsOf(box));
    box.classList.add("live"); box.innerHTML = "";
    const layer = document.createElement("div"); layer.className = "hs-layer"; box.appendChild(layer);
    const btns = el0hs(box) ? scene.hotspots.map(h => button(layer, h, scene)) : [];
    box.insertAdjacentHTML("beforeend", `<div class="rot3d"><button data-rot="-1" aria-label="Xoay sang trái">${ICON.left}</button><button data-rot="1" aria-label="Xoay sang phải">${ICON.right}</button></div>`);
    box.insertAdjacentHTML("beforeend", `<div class="zoom3d"><button data-zoom="1.3" aria-label="Phóng to">${ICON.plus}</button><button data-zoom="0.77" aria-label="Thu nhỏ">${ICON.minus}</button><button data-view aria-label="Xem ngoài tiệm" class="vw">${ICON.shop}</button>${scene.floors > 1 ? `<button data-floor aria-label="Chuyển tầng" class="vw fl">T1</button>` : ""}${box.dataset.full === "1" && !box.dataset.user ? `<button data-act="venue" aria-label="Nâng cấp tiệm" class="vw up">${ICON.up}</button>` : ""}</div>`);
    box.querySelector<HTMLElement>("[data-view]")!.addEventListener("click", e => { e.stopPropagation(); const b = e.currentTarget as HTMLElement, on = !scene.isExterior(); scene.setExterior(on); b.innerHTML = on ? ICON.room : ICON.shop; b.setAttribute("aria-label", on ? "Vào trong tiệm" : "Xem ngoài tiệm"); });
    box.querySelector<HTMLElement>("[data-floor]")?.addEventListener("click", e => { e.stopPropagation(); const b = e.currentTarget as HTMLElement; scene.setFloor((scene.floor() + 1) % scene.floors); b.textContent = "T" + (scene.floor() + 1); });
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
    live = { el: box, sig, base: baseOf(box), scene, btns, timer: 0, raf: 0, ro: new ResizeObserver(() => 0) };
    fixObserver(live); run(live);
  } catch (e) { console.warn("Không dựng được cảnh 3D, dùng cảnh 2D", e); }
}
/** ResizeObserver riêng cho mỗi cảnh: đổi cỡ khung thì đổi cỡ canvas */
function fixObserver(l: Live) {
  l.ro = new ResizeObserver(() => { const r = l.el.getBoundingClientRect(); if (r.width) { l.scene.resize(Math.round(r.width), Math.round(r.height)); insets(l.el, l.scene); } });
}
function button(layer: HTMLElement, h: Hotspot, scene: ShopScene): [Hotspot, HTMLButtonElement] {
  const b = document.createElement("button"); b.className = "hs"; b.setAttribute(h.attr, h.value);
  const pid = h.id.startsWith("pet-") ? h.id.slice(4) : "";
  b.setAttribute("aria-label", pid ? "Vuốt ve " + petName(pid as PetId) : h.label);
  if (pid) b.addEventListener("click", () => scene.bounce(pid));
  layer.appendChild(b); return [h, b];
}
