/* Kỹ năng gói quà / giao hàng của nhân viên: chủ tiệm đạt hạng SSS thì dạy được, bé đi làm vài ca là thạo và tự làm.
   Thuần dữ liệu; phần vẽ ở ui/team.ts. */
import { TIERS } from "../content/minigames";
import { giftResult, shipResult, tierOf } from "./minigame";
import { S, save } from "./state";
import { spend } from "./wallet";

export type SkillKind = "gift" | "ship";
export const SKILLS: SkillKind[] = ["gift", "ship"];
export const SKILL_NAME: Record<SkillKind, string> = { gift: "Gói quà", ship: "Giao hàng" };
export const SKILL_SHIFTS = 3;           // số ca đi làm để thạo
export const SKILL_FEE = 800;            // phí dạy mỗi kỹ năng
export const STAFF_OK = 0.9;             // xác suất bé làm trót lọt
export const STAFF_CUT = 0.8;            // bé làm chỉ được 80% thưởng so với chủ tiệm hạng SSS

const SSS = TIERS.length - 1;
export const mgXpOf = (k: SkillKind) => (S.mg ??= { gift: 0, ship: 0 })[k];
export const canTeach = (k: SkillKind) => tierOf(mgXpOf(k)) >= SSS;
/** tiến độ học: undefined = chưa dạy; số ca đã đi làm kể từ lúc được dạy */
export const progressOf = (id: string, k: SkillKind) => S.staff[id]?.skills?.[k];
export const knows = (id: string, k: SkillKind) => (progressOf(id, k) ?? -1) >= SKILL_SHIFTS;

export function teach(id: string, k: SkillKind): boolean {
  const st = S.staff[id];
  if (!st?.hired || !canTeach(k) || progressOf(id, k) !== undefined || S.coins < SKILL_FEE) return false;
  spend("train", SKILL_FEE, `Dạy ${SKILL_NAME[k].toLowerCase()} cho ${id}`);
  (st.skills ??= {})[k] = 0; save(); return true;
}

/** hết ca: bé nào đi làm thì tiến thêm một ca; trả về các kỹ năng vừa thạo */
export function advanceSkills(working: string[]): { id: string; k: SkillKind }[] {
  const up: { id: string; k: SkillKind }[] = [];
  working.forEach(id => SKILLS.forEach(k => {
    const p = progressOf(id, k); if (p === undefined || p >= SKILL_SHIFTS) return;
    S.staff[id]!.skills![k] = p + 1; if (p + 1 >= SKILL_SHIFTS) up.push({ id, k });
  }));
  if (up.length || working.length) save();
  return up;
}

/** bé làm hộ đơn có dịch vụ: chỉ khi thạo hết kỹ năng khách cần. Trả null nếu bé chưa làm được (không thưởng, không phàn nàn) */
export function staffService(id: string, svc: "gift" | "ship" | "both", price: number, km: number, rng: () => number = Math.random): { fee: number; ok: boolean } | null {
  const need: SkillKind[] = svc === "both" ? ["gift", "ship"] : [svc];
  if (!need.every(k => knows(id, k))) return null;
  if (rng() >= STAFF_OK) return { fee: 0, ok: false };
  const g = need.includes("gift") ? giftResult(price, ["good", "good", "good"], SSS).fee : 0;
  const s = need.includes("ship") ? shipResult(price, km, 1, SSS).fee : 0;
  return { fee: Math.max(1, Math.round((g + s) * STAFF_CUT)), ok: true };
}
