// The MathJax side of equation blocks. It is big, so it is only ever loaded on demand through
// mathRender.js (like the 3D renderer). Output is plain SVG paths, so no web fonts are needed and it
// draws crisply at any zoom. Only the base + ams TeX packages are enabled: there is no way to run
// scripts, load files or open links from a formula.
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import "mathjax-full/js/input/tex/base/BaseConfiguration.js";
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js";
import "mathjax-full/js/input/tex/html/HtmlConfiguration.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const mathDocument = mathjax.document("", {
  InputJax: new TeX({ packages: ["base", "ams"], maxMacros: 2000, maxBuffer: 6 * 1024 }),
  OutputJax: new SVG({ fontCache: "none" }),
});

/**
 * Typeset one formula. Returns { svg, vbW, vbH, error } where the viewBox is in 1/1000 em, so a
 * formula at font size S is vbW/1000*S wide. `error` is a short message when the TeX is invalid.
 */
export function latexToSvg(latex) {
  const node = mathDocument.convert(latex, { display: true, em: 16, ex: 8, containerWidth: 1e6 });
  const svg = adaptor.innerHTML(node);
  const box = svg.match(/viewBox="([^"]+)"/);
  const [, , vbW, vbH] = box ? box[1].trim().split(/\s+/).map(Number) : [0, 0, 0, 0];
  const failure = svg.match(/data-mjx-error="([^"]*)"/);
  return {
    svg,
    vbW,
    vbH,
    error: failure ? failure[1] || "This formula could not be read." : !(vbW > 0 && vbH > 0) ? "This formula is empty." : "",
  };
}

/* ------------------------------ where each part is drawn (for editing on the board) ------------------------------ */
// A second typesetter that understands \class{}{} markers. It only ever receives our own copy of a formula in which
// every editable number / letter is wrapped in a marker, and its output is read for coordinates, never displayed.
const measureDocument = mathjax.document("", {
  InputJax: new TeX({ packages: ["base", "ams", "html"], maxMacros: 4000, maxBuffer: 16 * 1024 }),
  OutputJax: new SVG({ fontCache: "none" }),
});

const IDENTITY = [1, 0, 0, 1, 0, 0];
const multiply = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const numbers = (text) => (text.match(NUMBER) || []).map(Number);

function parseTransform(text) {
  let m = IDENTITY;
  for (const [, name, args] of text.matchAll(/(translate|scale|matrix)\(([^)]*)\)/g)) {
    const n = numbers(args);
    if (name === "translate") m = multiply(m, [1, 0, 0, 1, n[0] || 0, n[1] || 0]);
    else if (name === "scale") m = multiply(m, [n[0], 0, 0, n.length > 1 ? n[1] : n[0], 0, 0]);
    else if (n.length === 6) m = multiply(m, n);
  }
  return m;
}

// Every coordinate a path passes through (control points included: a slightly generous box is fine for hit areas)
function pathPoints(d) {
  const points = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  for (const [, command, args] of d.matchAll(/([MmLlHhVvCcSsQqTtZz])([^MmLlHhVvCcSsQqTtZz]*)/g)) {
    const n = numbers(args);
    const relative = command === command.toLowerCase();
    const kind = command.toUpperCase();
    if (kind === "Z") { x = startX; y = startY; continue; }
    if (kind === "H") { for (const v of n) { x = relative ? x + v : v; points.push([x, y]); } continue; }
    if (kind === "V") { for (const v of n) { y = relative ? y + v : v; points.push([x, y]); } continue; }
    const step = kind === "C" ? 6 : kind === "S" || kind === "Q" ? 4 : 2;
    for (let i = 0; i + step <= n.length; i += step) {
      const baseX = x;
      const baseY = y;
      for (let j = 0; j < step; j += 2) {
        x = relative ? baseX + n[i + j] : n[i + j];
        y = relative ? baseY + n[i + j + 1] : n[i + j + 1];
        points.push([x, y]);
      }
      if (kind === "M") { startX = x; startY = y; }
    }
  }
  return points;
}

/**
 * Typeset `marked` (a formula whose parts are wrapped as {\class{bl0}{..}} {\class{bl1}{..}} …) and report the box of each
 * marked part in the image's own units: { vb: { x, y, w, h }, boxes: [{ x, y, w, h } | null] }, or null when it fails.
 */
export function latexLeafBoxes(marked, count) {
  const node = measureDocument.convert(marked, { display: true, em: 16, ex: 8, containerWidth: 1e6 });
  const svg = adaptor.innerHTML(node);
  if (svg.includes("data-mjx-error")) return null;
  const view = svg.match(/viewBox="([^"]+)"/);
  if (!view) return null;
  const [vx, vy, vw, vh] = view[1].trim().split(/\s+/).map(Number);
  const boxes = Array.from({ length: count }, () => null);
  const stack = [];
  const grow = (leaf, m, x, y) => {
    const px = m[0] * x + m[2] * y + m[4];
    const py = m[1] * x + m[3] * y + m[5];
    const b = boxes[leaf] || (boxes[leaf] = { minX: px, minY: py, maxX: px, maxY: py });
    b.minX = Math.min(b.minX, px); b.maxX = Math.max(b.maxX, px);
    b.minY = Math.min(b.minY, py); b.maxY = Math.max(b.maxY, py);
  };
  for (const [, closing, name, attrs, selfClosing] of svg.matchAll(/<(\/?)(svg|g|path|rect)\b([^>]*?)(\/?)>/g)) {
    if (name === "svg") continue;
    if (name === "g") {
      if (closing) { stack.pop(); continue; }
      const parent = stack[stack.length - 1] || { m: IDENTITY, leaf: null };
      const transform = /transform="([^"]*)"/.exec(attrs);
      const marker = /class="[^"]*\bbl(\d+)\b/.exec(attrs);
      stack.push({ m: transform ? multiply(parent.m, parseTransform(transform[1])) : parent.m, leaf: marker ? Number(marker[1]) : parent.leaf });
      if (selfClosing) stack.pop();
      continue;
    }
    if (closing) continue;
    const top = stack[stack.length - 1];
    if (!top || top.leaf === null || top.leaf >= count) continue;
    if (name === "path") {
      const d = /\sd="([^"]*)"/.exec(attrs);
      if (d) for (const [x, y] of pathPoints(d[1])) grow(top.leaf, top.m, x, y);
    } else {
      const r = Object.fromEntries([...attrs.matchAll(/(x|y|width|height)="([^"]*)"/g)].map(([, k, v]) => [k, Number(v)]));
      const x = r.x || 0;
      const y = r.y || 0;
      for (const [cx, cy] of [[x, y], [x + (r.width || 0), y + (r.height || 0)]]) grow(top.leaf, top.m, cx, cy);
    }
  }
  return {
    vb: { x: vx, y: vy, w: vw, h: vh },
    boxes: boxes.map((b) => (b ? { x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY } : null)),
  };
}
