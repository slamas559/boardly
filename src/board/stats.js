// Statistics for the board's data charts: reading pasted data, summary statistics, histogram classes and
// linear regression. Pure functions, so every number a student sees can be tested.

export const STATS_LIMITS = { columns: 4, rows: 300, nameLength: 40 };
export const CHARTS = [
  { id: "histogram", label: "Histogram", hint: "Spread of one set of values" },
  { id: "box", label: "Box plot", hint: "Compare groups at a glance" },
  { id: "scatter", label: "Scatter plot", hint: "Two values with a line of best fit" },
];

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

/* ------------------------------ reading pasted data ------------------------------ */

/** "1,234" or "12 %" style cells to a number, or null when the cell is not a number. */
function cellNumber(cell) {
  const text = String(cell ?? "").trim().replace(/−/g, "-").replace(/%$/, "").trim();
  if (!text || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= 1e9 ? value : null;
}

function splitLine(line, tabbed) {
  if (tabbed) return line.split("\t").map((cell) => cell.trim());
  return line.trim().split(/\s*[,;]\s*|\s+/).filter((cell, index, all) => cell !== "" || index < all.length - 1);
}

/**
 * Turn pasted text (from a spreadsheet, or typed) into columns of numbers.
 *  - one line of numbers, or one number per line  -> a single column
 *  - several numbers per line                      -> one column per position
 *  - a first line with words                       -> column names
 * Cells that are not numbers are left out (their row keeps its place as null so pairs stay matched).
 */
export function parseDataset(text) {
  const notes = [];
  const lines = String(text ?? "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (!lines.length) return { ok: false, columns: [], notes: ["Paste or type some numbers to begin."], hasHeader: false, rows: 0 };
  const tabbed = lines.some((line) => line.includes("\t"));
  let table = lines.map((line) => splitLine(line, tabbed));

  // One line of many numbers is a single column read across
  if (table.length === 1 && table[0].length > 1 && table[0].every((cell) => cellNumber(cell) !== null)) {
    table = table[0].map((cell) => [cell]);
  }

  const width = Math.min(Math.max(...table.map((row) => row.length)), STATS_LIMITS.columns);
  if (Math.max(...table.map((row) => row.length)) > STATS_LIMITS.columns) notes.push(`Only the first ${STATS_LIMITS.columns} columns are used.`);

  // A header is a first row with words in it, followed by rows that do have numbers
  const first = table[0];
  const hasHeader = table.length > 1 && first.some((cell) => cell !== "" && cellNumber(cell) === null)
    && table.slice(1).some((row) => row.some((cell) => cellNumber(cell) !== null));
  const dataRows = hasHeader ? table.slice(1) : table;
  const names = Array.from({ length: width }, (_, index) => {
    const raw = hasHeader ? first[index] : "";
    return (raw || (width === 1 ? "Values" : width === 2 ? ["x", "y"][index] : `Group ${index + 1}`)).slice(0, STATS_LIMITS.nameLength);
  });

  let skipped = 0;
  let rows = dataRows;
  if (rows.length > STATS_LIMITS.rows) {
    notes.push(`Only the first ${STATS_LIMITS.rows} rows are used.`);
    rows = rows.slice(0, STATS_LIMITS.rows);
  }
  const columns = names.map((name, index) => ({
    name,
    values: rows.map((row) => {
      const value = cellNumber(row[index]);
      if (value === null && String(row[index] ?? "").trim() !== "") skipped++;
      return value;
    }),
  }));
  // Trailing blanks (shorter columns) are dropped, so groups may have different sizes
  for (const column of columns) while (column.values.length && column.values.at(-1) === null) column.values.pop();
  if (skipped) notes.push(`${skipped === 1 ? "1 cell was not a number" : `${skipped} cells were not numbers`} and left out.`);
  const count = columns.reduce((sum, column) => sum + column.values.filter(isNumber).length, 0);
  if (!count) return { ok: false, columns: [], notes: ["No numbers found yet."], hasHeader, rows: 0 };
  return { ok: true, columns, notes, hasHeader, rows: Math.max(...columns.map((column) => column.values.length)) };
}

/** The text shown in the data box for the stored columns (tab separated, so it pastes back into a spreadsheet). */
export function datasetToText(columns, { header = true } = {}) {
  if (!columns?.length) return "";
  const rows = Math.max(...columns.map((column) => column.values.length));
  const lines = [];
  if (header && (columns.length > 1 || columns[0].name !== "Values")) lines.push(columns.map((column) => column.name).join("\t"));
  for (let i = 0; i < rows; i++) lines.push(columns.map((column) => (isNumber(column.values[i]) ? String(column.values[i]) : "")).join("\t"));
  return lines.join("\n");
}

/** The numbers of a column (blanks removed). */
export const numbersOf = (column) => (column?.values || []).filter(isNumber);

/** Pairs (x, y) from the first two columns, keeping only rows where both are numbers. */
export function pairsOf(columns) {
  if (!columns || columns.length < 2) return [];
  const [a, b] = columns;
  const rows = Math.min(a.values.length, b.values.length);
  const pairs = [];
  for (let i = 0; i < rows; i++) if (isNumber(a.values[i]) && isNumber(b.values[i])) pairs.push([a.values[i], b.values[i]]);
  return pairs;
}

/* ------------------------------ summary statistics ------------------------------ */

const median = (sorted) => {
  const n = sorted.length;
  if (!n) return NaN;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
};

/**
 * Everything about one set of numbers. Quartiles are the medians of the lower and upper halves (the middle
 * value is left out of both when n is odd). Outliers are beyond 1.5 x IQR from the quartiles.
 */
export function summarize(values, { sd: sdKind = "sample" } = {}) {
  const data = values.filter(isNumber);
  const n = data.length;
  if (!n) return { n: 0 };
  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((total, value) => total + value, 0);
  const mean = sum / n;
  const squares = data.reduce((total, value) => total + (value - mean) ** 2, 0);
  const half = Math.floor(n / 2);
  const lower = sorted.slice(0, half);
  const upper = sorted.slice(n % 2 ? half + 1 : half);
  const q1 = lower.length ? median(lower) : sorted[0];
  const q3 = upper.length ? median(upper) : sorted[n - 1];
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  const inside = sorted.filter((value) => value >= lowFence && value <= highFence);
  const counts = new Map();
  for (const value of data) counts.set(value, (counts.get(value) || 0) + 1);
  const top = Math.max(...counts.values());
  const sdSample = n > 1 ? Math.sqrt(squares / (n - 1)) : NaN;
  const sdPopulation = Math.sqrt(squares / n);
  return {
    n, sum, mean,
    median: median(sorted),
    mode: top > 1 ? [...counts].filter(([, count]) => count === top).map(([value]) => value).sort((a, b) => a - b) : [],
    min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0],
    q1, q3, iqr,
    sdSample, sdPopulation, sd: sdKind === "population" ? sdPopulation : sdSample,
    variance: sdKind === "population" ? squares / n : n > 1 ? squares / (n - 1) : NaN,
    whiskerLow: inside.length ? inside[0] : sorted[0],
    whiskerHigh: inside.length ? inside[inside.length - 1] : sorted[n - 1],
    outliers: sorted.filter((value) => value < lowFence || value > highFence),
  };
}

/* ------------------------------ histogram ------------------------------ */

/** The nearest "nice" number at or above `value`: 1, 2, 2.5, 5 or 10 times a power of ten. */
export function niceNumber(value) {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const factor of [1, 2, 2.5, 5, 10]) if (factor * power >= value - 1e-12) return factor * power;
  return 10 * power;
}

/**
 * Classes for a histogram. Each class includes its lower boundary and excludes its upper one, so a value of
 * exactly 50 belongs to the 50-60 class. Leave `width` out to have a sensible class width chosen.
 */
export function histogramBins(values, width) {
  const data = values.filter(isNumber);
  if (!data.length) return { bins: [], width: 1, auto: true };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const auto = !(width > 0);
  let w = width;
  if (auto) {
    const target = clamp(Math.ceil(Math.log2(data.length)) + 1, 4, 12);
    w = niceNumber((max - min || 1) / target);
  }
  // Keep the number of classes sensible however small a width was asked for
  const maxBins = 60;
  if ((max - min) / w > maxBins) w = niceNumber((max - min) / maxBins);
  const start = Math.floor(min / w + 1e-9) * w;
  const count = Math.max(1, Math.ceil((max - start) / w - 1e-9) + (max === start + Math.ceil((max - start) / w - 1e-9) * w ? 1 : 0));
  const bins = Array.from({ length: count }, (_, i) => ({ from: round(start + i * w), to: round(start + (i + 1) * w), count: 0 }));
  for (const value of data) {
    let index = Math.floor((value - start) / w + 1e-9);
    index = clamp(index, 0, bins.length - 1);
    bins[index].count++;
  }
  return { bins, width: round(w), auto };
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value) => Number(value.toPrecision(12));

/* ------------------------------ regression ------------------------------ */

/** Least-squares line y = slope * x + intercept, with Pearson's r and R². Null when it cannot be found. */
export function linearRegression(pairs) {
  const n = pairs.length;
  if (n < 2) return null;
  const meanX = pairs.reduce((sum, [x]) => sum + x, 0) / n;
  const meanY = pairs.reduce((sum, [, y]) => sum + y, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of pairs) {
    sxx += (x - meanX) ** 2;
    syy += (y - meanY) ** 2;
    sxy += (x - meanX) * (y - meanY);
  }
  if (sxx === 0) return null; // all x the same: no line to fit
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  return { n, slope, intercept, r, r2: r * r, meanX, meanY, flat: syy === 0 };
}

/* ------------------------------ formatting ------------------------------ */

/** A number for labels: 4 significant figures, no trailing zeros, a real minus sign. */
export function formatStat(value) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0 || Math.abs(value) < 1e-12) return "0";
  const text = Math.abs(value) >= 1e7 || Math.abs(value) < 1e-3 ? Number(value.toPrecision(4)).toExponential() : String(Number(value.toPrecision(4)));
  return text.replace("-", "−");
}

/** "y = 2.5x + 3" or "y = −0.4x − 12.1" */
export function regressionEquation(fit, { x = "x", y = "y" } = {}) {
  if (!fit) return "";
  const slope = formatStat(fit.slope);
  const intercept = formatStat(Math.abs(fit.intercept));
  const term = slope === "1" ? x : slope === "−1" ? `−${x}` : `${slope}${x}`;
  if (fit.intercept === 0 || intercept === "0") return `${y} = ${term}`;
  return `${y} = ${term} ${fit.intercept < 0 ? "−" : "+"} ${intercept}`;
}

/** Strength words for a correlation coefficient. */
export function describeCorrelation(r) {
  const size = Math.abs(r);
  const strength = size >= 0.8 ? "strong" : size >= 0.5 ? "moderate" : size >= 0.25 ? "weak" : "very weak or none";
  return size < 0.25 ? strength : `${strength} ${r > 0 ? "positive" : "negative"}`;
}

/**
 * The statistics table drawn beside a chart: { headers, rows } where each row is [label, ...values].
 * Priority order, so a small card can show just the first few rows.
 */
export function statsTable(o) {
  const columns = o.columns || [];
  const kind = o.sd === "population" ? "population" : "sample";
  if (o.chart === "scatter") {
    const pairs = pairsOf(columns);
    const fit = linearRegression(pairs);
    const xs = summarize(pairs.map((p) => p[0]), { sd: kind });
    const ys = summarize(pairs.map((p) => p[1]), { sd: kind });
    return {
      headers: [],
      rows: [
        ["n", String(pairs.length)],
        ["r", fit ? formatStat(fit.r) : "—"],
        ["R²", fit ? formatStat(fit.r2) : "—"],
        ["Slope", fit ? formatStat(fit.slope) : "—"],
        ["Intercept", fit ? formatStat(fit.intercept) : "—"],
        ["Mean x", xs.n ? formatStat(xs.mean) : "—"],
        ["Mean y", ys.n ? formatStat(ys.mean) : "—"],
      ],
    };
  }
  const used = o.chart === "histogram" ? columns.slice(0, 1) : columns;
  const stats = used.map((column) => summarize(numbersOf(column), { sd: kind }));
  const value = (stat, key) => {
    if (!stat.n) return "—";
    if (key === "mode") return stat.mode.length ? stat.mode.map(formatStat).join(", ") : "none";
    return formatStat(stat[key]);
  };
  const sdLabel = kind === "population" ? "SD (pop.)" : "SD";
  const order = o.chart === "box"
    ? [["n", "n"], ["Median", "median"], ["Q1", "q1"], ["Q3", "q3"], ["IQR", "iqr"], ["Mean", "mean"], [sdLabel, "sd"], ["Min", "min"], ["Max", "max"]]
    : [["n", "n"], ["Mean", "mean"], ["Median", "median"], [sdLabel, "sd"], ["Min", "min"], ["Max", "max"], ["Q1", "q1"], ["Q3", "q3"], ["Mode", "mode"], ["IQR", "iqr"]];
  return {
    headers: used.length > 1 ? used.map((column) => column.name) : [],
    rows: order.map(([label, key]) => [label, ...stats.map((stat) => (key === "n" ? String(stat.n) : value(stat, key)))]),
  };
}

/* ------------------------------ axis scales ------------------------------ */

/** A tidy axis: { min, max, step, ticks } that covers [min, max] with about `target` ticks. */
export function niceScale(min, max, target = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, step: 0.2, ticks: [0, 0.2, 0.4, 0.6, 0.8, 1] };
  if (min === max) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    min -= pad;
    max += pad;
  }
  const rough = (max - min) / Math.max(1, target - 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough - 1e-12) || 10 * power;
  const lo = Math.floor(min / step + 1e-9) * step;
  const hi = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let value = lo; value <= hi + step * 1e-6; value += step) ticks.push(round(value));
  return { min: round(lo), max: round(hi), step: round(step), ticks };
}

/* ------------------------------ ready-made examples ------------------------------ */

export const EXAMPLES = [
  {
    id: "scores", label: "Test scores", chart: "histogram",
    columns: [{ name: "Score", values: [45, 52, 55, 58, 60, 61, 63, 64, 65, 66, 67, 68, 69, 70, 70, 71, 72, 73, 74, 75, 76, 78, 79, 81, 82, 84, 85, 88, 91, 95] }],
  },
  {
    id: "classes", label: "Two classes", chart: "box",
    columns: [
      { name: "Class A", values: [52, 58, 61, 64, 66, 68, 70, 71, 73, 75, 78, 80, 84, 88] },
      { name: "Class B", values: [40, 55, 62, 67, 69, 72, 74, 76, 77, 79, 81, 83, 86, 90, 98] },
    ],
  },
  {
    id: "study", label: "Study hours vs score", chart: "scatter",
    columns: [
      { name: "Hours studied", values: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8] },
      { name: "Test score", values: [48, 52, 55, 54, 62, 65, 63, 70, 72, 74, 73, 80, 84, 88] },
    ],
  },
];

const CHART_SIZES = { histogram: [760, 440], box: [760, 340], scatter: [760, 460] };

/** A new chart of the given type with example data, centred on (cx, cy). */
export function newStats(chart, { id, page, cx, cy }) {
  const example = EXAMPLES.find((item) => item.chart === chart) || EXAMPLES[0];
  const [w, h] = CHART_SIZES[example.chart];
  const base = {
    id, type: "stats", page, chart: example.chart, w, h,
    x: Number((cx - w / 2).toFixed(2)), y: Number((cy - h / 2).toFixed(2)),
    columns: example.columns.map((column) => ({ ...column, values: [...column.values] })),
    color: "#2540D9", showStats: true, sd: "sample",
  };
  if (example.chart === "histogram") return { ...base, showMean: true, showMedian: false, showCounts: true };
  if (example.chart === "box") return { ...base, showMean: true, showValues: true };
  return { ...base, showLine: true, showEquation: true };
}
