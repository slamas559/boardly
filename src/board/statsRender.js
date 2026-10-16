// Canvas drawing for statistics charts (histogram, box plot, scatter plot) and the numbers beside them.
import {
  describeCorrelation, formatStat, histogramBins, linearRegression, niceScale, numbersOf, pairsOf, regressionEquation, statsTable, summarize,
} from "./stats.js";

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const INK = "#17181C";
const MUTED = "#6b6d75";
const GRID = "#e7e4dc";
const MEAN = "#D9480F";
const MEDIAN = "#0E8A6B";
const GROUP_COLORS = ["#2540D9", "#D9480F", "#0E8A6B", "#B8328F"];

export const STATS_DEFAULT_COLOR = "#2540D9";
const safeColor = (color) => (typeof color === "string" && /^#[0-9a-f]{3,8}$/i.test(color) ? color : STATS_DEFAULT_COLOR);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const tick = (value) => String(Number(value.toPrecision(6))).replace("-", "−");

function roundedRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function halo(ctx, text, x, y) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#fff";
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.fillText(text, x, y);
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/* ------------------------------ statistics panel ------------------------------ */

function measureTable(ctx, table) {
  ctx.font = `500 13px ${FONT}`;
  const labelWidth = Math.max(...table.rows.map((row) => ctx.measureText(row[0]).width));
  const columns = table.rows[0].length - 1;
  const cellWidths = Array.from({ length: columns }, (_, c) => Math.max(
    ...table.rows.map((row) => ctx.measureText(row[c + 1]).width),
    ...(table.headers[c] ? [ctx.measureText(table.headers[c]).width * 0.92] : []),
  ));
  return { labelWidth, cellWidths, width: labelWidth + cellWidths.reduce((sum, w) => sum + w + 16, 0) + 28 };
}

function drawTable(ctx, table, metrics, x, y, height, colors) {
  const rowHeight = 21;
  const headerHeight = table.headers.length ? 24 : 0;
  const rows = Math.max(1, Math.min(table.rows.length, Math.floor((height - 20 - headerHeight) / rowHeight)));
  const boxHeight = rows * rowHeight + headerHeight + 16;
  ctx.save();
  ctx.beginPath();
  roundedRect(ctx, x, y, metrics.width, boxHeight, 10);
  ctx.fillStyle = "#faf9f5";
  ctx.fill();
  ctx.strokeStyle = "#dedbd2";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textBaseline = "middle";
  let cursor = y + 8;
  if (headerHeight) {
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = "right";
    let cx = x + 14 + metrics.labelWidth;
    metrics.cellWidths.forEach((width, c) => {
      cx += width + 16;
      ctx.fillStyle = colors[c % colors.length];
      ctx.fillText(table.headers[c], cx - 8, cursor + headerHeight / 2, width + 12);
    });
    cursor += headerHeight;
  }
  for (let i = 0; i < rows; i++) {
    const row = table.rows[i];
    const cy = cursor + i * rowHeight + rowHeight / 2;
    ctx.font = `500 13px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillStyle = MUTED;
    ctx.fillText(row[0], x + 14, cy);
    ctx.textAlign = "right";
    ctx.fillStyle = INK;
    ctx.font = `600 13px ${FONT}`;
    let cx = x + 14 + metrics.labelWidth;
    metrics.cellWidths.forEach((width, c) => {
      cx += width + 16;
      ctx.fillText(row[c + 1], cx - 8, cy);
    });
  }
  ctx.restore();
}

/* ------------------------------ axes ------------------------------ */

function axisTitles(ctx, o, plot, xTitle, yTitle) {
  ctx.fillStyle = MUTED;
  ctx.font = `600 13px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  if (xTitle) ctx.fillText(xTitle, (plot.left + plot.right) / 2, o.y + o.h - 10, plot.right - plot.left);
  if (yTitle) {
    ctx.save();
    ctx.translate(o.x + 18, (plot.top + plot.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "top";
    ctx.fillText(yTitle, 0, -4, plot.bottom - plot.top);
    ctx.restore();
  }
}

function frame(ctx, plot) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plot.left, plot.top);
  ctx.lineTo(plot.left, plot.bottom);
  ctx.lineTo(plot.right, plot.bottom);
  ctx.stroke();
}

function yAxis(ctx, plot, scale, toY, label = tick) {
  ctx.font = `500 12px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const value of scale.ticks) {
    const y = toY(value);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    line(ctx, plot.left, y, plot.right, y);
    ctx.fillStyle = MUTED;
    ctx.fillText(label(value), plot.left - 8, y);
  }
}

function xAxis(ctx, plot, scale, toX, label = tick, grid = true) {
  ctx.font = `500 12px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  // Skip labels that would touch
  const spacing = scale.ticks.length > 1 ? Math.abs(toX(scale.ticks[1]) - toX(scale.ticks[0])) : 100;
  const every = Math.max(1, Math.ceil(46 / Math.max(spacing, 1)));
  scale.ticks.forEach((value, index) => {
    const x = toX(value);
    if (grid) {
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      line(ctx, x, plot.top, x, plot.bottom);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    line(ctx, x, plot.bottom, x, plot.bottom + 5);
    if (index % every === 0) {
      ctx.fillStyle = MUTED;
      ctx.fillText(label(value), x, plot.bottom + 8);
    }
  });
}

/* ------------------------------ the three charts ------------------------------ */

function drawHistogram(ctx, o, plot, color) {
  const column = o.columns?.[0];
  const data = numbersOf(column);
  const { bins } = histogramBins(data, o.binWidth);
  const peak = Math.max(...bins.map((bin) => bin.count));
  const yScale = niceScale(0, Math.max(1, peak), 6);
  const lo = bins[0].from;
  const hi = bins[bins.length - 1].to;
  const toX = (value) => plot.left + ((value - lo) / (hi - lo)) * (plot.right - plot.left);
  const toY = (value) => plot.bottom - ((value - yScale.min) / (yScale.max - yScale.min)) * (plot.bottom - plot.top);
  yAxis(ctx, plot, { ...yScale, ticks: yScale.ticks.filter((t) => Number.isInteger(t)) }, toY);
  const edges = [...bins.map((bin) => bin.from), hi];
  xAxis(ctx, plot, { ticks: edges }, toX, tick, false);

  const gap = Math.min(2, (plot.right - plot.left) / bins.length / 12);
  ctx.font = `600 12px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (const bin of bins) {
    if (!bin.count) continue;
    const x1 = toX(bin.from) + gap;
    const x2 = toX(bin.to) - gap;
    const y = toY(bin.count);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.78;
    ctx.fillRect(x1, y, x2 - x1, plot.bottom - y);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x1, y, x2 - x1, plot.bottom - y);
    if (o.showCounts !== false && x2 - x1 >= 18) {
      ctx.fillStyle = INK;
      ctx.fillText(String(bin.count), (x1 + x2) / 2, y - 3);
    }
  }
  frame(ctx, plot);

  const stat = summarize(data, { sd: o.sd });
  const marker = (value, tone, dash, name) => {
    if (!Number.isFinite(value) || value < lo || value > hi) return;
    const x = toX(value);
    ctx.save();
    ctx.strokeStyle = tone;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(dash);
    line(ctx, x, plot.top, x, plot.bottom);
    ctx.restore();
    ctx.fillStyle = tone;
    ctx.font = `700 12px ${FONT}`;
    ctx.textBaseline = "top";
    ctx.textAlign = value > (lo + hi) / 2 ? "right" : "left";
    halo(ctx, `${name} ${formatStat(value)}`, x + (value > (lo + hi) / 2 ? -6 : 6), plot.top + (name === "median" ? 20 : 4));
  };
  if (o.showMean) marker(stat.mean, MEAN, [7, 5], "mean");
  if (o.showMedian) marker(stat.median, MEDIAN, [2, 4], "median");
  axisTitles(ctx, o, plot, column?.name || "Values", "Frequency");
}

function drawBoxPlot(ctx, o, plot, color) {
  const columns = (o.columns || []).filter((column) => numbersOf(column).length);
  const stats = columns.map((column) => summarize(numbersOf(column), { sd: o.sd }));
  const lows = stats.map((s) => Math.min(s.min, s.whiskerLow));
  const highs = stats.map((s) => Math.max(s.max, s.whiskerHigh));
  const low = Math.min(...lows);
  const high = Math.max(...highs);
  const margin = (high - low || 1) * 0.06; // room so an outlier never sits on the axis or the group name
  const xScale = niceScale(low - margin, high + margin, 10);
  const toX = (value) => plot.left + ((value - xScale.min) / (xScale.max - xScale.min)) * (plot.right - plot.left);
  xAxis(ctx, plot, xScale, toX);
  const band = (plot.bottom - plot.top) / columns.length;
  const palette = [color, ...GROUP_COLORS.filter((c) => c.toLowerCase() !== color.toLowerCase())];

  columns.forEach((column, index) => {
    const s = stats[index];
    const tone = palette[index % palette.length];
    const cy = plot.top + band * (index + 0.5);
    const half = clamp(band * 0.26, 10, 34);
    ctx.strokeStyle = tone;
    ctx.fillStyle = tone;
    ctx.lineWidth = 2.5;
    // Whiskers
    line(ctx, toX(s.whiskerLow), cy, toX(s.q1), cy);
    line(ctx, toX(s.q3), cy, toX(s.whiskerHigh), cy);
    line(ctx, toX(s.whiskerLow), cy - half * 0.55, toX(s.whiskerLow), cy + half * 0.55);
    line(ctx, toX(s.whiskerHigh), cy - half * 0.55, toX(s.whiskerHigh), cy + half * 0.55);
    // Box, then the median
    ctx.globalAlpha = 0.2;
    ctx.fillRect(toX(s.q1), cy - half, Math.max(1, toX(s.q3) - toX(s.q1)), half * 2);
    ctx.globalAlpha = 1;
    ctx.strokeRect(toX(s.q1), cy - half, Math.max(1, toX(s.q3) - toX(s.q1)), half * 2);
    ctx.lineWidth = 4;
    line(ctx, toX(s.median), cy - half, toX(s.median), cy + half);
    // Outliers
    ctx.lineWidth = 2;
    for (const value of s.outliers) {
      ctx.beginPath();
      ctx.arc(toX(value), cy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.stroke();
    }
    // Mean marker
    if (o.showMean) {
      const mx = toX(s.mean);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      line(ctx, mx - 5, cy - 5, mx + 5, cy + 5);
      line(ctx, mx - 5, cy + 5, mx + 5, cy - 5);
    }
    // The five numbers around a single box: median above it, the rest in two staggered rows below
    if (columns.length === 1 && o.showValues !== false && band > 120) {
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.font = `700 12px ${FONT}`;
      ctx.fillStyle = tone;
      halo(ctx, `median ${formatStat(s.median)}`, toX(s.median), cy - half - 8);
      ctx.textBaseline = "top";
      [[s.whiskerLow, "min", 0], [s.q1, "Q1", 1], [s.q3, "Q3", 1], [s.whiskerHigh, "max", 0]].forEach(([value, name, row]) => {
        ctx.font = `600 12px ${FONT}`;
        ctx.fillStyle = tone;
        halo(ctx, formatStat(value), toX(value), cy + half + 8 + row * 30);
        ctx.font = `500 11px ${FONT}`;
        ctx.fillStyle = MUTED;
        halo(ctx, name, toX(value), cy + half + 22 + row * 30);
      });
    }
    // Group name
    ctx.fillStyle = tone;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(column.name, plot.left - 10, cy, plot.left - o.x - 14);
  });
  frame(ctx, plot);
  axisTitles(ctx, o, plot, columns.length === 1 ? columns[0].name : "", "");
}

function drawScatter(ctx, o, plot, color) {
  const pairs = pairsOf(o.columns);
  const xs = pairs.map((p) => p[0]);
  const ys = pairs.map((p) => p[1]);
  const padded = (values) => {
    const low = Math.min(...values);
    const high = Math.max(...values);
    const margin = (high - low || 1) * 0.04; // keeps points off the axes
    return [low - margin, high + margin];
  };
  const xScale = niceScale(...padded(xs), 7);
  const yScale = niceScale(...padded(ys), 6);
  const toX = (value) => plot.left + ((value - xScale.min) / (xScale.max - xScale.min)) * (plot.right - plot.left);
  const toY = (value) => plot.bottom - ((value - yScale.min) / (yScale.max - yScale.min)) * (plot.bottom - plot.top);
  yAxis(ctx, plot, yScale, toY);
  xAxis(ctx, plot, xScale, toX);
  frame(ctx, plot);

  const fit = linearRegression(pairs);
  if (o.showLine !== false && fit) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
    ctx.clip();
    ctx.strokeStyle = MEAN;
    ctx.lineWidth = 3;
    line(ctx, toX(xScale.min), toY(fit.slope * xScale.min + fit.intercept), toX(xScale.max), toY(fit.slope * xScale.max + fit.intercept));
    ctx.restore();
  }
  for (const [x, y] of pairs) {
    ctx.beginPath();
    ctx.arc(toX(x), toY(y), 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (o.showLine !== false && fit && o.showEquation !== false) {
    const names = { x: o.columns[0]?.name === "x" ? "x" : "x", y: "y" };
    const equation = regressionEquation(fit, names);
    ctx.fillStyle = MEAN;
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    halo(ctx, equation, plot.left + 12, plot.top + 8);
    ctx.fillStyle = MUTED;
    ctx.font = `600 12px ${FONT}`;
    halo(ctx, `r = ${formatStat(fit.r)}  ·  R² = ${formatStat(fit.r2)}  ·  ${describeCorrelation(fit.r)}`, plot.left + 12, plot.top + 28);
  }
  axisTitles(ctx, o, plot, o.columns[0]?.name || "x", o.columns[1]?.name || "y");
}

/** Whether the chart has what it needs to draw, or what is missing. */
export function chartProblem(o) {
  const columns = o.columns || [];
  if (o.chart === "scatter") {
    if (columns.length < 2) return "A scatter plot needs two columns: x and y";
    if (pairsOf(columns).length < 2) return "Add at least two rows with both an x and a y";
    return "";
  }
  if (o.chart === "box") return columns.some((column) => numbersOf(column).length) ? "" : "Add some numbers to draw the box plot";
  return numbersOf(columns[0]).length ? "" : "Add some numbers to draw the histogram";
}

/** Draw one statistics chart (an object with type "stats"). */
export function drawStats(ctx, o) {
  ctx.save();
  ctx.beginPath();
  roundedRect(ctx, o.x, o.y, o.w, o.h, 12);
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#dedbd2";
  ctx.stroke();
  ctx.clip();

  const color = safeColor(o.color);
  const problem = chartProblem(o);
  if (problem) {
    ctx.fillStyle = MUTED;
    ctx.font = `500 15px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(problem, o.x + o.w / 2, o.y + o.h / 2, o.w - 40);
    ctx.restore();
    return;
  }

  const table = o.showStats !== false ? statsTable(o) : null;
  const metrics = table ? measureTable(ctx, table) : null;
  const panel = table && o.w - metrics.width >= 380;
  const headerHeight = o.title ? 34 : 0;
  const plot = {
    left: o.x + (o.chart === "box" ? Math.min(150, o.w * 0.2) : 66),
    right: o.x + o.w - 24 - (panel ? metrics.width + 14 : 0),
    top: o.y + 20 + headerHeight,
    bottom: o.y + o.h - 56,
  };
  if (o.title) {
    ctx.fillStyle = INK;
    ctx.font = `700 18px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(o.title, o.x + 20, o.y + 16, o.w - 40);
  }
  if (plot.right - plot.left > 60 && plot.bottom - plot.top > 50) {
    if (o.chart === "scatter") drawScatter(ctx, o, plot, color);
    else if (o.chart === "box") drawBoxPlot(ctx, o, plot, color);
    else drawHistogram(ctx, o, plot, color);
  }
  if (panel) {
    const colors = o.chart === "box" ? [color, ...GROUP_COLORS.filter((c) => c.toLowerCase() !== color.toLowerCase())] : [INK];
    drawTable(ctx, table, metrics, o.x + o.w - metrics.width - 14, plot.top, plot.bottom - plot.top + 10, colors);
  }
  ctx.restore();
}
