/* Bánh 3D ghép từ ba lớp như trong game: đế × kem × topping (chỉ số theo CATS trong content/game.ts).
   Hình dạng theo bản vẽ nhiều mặt (design-kit/3d-ref/gemini): đế tròn, kem là mũ có viền chảy và chỏm tròn, topping từng cụm. */
import * as THREE from "three";
import { CONE, CYL, SPH, T, add } from "./kit";

const BASE = ["#FCD863", "#C58E55", "#FFF2EC", "#E8A857", "#FFF1CF"], CREAM = ["#9CCB80", "#FFAEC4", "#FFEEC2", "#FFF6D6", "#8A5A44"];

/** b: đế (0 bông lan, 1 tart, 2 mochi, 3 croissant, 4 cheesecake), c: kem (0 matcha, 1 dâu, 2 vani, 3 phô mai, 4 socola), t: topping (0 dâu tây, 1 đậu đỏ, 2 hạt dẻ, 3 việt quất, 4 mâm xôi); null = chưa có lớp đó */
export function cake(b: number | null, c: number | null, t: number | null, scale = 1): THREE.Group {
  const g = new THREE.Group();
  add(g, CYL(.36, .38, .025, 32), T("#fff"), 0, .0125, 0, { ol: "thin" });                                             // đĩa
  add(g, CYL(.2, .22, .02, 28), T("#EEEAF2"), 0, .03, 0, { ol: null });
  let top = .04;                                                                                                         // độ cao mặt trên của lớp dưới cùng
  if (b === 0) { add(g, CYL(.245, .255, .2, 28), T(BASE[0]), 0, .14, 0, { ol: "thin" }); add(g, new THREE.TorusGeometry(.235, .03, 8, 28), T(BASE[0]), 0, .24, 0, { r: [Math.PI / 2, 0, 0], ol: "thin" }); top = .26; }
  if (b === 1) {
    add(g, CYL(.285, .21, .12, 28), T(BASE[1]), 0, .1, 0, { ol: "thin" });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(g, CYL(.006, .006, .1, 4), T("#A8733F"), Math.cos(a) * .25, .1, Math.sin(a) * .25, { r: [Math.sin(a) * .35, 0, -Math.cos(a) * .35], ol: null, cast: false }); }
    top = .16;
  }
  if (b === 2) { add(g, SPH(.26, 26, 14), T(BASE[2]), 0, .04, 0, { s: [1, .66, 1], ol: "thin" }); top = .21; }
  if (b === 3) {                                                                                                         // croissant: vòm bánh cuộn có các nếp nổi
    add(g, SPH(.27, 26, 14), T(BASE[3]), 0, .04, 0, { s: [1.05, .66, .9], ol: "thin" });
    for (let i = -2; i <= 2; i++) add(g, SPH(.07, 10, 8), T("#D99646"), i * .095, .13 - Math.abs(i) * .012, 0, { s: [.7, .75, 3.1], r: [0, 0, i * .22], ol: null });
    top = .21;
  }
  if (b === 4) {                                                                                                         // cheesecake: thân kem phô mai trên đáy bánh quy nâu
    add(g, CYL(.255, .255, .2, 28), T(BASE[4]), 0, .14, 0, { ol: "thin" });
    add(g, CYL(.262, .262, .065, 28), T("#C98E55"), 0, .0725, 0, { ol: "thin" });
    top = .24;
  }
  if (c !== null) {                                                                                                      // kem: mũ phẳng + viền chảy + chỏm tròn
    const cr = T(CREAM[c]), y = top + .01;
    add(g, CYL(.272, .272, .04, 30), cr, 0, y, 0, { ol: "thin" });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(g, SPH(.032, 8, 6), cr, Math.cos(a) * .268, y - .03 - (i % 2) * .028, Math.sin(a) * .268, { s: [1, 1.9, 1], ol: "thin" }); }
    add(g, SPH(.13, 18, 12), cr, 0, y + .06, 0, { s: [1, .8, 1], ol: "thin" });
    top = y + .14;
  }
  if (t === 0) {                                                                                                         // cụm dâu tây: một quả lớn có lá + hai quả nhỏ
    const berry = (x: number, z: number, s: number, ry: number) => {
      const b1 = new THREE.Group(); b1.position.set(x, top, z); b1.rotation.y = ry; b1.scale.setScalar(s); g.add(b1);
      add(b1, SPH(.07, 12, 10), T("#E8445C"), 0, .06, 0, { s: [1, 1.25, 1], ol: "thin" });
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; add(b1, CONE(.03, .08, 4), T("#5DAA68"), Math.cos(a) * .035, .14, Math.sin(a) * .035, { r: [Math.sin(a) * .7, 0, -Math.cos(a) * .7], ol: null }); }
      for (let k = 0; k < 4; k++) add(b1, SPH(.008, 4, 4), T("#F4D58A"), Math.cos(k * 1.6) * .045, .04 + (k % 2) * .04, Math.sin(k * 1.6) * .045 + .02, { ol: null, cast: false });
    };
    berry(0, 0, 1.15, 0); berry(.17, .05, .8, 1); berry(-.17, .05, .8, -1);
  }
  if (t === 1) {                                                                                                         // đậu đỏ: gò đậu nâu đỏ + từng hạt
    add(g, SPH(.13, 14, 10), T("#7A2E3E"), 0, top + .01, 0, { s: [1.2, .8, 1.2], ol: "thin" });
    for (let k = 0; k < 9; k++) { const a = k * 2.4, r = .03 + (k % 3) * .035; add(g, SPH(.034, 8, 6), T("#8E3446"), Math.cos(a) * r, top + .08 + (k % 3) * .008 - r * .5, Math.sin(a) * r, { s: [1.3, .9, .9], r: [0, a, 0], ol: "thin" }); }
  }
  if (t === 2) {                                                                                                         // hạt dẻ: quả lớn có mũ + hai quả nhỏ
    const nut = (x: number, z: number, s: number) => { const n = new THREE.Group(); n.position.set(x, top, z); n.scale.setScalar(s); g.add(n);
      add(n, SPH(.085, 14, 10), T("#D9A56A"), 0, .07, 0, { s: [1, .95, 1], ol: "thin" }); add(n, SPH(.07, 12, 8, ), T("#8A5A32"), 0, .13, 0, { s: [1, .55, 1], ol: "thin" }); add(n, CONE(.03, .05, 6), T("#6E4526"), 0, .17, 0, { ol: null }); };
    nut(0, 0, 1.2); nut(.18, .06, .75); nut(-.17, .06, .75);
  }
  if (t === 3) {                                                                                                         // việt quất: ba quả tròn xanh tím có chỏm
    [[0, 0, 1], [.13, .06, .85], [-.12, .07, .85]].forEach(([x, z, k]) => { add(g, SPH(.075 * k, 12, 10), T("#4B5FB0"), x, top + .06, z, { ol: "thin" }); add(g, SPH(.02 * k, 6, 6), T("#2E3A7A"), x, top + .06 + .072 * k, z, { ol: null }); });
  }
  if (t === 4) {                                                                                                         // mâm xôi: cụm hạt tròn đỏ hồng + lá nhỏ
    [[0, 0, 0], [.07, .03, 0], [-.07, .03, 0], [.035, -.06, 0], [-.035, -.06, 0], [0, 0, .075]].forEach(([x, z, y]) => add(g, SPH(.05, 10, 8), T("#D6456A"), x, top + .06 + y, z, { ol: "thin" }));
    add(g, CONE(.03, .07, 4), T("#5DAA68"), 0, top + .16, 0, { r: [0, 0, 0], ol: null });
  }
  g.scale.setScalar(scale);
  return g;
}
