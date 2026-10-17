// Splits a LaTeX formula into the pieces a person actually wants to change - its numbers, letters and
// Greek symbols - and says where each one sits ("Numerator", "Power", "Inside root", "Row 2, column 1").
// Editing a part rewrites just that stretch of the LaTeX, so nobody has to read the code.
// Pure functions (no React, no browser).
import { GREEK_CHAR_TO_NAME, GREEK_NAME_TO_CHAR, isCompound, naturalToLatex } from "./naturalMath.js";

const FRACTIONS = new Set(["frac", "dfrac", "tfrac", "cfrac"]);
const LOWER_LIMIT_OPS = new Set(["sum", "prod", "int", "oint", "bigcup", "bigcap"]);
const LIMIT_OPS = new Set(["lim", "limsup", "liminf"]);
const OPAQUE = new Set(["text", "textrm", "textbf", "textit", "mbox"]); // words, not maths: left alone
const MAX_PARTS = 120;

const isDigit = (c) => c >= "0" && c <= "9";
const isLetter = (c) => /[A-Za-z]/.test(c);

/** Index of the "}" that closes the "{" at `open`, or -1. Escaped braces (\{ \}) do not count. */
function matchBrace(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") { i++; continue; }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
  }
  return -1;
}

/** Where the matching \end{name} for a \begin{name} that starts after `from` is, or -1. */
function matchEnd(s, name, from) {
  const begin = `\\begin{${name}}`;
  const end = `\\end{${name}}`;
  let depth = 1;
  let i = from;
  for (;;) {
    const nextBegin = s.indexOf(begin, i);
    const nextEnd = s.indexOf(end, i);
    if (nextEnd < 0) return -1;
    if (nextBegin >= 0 && nextBegin < nextEnd) { depth++; i = nextBegin + begin.length; } else if (--depth === 0) return nextEnd;
    else i = nextEnd + end.length;
  }
}

function cellLabel(env, row, col) {
  if (env === "cases") return col === 1 ? `Row ${row}, value` : `Row ${row}, condition`;
  if (/^(align|aligned|gather|gathered|split|eqnarray)\*?$/.test(env)) return `Line ${row}`;
  return `Row ${row}, column ${col}`;
}

/**
 * Every editable part of `latex`, in reading order:
 * { index, start, end, text, kind: "number" | "variable" | "symbol", ctx: string[], label, group, bare, solo }
 *  - bare: a script operand written without braces (x^2) - a longer value must be wrapped in braces
 *  - solo: the only thing in its group, so any expression can go there without brackets
 */
export function parseParts(latex) {
  const s = String(latex ?? "");
  const parts = [];
  let groups = 0;

  const addLeaf = (leaf, ctx, bucket) => {
    if (parts.length >= MAX_PARTS) return;
    const full = { ...leaf, ctx, label: ctx.length ? ctx.join(" · ") : "Formula", bare: Boolean(leaf.bare), solo: false };
    parts.push(full);
    bucket.push(full);
  };

  // Reads a single token written without braces after ^ or _ ; returns the index after it
  const bareOperand = (i, end, ctx, bucket, group) => {
    const c = s[i];
    if (c === undefined || i >= end) return i;
    if (isDigit(c)) { addLeaf({ start: i, end: i + 1, text: c, kind: "number", group, bare: true }, ctx, bucket); return i + 1; }
    if (isLetter(c)) { addLeaf({ start: i, end: i + 1, text: c, kind: "variable", group, bare: true }, ctx, bucket); return i + 1; }
    if (c === "\\") {
      const m = /^\\([a-zA-Z]+)/.exec(s.slice(i, end));
      if (m) {
        if (GREEK_NAME_TO_CHAR[m[1]]) addLeaf({ start: i, end: i + m[0].length, text: m[0], kind: "symbol", group, bare: true }, ctx, bucket);
        return i + m[0].length;
      }
      return i + 2;
    }
    return i + 1;
  };

  function walk(start, end, ctx, env) {
    const group = groups++;
    const mine = [];
    let i = start;
    let base = null; // the command a ^ or _ belongs to (\sum, \log …)
    let row = 1;
    let col = 1;
    const here = () => (env ? [...ctx, cellLabel(env, row, col)] : ctx);

    // A braced argument: walk what is inside it
    const braced = (at, label, scoped = ctx) => {
      if (s[at] !== "{") return at;
      const close = matchBrace(s, at);
      if (close < 0 || close >= end) return at;
      walk(at + 1, close, label ? [...scoped, label] : scoped, null);
      return close + 1;
    };
    const skipSpace = (at) => { while (at < end && /\s/.test(s[at])) at++; return at; };

    while (i < end) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }

      if (c === "\\") {
        if (s[i + 1] === "\\") { row++; col = 1; i += 2; base = null; continue; }
        const m = /^\\([a-zA-Z]+)/.exec(s.slice(i, end));
        if (!m) { i += 2; continue; } // \, \; \{ …
        const name = m[1];
        i += m[0].length;

        if (FRACTIONS.has(name) || name === "binom") {
          const labels = name === "binom" ? ["Top", "Bottom"] : ["Numerator", "Denominator"];
          let at = skipSpace(i);
          const afterFirst = braced(at, labels[0], here());
          if (afterFirst !== at) { at = skipSpace(afterFirst); i = braced(at, labels[1], here()); if (i === at) i = afterFirst; }
          base = null;
          continue;
        }
        if (name === "sqrt") {
          let at = skipSpace(i);
          if (s[at] === "[") {
            const close = s.indexOf("]", at);
            if (close > 0 && close < end) { walk(at + 1, close, [...here(), "Root index"], null); at = skipSpace(close + 1); }
          }
          i = braced(at, "Inside root", here());
          base = null;
          continue;
        }
        if (name === "begin") {
          const open = skipSpace(i);
          const close = s[open] === "{" ? matchBrace(s, open) : -1;
          if (close > 0 && close < end) {
            const envName = s.slice(open + 1, close);
            const inner = close + 1;
            const stop = matchEnd(s, envName, inner);
            if (stop > 0 && stop <= end) {
              walk(inner, stop, here(), envName);
              i = stop + `\\end{${envName}}`.length;
              base = null;
              continue;
            }
          }
          i = close > 0 ? close + 1 : i;
          continue;
        }
        if (name === "left" || name === "right") {
          if (s[i] === "\\") { const d = /^\\([a-zA-Z]+)/.exec(s.slice(i, end)); i += d ? d[0].length : 2; } else i++;
          continue;
        }
        if (OPAQUE.has(name)) {
          const at = skipSpace(i);
          const close = s[at] === "{" ? matchBrace(s, at) : -1;
          i = close > 0 && close < end ? close + 1 : i;
          base = null;
          continue;
        }
        if (GREEK_NAME_TO_CHAR[name]) {
          addLeaf({ start: i - m[0].length, end: i, text: m[0], kind: "symbol", group }, here(), mine);
          base = null;
          continue;
        }
        base = name; // \sum, \log, \sin … (and the scripts that follow them)
        continue;
      }

      if (c === "^" || c === "_") {
        const sup = c === "^";
        let label;
        if (sup) label = LOWER_LIMIT_OPS.has(base) || LIMIT_OPS.has(base) ? "Upper limit" : "Power";
        else label = LOWER_LIMIT_OPS.has(base) ? "Lower limit" : LIMIT_OPS.has(base) ? "Limit" : base === "log" ? "Base" : "Subscript";
        i = skipSpace(i + 1);
        const scoped = [...here(), label];
        if (s[i] === "{") {
          const close = matchBrace(s, i);
          if (close > 0 && close < end) { walk(i + 1, close, scoped, null); i = close + 1; } else i++;
        } else {
          const bucket = [];
          i = bareOperand(i, end, scoped, bucket, group);
          for (const leaf of bucket) mine.push(leaf);
        }
        continue; // `base` stays, so \sum_{a}^{b} labels both limits
      }

      if (c === "{") {
        const close = matchBrace(s, i);
        if (close > 0 && close < end) { walk(i + 1, close, here(), null); i = close + 1; } else i++;
        base = null;
        continue;
      }
      if (c === "&" && env) { col++; i++; base = null; continue; }

      if (isDigit(c) || (c === "." && isDigit(s[i + 1] || ""))) {
        const m = /^(\d+(\.\d+)?|\.\d+)/.exec(s.slice(i, end));
        addLeaf({ start: i, end: i + m[0].length, text: m[0], kind: "number", group }, here(), mine);
        i += m[0].length;
        base = null;
        continue;
      }
      if (isLetter(c)) {
        addLeaf({ start: i, end: i + 1, text: c, kind: "variable", group }, here(), mine);
        i++;
        base = null;
        continue;
      }
      i++; // operators, brackets, commas …
      base = null;
    }

    // A leaf that is everything in its group can take a whole expression without brackets
    let first = start;
    let last = end;
    while (first < last && /\s/.test(s[first])) first++;
    while (last > first && /\s/.test(s[last - 1])) last--;
    if (!env && mine.length === 1 && mine[0].start === first && mine[0].end === last) mine[0].solo = true;
  }

  walk(0, s.length, [], null);
  for (const leaf of parts) if (leaf.bare) leaf.solo = true;
  return parts.map((leaf, index) => ({ ...leaf, index }));
}

/** What a part shows in its field: the number or letter, or the actual Greek letter. */
export function partDisplay(part) {
  if (part.kind !== "symbol") return part.text;
  const name = part.text.replace(/^\\/, "");
  return GREEK_NAME_TO_CHAR[name] || name;
}

export const PART_KIND_LABEL = { number: "number", variable: "letter", symbol: "symbol" };

/**
 * Put `input` (what the person typed into a part's field: 3, x, pi, x+1 …) where `part` is.
 * Returns { latex, start, end } - `start`/`end` mark the new piece - or { error }.
 */
export function replacePart(latex, part, input) {
  const raw = String(input ?? "").trim();
  if (!raw) return { error: "Type a value." };
  const converted = naturalToLatex(raw);
  if (converted.error || !converted.latex) return { error: converted.error || "Type a value." };
  let piece = converted.latex;
  if (part.bare && !/^([A-Za-z0-9]|\\[a-zA-Z]+)$/.test(piece.trim())) piece = `{${piece}}`; // x^2 -> x^{12}
  else if (!part.solo && isCompound(piece)) piece = `(${piece})`; // 4a with a -> x+1 must stay 4(x+1)
  const before = latex.slice(0, part.start);
  const after = latex.slice(part.end);
  if (/\\[a-zA-Z]+$/.test(before) && /^[A-Za-z]/.test(piece)) piece = ` ${piece}`; // \pi2 -> \pi x, never \pix
  if (/\\[a-zA-Z]+$/.test(piece) && /^[A-Za-z]/.test(after)) piece += " "; // 4ac with a -> pi gives 4\pi c, never 4\pic
  return {
    latex: before + piece + after,
    start: part.start,
    end: part.start + piece.length,
  };
}

/** The formula with the range [start, end) boxed, for the editor preview (never saved to the board). */
export function highlightRange(latex, range) {
  if (!range || !(range.start >= 0 && range.end > range.start && range.end <= latex.length)) return null;
  return `${latex.slice(0, range.start)}{\\boxed{${latex.slice(range.start, range.end)}}}${latex.slice(range.end)}`;
}

/**
 * A copy of `latex` for measuring only: every part is wrapped as {\class{bl<i>}{part}}, so the typesetter tags the exact
 * glyphs of part i. The braces keep the layout identical (a part is already an ordinary symbol).
 */
export function markParts(latex, parts) {
  let out = latex;
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    out = `${out.slice(0, part.start)}{\\class{bl${i}}{${out.slice(part.start, part.end)}}}${out.slice(part.end)}`;
  }
  return out;
}

/** Parts in runs that belong together, for display: [{ label, group, parts }] */
export function groupParts(parts) {
  const out = [];
  for (const part of parts) {
    const last = out[out.length - 1];
    if (last && last.group === part.group && last.label === part.label) last.parts.push(part);
    else out.push({ label: part.label, group: part.group, parts: [part] });
  }
  return out;
}

export { GREEK_CHAR_TO_NAME };
