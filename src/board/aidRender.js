// Canvas drawing for math aids (number line, unit circle, fraction bars). All three sit on a soft white
// card so they stay readable on any paper, and take their main colour from the object.
import {
  AID_DEFAULT_COLOR, SIN_COLOR, SPECIAL_ANGLES, fractionLayout, normalizeAngle, numberLineTicks, radianLabel,
  tickLabel, unitCircleGeometry, unitCircleReadout, validNumberLine,
} from "./mathAids.js";

const INK = "#17181C";
const MUTED = "#6b6d75";
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function roundedRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function card(ctx, o) {
  ctx.save();
  ctx.beginPath();
  roundedRect(ctx, o.x, o.y, o.w, o.h, 12);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#dedbd2";
  ctx.stroke();
  ctx.restore();
}

/** Text with a white outline so it stays legible over lines. */
function haloText(ctx, text, x, y) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#fff";
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.fillText(text, x, y);
}

function arrowHead(ctx, x, y, angle, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.55);
  ctx.lineTo(-size, size * 0.55);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/* ------------------------------ number line ------------------------------ */

function drawNumberLine(ctx, o, color) {
  if (!validNumberLine(o)) {
    ctx.fillStyle = MUTED;
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Set a start, an end and a step to draw the line", o.x + o.w / 2, o.y + o.h / 2);
    return;
  }
  const left = o.x + 38;
  const right = o.x + o.w - 38;
  const y = o.y + o.h * 0.66;
  const { ticks, toX } = numberLineTicks(o, left, right);
  const fontSize = clamp(o.h * 0.105, 11, 17);

  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(left - 16, y);
  ctx.lineTo(right + 16, y);
  ctx.stroke();
  arrowHead(ctx, right + 20, y, 0, 10, INK);
  arrowHead(ctx, left - 20, y, Math.PI, 10, INK);

  ctx.font = `${fontSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = 2;
  for (const tick of ticks) {
    const half = tick.labelled ? 9 : 5;
    ctx.beginPath();
    ctx.moveTo(tick.x, y - half);
    ctx.lineTo(tick.x, y + half);
    ctx.stroke();
    if (tick.labelled) {
      ctx.fillStyle = INK;
      ctx.fillText(tickLabel(tick.value), tick.x, y + half + 4);
    }
  }

  // Jumps: arcs above the line, each labelled with how far it goes
  for (const jump of o.jumps || []) {
    if (jump.from < o.min || jump.from > o.max || jump.to < o.min || jump.to > o.max) continue;
    const x1 = toX(jump.from);
    const x2 = toX(jump.to);
    const baseY = y - 8;
    // Tall enough to read as an arc, but never so tall that its label leaves the card
    const lift = clamp(Math.abs(x2 - x1) * 0.28, 16, Math.max(16, Math.min(o.h * 0.5, baseY - o.y - 30)));
    const controlX = (x1 + x2) / 2;
    const controlY = baseY - 2 * lift;
    ctx.strokeStyle = SIN_COLOR;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, baseY);
    ctx.quadraticCurveTo(controlX, controlY, x2, baseY);
    ctx.stroke();
    arrowHead(ctx, x2, baseY, Math.atan2(baseY - controlY, x2 - controlX), 9, SIN_COLOR);
    const delta = jump.to - jump.from;
    ctx.font = `600 ${fontSize + 1}px ${FONT}`;
    ctx.fillStyle = SIN_COLOR;
    ctx.textBaseline = "bottom";
    haloText(ctx, `${delta > 0 ? "+" : "−"}${tickLabel(Math.abs(delta))}`, controlX, baseY - lift - 2);
  }

  // Marked points
  ctx.font = `600 ${fontSize + 1}px ${FONT}`;
  for (const value of o.marks || []) {
    if (value < o.min || value > o.max) continue;
    const x = toX(value);
    ctx.beginPath();
    ctx.arc(x, y, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textBaseline = "bottom";
    haloText(ctx, tickLabel(value), x, y - 14);
  }
}

/* ------------------------------ unit circle ------------------------------ */

function drawUnitCircle(ctx, o, color) {
  const g = unitCircleGeometry(o);
  const { cx, cy, radius: R } = g;
  const angle = normalizeAngle(Number.isFinite(o.angle) ? o.angle : 0);
  const rad = (angle * Math.PI) / 180;
  const px = g.point.x;
  const py = g.point.y;
  const fontSize = clamp(R / 9, 9, 15);

  // Axes
  ctx.strokeStyle = "#b9b6ab";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - R - 14, cy);
  ctx.lineTo(cx + R + 14, cy);
  ctx.moveTo(cx, cy - R - 14);
  ctx.lineTo(cx, cy + R + 14);
  ctx.stroke();

  // Circle
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Special angles: tick and label (degrees or radians)
  ctx.font = `${fontSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const labelled = R < 120 ? SPECIAL_ANGLES.filter((a) => a % 45 === 0) : SPECIAL_ANGLES;
  for (const special of SPECIAL_ANGLES) {
    const a = (special * Math.PI) / 180;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + (R - 5) * Math.cos(a), cy - (R - 5) * Math.sin(a));
    ctx.lineTo(cx + (R + 5) * Math.cos(a), cy - (R + 5) * Math.sin(a));
    ctx.stroke();
    if (!labelled.includes(special)) continue;
    const text = o.radians ? radianLabel(special) : `${special}°`;
    const distance = R + fontSize * (o.radians ? 1.9 : 1.7);
    ctx.fillStyle = MUTED;
    ctx.fillText(text, cx + distance * Math.cos(a), cy - distance * Math.sin(a));
  }

  // Angle wedge
  if (angle > 0.01) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R * 0.2, 0, -rad, true);
    ctx.closePath();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.2, 0, -rad, true);
    ctx.stroke();
  }

  // Cos and sin legs of the right triangle
  if (o.showTriangle !== false) {
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, cy);
    ctx.stroke();
    ctx.strokeStyle = SIN_COLOR;
    ctx.beginPath();
    ctx.moveTo(px, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    if (Math.abs(px - cx) > 18 && Math.abs(py - cy) > 18) {
      // Little square in the corner of the triangle, on the inside
      const toward = Math.sign(cx - px) || 1;
      const up = Math.sign(py - cy) || 1;
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + toward * 9, cy);
      ctx.lineTo(px + toward * 9, cy + up * 9);
      ctx.lineTo(px, cy + up * 9);
      ctx.stroke();
    }
  }

  // Radius and the draggable point
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Readout panel beside the circle
  if (g.hasPanel) {
    const read = unitCircleReadout(angle);
    const size = clamp(o.h / 15, 13, 21);
    const x = g.panelX + 14;
    const lineHeight = size * 1.55;
    const rows = [
      { text: o.radians ? `θ = ${read.radianLabel ? `${read.radianLabel} rad` : `${read.radians} rad`}` : `θ = ${read.degrees}°`, color: INK, bold: true },
      { text: o.radians ? `= ${read.degrees}°` : `= ${read.radianLabel ? `${read.radianLabel} rad` : `${read.radians} rad`}`, color: MUTED },
      { gap: true },
      { text: `cos θ = ${read.cos}`, color },
      { text: `sin θ = ${read.sin}`, color: SIN_COLOR },
      { text: `tan θ = ${read.tan === null ? "undefined" : read.tan}`, color: INK },
    ];
    const total = rows.reduce((sum, row) => sum + (row.gap ? lineHeight * 0.5 : lineHeight), 0);
    let y = cy - total / 2 + lineHeight / 2;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (const row of rows) {
      if (row.gap) {
        y += lineHeight * 0.5;
        continue;
      }
      ctx.font = `${row.bold ? "700 " : "500 "}${size}px ${FONT}`;
      ctx.fillStyle = row.color;
      ctx.fillText(row.text, x, y, o.x + o.w - x - 10);
      y += lineHeight;
    }
  }
}

/* ------------------------------ fraction bars ------------------------------ */

function fractionLabel(ctx, shaded, parts, cx, cy, size) {
  const top = String(shaded);
  const bottom = String(parts);
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = Math.max(ctx.measureText(top).width, ctx.measureText(bottom).width) + 10;
  ctx.fillStyle = INK;
  ctx.fillText(top, cx, cy - size * 0.62);
  ctx.fillText(bottom, cx, cy + size * 0.62);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, cy);
  ctx.lineTo(cx + width / 2, cy);
  ctx.stroke();
}

function drawFractions(ctx, o, color) {
  const layout = fractionLayout(o);
  for (const item of layout.items) {
    const parts = clamp(Math.round(item.parts) || 1, 1, 24);
    const shaded = clamp(Math.round(item.shaded) || 0, 0, parts);
    ctx.lineJoin = "round";
    if (layout.shape === "bar") {
      const cell = item.w / parts;
      for (let i = 0; i < parts; i++) {
        ctx.fillStyle = i < shaded ? color : "#fff";
        ctx.globalAlpha = i < shaded ? 0.85 : 1;
        ctx.fillRect(item.x + i * cell, item.y, cell, item.h);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 1; i < parts; i++) {
        ctx.moveTo(item.x + i * cell, item.y);
        ctx.lineTo(item.x + i * cell, item.y + item.h);
      }
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeRect(item.x, item.y, item.w, item.h);
      fractionLabel(ctx, shaded, parts, o.x + 16 + layout.labelWidth / 2 - 4, item.y + item.h / 2, clamp(item.h * 0.34, 13, 26));
    } else {
      const { cx, cy, radius } = item;
      for (let i = 0; i < parts; i++) {
        const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / parts;
        const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / parts;
        ctx.beginPath();
        if (parts > 1) ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, a0, a1);
        ctx.closePath();
        ctx.globalAlpha = i < shaded ? 0.85 : 1;
        ctx.fillStyle = i < shaded ? color : "#fff";
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = `600 ${clamp(radius * 0.3, 14, 24)}px ${FONT}`;
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${shaded}/${parts}`, cx, cy + radius + 10);
    }
  }
}

/** Draw one math aid (an object with type "aid"). */
export function drawAid(ctx, o) {
  ctx.save();
  card(ctx, o);
  ctx.beginPath();
  roundedRect(ctx, o.x, o.y, o.w, o.h, 12);
  ctx.clip();
  const color = typeof o.color === "string" && /^#[0-9a-f]{3,8}$/i.test(o.color) ? o.color : AID_DEFAULT_COLOR;
  if (o.kind === "unitcircle") drawUnitCircle(ctx, o, color);
  else if (o.kind === "fractions") drawFractions(ctx, o, color);
  else drawNumberLine(ctx, o, color);
  ctx.restore();
}
