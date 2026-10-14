const FUNCTIONS = {
  abs: Math.abs,
  acosh: Math.acosh,
  acos: Math.acos,
  acot: (x) => Math.atan(1 / x),
  acoth: (x) => 0.5 * Math.log((x + 1) / (x - 1)),
  acsc: (x) => Math.asin(1 / x),
  asec: (x) => Math.acos(1 / x),
  acsch: (x) => Math.asinh(1 / x),
  asech: (x) => Math.acosh(1 / x),
  asin: Math.asin,
  asinh: Math.asinh,
  atan: Math.atan,
  atanh: Math.atanh,
  ceil: Math.ceil,
  cosh: Math.cosh,
  cos: Math.cos,
  cot: (x) => 1 / Math.tan(x),
  coth: (x) => 1 / Math.tanh(x),
  csc: (x) => 1 / Math.sin(x),
  csch: (x) => 1 / Math.sinh(x),
  exp: Math.exp,
  floor: Math.floor,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  sech: (x) => 1 / Math.cosh(x),
  sec: (x) => 1 / Math.cos(x),
  sin: Math.sin,
  sinh: Math.sinh,
  sqrt: Math.sqrt,
  tan: Math.tan,
  tanh: Math.tanh,
};

/* ------------------------------ slider parameters ------------------------------
 * Single letters from PARAM_LETTERS (a, b, c, k, m ...) are constants the presenter can change with a
 * slider. They never collide with the variables (x, y, z, t, u, v) or with e and pi. */
export const PARAM_LETTERS = "abcdhkmnpqrsw";
export const PARAM_DEFAULT = { value: 1, min: -10, max: 10 };
const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort((a, b) => b.length - a.length);

/** "ax" -> ["a", "x"], "asin" -> ["asin"], "2pix" is handled by the number tokenizer first. */
function splitLetters(word) {
  const parts = [];
  let i = 0;
  while (i < word.length) {
    const name = FUNCTION_NAMES.find((candidate) => word.startsWith(candidate, i));
    if (name) {
      parts.push(name);
      i += name.length;
    } else if (word.startsWith("pi", i)) {
      parts.push("pi");
      i += 2;
    } else {
      parts.push(word[i]);
      i += 1;
    }
  }
  return parts;
}

/** Slider letters used by the given equation texts, e.g. ["a", "b"] for "a*x^2 + b". */
export function scanParamNames(...sources) {
  const found = new Set();
  for (const source of sources) {
    const words = String(source ?? "").toLowerCase().match(/log2|[a-z]+/g) || [];
    for (const word of words) {
      for (const part of splitLetters(word)) if (part.length === 1 && PARAM_LETTERS.includes(part)) found.add(part);
    }
  }
  return [...found].sort();
}

/** The equation texts of a graph that may contain slider letters, by graph mode. */
export function graphEquationTexts(graph) {
  if (graph.mode === "parametric") return [graph.xExpression, graph.yExpression];
  if (graph.mode === "curve3d" || graph.mode === "parametricSurface3d") return [graph.xExpression, graph.yExpression, graph.zExpression];
  return [graph.expression];
}

export const graphParamNames = (graph) => scanParamNames(...graphEquationTexts(graph));

/** Slider settings for one letter, filling in defaults for anything not stored yet. */
export function paramSpec(graph, name) {
  const stored = graph.params?.[name];
  const finite = (value, fallback) => (Number.isFinite(value) ? value : fallback);
  return {
    value: finite(stored?.value, PARAM_DEFAULT.value),
    min: finite(stored?.min, PARAM_DEFAULT.min),
    max: finite(stored?.max, PARAM_DEFAULT.max),
  };
}

/** { a: 2, b: -1 } - the numbers the parser substitutes for slider letters. */
export function paramConstants(graph) {
  const constants = {};
  for (const [name, spec] of Object.entries(graph?.params || {})) {
    if (PARAM_LETTERS.includes(name) && Number.isFinite(spec?.value)) constants[name] = spec.value;
  }
  return constants;
}

/** Stable string of the slider values, for render caches. */
export const paramKey = (graph) => JSON.stringify(paramConstants(graph));

export function compileExpression(source, variables = ["x"], constants = {}) {
  const expression = source.trim().replace(/^y\s*=\s*/i, "").replace(/\*\*/g, "^");
  const rawTokens = expression.match(/\d*\.?\d+(?:e[+-]?\d+)?|log2|[a-z]+|[()+\-*/^]/gi) || [];
  const compact = expression.replace(/\s+/g, "");
  if (!compact || rawTokens.join("").toLowerCase() !== compact.toLowerCase()) {
    throw new Error("Enter a valid equation using x, numbers, and supported operators.");
  }
  const isParam = (token) => typeof token === "string" && token.length === 1 && PARAM_LETTERS.includes(token) && !variables.includes(token);
  // Letters stuck together are separate factors: "ax" is a*x and "2sin(x)" is 2*sin(x)
  const tokens = rawTokens.flatMap((token) => {
    if (!/^[a-z]/i.test(token)) return [token];
    const word = token.toLowerCase();
    const parts = splitLetters(word);
    if (!parts.every((part) => Object.hasOwn(FUNCTIONS, part) || part === "pi" || part === "e" || variables.includes(part) || isParam(part))) {
      throw new Error(`"${word}" is not recognised. Use ${variables.join(", ")}, slider letters like a, b, c, numbers or supported functions.`);
    }
    return parts;
  });

  let index = 0;
  const peek = () => tokens[index]?.toLowerCase();
  const take = () => tokens[index++]?.toLowerCase();
  const startsValue = (token) => token === "(" || variables.includes(token) || isParam(token) || token === "pi" || token === "e"
    || /^\d/.test(token || "") || Boolean(token && Object.hasOwn(FUNCTIONS, token));

  const parsePrimary = () => {
    const token = take();
    if (token === "(") {
      const value = parseAdd();
      if (take() !== ")") throw new Error("Check the parentheses in your equation.");
      return value;
    }
    if (variables.includes(token)) return (...values) => values[variables.indexOf(token)];
    if (isParam(token)) {
      const value = Number.isFinite(constants[token]) ? constants[token] : PARAM_DEFAULT.value;
      return () => value;
    }
    if (token === "pi") return () => Math.PI;
    if (token === "e") return () => Math.E;
    if (/^\d/.test(token || "")) {
      const value = Number(token);
      return () => value;
    }
    if (token && Object.hasOwn(FUNCTIONS, token)) {
      if (take() !== "(") throw new Error(`${token} must be followed by parentheses.`);
      const arg = parseAdd();
      if (take() !== ")") throw new Error("Check the parentheses in your equation.");
      return (...values) => FUNCTIONS[token](arg(...values));
    }
    if (!token) throw new Error("The equation looks unfinished.");
    throw new Error(`"${token}" is not recognised. Use ${variables.join(", ")}, slider letters like a, b, c, numbers or supported functions.`);
  };

  const parsePower = () => {
    const left = parsePrimary();
    if (peek() === "^") {
      take();
      const right = parseUnary();
      return (...values) => left(...values) ** right(...values);
    }
    return left;
  };

  const parseUnary = () => {
    if (peek() === "+") {
      take();
      return parseUnary();
    }
    if (peek() === "-") {
      take();
      const value = parseUnary();
      return (...values) => -value(...values);
    }
    return parsePower();
  };

  const parseMultiply = () => {
    let left = parseUnary();
    while (peek() === "*" || peek() === "/" || startsValue(peek())) {
      const operator = startsValue(peek()) ? "*" : take();
      const right = parseUnary();
      const previous = left;
      left = operator === "*"
        ? (...values) => previous(...values) * right(...values)
        : (...values) => previous(...values) / right(...values);
    }
    return left;
  };

  const parseAdd = () => {
    let left = parseMultiply();
    while (peek() === "+" || peek() === "-") {
      const operator = take();
      const right = parseMultiply();
      const previous = left;
      left = operator === "+"
        ? (...values) => previous(...values) + right(...values)
        : (...values) => previous(...values) - right(...values);
    }
    return left;
  };

  const result = parseAdd();
  if (index !== tokens.length) throw new Error("Check the equation syntax.");
  return result;
}

export function sampleGraph(fn, { xMin, xMax, yMin, yMax, width, height }) {
  const xSpan = xMax - xMin;
  const ySpan = yMax - yMin;
  const toPoint = (x) => {
    const y = fn(x);
    if (!Number.isFinite(y) || Math.abs(y) > Math.max(Math.abs(yMin), Math.abs(yMax), 1) * 100) return null;
    const point = { x: ((x - xMin) / xSpan) * width, y: ((yMax - y) / ySpan) * height };
    return point.y < -height * 2 || point.y > height * 3 ? null : point;
  };
  const baseIntervals = Math.min(1000, Math.max(24, Math.ceil(width / 8)));
  const maxDepth = 10;
  const tolerance = 0.7;
  const leaves = [];

  const subdivide = (x1, p1, x2, p2, depth) => {
    const xm = (x1 + x2) / 2;
    const pm = toPoint(xm);
    const validCount = Number(Boolean(p1)) + Number(Boolean(pm)) + Number(Boolean(p2));
    const curvature = p1 && pm && p2
      ? Math.abs(pm.y - (p1.y + p2.y) / 2)
      : Infinity;

    if (depth < maxDepth && validCount > 0 && (validCount < 3 || curvature > tolerance)) {
      subdivide(x1, p1, xm, pm, depth + 1);
      subdivide(xm, pm, x2, p2, depth + 1);
      return;
    }

    if (!p1 || !p2 || !pm || curvature > height * 0.65) {
      leaves.push(null);
      return;
    }
    leaves.push([p1, p2]);
  };

  for (let i = 0; i < baseIntervals; i++) {
    const x1 = xMin + xSpan * i / baseIntervals;
    const x2 = xMin + xSpan * (i + 1) / baseIntervals;
    subdivide(x1, toPoint(x1), x2, toPoint(x2), 0);
  }

  const segments = [];
  let current = [];
  for (const leaf of leaves) {
    if (!leaf) {
      if (current.length > 1) segments.push(current);
      current = [];
      continue;
    }
    const [start, end] = leaf;
    const last = current[current.length - 1];
    if (last && Math.abs(last.x - start.x) < 1e-7 && Math.abs(last.y - start.y) < 1e-7) current.push(end);
    else {
      if (current.length > 1) segments.push(current);
      current = [start, end];
    }
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

export function fitGraphYRange(expression, xMin, xMax, constants = {}) {
  const fn = compileExpression(expression, ["x"], constants);
  const values = [];
  for (let i = 0; i <= 400; i++) {
    const y = fn(xMin + (xMax - xMin) * i / 400);
    if (Number.isFinite(y) && Math.abs(y) < 1e9) values.push(y);
  }
  if (values.length < 2) throw new Error("This equation has no finite values in the selected x range.");
  values.sort((a, b) => a - b);
  const low = values[Math.floor((values.length - 1) * 0.05)];
  const high = values[Math.ceil((values.length - 1) * 0.95)];
  const span = high - low;
  const padding = span > 0 ? span * 0.12 : Math.max(Math.abs(low) * 0.12, 1);
  return { yMin: low - padding, yMax: high + padding };
}

export function compileImplicitEquation(source, constants = {}) {
  const parts = source.split("=");
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
    throw new Error("Enter an equation with one equals sign, such as x^2 + y^2 = 25.");
  }
  const left = compileExpression(parts[0], ["x", "y"], constants);
  const right = compileExpression(parts[1], ["x", "y"], constants);
  return (x, y) => left(x, y) - right(x, y);
}

export function compileInequality(source, constants = {}) {
  const match = source.match(/(<=|>=|<|>)/);
  if (!match || source.slice(match.index + match[0].length).match(/(<=|>=|<|>)/)) {
    throw new Error("Enter one inequality per line, such as y > 2x + 1.");
  }
  const leftSource = source.slice(0, match.index).trim();
  const rightSource = source.slice(match.index + match[0].length).trim();
  if (!leftSource || !rightSource) throw new Error("Both sides of the inequality need an expression.");
  const left = compileExpression(leftSource, ["x", "y"], constants);
  const right = compileExpression(rightSource, ["x", "y"], constants);
  return {
    strict: match[0] === "<" || match[0] === ">",
    test: (x, y) => {
      const a = left(x, y), b = right(x, y);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
      if (match[0] === "<" || match[0] === "<=") return a < b || (match[0] === "<=" && a === b);
      return a > b || (match[0] === ">=" && a === b);
    },
    residual: (x, y) => left(x, y) - right(x, y),
  };
}

export function compileInequalitySystem(source, constants = {}) {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > 8) throw new Error("Enter between one and eight inequalities, one per line.");
  if (lines.some((line) => line.length > 120)) throw new Error("Keep each inequality under 120 characters.");
  return lines.map((line) => compileInequality(line, constants));
}

export function sampleInequalityRegion(constraints, { xMin, xMax, yMin, yMax, width, height }) {
  const pixelSize = 4;
  const cols = Math.max(1, Math.min(512, Math.ceil(width / pixelSize)));
  const rows = Math.max(1, Math.min(512, Math.ceil(height / pixelSize)));
  const dx = (xMax - xMin) / cols;
  const dy = (yMax - yMin) / rows;
  const pixels = new Uint8ClampedArray(cols * rows * 4);
  for (let row = 0; row < rows; row++) {
    const y = yMax - (row + 0.5) * dy;
    for (let col = 0; col < cols; col++) {
      const x = xMin + (col + 0.5) * dx;
      if (!constraints.every((constraint) => constraint.test(x, y))) continue;
      const offset = (row * cols + col) * 4;
      pixels[offset] = 37;
      pixels[offset + 1] = 64;
      pixels[offset + 2] = 217;
      pixels[offset + 3] = 38;
    }
  }
  return { cols, rows, pixels };
}

export function graphGeometryPixels(elements, { xMin, xMax, yMin, yMax, width, height }) {
  const toPixel = (x, y) => ({
    x: ((x - xMin) / (xMax - xMin)) * width,
    y: ((yMax - y) / (yMax - yMin)) * height,
  });
  return elements.map((element) => {
    if (element.kind === "point") return { ...element, point: toPixel(element.x, element.y) };
    if (element.kind === "polygon") {
      return { ...element, points: element.vertices.map(([x, y]) => toPixel(x, y)) };
    }
    if (element.kind === "angle") {
      const a = toPixel(element.ax, element.ay);
      const vertex = toPixel(element.vx, element.vy);
      const c = toPixel(element.cx, element.cy);
      const startAngle = Math.atan2(a.y - vertex.y, a.x - vertex.x);
      const endAngle = Math.atan2(c.y - vertex.y, c.x - vertex.x);
      let delta = (endAngle - startAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      return {
        ...element, a, vertex, c, startAngle, endAngle: startAngle + delta,
        angleRadians: Math.acos(Math.max(-1, Math.min(1,
          ((a.x - vertex.x) * (c.x - vertex.x) + (a.y - vertex.y) * (c.y - vertex.y))
          / (Math.hypot(a.x - vertex.x, a.y - vertex.y) * Math.hypot(c.x - vertex.x, c.y - vertex.y))
        ))),
      };
    }
    if (element.kind === "vector") {
      return { ...element, start: toPixel(element.x, element.y), end: toPixel(element.x + element.dx, element.y + element.dy), arrow: true };
    }
    const start = toPixel(element.x1, element.y1);
    let end = toPixel(element.x2, element.y2);
    if (element.kind === "ray") {
      const dx = end.x - start.x, dy = end.y - start.y;
      const candidates = [];
      if (dx > 0) candidates.push((width - start.x) / dx);
      if (dx < 0) candidates.push(-start.x / dx);
      if (dy > 0) candidates.push((height - start.y) / dy);
      if (dy < 0) candidates.push(-start.y / dy);
      const t = Math.min(...candidates.filter((value) => value >= 0));
      if (Number.isFinite(t)) end = { x: start.x + dx * t, y: start.y + dy * t };
    }
    const length = Math.hypot(element.x2 - element.x1, element.y2 - element.y1);
    return { ...element, start, end, arrow: element.kind === "ray", length };
  });
}

export function sampleParametric(fnX, fnY, options) {
  const { tMin, tMax, xMin, xMax, yMin, yMax, width, height } = options;
  const toPoint = (t) => {
    const x = fnX(t), y = fnY(t);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const px = ((x - xMin) / (xMax - xMin)) * width;
    const py = ((yMax - y) / (yMax - yMin)) * height;
    if (px < -width * 4 || px > width * 5 || py < -height * 4 || py > height * 5) return null;
    return { x: px, y: py };
  };
  const leaves = [];
  const baseIntervals = Math.min(800, Math.max(32, Math.ceil(width / 8)));
  const subdivide = (t1, p1, t2, p2, depth) => {
    const tm = (t1 + t2) / 2;
    const pm = toPoint(tm);
    const deviation = p1 && pm && p2
      ? Math.hypot(pm.x - (p1.x + p2.x) / 2, pm.y - (p1.y + p2.y) / 2)
      : Infinity;
    if (depth < 10 && (Boolean(p1) + Boolean(pm) + Boolean(p2) > 0)
      && (!p1 || !pm || !p2 || deviation > 0.7)) {
      subdivide(t1, p1, tm, pm, depth + 1);
      subdivide(tm, pm, t2, p2, depth + 1);
      return;
    }
    if (!p1 || !pm || !p2 || deviation > Math.max(width, height) * 0.5) leaves.push(null);
    else leaves.push([p1, p2]);
  };
  for (let i = 0; i < baseIntervals; i++) {
    const t1 = tMin + (tMax - tMin) * i / baseIntervals;
    const t2 = tMin + (tMax - tMin) * (i + 1) / baseIntervals;
    subdivide(t1, toPoint(t1), t2, toPoint(t2), 0);
  }

  const segments = [];
  let current = [];
  for (const leaf of leaves) {
    if (!leaf) {
      if (current.length > 1) segments.push(current);
      current = [];
    } else {
      const [a, b] = leaf;
      const last = current.at(-1);
      if (last && Math.hypot(last.x - a.x, last.y - a.y) < 1e-7) current.push(b);
      else {
        if (current.length > 1) segments.push(current);
        current = [a, b];
      }
    }
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

export function sampleImplicit(fn, { xMin, xMax, yMin, yMax, width, height }) {
  const step = 8;
  const cols = Math.max(2, Math.ceil(width / step));
  const rows = Math.max(2, Math.ceil(height / step));
  const dx = (xMax - xMin) / cols;
  const dy = (yMax - yMin) / rows;
  const valueAt = (x, y) => {
    const value = fn(x, y);
    return Number.isFinite(value) && Math.abs(value) < 1e100 ? value : NaN;
  };
  const segments = [];
  const interp = (a, b, va, vb) => {
    const t = va === vb ? 0.5 : Math.max(0, Math.min(1, va / (va - vb)));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };

  for (let row = 0; row < rows; row++) {
    const y0 = yMax - dy * row, y1 = y0 - dy;
    for (let col = 0; col < cols; col++) {
      const x0 = xMin + dx * col, x1 = x0 + dx;
      const corners = [
        { x: x0, y: y0, p: { x: col * width / cols, y: row * height / rows } },
        { x: x1, y: y0, p: { x: (col + 1) * width / cols, y: row * height / rows } },
        { x: x1, y: y1, p: { x: (col + 1) * width / cols, y: (row + 1) * height / rows } },
        { x: x0, y: y1, p: { x: col * width / cols, y: (row + 1) * height / rows } },
      ];
      const values = corners.map((point) => valueAt(point.x, point.y));
      if (values.some((value) => !Number.isFinite(value))) continue;
      const edges = [[0, 1], [1, 2], [2, 3], [3, 0]];
      const crossings = [];
      for (let edge = 0; edge < edges.length; edge++) {
        const [a, b] = edges[edge];
        if ((values[a] < 0) !== (values[b] < 0)) {
          crossings.push({ edge, point: interp(corners[a].p, corners[b].p, values[a], values[b]) });
        }
      }
      if (crossings.length === 2) segments.push([crossings[0].point, crossings[1].point]);
      else if (crossings.length === 4) {
        const center = valueAt((x0 + x1) / 2, (y0 + y1) / 2);
        const pairings = (center < 0) === (values[0] < 0)
          ? [[0, 1], [2, 3]]
          : [[0, 3], [1, 2]];
        for (const [a, b] of pairings) segments.push([crossings[a].point, crossings[b].point]);
      }
    }
  }
  return segments;
}

export function graphSegments(graph, width, height) {
  const options = {
    xMin: graph.xMin, xMax: graph.xMax, yMin: graph.yMin, yMax: graph.yMax, width, height,
  };
  const constants = paramConstants(graph);
  if (graph.mode === "implicit") {
    return sampleImplicit(compileImplicitEquation(graph.expression, constants), options);
  }
  if (graph.mode === "inequality") {
    return compileInequalitySystem(graph.expression, constants).flatMap((constraint) => sampleImplicit(constraint.residual, options));
  }
  if (graph.mode === "parametric") {
    return sampleParametric(
      compileExpression(graph.xExpression, ["t"], constants),
      compileExpression(graph.yExpression, ["t"], constants),
      { ...options, tMin: graph.tMin, tMax: graph.tMax }
    );
  }
  if (graph.mode === "polar") {
    const radius = compileExpression(graph.expression, ["t"], constants);
    return sampleParametric(
      (t) => radius(t) * Math.cos(t),
      (t) => radius(t) * Math.sin(t),
      { ...options, tMin: graph.tMin, tMax: graph.tMax }
    );
  }
  return sampleGraph(compileExpression(graph.expression, ["x"], constants), options);
}

export function fitGraphRanges(graph) {
  if (graph.mode === "inequality") {
    return { xMin: graph.xMin, xMax: graph.xMax, yMin: graph.yMin, yMax: graph.yMax };
  }
  if (!graph.mode || graph.mode === "explicit") {
    return { ...fitGraphYRange(graph.expression, graph.xMin, graph.xMax, paramConstants(graph)), xMin: graph.xMin, xMax: graph.xMax };
  }
  const segments = graphSegments(graph, 360, 240);
  const points = segments.flat();
  if (!points.length) throw new Error("No finite curve was found in the current ranges.");
  const xs = points.map((point) => graph.xMin + point.x / 360 * (graph.xMax - graph.xMin));
  const ys = points.map((point) => graph.yMax - point.y / 240 * (graph.yMax - graph.yMin));
  const padded = (values) => {
    const min = Math.min(...values), max = Math.max(...values);
    const pad = (max - min) * 0.08 || Math.max(Math.abs(min) * 0.08, 1);
    return [min - pad, max + pad];
  };
  const [xMin, xMax] = padded(xs);
  const [yMin, yMax] = padded(ys);
  return { xMin, xMax, yMin, yMax };
}
