/* Vẽ màn hình theo đường dẫn hiện tại */
import { rollDay } from "../engine/progress";
import { $, dropModal, hasModal } from "./dom";
import { pauseMenu } from "./modals";
import { account, isLocked, loggedIn } from "../net/cloud";
import { authHTML } from "./screens/auth";
import { fitRooms } from "./room";
import { currentPath, resolve } from "./router";
import { goalsHTML } from "./screens/goals";
import { homeHTML } from "./screens/home";
import { prepHTML } from "./screens/prep";
import { SH, hasResult, renderPlay, resultHTML } from "./screens/play";
import { roadmapHTML } from "./screens/roadmap";
import { rankSheet } from "./screens/rank";
import { shopHTML } from "./screens/shop";

let shown = "";
export function render() {
  rollDay();
  const path = currentPath(), r = resolve(path);
  // chưa đăng nhập: màn chào / đăng nhập; đã đăng nhập nhưng vừa mở app: hỏi PIN
  if (!SH && (!loggedIn() || isLocked())) {
    dropModal(); document.body.dataset.scr = "auth"; shown = "";
    $("#app")!.innerHTML = authHTML(loggedIn() ? "lock" : account() ? "login" : "welcome"); window.scrollTo(0, 0); return;
  }
  // đang bán mà người chơi bấm Back: quay lại ca, hiện bảng tạm dừng
  if (SH && r.name !== "play") { history.pushState(null, "", "#/choi"); if (!hasModal()) pauseMenu(); return; }
  if (r.name === "play" && !SH) return void location.replace("#/");
  if (r.name === "result" && !hasResult()) return void location.replace("#/");
  if (r.name !== "play" && r.name !== "result") dropModal();
  document.body.dataset.scr = r.name;
  const scroll = shown === path;
  shown = path;
  const y = scrollY;
  switch (r.name) {
    case "play": renderPlay(); break;
    case "result": $("#app")!.innerHTML = resultHTML(); break;
    case "home": $("#app")!.innerHTML = homeHTML(); break;
    case "goals": $("#app")!.innerHTML = goalsHTML(); break;
    case "prep": $("#app")!.innerHTML = prepHTML(); break;
    case "roadmap": $("#app")!.innerHTML = roadmapHTML(); break;
    case "shop": $("#app")!.innerHTML = shopHTML(r.tab); break;
    case "rank": $("#app")!.innerHTML = homeHTML(); setTimeout(rankSheet, 0); break;   // link cũ: màn chính + hộp thoại
  }
  fitRooms();
  // vẽ lại cùng màn (mua đồ, cho ăn…) thì giữ vị trí cuộn; sang màn khác thì lên đầu
  window.scrollTo(0, scroll ? y : 0);
}
