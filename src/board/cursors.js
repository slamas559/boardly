// Per-tool canvas cursors. Small SVGs with a light halo so they stay visible on any background.
const svgCursor = (svg, x, y, fallback) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, ${fallback}`;

const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${inner}</svg>`;

const INK = "#17181C";

// Pencil, tip at bottom-left
const pen = svgCursor(
  wrap(
    `<path d="M3 21l1.2-4.6L16.8 3.8a2 2 0 012.8 0l.6.6a2 2 0 010 2.8L7.6 19.8z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M14.6 6l3.4 3.4" stroke="${INK}" stroke-width="1.4"/>`
  ),
  3, 21, "crosshair"
);

// Chisel-tip marker, tip at bottom-left
const marker = svgCursor(
  wrap(
    `<path d="M3 21l2-5 4 4z" fill="#FFE14D" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M5 16L16.5 4.5a2 2 0 012.8 0l1.2 1.2a2 2 0 010 2.8L9 20z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`
  ),
  3, 21, "crosshair"
);

// Small ring + dot for the laser pointer
const laser = svgCursor(
  wrap(
    `<circle cx="12" cy="12" r="5" fill="none" stroke="#fff" stroke-width="3.5"/>` +
    `<circle cx="12" cy="12" r="5" fill="none" stroke="#E2492B" stroke-width="1.5"/>` +
    `<circle cx="12" cy="12" r="1.4" fill="#E2492B"/>`
  ),
  12, 12, "crosshair"
);

// Round eraser ring
const eraser = svgCursor(
  wrap(
    `<circle cx="12" cy="12" r="8" fill="rgba(255,255,255,0.35)" stroke="#fff" stroke-width="3.5"/>` +
    `<circle cx="12" cy="12" r="8" fill="none" stroke="${INK}" stroke-width="1.4"/>`
  ),
  12, 12, "cell"
);

export const TOOL_CURSORS = {
  pen,
  highlighter: marker,
  laser,
  eraser,
  text: "text",
  select: "default",
  pan: "grab",
  // shapes, lines, arrows and PDF text markup keep the precision crosshair
};

export const cursorFor = (tool, fallback = "crosshair") => TOOL_CURSORS[tool] || fallback;
