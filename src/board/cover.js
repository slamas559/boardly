// Covers: a panel the host puts over part of the board to hide it from students until it is revealed.
// The host always sees through it (so they can keep working underneath); students see a solid panel.
// This is a teaching convenience, not a secret: the hidden content is still sent to every device.

export const COVER_DEFAULT_COLOR = "#6B6D75";
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/** A new, closed cover centred on (cx, cy). */
export function newCover({ id, page, cx, cy, w = 360, h = 170 }) {
  return { id, type: "cover", page, x: Number((cx - w / 2).toFixed(2)), y: Number((cy - h / 2).toFixed(2)), w, h, open: false, color: COVER_DEFAULT_COLOR };
}

/** The update that reveals a closed cover or hides an open one again. */
export const togglePatch = (cover) => ({ open: !cover.open });

const safeColor = (color) => (typeof color === "string" && /^#[0-9a-f]{3,8}$/i.test(color) ? color : COVER_DEFAULT_COLOR);

function roundedRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/**
 * Draw a cover for `viewer` ("host" or "listener"). Students see nothing at all once it is open; the host
 * keeps a faint outline so an open cover can still be found and hidden again.
 */
export function drawCover(ctx, o, viewer = "listener", k = 1) {
  const color = safeColor(o.color);
  ctx.save();
  if (viewer === "listener") {
    if (!o.open) {
      ctx.beginPath();
      roundedRect(ctx, o.x, o.y, o.w, o.h, 10);
      ctx.fillStyle = "#EFEDE6";
      ctx.fill();
      // A light diagonal texture, so it reads as a panel and not as an empty gap
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = "rgba(0,0,0,0.045)";
      ctx.lineWidth = 6;
      for (let x = o.x - o.h; x < o.x + o.w; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, o.y + o.h);
        ctx.lineTo(x + o.h, o.y);
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      roundedRect(ctx, o.x, o.y, o.w, o.h, 10);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const size = Math.max(18, Math.min(o.h * 0.42, o.w * 0.2, 72));
      ctx.font = `600 ${size}px ${FONT}`;
      ctx.fillText(o.label ? "" : "?", o.x + o.w / 2, o.y + o.h / 2);
      if (o.label) {
        ctx.font = `600 ${Math.max(14, Math.min(o.h * 0.22, 28))}px ${FONT}`;
        ctx.fillText(o.label, o.x + o.w / 2, o.y + o.h / 2, o.w - 24);
      }
    }
    ctx.restore();
    return;
  }

  // Host: see-through, with a tag saying who can see what
  ctx.beginPath();
  roundedRect(ctx, o.x, o.y, o.w, o.h, 10);
  if (!o.open) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.22;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = 2 / k;
  ctx.setLineDash([8 / k, 6 / k]);
  ctx.strokeStyle = color;
  ctx.globalAlpha = o.open ? 0.45 : 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  const text = o.open ? "Revealed to students" : "Hidden from students";
  ctx.font = `600 ${12 / k}px ${FONT}`;
  const pad = 7 / k;
  const width = ctx.measureText(text).width + pad * 2;
  // The tag sits just above the cover, so it never hides what the teacher is working on underneath
  const tagY = o.y - 26 / k;
  ctx.beginPath();
  roundedRect(ctx, o.x, tagY, width, 22 / k, 6 / k);
  ctx.fillStyle = o.open ? "rgba(255,255,255,0.95)" : color;
  ctx.fill();
  if (o.open) {
    ctx.lineWidth = 1 / k;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.fillStyle = o.open ? color : "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, o.x + pad, tagY + 11 / k);
  ctx.restore();
}
