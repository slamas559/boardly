// Shared constants for the board and PDF annotation engine

export const PDF_WORLD_WIDTH = 1000; // PDF pages are laid out in a 1000-unit-wide world
export const BOARD_HOME = { w: 1600, h: 900 }; // region framed when a board opens

export const FONT_STACKS = {
  sans: '"Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: '"Instrument Serif", Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  hand: '"Caveat", "Comic Sans MS", cursive',
};

export const FONT_OPTIONS = [
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
  { id: "hand", label: "Handwriting" },
];

export const PALETTE = ["#17181C", "#6B6A64", "#2540D9", "#0E8A6B", "#D99A00", "#E2492B", "#B8328F", "#FFFFFF"];
export const HIGHLIGHT_PALETTE = ["#FFE14D", "#7CE8A0", "#7FD4FF", "#FF9EC8", "#FFB36B", "#C9A7FF"];

export const TEXT_SIZES = [14, 18, 24, 32, 48, 72, 96];

export const LINE_HEIGHT = 1.28;

export const SHAPE_KINDS = ["rect", "ellipse", "diamond", "triangle", "roundedRect", "hexagon", "star", "line", "arrow"];

// Which tools share remembered settings
export const STYLE_GROUP = {
  pen: "pen",
  highlighter: "highlighter",
  rect: "shape",
  ellipse: "shape",
  diamond: "shape",
  triangle: "shape",
  roundedRect: "shape",
  hexagon: "shape",
  star: "shape",
  line: "shape",
  arrow: "shape",
  text: "text",
  highlight: "markup",
  underline: "markupLine",
  strike: "markupLine",
};

export function defaultStyles(mode) {
  const pdf = mode === "pdf";
  return {
    pen: { color: "#17181C", width: pdf ? 2.5 : 4, opacity: 1 },
    highlighter: { color: "#FFE14D", width: pdf ? 14 : 22, opacity: 0.45 },
    shape: { color: "#2540D9", width: pdf ? 2.5 : 4, opacity: 1, fill: false },
    text: {
      color: "#17181C",
      fontFamily: "sans",
      fontSize: pdf ? 20 : 32,
      bold: false,
      italic: false,
      underline: false,
      align: "left",
    },
    markup: { color: "#FFE14D", opacity: 0.45 },
    markupLine: { color: "#E2492B", opacity: 1 },
  };
}

export const BOARD_TOOLS = ["select", "pan", "pen", "highlighter", "eraser", "text", "graph", "table", ...SHAPE_KINDS, "laser"];
export const PDF_TOOLS = ["select", "highlight", "underline", "strike", "pen", "highlighter", "text", ...SHAPE_KINDS, "eraser", "laser"];

export const uid = () => {
  const a = new Uint32Array(2);
  (globalThis.crypto || { getRandomValues: (x) => x.fill(Math.floor(Math.random() * 4e9)) }).getRandomValues(a);
  return a[0].toString(36) + a[1].toString(36);
};
