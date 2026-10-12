// Canvas rendering for board / PDF-annotation objects.
import { fontString, getBounds, shapeOutline } from "./geometry.js";
import { LINE_HEIGHT } from "./constants.js";
import { compileInequalitySystem, graphGeometryPixels, graphSegments, sampleInequalityRegion, sampleImplicit } from "./graphMath.js";

const graphFunctionCache = new Map();
const graphRegionCache = new Map();
let graph3dModule;
let graph3dLoad;
let graph3dLoadError = "";

function loadGraph3d() {
  if (!graph3dLoad) {
    graph3dLoad = import("./graph3d.js").then((module) => {
      graph3dModule = module;
      if (typeof window !== "undefined") window.dispatchEvent(new Event("boardly-3d-renderer-ready"));
    }).catch((error) => {
      graph3dLoadError = error instanceof Error ? error.message : "The 3D renderer could not be loaded.";
      if (typeof window !== "undefined") window.dispatchEvent(new Event("boardly-3d-renderer-ready"));
    });
  }
}

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
    case "triangle":
    case "roundedRect":
    case "hexagon":
    case "star": {
      const points = shapeOutline(o.kind, x, y, w, h);
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
      fillIfNeeded();
      ctx.stroke();
      break;
    }
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

function drawGraph(ctx, o) {
  const left = o.x + 42;
  const top = o.y + 24;
  const width = Math.max(20, o.w - 54);
  const height = Math.max(20, o.h - 58);
  const xSpan = o.xMax - o.xMin;
  const ySpan = o.yMax - o.yMin;

  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#b8b7b1";
  ctx.lineWidth = 1;
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.strokeRect(o.x, o.y, o.w, o.h);
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "#555";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const equationLabel = o.mode === "surface3d" ? `z = ${o.expression}`
    : o.mode === "curve3d" ? `x(t) = ${o.xExpression}, y(t) = ${o.yExpression}, z(t) = ${o.zExpression}`
      : o.mode === "parametricSurface3d" ? `x(u,v) = ${o.xExpression}, y(u,v) = ${o.yExpression}, z(u,v) = ${o.zExpression}`
    : o.mode === "implicit" ? o.expression
    : o.mode === "inequality" ? o.expression.replace(/\s*\n\s*/g, " ∩ ")
    : o.mode === "parametric" ? `x(t) = ${o.xExpression}, y(t) = ${o.yExpression}`
      : o.mode === "polar" ? `r(t) = ${o.expression}`
        : `y = ${o.expression}`;
  ctx.fillText(equationLabel, o.x + 8, o.y + 6, Math.max(20, o.w - 16));

  if (["surface3d", "curve3d", "parametricSurface3d"].includes(o.mode)) {
    loadGraph3d();
    const error = graph3dModule
      ? graph3dModule.drawGraph3d(ctx, o, { x: left, y: top, width, height })
      : graph3dLoadError || "Loading the 3D renderer…";
    if (error) {
      ctx.fillStyle = "#b42318";
      ctx.fillText(`3D plot: ${error}`, o.x + 8, o.y + o.h - 16, Math.max(20, o.w - 16));
    }
    ctx.restore();
    return;
  }

  let inequalityConstraints = null;
  if (o.mode === "inequality") {
    try {
      inequalityConstraints = compileInequalitySystem(o.expression);
      const cacheKey = JSON.stringify([o.expression, o.xMin, o.xMax, o.yMin, o.yMax, width, height]);
      let region = graphRegionCache.get(cacheKey);
      if (!region) {
        const sampled = sampleInequalityRegion(inequalityConstraints, {
          xMin: o.xMin, xMax: o.xMax, yMin: o.yMin, yMax: o.yMax, width, height,
        });
        region = document.createElement("canvas");
        region.width = sampled.cols;
        region.height = sampled.rows;
        const regionContext = region.getContext("2d");
        const image = regionContext.createImageData(sampled.cols, sampled.rows);
        image.data.set(sampled.pixels);
        regionContext.putImageData(image, 0, 0);
        graphRegionCache.set(cacheKey, region);
        if (graphRegionCache.size > 20) graphRegionCache.delete(graphRegionCache.keys().next().value);
      }
      ctx.drawImage(region, left, top, width, height);
    } catch {
      ctx.fillStyle = "#b42318";
      ctx.fillText("Unable to plot these inequalities", o.x + 8, o.y + o.h - 16);
    }
  }

  ctx.strokeStyle = "#e5e4e0";
  ctx.fillStyle = "#666";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const px = left + width * i / 8;
    const value = o.xMin + xSpan * i / 8;
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.lineTo(px, top + height);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(Number(value.toPrecision(3)).toString(), px, top + height + 4);

    const py = top + height * i / 8;
    const yValue = o.yMax - ySpan * i / 8;
    ctx.beginPath();
    ctx.moveTo(left, py);
    ctx.lineTo(left + width, py);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(Number(yValue.toPrecision(3)).toString(), left - 5, py);
  }

  const zeroX = left + ((0 - o.xMin) / xSpan) * width;
  const zeroY = top + ((o.yMax - 0) / ySpan) * height;
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1.5;
  if (zeroY >= top && zeroY <= top + height) {
    ctx.beginPath();
    ctx.moveTo(left, zeroY);
    ctx.lineTo(left + width, zeroY);
    ctx.stroke();
  }
  if (zeroX >= left && zeroX <= left + width) {
    ctx.beginPath();
    ctx.moveTo(zeroX, top);
    ctx.lineTo(zeroX, top + height);
    ctx.stroke();
  }

  try {
    const cacheKey = JSON.stringify([o.mode || "explicit", o.expression, o.xExpression, o.yExpression, o.tMin, o.tMax, o.xMin, o.xMax, o.yMin, o.yMax, width, height]);
    ctx.strokeStyle = o.color || "#2540D9";
    ctx.lineWidth = o.width || 2.5;
    ctx.lineJoin = "round";
    if (inequalityConstraints) {
      for (const constraint of inequalityConstraints) {
        const segments = sampleImplicit(constraint.residual, {
          xMin: o.xMin, xMax: o.xMax, yMin: o.yMin, yMax: o.yMax, width, height,
        });
        ctx.setLineDash(constraint.strict ? [7, 5] : []);
        for (const segment of segments) {
          ctx.beginPath();
          ctx.moveTo(left + segment[0].x, top + segment[0].y);
          for (let i = 1; i < segment.length; i++) ctx.lineTo(left + segment[i].x, top + segment[i].y);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    } else {
      let segments = graphFunctionCache.get(cacheKey);
      if (!segments) {
        segments = graphSegments(o, width, height);
        graphFunctionCache.set(cacheKey, segments);
        if (graphFunctionCache.size > 40) graphFunctionCache.delete(graphFunctionCache.keys().next().value);
      }
      for (const segment of segments) {
        ctx.beginPath();
        ctx.moveTo(left + segment[0].x, top + segment[0].y);
        for (let i = 1; i < segment.length; i++) ctx.lineTo(left + segment[i].x, top + segment[i].y);
        ctx.stroke();
      }
    }
    if (Array.isArray(o.geometry) && o.geometry.length) {
      const plot = graphGeometryPixels(o.geometry, {
        xMin: o.xMin, xMax: o.xMax, yMin: o.yMin, yMax: o.yMax, width, height,
      });
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, width, height);
      ctx.clip();
      ctx.fillStyle = o.color || "#2540D9";
      ctx.strokeStyle = o.color || "#2540D9";
      ctx.lineWidth = Math.max(1.5, (o.width || 2.5) * 0.8);
      ctx.font = "12px system-ui, sans-serif";
      for (const element of plot) {
        if (element.kind === "point") {
          ctx.beginPath();
          ctx.arc(left + element.point.x, top + element.point.y, 4, 0, Math.PI * 2);
          ctx.fill();
          if (element.label) ctx.fillText(element.label, left + element.point.x + 6, top + element.point.y - 6);
          continue;
        }
        if (element.kind === "polygon") {
          ctx.beginPath();
          ctx.moveTo(left + element.points[0].x, top + element.points[0].y);
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(left + element.points[i].x, top + element.points[i].y);
          }
          ctx.closePath();
          if (element.filled) {
            ctx.save();
            ctx.globalAlpha *= 0.14;
            ctx.fill();
            ctx.restore();
          }
          ctx.stroke();
          const center = element.points.reduce((sum, point) => ({ x: sum.x + point.x / element.points.length, y: sum.y + point.y / element.points.length }), { x: 0, y: 0 });
          if (element.label) ctx.fillText(element.label, left + center.x + 5, top + center.y - 5);
          continue;
        }
        if (element.kind === "angle") {
          const radius = 18;
          ctx.beginPath();
          ctx.moveTo(left + element.a.x, top + element.a.y);
          ctx.lineTo(left + element.vertex.x, top + element.vertex.y);
          ctx.lineTo(left + element.c.x, top + element.c.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(left + element.vertex.x, top + element.vertex.y, radius, element.startAngle, element.endAngle, element.endAngle < element.startAngle);
          ctx.stroke();
          const middle = (element.startAngle + element.endAngle) / 2;
          const value = element.angleUnit === "radians" ? element.angleRadians : element.angleRadians * 180 / Math.PI;
          const suffix = element.angleUnit === "radians" ? " rad" : "°";
          ctx.fillText(`${Number(value.toFixed(2))}${suffix}`, left + element.vertex.x + (radius + 5) * Math.cos(middle), top + element.vertex.y + (radius + 5) * Math.sin(middle));
          if (element.label) ctx.fillText(element.label, left + element.vertex.x + 5, top + element.vertex.y - 5);
          continue;
        }
        const x1 = left + element.start.x, y1 = top + element.start.y;
        const x2 = left + element.end.x, y2 = top + element.end.y;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (element.arrow) {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const head = 9;
          ctx.beginPath();
          ctx.moveTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(x2, y2);
          ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
        if (element.label) ctx.fillText(element.label, x1 + 6, y1 - 6);
        if (element.showMeasure && ["segment", "ray"].includes(element.kind)) {
          const measure = Number(element.length.toFixed(3));
          ctx.fillText(measure.toString(), (x1 + x2) / 2 + 4, (y1 + y2) / 2 - 8);
        }
      }
      ctx.restore();
    }
  } catch {
    ctx.fillStyle = "#b42318";
    ctx.fillText(o.mode === "inequality" ? "Unable to plot these inequalities" : "Unable to plot this equation", o.x + 8, o.y + o.h - 16);
  }
  ctx.restore();
}

function drawTable(ctx, o) {
  ctx.save();
  ctx.font = "14px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  for (let row = 0; row < o.rows; row++) {
    for (let col = 0; col < o.cols; col++) {
      const x = o.x + col * o.cellWidth;
      const y = o.y + row * o.cellHeight;
      ctx.fillStyle = row === 0 ? "#f1f0ed" : "#fff";
      ctx.fillRect(x, y, o.cellWidth, o.cellHeight);
      ctx.strokeStyle = "#777";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, o.cellWidth, o.cellHeight);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 6, y + 2, o.cellWidth - 12, o.cellHeight - 4);
      ctx.clip();
      ctx.fillStyle = "#17181c";
      ctx.textAlign = "left";
      ctx.fillText(o.cells[row * o.cols + col] || "", x + 8, y + o.cellHeight / 2, o.cellWidth - 16);
      ctx.restore();
    }
  }
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
    case "graph": drawGraph(ctx, o); break;
    case "table": drawTable(ctx, o); break;
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
