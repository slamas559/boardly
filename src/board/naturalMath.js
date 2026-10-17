// Type maths the way you would write it on a calculator and get proper typeset LaTeX:
//   x^2/3 + sqrt(x)   (a+b)/2   pi*r^2   sin(x)^2   x_1   root(3, x)   a <= b
// naturalToLatex() reads that notation; latexToNatural() goes back the other way for the formulas it can
// show faithfully (it returns null for anything else, so the editor never displays something wrong).
// Pure functions with no browser dependencies.

export const GREEK_NAME_TO_CHAR = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ",
  nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};
export const GREEK_CHAR_TO_NAME = Object.fromEntries(Object.entries(GREEK_NAME_TO_CHAR).map(([name, char]) => [char, name]));

const FUNCTIONS = ["sin", "cos", "tan", "sec", "csc", "cot", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "coth", "ln", "log", "exp", "min", "max"];
const KEYWORDS = ["sqrt", "cbrt", "root", "abs", "binom", "choose", "frac"];
const SYMBOL_WORDS = { infinity: "\\infty ", infty: "\\infty ", inf: "\\infty " };
// Longest first, so "arcsin" wins over "sin" and "alpha" over "a"
const WORDS = [...FUNCTIONS, ...KEYWORDS, ...Object.keys(GREEK_NAME_TO_CHAR), ...Object.keys(SYMBOL_WORDS)].sort((a, b) => b.length - a.length);

const MAX_INPUT = 300;
const MAX_DEPTH = 30;

class NaturalError extends Error {}

const OPS2 = { "<=": "leq", ">=": "geq", "!=": "neq", "==": "=", "->": "to", "+-": "pm", "-+": "mp", "~=": "approx" };
const OPS1 = { "+": "+", "-": "-", "*": "*", "/": "/", "^": "^", "_": "_", "=": "=", "<": "<", ">": ">" };
const UNICODE_OPS = { "×": "times", "·": "cdot", "÷": "div", "±": "pm", "∓": "mp", "≤": "leq", "≥": "geq", "≠": "neq", "≈": "approx", "→": "to", "−": "-", "⋅": "cdot" };
const SUPERSCRIPT = { "²": "2", "³": "3", "¹": "1" };

// A run of letters, cut into known words (sin, alpha, sqrt…) and single-letter variables
function splitRun(run) {
  const out = [];
  let j = 0;
  while (j < run.length) {
    const word = WORDS.find((w) => run.startsWith(w, j));
    out.push(word || run[j]);
    j += (word || run[j]).length;
  }
  return out;
}

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const rest = src.slice(i);
    let m = /^(\d+\.?\d*|\.\d+)/.exec(rest);
    if (m) {
      tokens.push({ t: "num", v: m[0].replace(/\.$/, ""), raw: m[0] });
      i += m[0].length;
      continue;
    }
    m = /^[A-Za-z]+/.exec(rest);
    if (m) {
      for (const word of splitRun(m[0])) {
        if (word.length === 1 && !WORDS.includes(word)) tokens.push({ t: "var", v: word, raw: word });
        else if (FUNCTIONS.includes(word)) tokens.push({ t: "fn", v: word, raw: word });
        else if (KEYWORDS.includes(word)) tokens.push({ t: "kw", v: word, raw: word });
        else if (SYMBOL_WORDS[word]) tokens.push({ t: "sym", v: SYMBOL_WORDS[word], raw: word });
        else tokens.push({ t: "sym", v: `\\${word} `, raw: word });
      }
      i += m[0].length;
      continue;
    }
    const two = rest.slice(0, 2);
    if (OPS2[two]) { tokens.push({ t: "op", v: OPS2[two], raw: two }); i += 2; continue; }
    if (OPS1[c]) { tokens.push({ t: "op", v: OPS1[c], raw: c }); i++; continue; }
    if (UNICODE_OPS[c]) { tokens.push({ t: "op", v: UNICODE_OPS[c], raw: c }); i++; continue; }
    if (SUPERSCRIPT[c]) { tokens.push({ t: "op", v: "^", raw: c }, { t: "num", v: SUPERSCRIPT[c], raw: c }); i++; continue; }
    if (GREEK_CHAR_TO_NAME[c]) { tokens.push({ t: "sym", v: `\\${GREEK_CHAR_TO_NAME[c]} `, raw: c }); i++; continue; }
    if (c === "∞") { tokens.push({ t: "sym", v: "\\infty ", raw: c }); i++; continue; }
    if (c === "√") { tokens.push({ t: "kw", v: "sqrt", raw: c }); i++; continue; }
    if (c === "°") { tokens.push({ t: "deg", raw: c }); i++; continue; }
    if (c === "(" || c === ")" || c === "," || c === "!") { tokens.push({ t: c, raw: c }); i++; continue; }
    if (c === "|") throw new NaturalError("For an absolute value type abs(x).");
    throw new NaturalError(`I don’t know what “${c}” means here.`);
  }
  return tokens;
}

/* ------------------------------------------------------------------ parser ------------------------------------------------------------------ */

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.p = 0;
    this.depth = 0;
  }

  peek(offset = 0) { return this.tokens[this.p + offset]; }
  next() { return this.tokens[this.p++]; }
  isOp(...values) { const t = this.peek(); return Boolean(t) && t.t === "op" && values.includes(t.v); }
  startsPrimary(t) { return Boolean(t) && ["num", "var", "sym", "fn", "kw", "("].includes(t.t); }
  unexpected() {
    const t = this.peek();
    return new NaturalError(t ? `I didn’t expect “${t.raw}” there.` : "The formula ends too early. Keep typing.");
  }
  expect(type) {
    const t = this.peek();
    if (!t || t.t !== type) throw type === ")" ? new NaturalError("A bracket is not closed: add “)”.") : this.unexpected();
    this.p++;
  }

  parseAll() {
    const node = this.parseRelation();
    if (this.p < this.tokens.length) throw this.peek().t === ")" ? new NaturalError("There is a “)” without a matching “(”.") : this.unexpected();
    return node;
  }

  parseRelation() {
    const first = this.parseSum();
    const rest = [];
    while (this.isOp("=", "<", ">", "leq", "geq", "neq", "approx", "to")) {
      const op = this.next().v;
      rest.push([op, this.parseSum()]);
    }
    return rest.length ? { k: "rel", first, rest } : first;
  }

  parseSum() {
    const first = this.parseTerm();
    const rest = [];
    while (this.isOp("+", "-", "pm", "mp")) {
      const op = this.next().v;
      rest.push([op, this.parseTerm()]);
    }
    return rest.length ? { k: "sum", first, rest } : first;
  }

  parseTerm() {
    let sign = null;
    if (this.isOp("-", "+")) sign = this.next().v;
    let node = this.parseSeq();
    while (this.isOp("*", "times", "cdot", "div", "/")) {
      const op = this.next().v;
      const rhs = this.parseSignedSeq();
      if (op === "/") node = { k: "div", n: node, d: rhs };
      else node = { k: "mul", op, l: node, r: rhs };
    }
    return sign === "-" ? { k: "neg", x: node } : sign === "+" ? { k: "pos", x: node } : node;
  }

  parseSignedSeq() {
    if (this.isOp("-")) { this.next(); return { k: "neg", x: this.parseSeq() }; }
    return this.parseSeq();
  }

  // Things written side by side multiply: 2x, 4ac, pi r
  parseSeq() {
    const items = [];
    while (this.startsPrimary(this.peek())) items.push(this.parsePostfix());
    if (!items.length) throw this.unexpected();
    return items.length === 1 ? items[0] : { k: "seq", items };
  }

  parsePostfix() {
    let node = this.parsePrimary();
    for (;;) {
      if (this.isOp("_")) { this.next(); node = { k: "sub", b: node, s: this.parseScript(false) }; }
      else if (this.isOp("^")) { this.next(); node = { k: "pow", b: node, e: this.parseScript(true) }; }
      else if (this.peek()?.t === "!") { this.next(); node = { k: "fact", x: node }; }
      else if (this.peek()?.t === "deg") { this.next(); node = { k: "deg", x: node }; }
      else break;
    }
    return node;
  }

  // The thing after ^ or _ : a number, letter, bracketed group, or a signed one of those
  parseScript(allowChain) {
    let sign = "";
    if (this.isOp("-")) { this.next(); sign = "-"; } else if (this.isOp("+")) { this.next(); }
    const t = this.peek();
    if (!this.startsPrimary(t)) throw this.unexpected();
    let node = this.parsePrimary();
    if (allowChain && this.isOp("^")) { this.next(); node = { k: "pow", b: node, e: this.parseScript(true) }; } // x^2^3 = x^(2^3)
    return sign ? { k: "neg", x: node } : node;
  }

  parseArgs() {
    this.expect("(");
    if (++this.depth > MAX_DEPTH) throw new NaturalError("That is nested too deeply.");
    const list = [this.parseRelation()];
    while (this.peek()?.t === ",") { this.next(); list.push(this.parseRelation()); }
    this.expect(")");
    this.depth--;
    return list;
  }

  parsePrimary() {
    const t = this.next();
    if (!t) throw new NaturalError("The formula ends too early. Keep typing.");
    switch (t.t) {
      case "num": return { k: "num", v: t.v };
      case "var": return { k: "raw", v: t.v };
      case "sym": return { k: "raw", v: t.v };
      case "(": {
        this.p--;
        const list = this.parseArgs();
        return list.length === 1 ? { k: "paren", x: list[0] } : { k: "paren", list };
      }
      case "fn": return this.parseFunction(t.v);
      case "kw": return this.parseKeyword(t.v);
      default:
        this.p--;
        throw this.unexpected();
    }
  }

  parseFunction(name) {
    let pow = null;
    let sub = null;
    for (;;) {
      if (this.isOp("^")) { this.next(); pow = this.parseScript(false); } else if (this.isOp("_")) { this.next(); sub = this.parseScript(false); } else break;
    }
    let arg = null;
    const t = this.peek();
    if (t && t.t === "(") {
      const list = this.parseArgs();
      arg = list.length === 1 ? { k: "paren", x: list[0] } : { k: "paren", list };
    } else if (t && ["num", "var", "sym"].includes(t.t)) arg = this.parsePostfix();
    return { k: "func", name, pow, sub, arg };
  }

  parseKeyword(name) {
    const t = this.peek();
    if (name === "sqrt" || name === "cbrt") {
      let x;
      if (t && t.t === "(") x = unwrap({ k: "paren", x: this.parseArgs()[0] });
      else if (t && ["num", "var", "sym"].includes(t.t)) x = this.parsePrimary();
      else throw this.unexpected();
      return { k: "sqrt", x, idx: name === "cbrt" ? { k: "num", v: "3" } : null };
    }
    const list = this.parseArgs();
    const need = (n) => { if (list.length !== n) throw new NaturalError(`${name}(…) needs ${n === 1 ? "one value" : `${n} values separated by commas`}.`); };
    if (name === "abs") { need(1); return { k: "abs", x: list[0] }; }
    if (name === "root") { need(2); return { k: "sqrt", idx: list[0], x: list[1] }; }
    if (name === "binom" || name === "choose") { need(2); return { k: "binom", a: list[0], b: list[1] }; }
    need(2); // frac
    return { k: "div", n: list[0], d: list[1] };
  }
}

/* ------------------------------------------------------------------ printer ------------------------------------------------------------------ */

const unwrap = (n) => (n && n.k === "paren" && !n.list ? n.x : n);
const REL_TEX = { "=": "=", "<": "<", ">": ">", leq: "\\leq", geq: "\\geq", neq: "\\neq", approx: "\\approx", to: "\\to" };
const SUM_TEX = { "+": "+", "-": "-", pm: "\\pm", mp: "\\mp" };

function glue(parts) {
  let out = "";
  for (const part of parts) {
    if (!out) { out = part; continue; }
    if (/\d$/.test(out) && /^\d/.test(part)) out += ` \\cdot ${part}`; // 2 3 means 2 times 3, not 23
    else if (/\\[a-zA-Z]+$/.test(out) && /^[a-zA-Z]/.test(part)) out += ` ${part}`;
    else out += part;
  }
  return out;
}

function tex(n) {
  switch (n.k) {
    case "num": case "raw": return n.v;
    case "seq": return glue(n.items.map(tex));
    case "neg": return `-${tex(n.x)}`;
    case "pos": return `+${tex(n.x)}`;
    case "mul": {
      const l = tex(n.l);
      const r = tex(n.r);
      if (n.op === "times") return `${l} \\times ${r}`;
      if (n.op === "div") return `${l} \\div ${r}`;
      if (n.op === "cdot" || /^[\d.]/.test(r)) return `${l} \\cdot ${r}`;
      return glue([l, r]); // 4*a*c reads best as 4ac
    }
    case "div": return `\\frac{${tex(unwrap(n.n))}}{${tex(unwrap(n.d))}}`;
    case "sum": return `${tex(n.first)}${n.rest.map(([op, node]) => ` ${SUM_TEX[op]} ${tex(node)}`).join("")}`;
    case "rel": return `${tex(n.first)}${n.rest.map(([op, node]) => ` ${REL_TEX[op]} ${tex(node)}`).join("")}`;
    case "pow": return `${tex(n.b)}^{${tex(unwrap(n.e))}}`;
    case "sub": return `${tex(n.b)}_{${tex(unwrap(n.s))}}`;
    case "fact": return `${tex(n.x)}!`;
    case "deg": return `${tex(n.x)}^{\\circ}`;
    case "sqrt": return n.idx ? `\\sqrt[${tex(unwrap(n.idx))}]{${tex(unwrap(n.x))}}` : `\\sqrt{${tex(unwrap(n.x))}}`;
    case "abs": return `\\left|${tex(n.x)}\\right|`;
    case "binom": return `\\binom{${tex(unwrap(n.a))}}{${tex(unwrap(n.b))}}`;
    case "paren": {
      const inner = n.list ? n.list.map(tex).join(", ") : tex(n.x);
      return /\\(frac|binom|sqrt|sum|int|prod)/.test(inner) ? `\\left(${inner}\\right)` : `(${inner})`;
    }
    case "func": {
      let out = `\\${n.name}`;
      if (n.sub) out += `_{${tex(unwrap(n.sub))}}`;
      if (n.pow) out += `^{${tex(unwrap(n.pow))}}`;
      if (n.arg) out += n.arg.k === "paren" ? tex(n.arg) : ` ${tex(n.arg)}`;
      else out += " ";
      return out;
    }
    default: throw new NaturalError("That could not be turned into a formula.");
  }
}

/** Natural notation -> { latex, error }. Empty input gives { latex: "", error: "" }. */
export function naturalToLatex(input) {
  const src = String(input ?? "");
  if (!src.trim()) return { latex: "", error: "" };
  if (src.length > MAX_INPUT) return { latex: "", error: `Keep it under ${MAX_INPUT} characters.` };
  try {
    const ast = new Parser(tokenize(src)).parseAll();
    return { latex: tex(ast).replace(/\s+/g, " ").trim(), error: "" };
  } catch (error) {
    if (error instanceof NaturalError) return { latex: "", error: error.message };
    throw error;
  }
}

/** True when `latex` has a + - = or similar at its top level (so it needs brackets when dropped into a product). */
export function isCompound(latex) {
  let depth = 0;
  for (let i = 0; i < latex.length; i++) {
    const c = latex[i];
    if (c === "\\") {
      const m = /^\\([a-zA-Z]+)/.exec(latex.slice(i));
      if (m) {
        if (depth === 0 && ["pm", "mp", "leq", "geq", "neq", "approx", "to"].includes(m[1])) return true;
        i += m[0].length - 1;
      } else i++;
      continue;
    }
    if ("{([".includes(c)) depth++;
    else if ("})]".includes(c)) depth--;
    else if (depth === 0 && "+-=<>".includes(c)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ LaTeX -> natural ------------------------------------------------------------------ */

class Unsupported extends Error {}

const canon = (s) => s.replace(/\s+/g, "");
const LETTER_END = /[A-Za-z]$/;
const LETTER_START = /^[A-Za-z]/;
const SIMPLE = /^-?[A-Za-z0-9.]+$/;
const SIMPLE_FRAC = /^[A-Za-z0-9.]+(\^-?[A-Za-z0-9.]+|_[A-Za-z0-9.]+)*$/;
const SYMBOL_OUT = { pm: " ± ", mp: " ∓ ", times: " × ", cdot: " · ", div: " ÷ ", leq: " ≤ ", geq: " ≥ ", neq: " ≠ ", approx: " ≈ ", to: " -> " };

class FromLatex {
  constructor(src) { this.s = src; this.i = 0; }

  // Letters written side by side stay together (4ac) unless they would merge into a known word (x i must not become xi)
  join(a, b) {
    if (!(a && b && LETTER_END.test(a) && LETTER_START.test(b))) return a + b;
    const left = /[A-Za-z]+$/.exec(a)[0];
    const right = /^[A-Za-z]+/.exec(b)[0];
    const pieces = [...splitRun(left), ...splitRun(right)];
    const plain = pieces.every((piece) => piece.length === 1) && splitRun(left + right).join("|") === pieces.join("|");
    return plain ? a + b : `${a} ${b}`; // named things (pi, sin…) are kept apart for readability
  }

  arg() {
    this.skipSpace();
    if (this.s[this.i] !== "{") throw new Unsupported();
    this.i++;
    const inner = this.seq();
    if (this.s[this.i] !== "}") throw new Unsupported();
    this.i++;
    return inner;
  }

  skipSpace() { while (/\s/.test(this.s[this.i] || "")) this.i++; }

  seq() {
    let out = "";
    let operand = false; // is the last thing written a value (so a "-" now is a subtraction)?
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === "}") break;
      if (/\s/.test(c)) { this.i++; continue; }
      if (/\d/.test(c)) {
        const m = /^\d+(\.\d+)?/.exec(this.s.slice(this.i));
        out = this.join(out, m[0]); this.i += m[0].length; operand = true;
      } else if (/[A-Za-z]/.test(c)) {
        out = this.join(out, c); this.i++; operand = true;
      } else if (c === "+" || c === "=" || c === "<" || c === ">") {
        out += ` ${c} `; this.i++; operand = false;
      } else if (c === "-") {
        out += operand ? " - " : "-"; this.i++; operand = false;
      } else if (c === "(") {
        out += "("; this.i++; operand = false;
      } else if (c === ")") {
        out += ")"; this.i++; operand = true;
      } else if (c === ",") {
        out += ", "; this.i++; operand = false;
      } else if (c === "!") {
        out += "!"; this.i++; operand = true;
      } else if (c === "^" || c === "_") {
        this.i++;
        out += this.script(c); operand = true;
      } else if (c === "\\") {
        const piece = this.command();
        out = piece.raw ? out + piece.text : this.join(out, piece.text);
        operand = piece.operand;
      } else throw new Unsupported();
    }
    return out;
  }

  script(op) {
    this.skipSpace();
    if (this.s[this.i] === "{") {
      const close = this.s.indexOf("}", this.i);
      if (op === "^" && close > 0 && this.s.slice(this.i + 1, close).trim() === "\\circ") { this.i = close + 1; return "°"; }
      const inner = this.arg();
      return op + (SIMPLE.test(inner) ? inner : `(${inner})`);
    }
    const c = this.s[this.i];
    if (/[0-9A-Za-z]/.test(c || "")) { this.i++; return op + c; }
    if (c === "\\") {
      const m = /^\\([a-zA-Z]+)/.exec(this.s.slice(this.i));
      if (m && GREEK_NAME_TO_CHAR[m[1]]) { this.i += m[0].length; return op + m[1]; }
    }
    throw new Unsupported();
  }

  command() {
    const m = /^\\([a-zA-Z]+)/.exec(this.s.slice(this.i));
    if (!m) {
      const d = this.s[this.i + 1];
      if (d && ",;:! ".includes(d)) { this.i += 2; return { text: "", raw: true, operand: false }; }
      throw new Unsupported();
    }
    const name = m[1];
    this.i += m[0].length;
    const wrap = (v) => (SIMPLE_FRAC.test(v) ? v : `(${v})`);
    if (name === "frac") { const a = this.arg(); const b = this.arg(); return { text: `${wrap(a)}/${wrap(b)}`, raw: false, operand: true }; }
    if (name === "sqrt") {
      this.skipSpace();
      if (this.s[this.i] === "[") {
        const close = this.s.indexOf("]", this.i);
        if (close < 0) throw new Unsupported();
        const index = new FromLatex(this.s.slice(this.i + 1, close)).seq();
        this.i = close + 1;
        return { text: `root(${index}, ${this.arg()})`, raw: false, operand: true };
      }
      return { text: `sqrt(${this.arg()})`, raw: false, operand: true };
    }
    if (name === "binom") { const a = this.arg(); const b = this.arg(); return { text: `binom(${a}, ${b})`, raw: false, operand: true }; }
    if (name === "left" || name === "right") {
      const d = this.s[this.i];
      this.i++;
      if (d === "(" || d === ")") return { text: d, raw: true, operand: d === ")" };
      if (d === "|") return { text: name === "left" ? "abs(" : ")", raw: true, operand: name === "right" };
      throw new Unsupported();
    }
    if (GREEK_NAME_TO_CHAR[name]) return { text: name, raw: false, operand: true };
    if (name === "infty") return { text: "inf", raw: false, operand: true };
    if (FUNCTIONS.includes(name)) return { text: name, raw: false, operand: false };
    if (SYMBOL_OUT[name]) return { text: SYMBOL_OUT[name], raw: true, operand: false };
    throw new Unsupported();
  }
}

/** LaTeX -> natural notation, or null when the formula cannot be shown faithfully in that notation. */
export function latexToNatural(latex) {
  const src = String(latex ?? "");
  if (!src.trim()) return "";
  try {
    const reader = new FromLatex(src);
    const out = reader.seq().replace(/\s+/g, " ").trim();
    if (reader.i < src.length || !out) return null;
    const back = naturalToLatex(out);
    return back.error || canon(back.latex) !== canon(src) ? null : out; // only if it reads back as the very same formula
  } catch (error) {
    if (error instanceof Unsupported || error instanceof NaturalError) return null;
    throw error;
  }
}

export const NATURAL_EXAMPLES = ["x^2/3 + sqrt(x)", "(a + b)/2", "pi*r^2", "sin(x)^2 + cos(x)^2 = 1", "x_1 + x_2", "root(3, x)", "a <= b"];
