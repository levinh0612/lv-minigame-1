/* Hộp danh sách Trang trí: vuốt xuống để thu gọn, vuốt lên để mở lại (như hộp thoại iOS).
   Vuốt trong lưới món chỉ tính khi lưới đang ở đầu, để vẫn cuộn được danh sách. */
export function initSheetDrag() {
  let sheet: HTMLElement | null = null, x0 = 0, y0 = 0, on: boolean | null = false, dy = 0;
  document.addEventListener("touchstart", e => {
    const t = e.target as HTMLElement; sheet = t.closest<HTMLElement>(".dsheet");
    const body = t.closest<HTMLElement>(".dbody");
    on = sheet && e.touches.length === 1 && !(body && body.scrollTop > 0 && !sheet.classList.contains("shut")) ? null : false;
    x0 = e.touches[0]!.clientX; y0 = e.touches[0]!.clientY; dy = 0;
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (on === false || !sheet) return;
    const dx = e.touches[0]!.clientX - x0, d = e.touches[0]!.clientY - y0, shut = sheet.classList.contains("shut");
    if (on === null) {
      if (Math.abs(dx) < 8 && Math.abs(d) < 8) return;
      on = Math.abs(d) > Math.abs(dx) * 1.2 && (shut ? d < 0 : d > 0); if (!on) return;
      sheet.style.transition = "none";
    }
    e.preventDefault(); dy = d;
    if (!shut) sheet.style.transform = `translateY(${Math.max(0, d)}px)`;
  }, { passive: false });
  const end = () => {
    if (on !== true || !sheet) { on = false; return; }
    on = false; sheet.style.transition = ""; sheet.style.transform = "";
    if (Math.abs(dy) > 50) sheet.querySelector<HTMLElement>(".dgrab")?.click();
  };
  document.addEventListener("touchend", end); document.addEventListener("touchcancel", end);
}
