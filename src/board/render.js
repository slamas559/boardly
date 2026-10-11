// Canvas rendering for board / PDF-annotation objects.
import { fontString, getBounds } from "./geometry.js";
import { LINE_HEIGHT } from "./constants.js";

function strokePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1]);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }
  ctx.stroke();
}

function drawStroke(ctx, o) {
  const pts = o.points;
  if (!pts || pts.length === 0) return;
  const width = o.width || 3;
  const highlighter = o.tool === "highlighter";

  ctx.save();
  ctx.strokeStyle = o.color || "#000";
  ctx.fillStyle = o.color || "#000";
  ctx.globalAlpha *= o.opacity ?? 1;
  ctx.lineJoin = "round";
  ctx.lineCap = highlighter ? "square" : "round";
  ctx.lineWidth = width;

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], width / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.vp && !highlighter) {
    // Pen pressure: vary width per segment
    for (let i = 1; i < pts.length; i++) {
      const p = ((pts[i - 1][2] ?? 0.5) + (pts[i][2] ?? 0.5)) / 2;
      ctx.lineWidth = width * (0.35 + 1.1 * p);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
  } else {
    strokePath(ctx, pts);
  }
  ctx.restore();
}

function drawShape(ctx, o) {
  const width = o.width || 3;
  const x = Math.min(o.x1, o.x2), y = Math.min(o.y1, o.y2);
  const w = Math.abs(o.x2 - o.x1), h = Math.abs(o.y2 - o.y1);

  ctx.save();
  ctx.strokeStyle = o.color || "#000";
  ctx.fillStyle = o.color || "#000";
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha *= o.opacity ?? 1;

  const fillIfNeeded = () => {
    if (!o.fill) return;
    ctx.save();
    ctx.globalAlpha *= 0.14;
    ctx.fill();
    ctx.restore();
  };

  switch (o.kind) {
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, Math.max(w / 2, 0.01), Math.max(h / 2, 0.01), 0, 0, Math.PI * 2);
      fillIfNeeded();
      ctx.stroke();
      break;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      fillIfNeeded();
      ctx.stroke();
      break;
    case "line":
    case "arrow": {
      ctx.beginPath();
      ctx.moveTo(o.x1, o.y1);
      ctx.lineTo(o.x2, o.y2);
      ctx.stroke();
      if (o.kind === "arrow") {
        const ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1);
        const head = Math.max(12, width * 4);
        const spread = Math.PI / 7;
        ctx.beginPath();
        ctx.moveTo(o.x2 - head * Math.cos(ang - spread), o.y2 - head * Math.sin(ang - spread));
        ctx.lineTo(o.x2, o.y2);
        ctx.lineTo(o.x2 - head * Math.cos(ang + spread), o.y2 - head * Math.sin(ang + spread));
        ctx.stroke();
      }
      break;
    }
    default:
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      fillIfNeeded();
      ctx.stroke();
  }
  ctx.restore();
}

function drawText(ctx, o) {
  const size = o.fontSize || 24;
  ctx.save();
  ctx.font = fontString(o);
  ctx.fillStyle = o.color || "#000";
  ctx.textBaseline = "top";
  ctx.textAlign = o.align || "left";
  const lines = (o.text || "").split("\n");
  lines.forEach((line, i) => {
    const y = o.y + i * size * LINE_HEIGHT + (size * LINE_HEIGHT - size) / 2 - size * 0.04;
    ctx.fillText(line, o.x, y);
    if (o.underline && line) {
      const w = ctx.measureText(line).width;
      const left = o.align === "center" ? o.x - w / 2 : o.align === "right" ? o.x - w : o.x;
      ctx.fillRect(left, y + size * 1.02, w, Math.max(1, size * 0.06));
    }
  });
  ctx.restore();
}

function drawMarkup(ctx, o, k) {
  ctx.save();
  ctx.fillStyle = o.color || "#FFE14D";
  ctx.strokeStyle = o.color || "#E2492B";
  for (const [x, y, w, h] of o.rects || []) {
    if (o.kind === "underline") {
      ctx.globalAlpha = 1;
      ctx.fillStyle = o.color || "#E2492B";
      ctx.fillRect(x, y + h * 0.9, w, Math.max(1.4 / k, h * 0.07));
    } else if (o.kind === "strike") {
      ctx.globalAlpha = 1;
      ctx.fillStyle = o.color || "#E2492B";
      ctx.fillRect(x, y + h * 0.5 - Math.max(0.7 / k, h * 0.035), w, Math.max(1.4 / k, h * 0.07));
    } else {
      ctx.globalAlpha = o.opacity ?? 0.45;
      ctx.fillRect(x, y, w, h);
    }
  }
  ctx.restore();
}

// Annotations saved by the previous version: percent rects of the page
function drawLegacyHighlight(ctx, o, pageSize) {
  if (!pageSize) return;
  ctx.save();
  ctx.fillStyle = o.color || "rgba(255,230,0,0.4)";
  for (const r of o.rects || []) {
    ctx.fillRect((r.xPct / 100) * pageSize.w, (r.yPct / 100) * pageSize.h, (r.wPct / 100) * pageSize.w, (r.hPct / 100) * pageSize.h);
  }
  ctx.restore();
}

export function drawObject(ctx, o, { k = 1, pageSize, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  switch (o.type) {
    case "stroke": drawStroke(ctx, o); break;
    case "shape": drawShape(ctx, o); break;
    case "text": drawText(ctx, o); break;
    case "markup": drawMarkup(ctx, o, k); break;
    case "highlight": drawLegacyHighlight(ctx, o, pageSize); break;
    default: break;
  }
  ctx.restore();
}

export function drawGrid(ctx, view, w, h) {
  const spacing = 40;
  const px = spacing * view.k;
  if (px < 10) return; // too dense when zoomed out
  const x0 = Math.floor(view.x / spacing) * spacing;
  const y0 = Math.floor(view.y / spacing) * spacing;
  const x1 = view.x + w / view.k;
  const y1 = view.y + h / view.k;
  ctx.save();
  ctx.fillStyle = "#d6d3cb";
  const r = Math.max(0.9 / view.k, 1.1);
  for (let x = x0; x <= x1; x += spacing) {
    for (let y = y0; y <= y1; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawSelection(ctx, objects, k, { showHandles = true, mode = "box" } = {}) {
  if (!objects.length) return;
  const accent = "#2540D9";
  ctx.save();
  ctx.lineWidth = 1.25 / k;
  ctx.strokeStyle = accent;
  ctx.fillStyle = "#fff";
  const pad = 4 / k;

  for (const o of objects) {
    const b = getBounds(o);
    ctx.setLineDash([4 / k, 3 / k]);
    ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
  }
  ctx.setLineDash([]);

  if (showHandles) {
    const hs = 9 / k;
    for (const [hx, hy] of handlePoints(objects, mode, pad)) {
      ctx.beginPath();
      ctx.rect(hx - hs / 2, hy - hs / 2, hs, hs);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Handle positions: endpoints for a single line/arrow, otherwise the 4 corners of the union bounds. */
export function handlePoints(objects, mode, pad = 0) {
  if (objects.length === 1 && objects[0].type === "shape" && (objects[0].kind === "line" || objects[0].kind === "arrow")) {
    const o = objects[0];
    return [[o.x1, o.y1], [o.x2, o.y2]];
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    const b = getBounds(o);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return [
    [minX - pad, minY - pad],
    [maxX + pad, minY - pad],
    [maxX + pad, maxY + pad],
    [minX - pad, maxY + pad],
  ];
}
