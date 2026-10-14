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
