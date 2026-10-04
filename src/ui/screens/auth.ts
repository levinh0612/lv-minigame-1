/* Màn tài khoản: chào, đăng ký, đăng nhập, quên PIN, khoá PIN khi mở app.
   Tên tiệm = username. Chỉ đăng nhập một lần trên mỗi máy, lần sau chỉ hỏi PIN. */
import { sfx } from "../../audio/sound";
import { PETS } from "../../content/game";
import { S, meLook } from "../../engine/state";
import { hydratePortraits, portraitHTML } from "../portrait";
import { guestSVG } from "../art";
import { account, checkName, login, logout, pinTriesLeft, question, register, resetPin, unlock } from "../../net/cloud";
import { petSVG } from "../art";
import { $, esc, haptic, toast } from "../dom";

type View = "welcome" | "register" | "login" | "forgot" | "lock";
let view: View = "welcome", pin = "", fq = "", fUser = "";
const QUESTIONS = ["Tên thú cưng đầu tiên của bạn?", "Món bánh bạn thích nhất?", "Biệt danh hồi nhỏ của bạn?", "Tên trường tiểu học của bạn?", "Hai đứa quen nhau ở đâu?"];
const pinInput = (id: string, ph = "••••") => `<input id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="${ph}" class="pinin">`;
const userInput = (v = "") => `<input id="aUser" value="${esc(v)}" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" maxlength="20" placeholder="vd: vinh.matcha">`;
const hero = (m: "love" | "happy" | "wink" = "happy") => `<div class="ahero">${petSVG({ ...PETS.dog, mood: m, ledge: false }, 70)}${petSVG({ ...PETS.gold, mood: "love", ledge: false }, 80)}${petSVG({ ...PETS.white, mood: m === "love" ? "love" : "open", wave: true, ledge: false }, 70)}</div>`;

export function authHTML(v?: View) {
  if (v) view = v;
  let body = "";
  if (view === "welcome") body = `${hero("love")}<h1>Tiệm Bánh Matcha</h1><p class="asub">Tạo tiệm của riêng mình. Tiệm được lưu theo tên, đổi máy chỉ cần đăng nhập lại.</p>
    <button class="b3" data-av="register">Tạo tiệm mới</button><button class="b3 w" data-av="login">Mình có tiệm rồi</button>`;
  if (view === "register") body = `${hero()}<h2>Tạo tiệm mới</h2>
    <label class="field">Tên tiệm (cũng là tên đăng nhập)${userInput()}<small id="aHint" class="ahint">3–20 chữ thường không dấu, số, dấu chấm hoặc gạch dưới</small></label>
    <div class="arow"><label class="field">PIN 4 số${pinInput("aPin")}</label><label class="field">Nhập lại PIN${pinInput("aPin2")}</label></div>
    <label class="field">Câu hỏi bí mật (khi quên PIN)<select id="aQ">${QUESTIONS.map(q => `<option>${esc(q)}</option>`).join("")}</select></label>
    <label class="field">Câu trả lời<input id="aA" autocomplete="off" maxlength="60" placeholder="Nhớ kỹ câu này nha"></label>
    ${S.shifts > 0 ? `<p class="asub small">Tiệm đang chơi trên máy này (Lv, xu, đồ trang trí) sẽ được giữ nguyên trong tài khoản mới.</p>` : ""}
    <button class="b3" id="aGo">Tạo tiệm</button><button class="alink" data-av="welcome">← Quay lại</button>`;
  if (view === "login") body = `${hero("wink")}<h2>Vào tiệm</h2>
    <label class="field">Tên tiệm${userInput(fUser || account())}</label><label class="field">PIN 4 số${pinInput("aPin")}</label>
    <p class="asub small">Tiệm trên máy này sẽ được thay bằng tiệm của bạn trên server.</p>
    <button class="b3" id="aGo">Vào tiệm</button><button class="alink" data-av="forgot">Quên PIN?</button><button class="alink" data-av="welcome">← Quay lại</button>`;
  if (view === "forgot") body = `${hero()}<h2>Quên PIN</h2>
    ${fq ? `<p class="asub"><b>${esc(fUser)}</b> · ${esc(fq)}</p><label class="field">Câu trả lời<input id="aA" autocomplete="off" maxlength="60"></label>
      <div class="arow"><label class="field">PIN mới${pinInput("aPin")}</label><label class="field">Nhập lại${pinInput("aPin2")}</label></div>
      <button class="b3" id="aGo">Đặt PIN mới</button>`
    : `<label class="field">Tên tiệm${userInput(fUser || account())}</label><button class="b3" id="aQn">Tiếp</button>`}
    <button class="alink" data-av="${account() ? "lock" : "login"}">← Quay lại</button>`;
  if (view === "lock") body = `<div class="lk-av"><i class="lk-ring"></i>${portraitHTML(S.me.sprite, S.me, 112, guestSVG({ ...meLook(), mood: "happy" }, 112), "", true)}</div>
    <h2>Chào ${esc(account())}!</h2><p class="asub">Nhập PIN để mở tiệm</p>
    <div class="dots" id="aDots">${[0, 1, 2, 3].map(i => `<i class="${i < pin.length ? "on" : ""}"></i>`).join("")}</div>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-key="${n}">${n}</button>`).join("")}<button class="alink" data-av="forgot">Quên PIN?</button><button data-key="0">0</button><button data-key="del" aria-label="Xoá">⌫</button></div>
    <button class="alink lk-out" id="aOut">Đăng nhập tiệm khác</button>`;
  setTimeout(() => { bind(); hydratePortraits(); }, 0);
  return `<div class="scr auth4${view === "lock" ? " lock" : ""}" id="auth">${body}</div>`;
}

const val = (id: string) => ($<HTMLInputElement>(id)?.value ?? "").trim();
const done = (msg: string) => { toast(msg); sfx("level"); pin = ""; fq = ""; location.hash = "#/"; dispatchEvent(new HashChangeEvent("hashchange")); dispatchEvent(new Event("auth:in")); };
async function run(btn: HTMLButtonElement, f: () => Promise<void>) {
  btn.disabled = true;
  try { await f(); } catch (e) { toast((e as Error).message); sfx("wrong"); haptic(40); } finally { btn.disabled = false; }
}
function show(v: View) { view = v; pin = ""; $("#app")!.innerHTML = authHTML(); }

function bind() {
  const root = $("#auth"); if (!root) return;
  root.querySelectorAll<HTMLElement>("[data-av]").forEach(b => b.addEventListener("click", () => { fUser = val("#aUser") || fUser; if (b.dataset.av !== "forgot") fq = ""; show(b.dataset.av as View); }));
  const go = $<HTMLButtonElement>("#aGo");
  if (view === "register") {
    let t = 0;
    $("#aUser")!.addEventListener("input", () => { clearTimeout(t); t = window.setTimeout(async () => {
      const u = val("#aUser").toLowerCase(), h = $("#aHint")!; if (!u) return;
      try { const r = await checkName(u); h.textContent = r.error || (r.free ? "✓ Tên này dùng được" : "Tên này có người dùng rồi"); h.className = "ahint " + (r.free ? "ok" : "bad"); } catch { /* offline */ }
    }, 400); });
    go!.addEventListener("click", () => run(go!, async () => {
      if (!/^\d{4}$/.test(val("#aPin"))) throw new Error("PIN gồm đúng 4 số");
      if (val("#aPin") !== val("#aPin2")) throw new Error("Hai lần nhập PIN chưa giống nhau");
      if (val("#aA").length < 2) throw new Error("Nhập câu trả lời bí mật nha");
      await register(val("#aUser").toLowerCase(), val("#aPin"), $<HTMLSelectElement>("#aQ")!.value, val("#aA"));
      done("Đã tạo tiệm! Tiệm tự lưu theo tên của bạn ☁︎");
    }));
  }
  if (view === "login") go!.addEventListener("click", () => run(go!, async () => {
    await login(val("#aUser").toLowerCase(), val("#aPin")); done(`Chào mừng ${account()} quay lại tiệm!`);
  }));
  if (view === "forgot") {
    $("#aQn")?.addEventListener("click", e => run(e.currentTarget as HTMLButtonElement, async () => {
      fUser = val("#aUser").toLowerCase(); fq = (await question(fUser)).question; show("forgot");
    }));
    go?.addEventListener("click", () => run(go!, async () => {
      if (!/^\d{4}$/.test(val("#aPin")) || val("#aPin") !== val("#aPin2")) throw new Error("PIN mới gồm 4 số, hai lần nhập phải giống nhau");
      await resetPin(fUser, val("#aA"), val("#aPin")); done("Đã đặt PIN mới ✓");
    }));
  }
  if (view === "lock") {
    root.querySelectorAll<HTMLButtonElement>("[data-key]").forEach(b => b.addEventListener("click", () => key(b.dataset.key!)));
    $("#aOut")!.addEventListener("click", async e => {
      const b = e.currentTarget as HTMLButtonElement;
      if (b.dataset.arm !== "1") { b.dataset.arm = "1"; b.textContent = "Chạm lần nữa để đăng xuất tiệm này"; return; }
      await logout(); show("welcome");
    });
  }
}
async function key(k: string) {
  sfx("tap"); haptic(6);
  pin = k === "del" ? pin.slice(0, -1) : (pin + k).slice(0, 4);
  const dots = $("#aDots"); if (dots) dots.innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < pin.length ? "on" : ""}"></i>`).join("");
  if (pin.length < 4) return;
  const r = await unlock(pin);
  if (r === "ok") return done(`Chào ${account()} ♥`);
  pin = ""; sfx("wrong"); haptic([60, 40, 60]); bump();
  if (r === "out") { toast("Sai PIN 5 lần, đăng nhập lại bằng tên tiệm và PIN nha"); fUser = account(); show("login"); }
  else toast(`Sai PIN, còn ${pinTriesLeft()} lần`);
}
function bump() { const d = $("#aDots"); if (!d) return; d.innerHTML = "<i></i><i></i><i></i><i></i>"; d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); }
