/* Vẽ màn hình theo đường dẫn hiện tại */
import { applyTheme } from "../content/theme";
import { rollDay } from "../engine/progress";
import { S } from "../engine/state";
import { $, dropModal, hasModal } from "./dom";
import { pauseMenu } from "./modals";
import { account, isLocked, loggedIn, refreshRank } from "../net/cloud";
import { authHTML } from "./screens/auth";
import { fitRooms } from "./room";
import { keepRoom, mountRooms } from "./room3d";
import { hydratePortraits } from "./portrait";
import { currentPath, resolve } from "./router";
import { goalsHTML } from "./screens/goals";
import { homeHTML } from "./screens/home";
import { progressHTML } from "./screens/progress";
import { prepHTML } from "./screens/prep";
import { visitHTML } from "./screens/visit";
import { gachaHTML } from "./screens/gacha";
import { SH, renderPlay } from "./screens/play";
import { hasResult, resultHTML } from "./screens/result";
import { roadmapHTML } from "./screens/roadmap";
import { rankSheet } from "./screens/rank";
import { shopHTML } from "./screens/shop";

let shown = "";
/** keepModal === true: vẽ lại màn phía sau mà giữ nguyên hộp thoại đang mở (nâng cấp tiệm cập nhật tiền và cảnh ngay) */
export function render(keepModal?: boolean) {
  rollDay(); applyTheme(S.theme); keepRoom();
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
  if (keepModal !== true && r.name !== "play" && r.name !== "result") dropModal();
  document.body.dataset.scr = r.name;
  const scroll = shown === path;
  shown = path;
  const y = scrollY;
  switch (r.name) {
    case "play": renderPlay(); break;
    case "result": $("#app")!.innerHTML = resultHTML(); break;
    case "home": $("#app")!.innerHTML = homeHTML(); void refreshRank(); break;
    case "goals": $("#app")!.innerHTML = goalsHTML(); break;
    case "progress": $("#app")!.innerHTML = progressHTML(); break;
    case "prep": $("#app")!.innerHTML = prepHTML(); break;
    case "roadmap": $("#app")!.innerHTML = roadmapHTML(); break;
    case "shop": $("#app")!.innerHTML = shopHTML(r.tab); break;
    case "gacha": $("#app")!.innerHTML = gachaHTML(); break;
    case "visit": $("#app")!.innerHTML = visitHTML(r.user); break;
    case "rank": $("#app")!.innerHTML = homeHTML(); setTimeout(rankSheet, 0); break;   // link cũ: màn chính + hộp thoại
  }
  fitRooms(); void mountRooms(); hydratePortraits();
  // vẽ lại cùng màn (mua đồ, cho ăn…) thì giữ vị trí cuộn; sang màn khác thì lên đầu
  window.scrollTo(0, scroll ? y : 0);
}
