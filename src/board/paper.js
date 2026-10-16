// Page paper: the pattern drawn behind everything on a whiteboard page (dots, graph paper, a number
// plane with labelled axes, isometric dots, lined, or blank). It is stored per page as a small
// "paper" object so it syncs to listeners, persists and can be undone like anything else, but it is
// never selectable or erasable and "clear page" leaves it alone.
import { BOARD_HOME } from "./constants.js";

export const PAPER_KINDS = [
  { id: "dots", label: "Dots", hint: "Soft dotted grid" },
  { id: "grid", label: "Graph paper", hint: "Squares with bolder lines every 5" },
  { id: "plane", label: "Number plane", hint: "x and y axes with numbers" },
  { id: "isometric", label: "Isometric", hint: "For drawing 3D shapes" },
  { id: "lined", label: "Lined", hint: "Ruled lines for writing" },
  { id: "blank", label: "Blank", hint: "Plain white" },
];
export const PAPER_SCALES = [
  { id: 0.5, label: "Small" },
  { id: 1, label: "Medium" },
  { id: 2, label: "Large" },
];
export const DEFAULT_PAPER = { kind: "dots", scale: 1 };
export const paperId = (page) => `paper-${page}`;

/** Where the number plane's axes cross: the centre of the area a board opens on. */
export const PLANE_ORIGIN = { x: BOARD_HOME.w / 2, y: BOARD_HOME.h / 2 };

const BASE = 40; // world units per square at "Medium"

/** 1, 2, 5, 10, 20, 50 ... the smallest nice step that is at least `min`. */
export function niceStep(min) {
  if (!(min > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(min));
  for (const factor of [1, 2, 5, 10]) if (factor * power >= min) return factor * power;
  return 10 * power;
}

const cleanNumber = (value) => String(Number(value.toFixed(6)));

function verticalLines(ctx, step, from, to, offset = 0) {
  ctx.beginPath();
  for (let x = Math.ceil((from - offset) / step) * step + offset; x <= to; x += step) {
    ctx.moveTo(x, -1e6);
    ctx.lineTo(x, 1e6);
  }
  ctx.stroke();
}
function horizontalLines(ctx, step, from, to, offset = 0) {
  ctx.beginPath();
  for (let y = Math.ceil((from - offset) / step) * step + offset; y <= to; y += step) {
    ctx.moveTo(-1e6, y);
    ctx.lineTo(1e6, y);
  }
  ctx.stroke();
}

function drawDots(ctx, view, rect, spacing) {
  if (spacing * view.k < 10) return; // too dense when zoomed out
  ctx.fillStyle = "#d6d3cb";
  const r = Math.max(0.9 / view.k, 1.1);
  for (let x = Math.ceil(rect.x0 / spacing) * spacing; x <= rect.x1; x += spacing) {
    for (let y = Math.ceil(rect.y0 / spacing) * spacing; y <= rect.y1; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGraphPaper(ctx, view, rect, spacing) {
  const minor = spacing / 2; // finer squares than the dots so it looks like real graph paper
  ctx.lineWidth = 1 / view.k;
  if (minor * view.k >= 7) {
    ctx.strokeStyle = "#ebe8e0";
    verticalLines(ctx, minor, rect.x0, rect.x1);
    horizontalLines(ctx, minor, rect.y0, rect.y1);
  }
  const major = minor * 5;
  if (major * view.k >= 12) {
    ctx.strokeStyle = "#d3cfc4";
    verticalLines(ctx, major, rect.x0, rect.x1);
    horizontalLines(ctx, major, rect.y0, rect.y1);
  }
}

function drawLined(ctx, view, rect, spacing) {
  if (spacing * view.k < 8) return;
  ctx.lineWidth = 1 / view.k;
  ctx.strokeStyle = "#dedad0";
  horizontalLines(ctx, spacing, rect.y0, rect.y1);
}

function drawIsometric(ctx, view, rect, spacing) {
  if (spacing * view.k < 12) return;
  const rowHeight = (spacing * Math.sqrt(3)) / 2;
  ctx.fillStyle = "#d0ccc1";
  const r = Math.max(0.9 / view.k, 1.1);
  for (let row = Math.ceil(rect.y0 / rowHeight); row * rowHeight <= rect.y1; row++) {
    const shift = row % 2 ? spacing / 2 : 0;
    for (let x = Math.ceil((rect.x0 - shift) / spacing) * spacing + shift; x <= rect.x1; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, row * rowHeight, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlane(ctx, view, rect, unit) {
  const { x: ox, y: oy } = PLANE_ORIGIN;
  const k = view.k;
  const stepUnits = niceStep(30 / (unit * k)); // a label about every 30px, never closer
  const step = stepUnits * unit;

  // Light grid, aligned to the axes
  if (step * k >= 12) {
    ctx.lineWidth = 1 / k;
    ctx.strokeStyle = "#ebe8e0";
    verticalLines(ctx, step, rect.x0, rect.x1, ox);
    horizontalLines(ctx, step, rect.y0, rect.y1, oy);
  }

  // Axes
  ctx.lineWidth = 2 / k;
  ctx.strokeStyle = "#33363d";
  ctx.beginPath();
  ctx.moveTo(rect.x0, oy);
  ctx.lineTo(rect.x1, oy);
  ctx.moveTo(ox, rect.y0);
  ctx.lineTo(ox, rect.y1);
  ctx.stroke();

  // Tick marks and numbers. When an axis has been panned off screen its numbers stick to the edge.
  const font = 12 / k;
  const edge = 6 / k;
  const axisY = Math.max(rect.y0 + edge, Math.min(rect.y1 - 22 / k, oy));
  const axisX = Math.max(rect.x0 + 30 / k, Math.min(rect.x1 - edge, ox));
  ctx.font = `${font}px system-ui, sans-serif`;
  ctx.lineJoin = "round";
  ctx.fillStyle = "#5e6068";
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3 / k;
  const label = (text, x, y, align, baseline) => {
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  };
  ctx.save();
  ctx.lineWidth = 1.5 / k;
  ctx.strokeStyle = "#33363d";
  ctx.beginPath();
  for (let i = Math.ceil((rect.x0 - ox) / step); ox + i * step <= rect.x1; i++) {
    if (i === 0) continue;
    ctx.moveTo(ox + i * step, oy - 4 / k);
    ctx.lineTo(ox + i * step, oy + 4 / k);
  }
  for (let j = Math.ceil((rect.y0 - oy) / step); oy + j * step <= rect.y1; j++) {
    if (j === 0) continue;
    ctx.moveTo(ox - 4 / k, oy + j * step);
    ctx.lineTo(ox + 4 / k, oy + j * step);
  }
  ctx.stroke();
  ctx.restore();
  for (let i = Math.ceil((rect.x0 - ox) / step); ox + i * step <= rect.x1; i++) {
    if (i === 0) continue;
    label(cleanNumber(i * stepUnits), ox + i * step, axisY + 7 / k, "center", "top");
  }
  for (let j = Math.ceil((rect.y0 - oy) / step); oy + j * step <= rect.y1; j++) {
    if (j === 0) continue;
    label(cleanNumber(-j * stepUnits), axisX - 8 / k, oy + j * step, "right", "middle");
  }
  if (ox >= rect.x0 && ox <= rect.x1 && oy >= rect.y0 && oy <= rect.y1) label("0", ox - 7 / k, oy + 6 / k, "right", "top");

  // Axis names at the visible ends
  ctx.font = `italic ${15 / k}px Georgia, serif`;
  ctx.fillStyle = "#33363d";
  label("x", rect.x1 - 12 / k, Math.max(rect.y0 + 14 / k, Math.min(rect.y1 - 26 / k, oy)) - 12 / k, "center", "bottom");
  label("y", Math.max(rect.x0 + 30 / k, Math.min(rect.x1 - 14 / k, ox)) + 12 / k, rect.y0 + 12 / k, "left", "top");
}

/** The grid a drawn point can snap to on this paper: { step, ox, oy }, or null when the paper has none. */
export function paperSnapGrid(paper) {
  const kind = paper?.kind || "dots";
  const spacing = BASE * (PAPER_SCALES.some((s) => s.id === paper?.scale) ? paper.scale : 1);
  if (kind === "grid") return { step: spacing / 2, ox: 0, oy: 0 };
  if (kind === "plane") return { step: spacing, ox: PLANE_ORIGIN.x, oy: PLANE_ORIGIN.y };
  if (kind === "dots") return { step: spacing, ox: 0, oy: 0 };
  return null;
}

/** Draw the paper for the visible part of the world. `view` is { x, y, k }; w, h are the screen size. */
export function drawPaper(ctx, view, w, h, kind = "dots", scale = 1) {
  if (kind === "blank") return;
  const rect = { x0: view.x, y0: view.y, x1: view.x + w / view.k, y1: view.y + h / view.k };
  const spacing = BASE * (PAPER_SCALES.some((s) => s.id === scale) ? scale : 1);
  ctx.save();
  switch (kind) {
    case "grid": drawGraphPaper(ctx, view, rect, spacing); break;
    case "plane": drawPlane(ctx, view, rect, spacing); break;
    case "isometric": drawIsometric(ctx, view, rect, spacing); break;
    case "lined": drawLined(ctx, view, rect, spacing); break;
    default: drawDots(ctx, view, rect, spacing);
  }
  ctx.restore();
}
