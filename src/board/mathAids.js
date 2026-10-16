// Math aids: a number line, a unit circle and fraction bars that a teacher drops on the board.
// This file holds the data, the maths and the layouts (pure functions, easy to test). The drawing is in
// aidRender.js and the editor in AidInspector.jsx.

export const AID_KINDS = [
  { id: "numberline", label: "Number line", hint: "Mark points and show jumps" },
  { id: "unitcircle", label: "Unit circle", hint: "Drag the angle to read sin, cos and tan" },
  { id: "fractions", label: "Fraction bars", hint: "Compare fractions and tap to shade" },
];

export const AID_LIMITS = { marks: 12, jumps: 8, bars: 4, parts: 24, ticks: 200 };

export const SPECIAL_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
export const SIN_COLOR = "#D9480F";
export const AID_DEFAULT_COLOR = "#2540D9";

const round = (value, places = 6) => Number(value.toFixed(places));
const finite = (value) => typeof value === "number" && Number.isFinite(value);

/** A new aid of the given kind, centred on (cx, cy). */
export function newAid(kind, { id, page, cx, cy }) {
  const base = { id, type: "aid", kind, page, color: AID_DEFAULT_COLOR };
  const sized = (w, h) => ({ ...base, w, h, x: round(cx - w / 2, 2), y: round(cy - h / 2, 2) });
  if (kind === "unitcircle") return { ...sized(620, 400), angle: 45, snap: true, radians: false, showTriangle: true, showValues: true };
  if (kind === "fractions") return { ...sized(560, 220), shape: "bar", bars: [{ parts: 4, shaded: 1 }] };
  return { ...sized(680, 170), min: -5, max: 5, step: 1, marks: [], jumps: [] };
}

/* ------------------------------ number line ------------------------------ */

/** "2, 5.5; -3" -> [2, 5.5, -3] (numbers only, no repeats, at most `limit`). */
export function parseNumberList(text, limit = AID_LIMITS.marks) {
  const numbers = [];
  for (const piece of String(text ?? "").split(/[\s,;]+/)) {
    if (!piece) continue;
    const value = Number(piece.replace("−", "-"));
    if (Number.isFinite(value) && Math.abs(value) <= 1e6 && !numbers.includes(value)) numbers.push(value);
  }
  return numbers.slice(0, limit);
}

/** "0>3, 3>-2" or "0 -> 3" -> [{from: 0, to: 3}, {from: 3, to: -2}] */
export function parseJumps(text, limit = AID_LIMITS.jumps) {
  const jumps = [];
  for (const piece of String(text ?? "").split(/[,;]+/)) {
    const match = piece.replace(/−/g, "-").match(/^\s*(-?\d*\.?\d+)\s*(?:>|->|→|to)\s*(-?\d*\.?\d+)\s*$/i);
    if (!match) continue;
    const from = Number(match[1]);
    const to = Number(match[2]);
    if (Math.abs(from) <= 1e6 && Math.abs(to) <= 1e6 && from !== to) jumps.push({ from, to });
  }
  return jumps.slice(0, limit);
}

export const listToText = (numbers) => numbers.map((n) => round(n)).join(", ");
export const jumpsToText = (jumps) => jumps.map((j) => `${round(j.from)} > ${round(j.to)}`).join(", ");

/** −5, 0, 2.5 as shown on the line (a real minus sign). */
export const tickLabel = (value) => String(round(value)).replace("-", "−");

/** Tick values and the x position of each, for a number line drawn between `left` and `right`. */
export function numberLineTicks(o, left, right) {
  const min = o.min;
  const max = o.max;
  const span = max - min;
  let step = o.step;
  if (!(step > 0) || span / step > AID_LIMITS.ticks) step = span / AID_LIMITS.ticks;
  const count = Math.round(span / step);
  const toX = (value) => left + ((value - min) / span) * (right - left);
  const pixelStep = ((right - left) * step) / span;
  const labelEvery = Math.max(1, Math.ceil(38 / pixelStep));
  const ticks = [];
  for (let i = 0; i <= count; i++) {
    const value = round(min + i * step);
    ticks.push({ value, x: toX(value), labelled: i % labelEvery === 0 || i === count });
  }
  return { ticks, toX, step };
}

/** Whether the numbers describe a drawable line. */
export const validNumberLine = (o) => finite(o.min) && finite(o.max) && o.min < o.max && finite(o.step) && o.step > 0 && (o.max - o.min) / o.step <= AID_LIMITS.ticks;

/* ------------------------------ unit circle ------------------------------ */

export const normalizeAngle = (degrees) => ((degrees % 360) + 360) % 360;

/** Pull an angle onto the nearest "special" angle (30, 45, 60 ...) when it is within `tolerance` degrees. */
export function snapToSpecial(degrees, tolerance = 4) {
  const angle = normalizeAngle(degrees);
  for (const special of [...SPECIAL_ANGLES, 360]) {
    if (Math.abs(angle - special) <= tolerance) return special === 360 ? 0 : special;
  }
  return angle;
}

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

/** 45 -> "π/4", 270 -> "3π/2", 360 -> "2π", 0 -> "0"; null when it is not a neat fraction of π. */
export function radianLabel(degrees) {
  const turns = degrees / 180; // in multiples of π
  for (const denominator of [1, 2, 3, 4, 5, 6, 8, 9, 10, 12]) {
    const numerator = Math.round(turns * denominator);
    if (Math.abs(turns - numerator / denominator) < 1e-6) {
      if (numerator === 0) return "0";
      const divisor = gcd(numerator, denominator);
      const n = numerator / divisor;
      const d = denominator / divisor;
      const top = Math.abs(n) === 1 ? "π" : `${Math.abs(n)}π`;
      return `${n < 0 ? "−" : ""}${top}${d === 1 ? "" : `/${d}`}`;
    }
  }
  return null;
}

const clean = (value) => (Math.abs(value) < 1e-10 ? 0 : round(value, 4));

/** Angle, radians, and sin / cos / tan (tan is null where it is undefined). */
export function unitCircleReadout(degrees) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    degrees: round(degrees, 2),
    radians: round(radians, 4),
    radianLabel: radianLabel(degrees),
    cos: clean(cos),
    sin: clean(sin),
    tan: Math.abs(cos) < 1e-9 ? null : clean(sin / cos),
  };
}

/** Where the circle is drawn inside the aid's box, and where the draggable point sits. */
export function unitCircleGeometry(o) {
  const side = o.h;
  const hasPanel = Boolean(o.showValues) && o.w - side >= 190;
  const cx = hasPanel ? o.x + side / 2 : o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  const margin = Math.max(32, Math.min(58, Math.min(o.w, side) * 0.14));
  const radius = Math.max(12, Math.min(o.w, side) / 2 - margin);
  const angle = (normalizeAngle(finite(o.angle) ? o.angle : 0) * Math.PI) / 180;
  return { cx, cy, radius, hasPanel, panelX: o.x + side + 6, point: { x: cx + radius * Math.cos(angle), y: cy - radius * Math.sin(angle) } };
}

/** True when p (world coordinates) is on the draggable point of a unit circle. */
export function hitUnitCirclePoint(o, p, tolerance) {
  if (o.kind !== "unitcircle") return false;
  const { point } = unitCircleGeometry(o);
  return Math.hypot(p[0] - point.x, p[1] - point.y) <= tolerance;
}

/** The angle (degrees, 0..360) that a pointer at p makes with the circle's centre. */
export function angleFromPoint(o, p) {
  const { cx, cy } = unitCircleGeometry(o);
  return normalizeAngle((Math.atan2(cy - p[1], p[0] - cx) * 180) / Math.PI);
}

/* ------------------------------ fraction bars ------------------------------ */

/** Positions of every bar (or circle) and its parts, so drawing and tapping agree. */
export function fractionLayout(o) {
  const bars = Array.isArray(o.bars) ? o.bars : [];
  const n = Math.max(1, bars.length);
  const pad = 16;
  if (o.shape === "pie") {
    const gap = 16;
    const labelHeight = 40;
    const diameter = Math.max(20, Math.min(o.h - 2 * pad - labelHeight, (o.w - 2 * pad - (n - 1) * gap) / n));
    const totalWidth = n * diameter + (n - 1) * gap;
    const left = o.x + (o.w - totalWidth) / 2;
    const top = o.y + (o.h - diameter - labelHeight) / 2;
    return {
      shape: "pie",
      items: bars.map((bar, index) => ({ ...bar, index, cx: left + index * (diameter + gap) + diameter / 2, cy: top + diameter / 2, radius: diameter / 2 })),
    };
  }
  const labelWidth = Math.min(76, o.w * 0.2);
  const gap = 12;
  const barHeight = Math.max(14, Math.min(72, (o.h - 2 * pad - (n - 1) * gap) / n));
  const totalHeight = n * barHeight + (n - 1) * gap;
  const top = o.y + (o.h - totalHeight) / 2;
  const left = o.x + pad + labelWidth;
  const width = Math.max(40, o.w - 2 * pad - labelWidth);
  return {
    shape: "bar",
    labelWidth,
    items: bars.map((bar, index) => ({ ...bar, index, x: left, y: top + index * (barHeight + gap), w: width, h: barHeight })),
  };
}

/** Which part of which bar (or circle) is at p, or null. */
export function hitFractionPart(o, p) {
  if (o.kind !== "fractions") return null;
  const layout = fractionLayout(o);
  for (const item of layout.items) {
    if (!(item.parts >= 1)) continue;
    if (layout.shape === "bar") {
      if (p[0] >= item.x && p[0] <= item.x + item.w && p[1] >= item.y && p[1] <= item.y + item.h) {
        return { bar: item.index, part: Math.min(item.parts - 1, Math.floor(((p[0] - item.x) / item.w) * item.parts)) };
      }
    } else if (Math.hypot(p[0] - item.cx, p[1] - item.cy) <= item.radius) {
      // Pie parts start at the top and run clockwise
      const turn = (Math.atan2(p[1] - item.cy, p[0] - item.cx) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
      return { bar: item.index, part: Math.min(item.parts - 1, Math.floor((turn / (2 * Math.PI)) * item.parts)) };
    }
  }
  return null;
}

/** Tapping part `part` shades up to it; tapping the last shaded part clears it again. */
export function shadePatch(o, { bar, part }) {
  const bars = o.bars.map((item, index) => (index === bar ? { ...item, shaded: item.shaded === part + 1 ? part : part + 1 } : item));
  return { bars };
}
