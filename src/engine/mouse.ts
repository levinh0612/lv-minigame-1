/* Chuột vào tiệm: sự cố bất ngờ giữa ca (khoảng 35% số ca). Bắt kịp càng sớm càng tốt:
   dưới 10 giây: bắt kịp, được thưởng và tăng hạng "Vua diệt chuột" (F, E, D, C, B, A, S)
   10 đến 30 giây: tạm chấp nhận, bắt được thì thôi (không thưởng, không tăng hạng)
   30 giây: một bé mèo đi làm bị ngất, nghỉ hết ca (không có mèo thì khách sốt ruột nhanh hơn 30%)
   45 giây: cảnh báo khách bắt đầu nghi ngờ
   60 giây: khách báo sở y tế, bắt buộc đóng ca và đền 8% số xu đang có (thấp nhất 100, cao nhất 1.000, không quá số xu đang có)
   Từ giây thứ 10 có thể trả tiền xử lý nhanh để chuột biến mất, rẻ hơn tiền phạt. */
import { PETS } from "../content/game";
import type { PetId } from "../content/couple";
import { earn, spend } from "./wallet";
import { S, save } from "./state";
import type { Shift } from "./shift";

export const MOUSE_CHANCE = 0.35, T_PERFECT = 10, T_OK = 30, T_WARN = 45, T_FINE = 60;
export const FINE_PCT = 0.08, FINE_MIN = 100, FINE_MAX = 1000, PAY_PCT = 0.4, CATCH_REWARD = 30;
export const RANKS: { n: number; name: string }[] = [{ n: 1, name: "F" }, { n: 3, name: "E" }, { n: 6, name: "D" }, { n: 10, name: "C" }, { n: 15, name: "B" }, { n: 25, name: "A" }, { n: 40, name: "S" }];

export interface MouseEvt { age: number; warned: boolean; fainted: PetId | null }
export type MouseStage = "fast" | "ok" | "faint" | "warn";

/** hạng hiện tại ("" nếu chưa diệt con nào) và số lần cần cho hạng kế */
export function mouseRank(king = S.mouse?.king ?? 0) {
  const i = RANKS.reduce((a, r, k) => king >= r.n ? k : a, -1);
  return { name: i >= 0 ? RANKS[i]!.name : "", next: RANKS[i + 1]?.n ?? 0, king };
}
export const mouseTitle = () => { const r = mouseRank(); return r.name ? `Vua diệt chuột hạng ${r.name}` : ""; };

/** tiền phạt nếu bị báo sở y tế */
export const mouseFine = () => Math.min(S.coins, Math.min(FINE_MAX, Math.max(FINE_MIN, Math.round(S.coins * FINE_PCT))));
/** tiền xử lý nhanh */
export const mousePay = () => Math.min(S.coins, Math.max(1, Math.ceil(mouseFine() * PAY_PCT)));
export const mouseStage = (m: MouseEvt): MouseStage => m.age < T_PERFECT ? "fast" : m.age < T_OK ? "ok" : m.age < T_WARN ? "faint" : "warn";

/** kế hoạch cho ca mới: chuột xuất hiện khi đã có bấy nhiêu khách vào tiệm (-1 = ca này không có chuột); không có chuột hai ca liền, ca đầu tiên cũng không */
export function planMouse(total: number, rng: () => number = Math.random): number {
  const m = (S.mouse ??= { king: 0, last: -9 });
  if (S.shifts < 1 || m.last === S.shifts - 1 || rng() >= MOUSE_CHANCE) return -1;
  return Math.max(2, Math.floor(total * (0.3 + rng() * 0.3)));
}

export interface MouseOut { appeared?: boolean; fainted?: PetId | null; patience?: boolean; warn?: boolean; shutdown?: boolean }
/** gọi mỗi nhịp của ca (khi không tạm dừng) */
export function tickMouse(sh: Shift, dt: number, closeEarly: (sh: Shift) => void): MouseOut {
  const out: MouseOut = {};
  if (!sh.mouse) {
    if (sh.mousePlan >= 0 && !sh.mouseDone && sh.spawned >= sh.mousePlan) {
      sh.mouse = { age: 0, warned: false, fainted: null }; sh.mouseDone = true; (S.mouse ??= { king: 0, last: -9 }).last = S.shifts; out.appeared = true;
    }
    return out;
  }
  const m = sh.mouse; const was = m.age; m.age += dt;
  if (was < T_OK && m.age >= T_OK) {
    const cats = sh.working.filter(id => PETS[id].pet !== "dog" && !sh.fainted.includes(id));
    if (cats.length) { const id = cats[Math.floor(Math.random() * cats.length)]!; sh.fainted.push(id); m.fainted = id; out.fainted = id; sh.bakers = sh.bakers.filter(b => { if (b.id !== id) return true; const c = sh.seats[b.seat]; if (c?.by === id) c.by = undefined; return false; }); }
    else { sh.patMul = 1.3; out.patience = true; }
  }
  if (!m.warned && m.age >= T_WARN) { m.warned = true; out.warn = true; }
  if (m.age >= T_FINE) {
    const fine = mouseFine(); spend("incident", fine, "Sở y tế phạt vì có chuột"); sh.mouseFine = fine; sh.shutdown = true; sh.mouse = null; closeEarly(sh); out.shutdown = true; save();
  }
  return out;
}

export type CatchKind = "perfect" | "ok";
/** người chơi bắt được chuột */
export function catchMouse(sh: Shift): { kind: CatchKind; reward: number; rank: string; rankUp: boolean } | null {
  const m = sh.mouse; if (!m) return null;
  sh.mouse = null; const perfect = m.age < T_PERFECT;
  if (!perfect) { save(); return { kind: "ok", reward: 0, rank: mouseRank().name, rankUp: false }; }
  const before = mouseRank().name, st = (S.mouse ??= { king: 0, last: -9 }); st.king++;
  earn("mouse", CATCH_REWARD); sh.mouseReward += CATCH_REWARD; sh.mouseKills++;
  const after = mouseRank().name; save();
  return { kind: "perfect", reward: CATCH_REWARD, rank: after, rankUp: after !== before };
}
/** trả tiền xử lý nhanh (từ giây thứ 10) */
export function payMouse(sh: Shift): number | null {
  const m = sh.mouse; if (!m || m.age < T_PERFECT) return null;
  const cost = mousePay(); if (S.coins < cost) return null;
  spend("incident", cost, "Xử lý chuột nhanh"); sh.mouse = null; sh.mousePaid += cost; save(); return cost;
}
