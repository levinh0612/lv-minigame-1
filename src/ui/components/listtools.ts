/* Thanh công cụ cho mọi danh sách: ô tìm, chip lọc (xuống dòng, không cuộn ngang), nút sắp xếp tự vẽ (không dùng ô chọn mặc định).
   Cách dùng: registerList(khoá, định nghĩa) một lần ở đầu file màn, rồi đặt listHTML(khoá) vào chỗ danh sách.
   Gõ tìm hoặc bấm chip chỉ vẽ lại phần thân danh sách nên ô tìm không mất bàn phím; trạng thái nhớ theo khoá nên vẽ lại cả màn vẫn giữ. */
import { sfx } from "../../audio/sound";
import { applyView, countBy, newView, type ListCfg, type ListView } from "../../engine/listview";
import { ic } from "../icons";
import { esc } from "../dom";

export interface ListOpt { id: string; label: string; icon?: string; alert?: boolean }
export interface ListGroup { id: string; opts: ListOpt[] }       // opts[0] phải có id "all"
export interface ListSort { id: string; label: string }          // sorts[0] là thứ tự mặc định (id "")

export interface ListDef<T> {
  placeholder: string;
  cfg: ListCfg<T>;
  items: () => readonly T[];
  groups?: ListGroup[];
  sorts?: ListSort[];
  /** vẽ thân danh sách từ các món đã lọc và sắp xếp (tự lo trạng thái rỗng) */
  body: (rows: T[], all: readonly T[], v: ListView) => string;
  /** chạy sau khi vẽ lại thân (gắn lại ảnh, nhân vật...) */
  after?: () => void;
}

const defs = new Map<string, ListDef<never>>();
const views = new Map<string, ListView>();
const menus = new Set<string>();

export const registerList = <T>(key: string, def: ListDef<T>) => { defs.set(key, def as unknown as ListDef<never>); };
export const viewOf = (key: string): ListView => { let v = views.get(key); if (!v) views.set(key, v = newView(defs.get(key)?.sorts?.[0]?.id ?? "")); return v; };
/** đặt sẵn một nhóm lọc (ví dụ mở danh sách ở đúng mục) */
export const setListFilter = (key: string, group: string, id: string) => { const v = viewOf(key); if (id === "all") delete v.f[group]; else v.f[group] = id; };

const rowsOf = (key: string) => { const d = defs.get(key)!, v = viewOf(key), all = d.items(); return { d, v, all, rows: applyView(all, v, d.cfg) }; };

const chip = (on: boolean, attrs: string, inner: string) =>
  `<button type="button" ${attrs} aria-pressed="${on}" class="inline-flex h-7 items-center gap-1 rounded-full px-2.5 font-body text-[12.5px] font-extrabold whitespace-nowrap shadow-[0_2px_0_var(--sh)] ${on ? "bg-pink-d text-white" : "bg-white text-soft"}">${inner}</button>`;

function ctlHTML(key: string) {
  const { d, v, all, rows } = rowsOf(key);
  const groups = (d.groups ?? []).map(g => {
    const cnt = countBy(all, v, d.cfg, g.id), cur = v.f[g.id] ?? "all";
    return `<div class="flex flex-wrap gap-1" role="group">${g.opts.map(o => chip(cur === o.id, `data-lt-f="${g.id}:${o.id}"`,
      `${o.icon ?? ""}${esc(o.label)}<em class="rounded-full px-1.5 py-0.5 text-[11px] leading-none font-extrabold not-italic tabular-nums ${cur === o.id ? "bg-white/25 text-white" : o.alert && cnt[o.id] ? "bg-red text-white" : "bg-pink-l text-soft"}">${cnt[o.id] ?? 0}</em>`)).join("")}</div>`;
  }).join("");
  const sorts = d.sorts ?? [], cur = sorts.find(s => s.id === v.sort) ?? sorts[0], open = menus.has(key);
  const sortBar = sorts.length > 1 ? `<div class="flex items-center justify-between gap-2">
      <button type="button" data-lt-sortbtn aria-expanded="${open}" class="inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-2.5 font-body text-[12.5px] font-extrabold text-soft shadow-[0_2px_0_var(--sh)]">${ic.sort(14, 2.4)}Sắp xếp: <b class="text-ink">${esc(cur!.label)}</b>${v.sort ? `<span class="${v.desc ? "rotate-180" : ""}">${ic.up(13, 2.8)}</span>` : ""}</button>
      <span class="font-body text-xs font-extrabold text-soft tabular-nums">${rows.length}/${all.length}</span></div>
    ${open ? `<div class="flex flex-wrap gap-1.5 rounded-2xl bg-white p-2 shadow-[0_2px_0_var(--sh)]" role="listbox" aria-label="Kiểu sắp xếp">${sorts.map(s => chip(s.id === v.sort, `data-lt-s="${s.id}" role="option"`, `${esc(s.label)}${s.id === v.sort && s.id ? `<span class="${v.desc ? "rotate-180" : ""}">${ic.up(12, 3)}</span>` : ""}`)).join("")}
      <small class="basis-full px-1 font-body text-[11px] font-bold text-soft">Chạm lại kiểu đang chọn để đảo chiều.</small></div>` : ""}` : "";
  return groups + sortBar;
}

/** toàn bộ khối: ô tìm, chip lọc, sắp xếp và thân danh sách */
export function listHTML(key: string) {
  const { d, v, all, rows } = rowsOf(key);
  return `<div class="lstool5" data-lt="${key}">
    <div class="mx-4 mt-3 flex flex-col gap-2">
      <label class="relative flex h-10 items-center rounded-full bg-white shadow-[0_2px_0_var(--sh)]">
        <span class="pointer-events-none absolute left-3 flex text-soft">${ic.search(17, 2.4)}</span>
        <input data-lt-q type="text" inputmode="search" value="${esc(v.q)}" placeholder="${esc(d.placeholder)}" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="${esc(d.placeholder)}"
          class="h-full min-w-0 flex-1 appearance-none rounded-full border-0 bg-transparent pr-10 pl-10 font-body text-base font-bold text-ink outline-none placeholder:font-semibold placeholder:text-soft3">
        <button type="button" data-lt-clear aria-label="Xoá ô tìm" class="absolute right-1.5 flex size-8 items-center justify-center rounded-full text-soft ${v.q ? "" : "hidden"}">${ic.x(16, 2.6)}</button>
      </label>
      <div class="flex flex-col gap-2" data-lt-ctl>${ctlHTML(key)}</div>
    </div>
    <div data-lt-body>${d.body(rows, all, v)}</div></div>`;
}

function refresh(key: string, ctl = true) {
  const root = document.querySelector<HTMLElement>(`[data-lt="${key}"]`); if (!root) return;
  const { d, v, all, rows } = rowsOf(key);
  if (ctl) root.querySelector("[data-lt-ctl]")!.innerHTML = ctlHTML(key);
  root.querySelector("[data-lt-body]")!.innerHTML = d.body(rows, all, v);
  root.querySelector("[data-lt-clear]")?.classList.toggle("hidden", !v.q);
  d.after?.();
}

const keyOf = (el: Element) => el.closest<HTMLElement>("[data-lt]")?.dataset.lt;

addEventListener("input", e => {
  const el = e.target as HTMLElement; if (!el.matches?.("[data-lt-q]")) return;
  const key = keyOf(el); if (!key || !defs.has(key)) return;
  viewOf(key).q = (el as HTMLInputElement).value;
  refresh(key);
}, true);
addEventListener("keydown", e => { if (e.key === "Enter" && (e.target as HTMLElement).matches?.("[data-lt-q]")) (e.target as HTMLElement).blur(); }, true);

addEventListener("click", e => {
  const t = e.target as HTMLElement | null; if (!t?.closest) return;
  const key = keyOf(t);
  const hit = (sel: string) => t.closest<HTMLElement>(sel);
  if (menus.size && !hit("[data-lt-sortbtn],[data-lt-s]")) { const ks = [...menus]; menus.clear(); ks.forEach(k => refresh(k)); }
  if (!key || !defs.has(key)) return;
  let el: HTMLElement | null;
  if ((el = hit("[data-lt-clear]"))) {
    viewOf(key).q = ""; const i = el.parentElement!.querySelector<HTMLInputElement>("[data-lt-q]")!; i.value = ""; refresh(key); i.focus(); return;
  }
  if ((el = hit("[data-lt-f]"))) {
    const [g, id] = el.dataset.ltF!.split(":"); setListFilter(key, g!, id!); sfx("click"); return refresh(key);
  }
  if (hit("[data-lt-sortbtn]")) { menus.has(key) ? menus.delete(key) : menus.add(key); sfx("click"); return refresh(key); }
  if ((el = hit("[data-lt-s]"))) {
    const v = viewOf(key), id = el.dataset.ltS!;
    if (id && id === v.sort) v.desc = !v.desc; else { v.sort = id; v.desc = false; menus.delete(key); }
    sfx("click"); return refresh(key);
  }
}, true);
