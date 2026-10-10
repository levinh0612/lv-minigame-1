/* Đổi ký tự / emoji trang trí trong giao diện thành icon Lucide cho đồng bộ.
   Một chỗ duy nhất: theo dõi DOM, thấy chữ trong bảng GLYPH thì thay bằng <svg> (cỡ 1em, theo cỡ chữ của cha).
   - Ký hiệu chữ (✓ ✕ ★ › → ...) lấy màu chữ của cha như trước.
   - Emoji (🎁 🔥 🪑 ...) có tông màu riêng, giống bộ icon trong icons.ts.
   Emoji của nhân vật (mặt cười, đồ trong tin nhắn) cố tình không nằm trong bảng, vẫn giữ nguyên. */
import { ic, type IconName } from "./icons";

type G = [IconName, ("" | undefined)?];   // "" = lấy màu của cha, bỏ qua tông riêng
const T: Record<string, G> = {
  "✓": ["check", ""], "✔": ["check", ""], "✕": ["x", ""], "›": ["chevR", ""], "‹": ["chevL", ""], "→": ["right", ""], "←": ["left", ""],
  "↑": ["up", ""], "❚❚": ["pause", ""], "★": ["star", ""], "☆": ["star", ""], "♥": ["heart", ""], "♡": ["heart", ""], "✦": ["sparkle", ""],
  "⚠": ["warn", ""], "♀": ["venus", ""], "♂": ["mars", ""], "☁": ["cloud", ""],
  "✨": ["sparkle"], "🔥": ["fire"], "💡": ["bulb"], "🎁": ["gift"], "🧧": ["gift"], "💝": ["gift"], "🪑": ["seat"], "👥": ["users"],
  "🌟": ["star"], "⭐": ["star"], "🍖": ["meat"], "🧺": ["basket"], "📊": ["stats"], "🎨": ["palette"], "🎵": ["music"], "👤": ["user"],
  "🛠": ["wrench"], "🔔": ["bell"], "☀": ["sun"], "🏢": ["building"], "🍀": ["clover"], "💞": ["heart"], "💗": ["heart"], "🌙": ["moon"],
  "🎂": ["cake"], "💯": ["medal"], "🌷": ["flower"], "🌸": ["flower"], "🎉": ["party"], "🖼": ["image"], "🏪": ["store"],
  "🪙": ["coins"], "🧑‍🍳": ["chef"], "🍰": ["slice"], "🚪": ["door"], "⚡": ["bolt"], "🏰": ["castle"], "💎": ["gem"], "😊": ["smile"],
  "🛍": ["bag"], "🐾": ["paw"], "🎴": ["layers"], "💰": ["coins"], "📈": ["trend"], "🎟": ["ticket"], "🎰": ["dice"], "📅": ["cal"],
  "🎯": ["target"], "🏆": ["trophy"], "☕": ["coffee"], "🛋": ["sofa"], "👑": ["crown"]
};
const keys = Object.keys(T).sort((a, b) => b.length - a.length);
const RE = new RegExp(`(${keys.join("|")})[\\uFE0E\\uFE0F]?`, "gu");
const HOLLOW = new Set(["☆", "♡"]);
const SOLID = new Set(["★", "♥"]);
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "OPTION", "TITLE", "INPUT", "CANVAS"]);

const iconHTML = (g: string) => {
  const [name, tone] = T[g];
  const h = ic[name]("1.05em", 2.3, SOLID.has(g) ? "currentColor" : "none", tone);
  return HOLLOW.has(g) ? h.replace('class="lu', 'class="lu hollow') : h;
};

/** Thay glyph trong chuỗi HTML tin cậy (chỉ phần chữ, không đụng thuộc tính thẻ). */
export const glyphHTML = (html: string) => html.replace(/(<[^>]*>)|([^<]+)/g, (_, tag, text) => tag ?? text.replace(RE, (_m: string, g: string) => iconHTML(g)));

const fix = (node: Text) => {
  const t = node.nodeValue || "";
  RE.lastIndex = 0; if (!RE.test(t)) return;
  const p = node.parentElement; if (!p || SKIP.has(p.tagName) || p.closest("svg")) return;
  const box = document.createElement("template"); box.innerHTML = glyphHTML(t.replace(/&/g, "&amp;").replace(/</g, "&lt;"));
  node.replaceWith(box.content);
};
const walk = (root: Node) => {
  if (root.nodeType === 3) { fix(root as Text); return; }
  if (root.nodeType !== 1 || SKIP.has((root as Element).tagName) || (root as Element).closest("svg")) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list: Text[] = [];
  for (let n = tw.nextNode(); n; n = tw.nextNode()) list.push(n as Text);
  list.forEach(fix);
};

let on = false;
export function installGlyphs(root: HTMLElement = document.body) {
  if (on) return; on = true;
  walk(root);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === "characterData") fix(m.target as Text);
      else m.addedNodes.forEach(walk);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}
