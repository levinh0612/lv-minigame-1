import { CATS, type CritterLook, type GuestLook, type Look, type Mood, type PartKey } from "../content/game";

/* ===================== VẼ: chuyển từ component Cake / Critter / Guest của Claude Design ===================== */
const INK = "#4A3438";
const sparkle = (x: number, y: number, s: number, delay = 0, dur = 1.8) => `<path d="M${x} ${y} l${1.8*s} ${-4.6*s} l${1.8*s} ${4.6*s} l${4.6*s} ${1.8*s} l${-4.6*s} ${1.8*s} l${-1.8*s} ${4.6*s} l${-1.8*s} ${-4.6*s} l${-4.6*s} ${-1.8*s} Z" style="transform-box:fill-box;transform-origin:center;animation:cakeTw ${dur}s ease-in-out ${delay}s infinite"/>`;
const heartP = (x: number, y: number, delay: number) => `<path d="M${x+6} ${y} C${x+6} ${y-4} ${x+1} ${y-5} ${x} ${y-1} C${x-1} ${y-5} ${x-6} ${y-4} ${x-6} ${y} C${x-6} ${y+4} ${x} ${y+7} ${x} ${y+9} C${x} ${y+7} ${x+6} ${y+4} ${x+6} ${y} Z" style="transform-box:fill-box;transform-origin:center;animation:cakeTw 1.4s ease-in-out ${delay}s infinite"/>`;
const CREAM_P = `<path d="M18 80 C18 64 40 56 70 56 C100 56 122 64 122 80 C116 80 116 86 110 86 C104 86 104 80 98 80 C92 80 94 88 86 88 C80 88 80 80 74 80 H66 C60 80 60 86 54 86 C48 86 48 80 42 80 C36 80 36 86 30 86 C24 86 24 80 18 80 Z" fill="%C"/><path d="M50 60 C48 46 58 38 70 38 C82 38 92 46 90 60 Z" fill="%C"/><path d="M57 50 C64 46 76 46 83 50" stroke-width="2"/>`;
const STRAW = `<path d="M70 42 C58 42 56 28 62 21 C66 17 74 17 78 21 C84 28 82 42 70 42 Z" fill="#F0506E"/><path d="M62 21 L65 14 L70 19 L75 14 L78 21 Z" fill="#7FB77E" stroke-width="2.2"/>`;
const NUT = `<path d="M70 16 C62 24 57 31 57 38 C57 45 83 45 83 38 C83 31 78 24 70 16 Z" fill="#B07A4A"/>`;
export interface CakeParts { base?: number | null; cream?: number | null; top?: number | null; sweet?: number | null }
export interface CakeOpts { size?: number; done?: boolean; drop?: PartKey | null; still?: boolean }
// Chỉ số -1..2; drop = phần vừa thêm (chỉ phần đó rơi xuống), still = không động
export function cakeSVG(p: CakeParts, o: CakeOpts = {}){
  const S = o.size || 140, b = p.base ?? -1, c = p.cream ?? -1, t = p.top ?? -1, s = p.sweet ?? -1, done = !!o.done;
  const drop = (k: PartKey) => o.drop === k ? ` style="transform-box:fill-box;transform-origin:50% 100%;animation:cakeDrop .55s cubic-bezier(.3,1.4,.5,1) both"` : "";
  const body = o.still ? "" : `transform-box:fill-box;transform-origin:50% 100%;animation:${done ? "cakeHop .8s cubic-bezier(.3,1.4,.5,1) infinite" : "cakeIdle 2.8s ease-in-out infinite"}`;
  let g = "";
  if (b===0) g += `<g${drop("base")}><rect x="22" y="74" width="96" height="34" rx="10" fill="#F6D59A"/><g fill="#E6B870" stroke="none"><circle cx="34" cy="100" r="2.4"/><circle cx="106" cy="99" r="2"/><circle cx="40" cy="86" r="1.8"/><circle cx="100" cy="86" r="2.2"/></g></g>`;
  if (b===1) g += `<g${drop("base")}><path d="M16 76 H124 L114 108 H26 Z" fill="#D9A66B"/><path d="M30 80 L33 104 M44 80 L46 104 M96 80 L94 104 M110 80 L107 104" stroke="#B98246" stroke-width="2.2"/></g>`;
  if (b===2) g += `<g${drop("base")}><path d="M22 108 C20 82 40 70 70 70 C100 70 120 82 118 108 Z" fill="#FFF4EE"/><g fill="#F1DDD5" stroke="none"><circle cx="36" cy="96" r="1.8"/><circle cx="104" cy="94" r="1.8"/><circle cx="44" cy="84" r="1.4"/><circle cx="98" cy="84" r="1.4"/></g></g>`;
  if (b>=0){
    g += `<ellipse cx="50" cy="100" rx="4.6" ry="2.6" fill="#FF9FB6" stroke="none" opacity=".8"/><ellipse cx="90" cy="100" rx="4.6" ry="2.6" fill="#FF9FB6" stroke="none" opacity=".8"/>`;
    g += done ? `<path d="M54 97 Q58 92 62 97 M78 97 Q82 92 86 97" stroke-width="2.2"/>`
              : `<circle cx="58" cy="96" r="3.4" fill="${INK}" stroke="none"/><circle cx="59.2" cy="94.8" r="1.2" fill="#fff" stroke="none"/><circle cx="82" cy="96" r="3.4" fill="${INK}" stroke="none"/><circle cx="83.2" cy="94.8" r="1.2" fill="#fff" stroke="none"/>`;
    g += `<path d="M66 100 Q70 104 74 100" stroke-width="2.2"/>`;
  }
  if (c>=0) g += `<g${drop("cream")}>${CREAM_P.replace(/%C/g, CATS.cream[c][1])}</g>`;
  if (t===0) g += `<g${drop("top")}>${STRAW}<g fill="#FFE08A" stroke="none"><ellipse cx="65" cy="28" rx="1.2" ry="1.8"/><ellipse cx="75" cy="28" rx="1.2" ry="1.8"/><ellipse cx="70" cy="34" rx="1.2" ry="1.8"/></g><g transform="translate(34 62) scale(.55) translate(-70 -30)" stroke-width="4.4">${STRAW}</g><g transform="translate(106 62) scale(.55) translate(-70 -30)" stroke-width="4.4">${STRAW}</g></g>`;
  if (t===1) g += `<g${drop("top")} fill="#8E3B46" stroke-width="2"><ellipse cx="60" cy="38" rx="5.5" ry="4.2"/><ellipse cx="72" cy="32" rx="5.5" ry="4.2" transform="rotate(-15 72 32)"/><ellipse cx="81" cy="40" rx="5.5" ry="4.2" transform="rotate(20 81 40)"/><ellipse cx="68" cy="42" rx="5.5" ry="4.2"/><ellipse cx="34" cy="64" rx="4.5" ry="3.4"/><ellipse cx="44" cy="60" rx="4.5" ry="3.4"/><ellipse cx="96" cy="60" rx="4.5" ry="3.4"/><ellipse cx="106" cy="64" rx="4.5" ry="3.4"/><g fill="#fff" stroke="none" opacity=".8"><circle cx="58.5" cy="36.5" r="1.2"/><circle cx="70.5" cy="30.5" r="1.2"/><circle cx="79.5" cy="38.5" r="1.2"/></g></g>`;
  if (t===2) g += `<g${drop("top")}>${NUT}<path d="M58.5 37 C60 43 80 43 81.5 37 C76 40.5 64 40.5 58.5 37 Z" fill="#E8C9A0" stroke-width="2"/><path d="M66 24 C64 27 63 30 63 32" stroke="#D4A472" stroke-width="2.2"/><g transform="translate(36 62) scale(.55) translate(-70 -32)" stroke-width="4.4">${NUT}</g><g transform="translate(104 62) scale(.55) translate(-70 -32)" stroke-width="4.4">${NUT}</g></g>`;
  if (s===2) g += `<path d="M26 72 C38 67 46 76 56 71 C66 66 76 76 86 71 C96 66 104 74 114 69" stroke="#E8A92A" stroke-width="3.6" style="animation:cakeDrop .5s ease-out both"/>`;
  let out = `<ellipse cx="70" cy="110" rx="62" ry="8" fill="#FFFFFF"/>`;
  if (b<0) out += `<path d="M24 108 C22 82 42 66 70 66 C98 66 118 82 116 108 Z" stroke="#D9C4CB" stroke-dasharray="6 6"/>`;
  out += `<g style="${body}">${g}</g>`;
  if (s>=0){
    out += `<g fill="#FFD166" stroke-width="1.6">${sparkle(104,44,1)}`;
    if (s>=1) out += sparkle(28,48,1,-.9);
    if (s>=2) out += sparkle(44,26,.78,-.4) + sparkle(94,22,.78,-1.3);
    out += `</g>`;
  }
  if (done) out += `<g fill="#FF8FAB" stroke-width="1.6"><g fill="#FFD166">${sparkle(14,60,1.3,0,1.2)}${sparkle(122,70,1.3,-.6,1.2)}</g>${heartP(110,29,-.3)}${heartP(24,25,-1)}</g>`;
  return `<svg width="${S}" height="${Math.round(S*114/140)}" viewBox="0 6 140 114" style="display:block;overflow:visible;flex:none" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${out}</svg>`;
}

let CID = 0;
export function critterSVG(p: CritterLook & { mood?: Mood }, S = 90){
  const k = p.kind || "cat", fur = p.fur || "#FFFFFF", mood = p.mood || "happy", pattern = p.pattern || "none", mark = p.mark || "#E9A860", wave = !!p.wave;
  const vbY = k==="bunny" ? -18 : 12, vbH = 98 - vbY, cid = "cr" + (++CID);
  const open = mood==="open" || mood==="impatient", happy = mood==="happy" || mood==="love";
  const headFill = pattern==="tux" ? mark : fur, earL = headFill, earR = (pattern==="tux"||pattern==="patch") ? mark : fur;
  const pawFill = pattern==="tux" ? "#FFFFFF" : fur, blush = mood==="impatient" ? .3 : .75;
  let s = `<defs><clipPath id="${cid}"><path d="M12 94 C10 58 18 36 60 36 C102 36 110 58 108 94 Z"/></clipPath></defs>`;
  if (k==="cat") s += `<path d="M18 60 L22 18 L52 40 Z" fill="${earL}"/><path d="M27 46 L28 28 L43 40 Z" fill="#F7A8B8" stroke="none"/><path d="M102 60 L98 18 L68 40 Z" fill="${earR}"/><path d="M93 46 L92 28 L77 40 Z" fill="#F7A8B8" stroke="none"/>`;
  if (k==="bunny") s += `<path d="M36 44 C28 18 30 -12 42 -14 C54 -14 54 20 50 40 Z" fill="${fur}"/><path d="M41 34 C37 18 38 -4 42 -6 C46 -6 47 16 46 32 Z" fill="#F7A8B8" stroke="none"/><path d="M84 44 C92 18 90 -12 78 -14 C66 -14 66 20 70 40 Z" fill="${fur}"/><path d="M79 34 C83 18 82 -4 78 -6 C74 -6 73 16 74 32 Z" fill="#F7A8B8" stroke="none"/>`;
  if (k==="bear") s += `<circle cx="28" cy="44" r="13" fill="${fur}"/><circle cx="28" cy="44" r="6" fill="#F7A8B8" stroke="none"/><circle cx="92" cy="44" r="13" fill="${fur}"/><circle cx="92" cy="44" r="6" fill="#F7A8B8" stroke="none"/>`;
  if (p.fluffy) s += `<circle cx="32" cy="44" r="13" fill="${fur}"/><circle cx="47" cy="34" r="14" fill="${fur}"/><circle cx="64" cy="31" r="14" fill="${fur}"/><circle cx="81" cy="36" r="13" fill="${fur}"/><circle cx="91" cy="46" r="11" fill="${fur}"/>`;
  s += `<path d="M12 94 C10 58 18 36 60 36 C102 36 110 58 108 94 Z" fill="${headFill}"/><g clip-path="url(#${cid})" stroke="none">`;
  if (pattern==="tux") s += `<path d="M60 54 C46 54 38 70 30 96 L90 96 C82 70 74 54 60 54 Z" fill="${fur}"/><path d="M60 38 L60 54" stroke="${fur}" stroke-width="6"/>`;
  if (pattern==="patch") s += `<circle cx="94" cy="48" r="24" fill="${mark}"/><circle cx="18" cy="88" r="12" fill="${p.mark2||"#5A4A48"}"/>`;
  if (pattern==="tabby") s += `<path d="M51 41 L53 50 M60 39 V50 M69 41 L67 50 M11 62 L22 64 M11 70 L21 71 M109 62 L98 64 M109 70 L99 71" stroke="${mark}" stroke-width="3.6"/>`;
  s += `</g><path d="M12 94 C10 58 18 36 60 36 C102 36 110 58 108 94" fill="none"/>`;
  if (k==="dog") s += `<path d="M24 44 C8 42 2 66 8 78 C14 88 28 74 32 52 Z" fill="${p.ear||"#E8D8CC"}"/><path d="M96 44 C112 42 118 66 112 78 C106 88 92 74 88 52 Z" fill="${p.ear||"#E8D8CC"}"/>`;
  if (k==="cat") s += `<path d="M14 70 L2 67 M14 76 L3 78 M106 70 L118 67 M106 76 L117 78" stroke-width="2"/>`;
  s += `<ellipse cx="31" cy="77" rx="6.5" ry="3.8" fill="#FF9FB6" stroke="none" opacity="${blush}"/><ellipse cx="89" cy="77" rx="6.5" ry="3.8" fill="#FF9FB6" stroke="none" opacity="${blush}"/>`;
  const eyeO = (x: number) => `<circle cx="${x}" cy="67" r="6.8" fill="${INK}" stroke="none"/><circle cx="${x+2.3}" cy="64.4" r="2.4" fill="#fff" stroke="none"/>`;
  if (open || mood==="wink") s += eyeO(42);
  if (happy) s += `<path d="M35 68 Q42 60 49 68"/>`;
  if (open) s += eyeO(78);
  if (happy) s += `<path d="M71 68 Q78 60 85 68"/>`;
  if (mood==="wink") s += `<path d="M84 63 L73 67.5 L84 72"/>`;
  if (mood==="impatient") s += `<path d="M34 57 L46 54 M86 57 L74 54" stroke-width="2.4"/><path d="M104 42 C99 49 99 55 104 55 C109 55 109 49 104 42 Z" fill="#A8DDF5" stroke-width="2"/>`;
  s += `<ellipse cx="60" cy="72" rx="3.2" ry="2.2" fill="${k==="dog"||k==="bear" ? INK : "#F48FA8"}" stroke="none"/>`;
  if (mood==="love"||mood==="wink") s += `<path d="M55.5 76.5 Q60 86 64.5 76.5 Z" fill="#F07A95" stroke-width="2"/>`;
  s += mood!=="impatient" ? `<path d="M53 75 Q56.5 80 60 75 Q63.5 80 67 75" stroke-width="2.4"/>` : `<path d="M54 80 Q60 75 66 80" stroke-width="2.4"/>`;
  if (p.bow) s += `<g transform="translate(30 38) rotate(-18)"><path d="M0 0 L-12 -8 L-12 8 Z M0 0 L12 -8 L12 8 Z" fill="${p.bow}" stroke-width="2.2"/><circle r="4" fill="${p.bow}" stroke-width="2.2"/></g>`;
  if (mood==="love") s += `<g style="animation:critHeart 1.6s ease-in-out infinite"><path d="M106 24 C106 19 100 18 99 23 C98 18 92 19 92 24 C92 29 99 32 99 35 C99 32 106 29 106 24 Z" fill="#FF6F91" stroke-width="2"/></g>`;
  s += `<path d="M28 95 C27 85 45 85 44 95 Z" fill="${pawFill}"/><path d="M34 90 V94 M38.5 90 V94" stroke-width="2"/>`;
  if (!wave) s += `<path d="M76 95 C75 85 93 85 92 95 Z" fill="${pawFill}"/><path d="M82 90 V94 M86.5 90 V94" stroke-width="2"/>`;
  else s += `<g style="transform-origin:100px 94px;animation:critWave 1.4s ease-in-out infinite"><path d="M90 95 C90 78 92 62 94 55 C96 45 112 45 112 57 C112 68 108 82 108 95" fill="${pawFill}"/><ellipse cx="102.5" cy="60" rx="4.6" ry="3.8" fill="#F7A8B8" stroke="none"/><circle cx="97" cy="52.5" r="1.9" fill="#F7A8B8" stroke="none"/><circle cx="102.5" cy="50.5" r="1.9" fill="#F7A8B8" stroke="none"/><circle cx="108" cy="52.5" r="1.9" fill="#F7A8B8" stroke="none"/></g>`;
  if (p.ledge !== false) s += `<path d="M-6 95 H126"/>`;
  return `<svg width="${S}" height="${Math.round(S*vbH/120)}" viewBox="0 ${vbY} 120 ${vbH}" style="display:block;overflow:visible;flex:none" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${s}</svg>`;
}

export function guestSVG(p: GuestLook & { mood?: Mood }, S = 90){
  const girl = (p.gender||"girl")==="girl", mood = p.mood||"happy", g = p.gesture||"rest", style = p.hairStyle || (girl?"long":"short");
  const hair = p.hair || (girl?"#6B4A3A":"#3B2A26"), skin = p.skin || "#FFE3D0", acc = p.accent || "#FF8FAB";
  const open = mood==="open"||mood==="impatient", happy = mood==="happy"||mood==="love", blush = mood==="impatient" ? .3 : .75;
  let s = "";
  if (girl && style==="buns") s += `<circle cx="24" cy="28" r="13" fill="${hair}"/><circle cx="96" cy="28" r="13" fill="${hair}"/>`;
  if (girl && style==="long") s += `<path d="M8 97 C4 44 28 18 60 18 C92 18 116 44 112 97 Z" fill="${hair}"/>`;
  if ((girl && style==="buns") || !girl) s += `<path d="M16 74 C12 36 34 20 60 20 C86 20 108 36 104 74 Z" fill="${hair}"/>`;
  if (!girl) s += `<circle cx="19" cy="72" r="7" fill="${skin}"/><circle cx="101" cy="72" r="7" fill="${skin}"/>`;
  s += `<path d="M20 97 C16 62 30 40 60 40 C90 40 104 62 100 97 Z" fill="${skin}"/>`;
  if (girl) s += `<path d="M20 64 C18 34 40 24 60 24 C80 24 102 34 100 64 C94 56 88 48 84 42 C78 52 68 56 60 50 C52 56 42 56 36 46 C30 54 25 58 20 64 Z" fill="${hair}"/>`;
  if (!girl && style!=="cap") s += `<path d="M17 66 C14 34 38 20 60 20 C84 20 106 34 103 66 C98 56 94 50 90 44 C86 52 78 53 73 45 C67 53 59 53 55 45 C49 53 41 53 37 45 C31 51 23 58 17 66 Z" fill="${hair}"/><path d="M58 21 C55 12 62 7 68 10"/>`;
  if (!girl && style==="cap") s += `<path d="M17 58 C17 26 38 15 60 15 C82 15 103 26 103 58 Z" fill="${acc}"/><path d="M14 58 C40 51 80 51 106 58 C106 65 14 65 14 58 Z" fill="${acc}"/><circle cx="60" cy="16" r="3.2" fill="${acc}"/><path d="M20 64 C22 60 28 60 30 64 M90 64 C92 60 98 60 100 64" fill="${hair}" stroke-width="2"/>`;
  if (girl && style==="long") s += `<g transform="translate(86 32) rotate(18)"><path d="M0 0 L-11 -8 L-11 8 Z M0 0 L11 -8 L11 8 Z" fill="${acc}" stroke-width="2.2"/><circle r="3.8" fill="${acc}" stroke-width="2.2"/></g>`;
  s += `<ellipse cx="30" cy="81" rx="6.5" ry="3.8" fill="#FF9FB6" stroke="none" opacity="${blush}"/><ellipse cx="90" cy="81" rx="6.5" ry="3.8" fill="#FF9FB6" stroke="none" opacity="${blush}"/>`;
  const eyeO = (x: number) => `<circle cx="${x}" cy="71" r="6.6" fill="${INK}" stroke="none"/><circle cx="${x+2.2}" cy="68.4" r="2.3" fill="#fff" stroke="none"/>`;
  if (open || mood==="wink") s += eyeO(43);
  if (happy) s += `<path d="M36 72 Q43 64 50 72"/>`;
  if (open) s += eyeO(77);
  if (happy) s += `<path d="M70 72 Q77 64 84 72"/>`;
  if (mood==="wink") s += `<path d="M83 67 L72 71.5 L83 76"/>`;
  if (girl && (open || mood==="wink")) s += `<path d="M35 66 L32 63 M85 66 L88 63" stroke-width="2.2"/>`;
  if (mood==="impatient") s += `<path d="M35 61 L48 58 M85 61 L72 58" stroke-width="2.4"/><path d="M106 46 C101 53 101 59 106 59 C111 59 111 53 106 46 Z" fill="#A8DDF5" stroke-width="2"/>`;
  if (mood==="love"||mood==="wink") s += `<path d="M54.5 80 Q60 90 65.5 80 Z" fill="#F07A95" stroke-width="2.2"/>`;
  if (mood==="happy"||mood==="open") s += `<path d="M55 81 Q60 86 65 81" stroke-width="2.4"/>`;
  if (mood==="impatient") s += `<path d="M55 85 Q60 80 65 85" stroke-width="2.4"/>`;
  if (mood==="love") s += `<g style="animation:critHeart 1.6s ease-in-out infinite"><path d="M110 28 C110 23 104 22 103 27 C102 22 96 23 96 28 C96 33 103 36 103 39 C103 36 110 33 110 28 Z" fill="#FF6F91" stroke-width="2"/></g>`;
  if (g==="rest") s += `<path d="M28 98 C27 87 45 87 44 98 Z" fill="${skin}"/><path d="M76 98 C75 87 93 87 92 98 Z" fill="${skin}"/>`;
  if (g==="wave") s += `<path d="M28 98 C27 87 45 87 44 98 Z" fill="${skin}"/><g style="transform-origin:99px 98px;animation:critWave 1.4s ease-in-out infinite"><path d="M89 98 L92 68 L107 68 L110 98 Z" fill="${acc}"/><circle cx="99.5" cy="60" r="10" fill="${skin}"/><path d="M95 54 V57 M100 52.5 V56 M105 54 V57" stroke-width="1.8"/></g>`;
  if (g==="cheek") s += `<path d="M10 98 C10 90 30 88 31 98 Z" fill="${acc}"/><circle cx="23" cy="86" r="9" fill="${skin}"/><path d="M110 98 C110 90 90 88 89 98 Z" fill="${acc}"/><circle cx="97" cy="86" r="9" fill="${skin}"/>`;
  if (p.ledge !== false) s += `<path d="M-6 98 H126"/>`;
  return `<svg width="${S}" height="${Math.round(S*94/120)}" viewBox="0 6 120 94" style="display:block;overflow:visible;flex:none" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${s}</svg>`;
}
export const charSVG = (look: Look, mood: Mood, S?: number) => look.gender ? guestSVG({ ...look, mood }, S) : critterSVG({ ...look, mood }, S);
