// Ready-made formulas with named blanks. Pick one, type values (or leave a letter) in each blank, and
// the formula is built for you: no LaTeX needed. Blanks accept the same natural notation as the Type tab,
// so "2", "-3", "x+1" and "pi" all work, and a value that needs brackets gets them.
import { isCompound, naturalToLatex } from "./naturalMath.js";

const field = (key, label, value, hint) => ({ key, label, value, hint });

/**
 * `natural` templates are written in the natural notation; `latex` ones carry raw LaTeX for shapes that
 * notation cannot express (limits, integrals, sums). [key] marks a blank.
 */
export const TEMPLATES = [
  {
    id: "quadratic", name: "Quadratic formula", natural: "x = (-[b] ± sqrt([b]^2 - 4*[a]*[c]))/(2*[a])",
    fields: [field("a", "a", "a"), field("b", "b", "b"), field("c", "c", "c")],
  },
  {
    id: "pythagoras", name: "Pythagoras", natural: "[a]^2 + [b]^2 = [c]^2",
    fields: [field("a", "Side a", "a"), field("b", "Side b", "b"), field("c", "Hypotenuse c", "c")],
  },
  {
    id: "line", name: "Straight line", natural: "y = [m]*x + [c]",
    fields: [field("m", "Slope m", "m"), field("c", "Intercept c", "c")],
  },
  {
    id: "slope", name: "Slope between two points", natural: "m = ([y2] - [y1])/([x2] - [x1])",
    fields: [field("x1", "x₁", "x_1"), field("y1", "y₁", "y_1"), field("x2", "x₂", "x_2"), field("y2", "y₂", "y_2")],
  },
  {
    id: "distance", name: "Distance between two points", natural: "d = sqrt(([x2] - [x1])^2 + ([y2] - [y1])^2)",
    fields: [field("x1", "x₁", "x_1"), field("y1", "y₁", "y_1"), field("x2", "x₂", "x_2"), field("y2", "y₂", "y_2")],
  },
  {
    id: "circle", name: "Circle", natural: "([x] - [h])^2 + ([y] - [k])^2 = [r]^2",
    fields: [field("x", "x", "x"), field("y", "y", "y"), field("h", "Centre x (h)", "h"), field("k", "Centre y (k)", "k"), field("r", "Radius r", "r")],
  },
  {
    id: "circleArea", name: "Area of a circle", natural: "A = pi*[r]^2",
    fields: [field("r", "Radius r", "r")],
  },
  {
    id: "interest", name: "Compound interest", natural: "A = [P]*(1 + [r]/[n])^([n]*[t])",
    fields: [field("P", "Principal P", "P"), field("r", "Rate r", "r"), field("n", "Times per year n", "n"), field("t", "Years t", "t")],
  },
  {
    id: "fraction", name: "Fraction", natural: "[top]/[bottom]",
    fields: [field("top", "Top", "a"), field("bottom", "Bottom", "b")],
  },
  {
    id: "power", name: "Power", natural: "[base]^[exponent]",
    fields: [field("base", "Base", "x"), field("exponent", "Power", "n")],
  },
  {
    id: "root", name: "Root", natural: "root([n], [x])",
    fields: [field("n", "Root (2 = square root)", "3"), field("x", "Inside", "x")],
  },
  {
    id: "limit", name: "Limit", latex: "\\lim_{[x] \\to [a]} [f]", group: ["f"],
    fields: [field("x", "Variable", "x"), field("a", "Approaches", "0"), field("f", "Function", "f(x)")],
  },
  {
    id: "integral", name: "Definite integral", latex: "\\int_{[a]}^{[b]} [f] \\, d[x]", group: ["f"],
    fields: [field("a", "From", "a"), field("b", "To", "b"), field("f", "Function", "f(x)"), field("x", "With respect to", "x")],
  },
  {
    id: "sum", name: "Sum of a series", latex: "\\sum_{[i]=[from]}^{[to]} [term]", group: ["term"],
    fields: [field("i", "Counter", "n"), field("from", "From", "1"), field("to", "To", "N"), field("term", "Term", "n^2")],
  },
];

// A value that is a single token needs no brackets; anything else does when it is dropped into a formula
const SIMPLE_VALUE = /^[\p{L}\p{N}.]+(_[\p{L}\p{N}]+)?$/u;

/**
 * Build a template from the values typed into its blanks.
 * Returns { latex } or { error, key } where key is the blank that could not be read.
 */
export function buildTemplate(template, values = {}) {
  const valueOf = (f) => {
    const typed = String(values[f.key] ?? "").trim();
    return typed || f.value;
  };

  if (template.natural) {
    let text = template.natural;
    for (const f of template.fields) {
      const value = valueOf(f);
      const check = naturalToLatex(value);
      if (check.error || !check.latex) return { error: check.error || "Type a value.", key: f.key };
      const negative = /^-\s*(\d+\.?\d*|[\p{L}])$/u.exec(value);
      // "+ [c]" with c = -1 reads better as "- 1" than "+ (-1)"
      if (negative) text = text.split(`+ [${f.key}]`).join(`- ${negative[1]}`).split(`+[${f.key}]`).join(`- ${negative[1]}`);
      text = text.split(`[${f.key}]`).join(SIMPLE_VALUE.test(value) ? value : `(${value})`);
    }
    const result = naturalToLatex(text);
    return result.error ? { error: result.error } : { latex: result.latex };
  }

  let latex = template.latex;
  for (const f of template.fields) {
    const check = naturalToLatex(valueOf(f));
    if (check.error || !check.latex) return { error: check.error || "Type a value.", key: f.key };
    let piece = check.latex;
    if ((template.group || []).includes(f.key) && isCompound(piece)) piece = `\\left(${piece}\\right)`;
    else if (/\s/.test(piece.trim())) piece = `{${piece}}`; // several words need grouping; one token (x, \pi, f(x), \frac{1}{n}) does not
    latex = latex.split(`[${f.key}]`).join(piece);
  }
  return { latex: latex.replace(/\s+/g, " ").trim() };
}

/** What each template looks like before anything is filled in. */
export const defaultValues = (template) => Object.fromEntries(template.fields.map((f) => [f.key, f.value]));
