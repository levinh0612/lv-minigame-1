/* Trang "Sắp ra mắt": lộ trình nâng cấp, đọc từ content/roadmap.ts */
import { CHANGELOG, PHASES, STATUS_LABEL } from "../../content/roadmap";
import { backBtn, esc, twinkles } from "../dom";

export function roadmapHTML() {
  const all = PHASES.flatMap(p => p.items), done = all.filter(i => i.status === "done").length;
  const pct = Math.round(done / all.length * 100);
  return `<div class="scr rm">
    ${twinkles(["#FF8FAB", "#FFC94D", "#8FD9B6", "#C9B8F0"], 7)}
    <div class="shead">${backBtn}<h2>Sắp ra mắt</h2><span class="ver">v${esc(__APP_VERSION__)}</span></div>
    <div class="list">
      <div class="card rm-hero">
        <b>Tiệm đang lớn lên từng ngày</b>
        <p>Đây là những điều sắp có ở tiệm. Mục nào xong sẽ được đánh dấu, và bản mới tự cập nhật khi Em mở app.</p>
        <div class="rm-prog"><div class="track"><i style="width:${pct}%"></i></div><span>${done}/${all.length} đã có</span></div>
      </div>
      <ol class="phases">${PHASES.map((p, n) => `<li class="phase" style="--c:${p.color}">
        <div class="pn">${n}</div>
        <div class="card">
          <h3>${esc(p.name)} <small>${esc(p.when)}</small></h3>
          <p class="goal">${esc(p.goal)}</p>
          <ul class="ri">${p.items.map(i => `<li class="${i.status}"><span class="st ${i.status}">${STATUS_LABEL[i.status]}</span><b>${esc(i.title)}</b><small>${esc(i.desc)}</small></li>`).join("")}</ul>
        </div></li>`).join("")}</ol>
      <div class="card"><h3>Có gì mới</h3>
        ${CHANGELOG.map(r => `<div class="lt"><small>Bản ${esc(r.v)} · ${esc(r.date)}</small><p>${r.notes.map(esc).join("\n")}</p></div>`).join("")}
      </div>
      <p class="hint">Muốn tiệm có thêm gì? Nhắn cho Anh nha.</p>
    </div>
  </div>`;
}
