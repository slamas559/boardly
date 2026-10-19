// The card a 3D solid sits on: its title, the 3D view, and the volume and surface area with the working.
import { measureLines, solidLayout, solidTitle } from "./solids.js";

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const INK = "#17181C";
const MUTED = "#6b6d75";

function roundedRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** `solid3d` is the loaded 3D module (or null while it loads); `loadError` explains a failed load. */
export function drawSolid(ctx, o, solid3d, loadError = "") {
  const layout = solidLayout(o);
  ctx.save();
  ctx.beginPath();
  roundedRect(ctx, o.x, o.y, o.w, o.h, 12);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#dedbd2";
  ctx.stroke();
  ctx.clip();

  const title = solidTitle(o);
  if (title) {
    ctx.fillStyle = INK;
    ctx.font = `700 16px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(title, o.x + 16, o.y + 11, o.w - 32);
  }

  const { viewport } = layout;
  const error = solid3d
    ? solid3d.drawSolid3d(ctx, o, { x: viewport.x, y: viewport.y, width: viewport.w, height: viewport.h })
    : loadError || "Loading the 3D view…";
  if (error) {
    ctx.fillStyle = MUTED;
    ctx.font = `500 14px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(error, viewport.x + viewport.w / 2, viewport.y + viewport.h / 2, viewport.w - 20);
  }

  if (layout.strip) {
    const lines = measureLines(o);
    const left = o.x + 16;
    const right = o.w - 32;
    let y = o.y + o.h - layout.strip + 6;
    ctx.strokeStyle = "#e4e2dc";
    ctx.beginPath();
    ctx.moveTo(o.x + 12, y - 4);
    ctx.lineTo(o.x + o.w - 12, y - 4);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (const item of [lines.volume, lines.surface]) {
      ctx.font = `700 13px ${FONT}`;
      ctx.fillStyle = INK;
      const head = `${item.label}   `;
      ctx.fillText(head, left, y);
      const headWidth = ctx.measureText(head).width;
      ctx.font = `500 13px ${FONT}`;
      ctx.fillStyle = MUTED;
      ctx.fillText(item.formula, left + headWidth, y, Math.max(20, right - headWidth));
      y += 19;
      ctx.font = `600 13px ${FONT}`;
      ctx.fillStyle = INK;
      ctx.fillText(`= ${item.working} = ${item.answer}`, left + 14, y, Math.max(20, right - 14));
      y += 19;
    }
    ctx.font = `500 12.5px ${FONT}`;
    ctx.fillStyle = MUTED;
    for (const extra of lines.extras) {
      ctx.fillText(extra.text, left, y, right);
      y += 19;
    }
  }
  ctx.restore();
}
