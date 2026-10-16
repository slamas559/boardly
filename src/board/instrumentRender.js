// Canvas drawing for geometry instruments, the measurements on shapes, and the snap marker.
import {
  INCH, PROTRACTOR_FLANGE, RULER_HEIGHT, UNIT, formatCm, formatDegrees, instrumentHandles, instrumentPolygon, localOutline,
  measureShape, normalizeDegrees,
} from "./geometryTools.js";

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const INK = "#2b2a27";
const rad = (degrees) => (degrees * Math.PI) / 180;

const PALETTE = {
  ruler: { fill: "rgba(255, 233, 160, 0.62)", edge: "#a88a2a", ink: "#5b4a12" },
  protractor: { fill: "rgba(178, 214, 255, 0.5)", edge: "#4f7fbf", ink: "#1d3f6e" },
  square45: { fill: "rgba(255, 196, 150, 0.5)", edge: "#bf7430", ink: "#6b3a10" },
  square3060: { fill: "rgba(190, 235, 190, 0.5)", edge: "#4c9a58", ink: "#1f5a2b" },
};

function path(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

/* ------------------------------ ruler ------------------------------ */

function drawRuler(ctx, o, colors) {
  const w = o.w;
  const hh = RULER_HEIGHT / 2;
  const left = -w / 2;
  path(ctx, [[left, -hh], [w / 2, -hh], [w / 2, hh], [left, hh]]);
  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.edge;
  ctx.stroke();

  ctx.strokeStyle = colors.ink;
  ctx.fillStyle = colors.ink;
  ctx.lineCap = "butt";
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = "center";

  // Top edge: centimetres, with millimetre ticks. Zero sits a little in from the end.
  const zero = left + 22;
  const topLimit = w / 2 - 36; // leaves room for the unit names at the end
  ctx.textBaseline = "top";
  ctx.beginPath();
  for (let mm = 0; zero + (mm * UNIT) / 10 <= topLimit; mm++) {
    const x = zero + (mm * UNIT) / 10;
    const long = mm % 10 === 0;
    const medium = mm % 5 === 0;
    ctx.moveTo(x, -hh);
    ctx.lineTo(x, -hh + (long ? 17 : medium ? 12 : 7));
  }
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let cm = 0; zero + cm * UNIT <= topLimit; cm++) {
    ctx.fillText(String(cm), zero + cm * UNIT, -hh + 19);
  }
  ctx.font = `600 10px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("cm", w / 2 - 28, -hh + 19);

  // Bottom edge: inches, with eighths
  ctx.textBaseline = "bottom";
  ctx.beginPath();
  for (let eighth = 0; zero + (eighth * INCH) / 8 <= topLimit; eighth++) {
    const x = zero + (eighth * INCH) / 8;
    const long = eighth % 8 === 0;
    const half = eighth % 4 === 0;
    const quarter = eighth % 2 === 0;
    ctx.moveTo(x, hh);
    ctx.lineTo(x, hh - (long ? 17 : half ? 13 : quarter ? 9 : 6));
  }
  ctx.stroke();
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = "center";
  for (let inch = 0; zero + inch * INCH <= topLimit; inch++) ctx.fillText(String(inch), zero + inch * INCH, hh - 19);
  ctx.font = `600 10px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("in", w / 2 - 22, hh - 19);
}

/* ------------------------------ protractor ------------------------------ */

function drawProtractor(ctx, o, colors) {
  const R = o.w / 2;
  ctx.beginPath();
  ctx.moveTo(-R, PROTRACTOR_FLANGE);
  ctx.lineTo(-R, 0);
  ctx.arc(0, 0, R, Math.PI, 0);
  ctx.lineTo(R, PROTRACTOR_FLANGE);
  ctx.closePath();
  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.edge;
  ctx.stroke();

  // The base line and a small cross at the centre
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-R, 0);
  ctx.lineTo(R, 0);
  ctx.moveTo(-9, 0);
  ctx.lineTo(9, 0);
  ctx.moveTo(0, -9);
  ctx.lineTo(0, 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.stroke();

  // Scales: outer 0 to 180 reading from the right, inner 180 to 0 reading from the left
  ctx.fillStyle = colors.ink;
  ctx.font = `600 ${Math.max(9, Math.min(13, R / 16))}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let degrees = 0; degrees <= 180; degrees++) {
    const a = rad(degrees);
    const long = degrees % 10 === 0;
    const medium = degrees % 5 === 0;
    const length = long ? 15 : medium ? 11 : 7;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R, -Math.sin(a) * R);
    ctx.lineTo(Math.cos(a) * (R - length), -Math.sin(a) * (R - length));
    ctx.lineWidth = long ? 1.2 : 0.8;
    ctx.stroke();
    if (long) {
      const outer = R - 27;
      const inner = R - 47;
      ctx.fillText(String(degrees), Math.cos(a) * outer, -Math.sin(a) * outer);
      if (R > 130) {
        ctx.globalAlpha = 0.75;
        ctx.fillText(String(180 - degrees), Math.cos(a) * inner, -Math.sin(a) * inner);
        ctx.globalAlpha = 1;
      }
    }
  }
}

/* ------------------------------ set squares ------------------------------ */

function drawSetSquare(ctx, o, colors) {
  const outline = localOutline(o);
  const [a, b, c] = outline;
  path(ctx, outline);
  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.edge;
  ctx.stroke();

  // A window in the middle, like a real set square
  const centre = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
  const inner = outline.map(([x, y]) => [centre[0] + (x - centre[0]) * 0.5, centre[1] + (y - centre[1]) * 0.5]);
  path(ctx, inner);
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Centimetre ticks along both short sides, counted from the right angle
  ctx.strokeStyle = colors.ink;
  ctx.fillStyle = colors.ink;
  ctx.font = `600 10px ${FONT}`;
  ctx.lineWidth = 1;
  const baseLength = b[0] - a[0];
  const upLength = a[1] - c[1];
  ctx.beginPath();
  for (let mm = 0; (mm * UNIT) / 10 <= baseLength - 6; mm++) {
    const x = a[0] + (mm * UNIT) / 10;
    ctx.moveTo(x, a[1]);
    ctx.lineTo(x, a[1] - (mm % 10 === 0 ? 14 : mm % 5 === 0 ? 10 : 6));
  }
  for (let mm = 0; (mm * UNIT) / 10 <= upLength - 6; mm++) {
    const y = a[1] - (mm * UNIT) / 10;
    ctx.moveTo(a[0], y);
    ctx.lineTo(a[0] + (mm % 10 === 0 ? 14 : mm % 5 === 0 ? 10 : 6), y);
  }
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (let cm = 1; cm * UNIT <= baseLength - 18; cm++) ctx.fillText(String(cm), a[0] + cm * UNIT, a[1] - 15);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (let cm = 1; cm * UNIT <= upLength - 18; cm++) ctx.fillText(String(cm), a[0] + 15, a[1] - cm * UNIT);

  // The three angles, named in their corners
  ctx.font = `700 11px ${FONT}`;
  ctx.textBaseline = "middle";
  const angles = o.kind === "square45" ? ["90°", "45°", "45°"] : ["90°", "30°", "60°"];
  const labelAt = [[a[0] + 40, a[1] - 40], [b[0] - 62, b[1] - 16], [c[0] + 26, c[1] + 50]];
  ctx.textAlign = "left";
  angles.forEach((text, index) => ctx.fillText(text, labelAt[index][0], labelAt[index][1]));
}

/** Draw one instrument (an object with type "instrument"). */
export function drawInstrument(ctx, o) {
  const colors = PALETTE[o.kind] || PALETTE.ruler;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(rad(o.angle || 0));
  if (o.kind === "protractor") drawProtractor(ctx, o, colors);
  else if (o.kind === "square45" || o.kind === "square3060") drawSetSquare(ctx, o, colors);
  else drawRuler(ctx, o, colors);
  ctx.restore();
}

/** Selection outline and the rotate / size handles of an instrument, plus a live reading while you turn or stretch it. */
export function drawInstrumentSelection(ctx, o, k, reading = null) {
  const accent = "#2540D9";
  ctx.save();
  ctx.lineWidth = 1.25 / k;
  ctx.strokeStyle = accent;
  ctx.setLineDash([4 / k, 3 / k]);
  path(ctx, instrumentPolygon(o));
  ctx.stroke();
  ctx.setLineDash([]);

  const handles = instrumentHandles(o);
  // A short stem from the anchor edge to the rotate handle
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  ctx.lineTo(handles.rotate[0], handles.rotate[1]);
  ctx.globalAlpha = 0.35;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const r = 8 / k;
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 2 / k;
  ctx.beginPath();
  ctx.arc(handles.rotate[0], handles.rotate[1], r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A little turning arrow inside the rotate handle
  ctx.beginPath();
  ctx.arc(handles.rotate[0], handles.rotate[1], r * 0.5, -Math.PI * 0.8, Math.PI * 0.55);
  ctx.lineWidth = 1.5 / k;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(handles.size[0] - r * 0.85, handles.size[1] - r * 0.85, r * 1.7, r * 1.7);
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 2 / k;
  ctx.fill();
  ctx.stroke();

  const text = reading || `${Math.round(normalizeDegrees(o.angle || 0))}°`;
  ctx.font = `600 ${12 / k}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3.5 / k;
  ctx.strokeStyle = "#fff";
  ctx.strokeText(text, handles.rotate[0], handles.rotate[1] - r - 3 / k);
  ctx.fillStyle = accent;
  ctx.fillText(text, handles.rotate[0], handles.rotate[1] - r - 3 / k);
  ctx.restore();
}

/* ------------------------------ measurements on shapes ------------------------------ */

function halo(ctx, text, x, y, k) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineWidth = 4 / k;
  ctx.strokeStyle = "#fff";
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.fillText(text, x, y);
}

/** Side lengths (in cm) and interior angles, with arcs and right-angle squares, for a shape with `measure` on. */
export function drawMeasure(ctx, o, k = 1) {
  const measured = measureShape(o);
  if (!measured) return;
  const size = 13 / k;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const side of measured.sides) {
    ctx.fillStyle = INK;
    const gap = size * 1.05;
    halo(ctx, `${formatCm(side.length)} cm`, side.mid[0] + side.normal[0] * gap, side.mid[1] + side.normal[1] * gap, k);
  }

  ctx.lineWidth = 1.5 / k;
  for (const angle of measured.angles) {
    const [vx, vy] = angle.vertex;
    const radius = Math.min(26 / k, angle.shortest * 0.32);
    if (radius < 6 / k) continue;
    ctx.strokeStyle = "#d9480f";
    ctx.fillStyle = "#d9480f";
    if (Math.abs(angle.degrees - 90) < 0.6) {
      const r = radius * 0.75;
      ctx.beginPath();
      ctx.moveTo(vx + angle.dirA[0] * r, vy + angle.dirA[1] * r);
      ctx.lineTo(vx + (angle.dirA[0] + angle.dirB[0]) * r, vy + (angle.dirA[1] + angle.dirB[1]) * r);
      ctx.lineTo(vx + angle.dirB[0] * r, vy + angle.dirB[1] * r);
      ctx.stroke();
    } else {
      const a1 = Math.atan2(angle.dirA[1], angle.dirA[0]);
      const a2 = Math.atan2(angle.dirB[1], angle.dirB[0]);
      let delta = a2 - a1;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta <= -Math.PI) delta += 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(vx, vy, radius, a1, a2, delta < 0);
      ctx.stroke();
    }
    const labelRadius = radius + size * 1.15;
    ctx.font = `700 ${size * 0.92}px ${FONT}`;
    halo(ctx, `${formatDegrees(angle.degrees)}°`, vx + angle.inward[0] * labelRadius, vy + angle.inward[1] * labelRadius, k);
  }
  ctx.restore();
}

/* ------------------------------ snap marker ------------------------------ */

/** A small ring (corner), diamond (midpoint), square (edge) or cross (grid) where the point will land. */
export function drawSnapMark(ctx, target, k) {
  if (!target) return;
  const [x, y] = target.at;
  const r = 7 / k;
  ctx.save();
  ctx.lineWidth = 2 / k;
  ctx.strokeStyle = "#16a34a";
  ctx.fillStyle = "rgba(22,163,74,0.18)";
  ctx.beginPath();
  if (target.kind === "vertex") ctx.arc(x, y, r, 0, Math.PI * 2);
  else if (target.kind === "midpoint") {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
  } else if (target.kind === "edge") ctx.rect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4);
  else {
    ctx.moveTo(x - r * 0.8, y);
    ctx.lineTo(x + r * 0.8, y);
    ctx.moveTo(x, y - r * 0.8);
    ctx.lineTo(x, y + r * 0.8);
  }
  if (target.kind !== "grid") ctx.fill();
  ctx.stroke();
  ctx.restore();
}
