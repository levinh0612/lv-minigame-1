/* Máy có WebGL không (tách riêng, không kéo three.js vào) */
export const webglOK = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
