/* Thú cưng 3D theo bản vẽ nhiều mặt (design-kit/3d-ref/gemini): ngồi thẳng, mặt hướng +z.
   Milo: cún trắng lông xù tai cụp; Siro: mèo vàng đuôi xoắn ngực kem; Cacao: mèo trắng đuôi cong. */
import * as THREE from "three";
import { Animated, CAP, CONE, SPH, T, add, face } from "./kit";

export type PetKind = "dog" | "gold" | "white";
const EYE: Record<PetKind, string> = { dog: "#5B3A2A", gold: "#6BAF4F", white: "#4F93D9" };
const tube = (pts: [number, number, number][], r: number, seg = 24) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, 8);

export function pet(kind: PetKind): Animated {
  const g = new THREE.Group(), ups: ((t: number) => void)[] = [];
  const cat = kind !== "dog", gold = kind === "gold";
  const fur = kind === "dog" ? "#FFF3E4" : gold ? "#F5C46E" : "#FFFEFA";
  const furD = kind === "dog" ? "#EBCFA6" : gold ? "#E8A94E" : "#F1E9E0", cream = "#FFF1CE";
  const F = T(fur), FD = T(furD), FC = T(cream);

  /* thân ngồi: bụng, ngực, hai đùi, hai chân trước + bàn chân */
  add(g, SPH(.4, 24, 18), F, 0, .4, -.02, { s: [1, 1, .95] });
  add(g, SPH(.3, 22, 16), gold ? FC : F, 0, .64, .1, { s: [1, 1, .85] });
  ([-1, 1] as const).forEach(s => {
    add(g, SPH(.2, 16, 12), F, s * .27, .2, -.1, { s: [.8, 1, 1.1] });
    add(g, CAP(.085, .24), F, s * .13, .3, .27);
    add(g, SPH(.1, 14, 10), gold ? FC : F, s * .13, .06, .34, { s: [1.05, .55, 1.3] });
    [-.035, .035].forEach(dx => add(g, CAP(.006, .05), T("#C7B6A6"), s * .13 + dx, .05, .44, { r: [Math.PI / 2, 0, 0], ol: null }));
  });

  /* đầu */
  const head = new THREE.Group(); head.position.set(0, 1.0, .06); g.add(head);
  add(head, SPH(.4, 28, 20), F, 0, 0, 0, { s: [1.15, .92, 1] });
  ups.push(face(head, EYE[kind], .4, { gap: .42, eyeSize: kind === "dog" ? 1.15 : 1, mouth: false }));
  if (cat) {
    ([-1, 1] as const).forEach(s => {
      const ear = new THREE.Group(); ear.position.set(s * .29, .4, -.02); ear.rotation.z = -s * .32; head.add(ear);
      add(ear, CONE(.17, .32, 4), F, 0, 0, 0, { r: [0, Math.PI / 4, 0] });
      add(ear, CONE(.1, .22, 4), T("#F7A8B8"), 0, -.02, .05, { r: [0, Math.PI / 4, 0], ol: null });
      add(head, CONE(.06, .13, 8), gold ? FC : F, s * .43, -.17, .1, { r: [0, 0, s * 2.3], ol: "thin" });             // lông má
      add(head, CONE(.05, .11, 8), gold ? FC : F, s * .38, -.24, .08, { r: [0, 0, s * 2.7], ol: "thin" });
    });
    add(head, SPH(.035, 8, 6), T("#F48FA8"), 0, -.07, .4, { s: [1.2, .8, .8], ol: null });
    add(head, new THREE.TorusGeometry(.03, .007, 6, 12, Math.PI), T("#B0485E"), -.03, -.125, .39, { r: [0, 0, Math.PI], ol: null });
    add(head, new THREE.TorusGeometry(.03, .007, 6, 12, Math.PI), T("#B0485E"), .03, -.125, .39, { r: [0, 0, Math.PI], ol: null });
    if (gold) {
      add(head, SPH(.2, 16, 12), FC, 0, -.14, .27, { s: [1.5, .8, .8], ol: "thin" });                                // mõm kem
      [-.1, 0, .1].forEach(x => add(head, SPH(.02, 6, 6), T("#D79636"), x, .3, .3, { s: [.7, 2.4, .5], ol: null }));      // sọc trán
      add(g, SPH(.1, 12, 10), FC, 0, .5, .38, { s: [1, 1.2, .5], ol: "thin" });
    }
  } else {
    /* chó: tai cụp lớn, lông xù trên đầu và hai bên, mõm nhỏ + mũi đen */
    ([-1, 1] as const).forEach(s => {
      add(head, SPH(.18, 16, 12), FD, s * .5, -.1, -.02, { s: [.72, 1.8, .95], r: [0, 0, s * .16] });
      add(head, SPH(.12, 12, 10), T("#E3C79E"), s * .47, -.1, .06, { s: [.6, 1.6, .5], r: [0, 0, s * .16], ol: null });
      add(head, SPH(.12, 10, 8), F, s * .43, .06, .02, { ol: "thin" });
    });
    [[-.2, .36], [-.07, .42], [.07, .42], [.2, .36]].forEach(([x, y]) => add(head, SPH(.11, 10, 8), F, x, y, -.02, { ol: "thin" }));
    add(head, SPH(.11, 14, 10), F, 0, -.13, .36, { s: [1.25, .8, .8], ol: "thin" });
    add(head, SPH(.045, 10, 8), T("#2A1E22"), 0, -.08, .46, { s: [1.2, .8, .8], ol: null });
    add(head, new THREE.TorusGeometry(.035, .007, 6, 12, Math.PI), T("#6A3A3A"), 0, -.17, .43, { r: [0, 0, Math.PI], ol: null });
    [[0, .52, .34], [-.12, .46, .3], [.12, .46, .3]].forEach(([x, y, z]) => add(g, SPH(.1, 10, 8), F, x, y, z, { ol: "thin" }));   // lông ngực
  }

  /* đuôi: mèo trắng cong chữ S, mèo vàng xoắn ốc sau lưng, chó bông tròn */
  const tail = new THREE.Group(); tail.position.set(0, 0, 0); g.add(tail);
  if (kind === "white") add(tail, tube([[.16, .16, -.3], [.42, .1, -.4], [.6, .36, -.34], [.52, .64, -.26], [.36, .72, -.2]], .075), F, 0, 0, 0, { ol: "thin" });
  if (gold) { const p: [number, number, number][] = [[0, .2, -.36]]; for (let i = 0; i <= 22; i++) { const a = i / 22 * 4.7 + Math.PI * .9, r = .27 - .14 * i / 22; p.push([Math.cos(a) * r, .4 + Math.sin(a) * r, -.46 - i * .002]); } add(tail, tube(p, .08, 40), F, 0, 0, 0, { ol: "thin" }); }
  if (kind === "dog") [[0, .32, -.4, .15], [.03, .5, -.46, .12], [.12, .64, -.42, .09]].forEach(([x, y, z, r]) => add(tail, SPH(r, 12, 10), F, x, y, z, { ol: "thin" }));

  ups.push(t => {
    head.rotation.z = Math.sin(t * 1.4) * .05; head.position.y = 1.0 + Math.sin(t * 2.1) * .01;
    tail.rotation.y = Math.sin(t * 2.4) * (kind === "white" ? .3 : .12);
    if (gold) tail.rotation.z = Math.sin(t * 1.8) * .06;
  });
  return { group: g, update: t => ups.forEach(f => f(t)) };
}
