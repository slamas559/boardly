// The on-screen math keyboard: key layouts and the pure text-editing helpers behind them.
// Keys insert LaTeX snippets. "‸" marks where the caret lands (any selected text is moved there, so
// selecting "x+1" and tapping √ gives \sqrt{x+1}).
export const CARET = "‸";

/** Insert a snippet over the selection [start, end); returns the new text and caret position. */
export function insertSnippet(text, start, end, snippet) {
  const selected = text.slice(start, end);
  const mark = snippet.indexOf(CARET);
  const inserted = mark >= 0 ? snippet.slice(0, mark) + selected + snippet.slice(mark + 1) : snippet;
  const caret = start + (mark >= 0 ? mark + selected.length : snippet.length);
  return { text: text.slice(0, start) + inserted + text.slice(end), caret };
}

const COMMAND_BEFORE = /\\[a-zA-Z]+ ?$/;
const COMMAND_AFTER = /^\\[a-zA-Z]+ ?/;

/** Delete the selection, or one character - or a whole command such as \alpha - before the caret. */
export function backspace(text, start, end) {
  if (start !== end) return { text: text.slice(0, start) + text.slice(end), caret: start };
  if (start === 0) return { text, caret: 0 };
  const command = text.slice(0, start).match(COMMAND_BEFORE);
  const length = command ? command[0].length : 1;
  return { text: text.slice(0, start - length) + text.slice(start), caret: start - length };
}

/** Move the caret one step left (-1) or right (1), treating \commands as a single step. */
export function stepCaret(text, caret, direction) {
  if (direction < 0) {
    const command = text.slice(0, caret).match(COMMAND_BEFORE);
    return Math.max(0, caret - (command ? command[0].length : 1));
  }
  const command = text.slice(caret).match(COMMAND_AFTER);
  return Math.min(text.length, caret + (command ? command[0].length : 1));
}

/** Jump to the next empty {} group, matrix cell (&) or row break (\\); otherwise out of the current group. */
export function nextSlot(text, caret) {
  const rest = text.slice(caret);
  const found = rest.match(/\{\}|&|\\\\/);
  if (found) {
    const at = caret + found.index;
    if (found[0] === "{}") return at + 1;
    const after = at + found[0].length;
    return text[after] === " " ? after + 1 : after;
  }
  const close = rest.indexOf("}");
  return close >= 0 ? caret + close + 1 : text.length;
}

const k = (label, insert, title, extra = {}) => ({ label, insert, title: title || label, ...extra });
const word = (label, command, title) => k(label, `\\${command} `, title || command);
const sym = (label, command, title) => k(label, `\\${command} `, title);

export const KEY_TABS = [
  { id: "basic", label: "123", title: "Numbers and operators" },
  { id: "letters", label: "abc", title: "Letters" },
  { id: "functions", label: "f(x)", title: "Functions, sums and integrals" },
  { id: "greek", label: "αβγ", title: "Greek letters" },
  { id: "symbols", label: "∈∞", title: "Symbols and relations" },
  { id: "library", label: "Formulas", title: "Ready-made formulas" },
];

const action = (label, name, title) => k(label, null, title, { action: name, tone: "control" });

export const KEYS = {
  basic: [
    k("7", "7"), k("8", "8"), k("9", "9"), k("÷", "\\div ", "Divide"), k("□²", "^{2}", "Squared"), k("□ⁿ", "^{‸}", "Power"),
    k("4", "4"), k("5", "5"), k("6", "6"), k("×", "\\times ", "Times"), k("(", "("), k(")", ")"),
    k("1", "1"), k("2", "2"), k("3", "3"), k("−", "-", "Minus"), k("√", "\\sqrt{‸}", "Square root"), k("a⁄b", "\\frac{‸}{}", "Fraction"),
    k("0", "0"), k(".", "."), k(",", ","), k("+", "+"), k("=", "="), action("⌫", "backspace", "Delete"),
    k("x", "x"), k("y", "y"), k("π", "\\pi ", "Pi"), action("←", "left", "Move left"), action("→", "right", "Move right"), action("⇥", "next", "Next box"),
  ],
  functions: [
    word("sin", "sin"), word("cos", "cos"), word("tan", "tan"), k("sin⁻¹", "\\sin^{-1}", "Inverse sine"), k("cos⁻¹", "\\cos^{-1}", "Inverse cosine"), k("tan⁻¹", "\\tan^{-1}", "Inverse tangent"),
    word("ln", "ln", "Natural log"), word("log", "log"), k("log□", "\\log_{‸}", "Log with base"), k("eˣ", "e^{‸}", "e to a power"), k("|□|", "\\left|‸\\right|", "Absolute value"), k("n!", "!", "Factorial"),
    k("∑", "\\sum_{‸}^{}", "Sum"), k("∏", "\\prod_{‸}^{}", "Product"), k("∫", "\\int_{‸}^{}", "Integral"), k("lim", "\\lim_{‸\\to }", "Limit"), k("d/dx", "\\frac{d}{dx}", "Derivative"), k("∂", "\\frac{\\partial ‸}{\\partial x}", "Partial derivative"),
    k("ⁿ√", "\\sqrt[‸]{}", "Nth root"), k("a⁄b", "\\frac{‸}{}", "Fraction"), k("(n k)", "\\binom{‸}{}", "Choose"), k("□ₙ", "_{‸}", "Subscript"), k("x̄", "\\overline{‸}", "Bar"), k("v⃗", "\\vec{‸}", "Vector"),
    k("2×2", "\\begin{pmatrix} ‸ &  \\\\  &  \\end{pmatrix}", "2 by 2 matrix", { wide: true }),
    k("3×3", "\\begin{pmatrix} ‸ &  &  \\\\  &  &  \\\\  &  &  \\end{pmatrix}", "3 by 3 matrix", { wide: true }),
    k("{ cases", "\\begin{cases} ‸ &  \\\\  &  \\end{cases}", "Piecewise", { wide: true }),
  ],
  greek: [
    sym("α", "alpha"), sym("β", "beta"), sym("γ", "gamma"), sym("δ", "delta"), sym("ε", "epsilon"), sym("θ", "theta"),
    sym("λ", "lambda"), sym("μ", "mu"), sym("π", "pi"), sym("ρ", "rho"), sym("σ", "sigma"), sym("τ", "tau"),
    sym("φ", "phi"), sym("ω", "omega"), sym("η", "eta"), sym("ν", "nu"), sym("ψ", "psi"), sym("χ", "chi"),
    sym("Γ", "Gamma"), sym("Δ", "Delta"), sym("Θ", "Theta"), sym("Λ", "Lambda"), sym("Σ", "Sigma"), sym("Φ", "Phi"),
    sym("Ψ", "Psi"), sym("Ω", "Omega"), sym("Π", "Pi"), sym("ξ", "xi"), sym("ζ", "zeta"), sym("κ", "kappa"),
  ],
  symbols: [
    sym("∞", "infty", "Infinity"), sym("±", "pm", "Plus or minus"), sym("∓", "mp", "Minus or plus"), sym("≤", "leq", "Less or equal"), sym("≥", "geq", "Greater or equal"), sym("≠", "neq", "Not equal"),
    sym("≈", "approx", "Approximately"), sym("≡", "equiv", "Equivalent"), sym("∝", "propto", "Proportional"), sym("∈", "in", "Element of"), sym("∉", "notin", "Not an element of"), sym("∅", "emptyset", "Empty set"),
    sym("⊂", "subset", "Subset"), sym("⊆", "subseteq", "Subset or equal"), sym("∪", "cup", "Union"), sym("∩", "cap", "Intersection"), sym("∀", "forall", "For all"), sym("∃", "exists", "There exists"),
    sym("→", "to", "Arrow"), sym("⇒", "Rightarrow", "Implies"), sym("⇔", "Leftrightarrow", "If and only if"), sym("∴", "therefore", "Therefore"), k("°", "^{\\circ}", "Degrees"), sym("∠", "angle", "Angle"),
    sym("⊥", "perp", "Perpendicular"), sym("∥", "parallel", "Parallel"), sym("△", "triangle", "Triangle"), sym("∇", "nabla", "Nabla"), k("&", " & ", "Align point / next cell"), k("↵", " \\\\ ", "New line / next row"),
  ],
  library: [
    k("Quadratic formula", "x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}", "", { full: true }),
    k("Pythagoras", "a^{2} + b^{2} = c^{2}", "", { full: true }),
    k("Slope of a line", "m = \\frac{y_{2} - y_{1}}{x_{2} - x_{1}}", "", { full: true }),
    k("Distance formula", "d = \\sqrt{(x_{2} - x_{1})^{2} + (y_{2} - y_{1})^{2}}", "", { full: true }),
    k("Area of a circle", "A = \\pi r^{2}", "", { full: true }),
    k("Derivative definition", "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}", "", { full: true }),
    k("Definite integral", "\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)", "", { full: true }),
    k("Sum of a series", "\\sum_{n=1}^{N} n = \\frac{N(N+1)}{2}", "", { full: true }),
    k("Euler's identity", "e^{i\\pi} + 1 = 0", "", { full: true }),
  ],
};

export const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
