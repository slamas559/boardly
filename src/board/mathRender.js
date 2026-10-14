// Equation blocks: turns LaTeX into sized vector images for the canvas and the editor preview.
// Light-weight on purpose - the MathJax engine itself (mathEngine.js) is loaded the first time a
// formula needs drawing, and everything redraws when it arrives ("boardly-math-ready").
export const MAX_LATEX_LENGTH = 600;
export const MATH_READY_EVENT = "boardly-math-ready";

let engine = null;
let loading = null;
let failure = "";

const announce = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MATH_READY_EVENT));
};

/** Start (or await) loading the typesetting engine. Resolves to true when it is ready. */
export function ensureMath() {
  if (engine) return Promise.resolve(true);
  if (!loading) {
    loading = import("./mathEngine.js").then((module) => {
      engine = module;
      announce();
    }).catch((error) => {
      failure = error instanceof Error ? error.message : "The equation renderer could not be loaded.";
      loading = null;
      announce();
    });
  }
  return loading.then(() => Boolean(engine));
}

export const mathReady = () => Boolean(engine);
export const mathFailure = () => failure;

const svgCache = new Map();

/** Typeset a formula (cached). Returns null while the engine is still loading. */
export function renderLatex(latex) {
  if (typeof latex !== "string" || !latex.trim()) return { svg: "", vbW: 0, vbH: 0, error: "Type or tap a formula to get started." };
  if (latex.length > MAX_LATEX_LENGTH) return { svg: "", vbW: 0, vbH: 0, error: `Keep formulas under ${MAX_LATEX_LENGTH} characters.` };
  if (!engine) {
    ensureMath();
    return null;
  }
  let result = svgCache.get(latex);
  if (!result) {
    try {
      result = engine.latexToSvg(latex);
    } catch (error) {
      result = { svg: "", vbW: 0, vbH: 0, error: error instanceof Error ? error.message : "This formula could not be read." };
    }
    svgCache.set(latex, result);
    if (svgCache.size > 300) svgCache.delete(svgCache.keys().next().value);
  }
  return result;
}

const round1 = (value) => Math.round(value * 10) / 10;

/** Size of a formula at a font size: { w, h }, { error }, or null while the engine loads. */
export function measureEquation(latex, fontSize) {
  const result = renderLatex(latex);
  if (!result) return null;
  if (result.error) return { error: result.error };
  return { w: round1((result.vbW / 1000) * fontSize), h: round1((result.vbH / 1000) * fontSize) };
}

/** Rough size used before the engine has loaded, so a new block can be placed and selected at once. */
export const estimateEquationSize = (latex, fontSize) => ({
  w: round1(Math.max(1, latex.replace(/\\[a-zA-Z]+/g, "x").length) * fontSize * 0.55),
  h: round1(fontSize * 1.7),
});

const safeColor = (color) => (typeof color === "string" && /^#[0-9a-f]{3,8}$/i.test(color) ? color : "#17181C");
const INTRINSIC = 96; // images are made large so they stay sharp when zoomed in

/** A data: URL of the formula as an SVG image in the given colour, or null when it cannot be drawn. */
export function equationSvgUrl(latex, color) {
  const result = renderLatex(latex);
  if (!result || result.error) return null;
  const w = (result.vbW / 1000) * INTRINSIC;
  const h = (result.vbH / 1000) * INTRINSIC;
  const svg = result.svg
    .replace(/currentColor/g, safeColor(color))
    .replace(/ width="[^"]*"/, ` width="${w.toFixed(2)}"`)
    .replace(/ height="[^"]*"/, ` height="${h.toFixed(2)}"`)
    .replace(/ style="[^"]*"/, "");
  // Base64 rather than percent-encoding: understood by every browser and WebView
  let binary = "";
  for (const byte of new TextEncoder().encode(svg)) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

const imageCache = new Map();

/** A loaded image for the canvas, or null while it is being prepared (a redraw follows when it is ready). */
export function equationImage(o) {
  if (typeof Image === "undefined") return null;
  const color = safeColor(o.color);
  const key = `${color}|${o.latex}`;
  let entry = imageCache.get(key);
  if (!entry) {
    const url = equationSvgUrl(o.latex, color);
    if (!url) return null;
    const image = new Image();
    entry = { image, ready: false };
    image.onload = () => {
      entry.ready = true;
      announce();
    };
    image.src = url;
    imageCache.set(key, entry);
    if (imageCache.size > 150) imageCache.delete(imageCache.keys().next().value);
  }
  return entry.ready ? entry.image : null;
}
