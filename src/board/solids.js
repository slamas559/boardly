// 3D solids for the board (cube, cuboid, sphere, cylinder, cone, square pyramid, triangular prism): their sizes,
// volume and surface area with the working shown, and where to draw each measurement on the solid.
// Pure functions, so every number a student sees can be tested.

export const SOLID_LIMITS = { min: 0.1, max: 1000, unitLength: 8, titleLength: 60 };
export const SOLID_COLOR = "#2540D9";

const P = {
  a: { key: "a", label: "Edge", symbol: "a" },
  l: { key: "l", label: "Length", symbol: "l" },
  w: { key: "w", label: "Width", symbol: "w" },
  h: { key: "h", label: "Height", symbol: "h" },
  r: { key: "r", label: "Radius", symbol: "r" },
};

export const SOLIDS = [
  { id: "cube", label: "Cube", hint: "Six equal square faces", params: [{ ...P.a, def: 4 }] },
  { id: "cuboid", label: "Cuboid", hint: "A box with three different edges", params: [{ ...P.l, def: 6 }, { ...P.w, def: 4 }, { ...P.h, def: 3 }] },
  { id: "sphere", label: "Sphere", hint: "A ball", params: [{ ...P.r, def: 3 }] },
  { id: "cylinder", label: "Cylinder", hint: "Two circles joined by a curved side", params: [{ ...P.r, def: 2.5 }, { ...P.h, def: 6 }] },
  { id: "cone", label: "Cone", hint: "A circle rising to a point", params: [{ ...P.r, def: 2.5 }, { ...P.h, def: 6 }] },
  { id: "pyramid", label: "Square pyramid", hint: "A square base rising to a point", params: [{ key: "a", label: "Base edge", symbol: "a", def: 5 }, { ...P.h, def: 6 }] },
  {
    id: "prism", label: "Triangular prism", hint: "A triangle stretched along its length",
    params: [{ key: "b", label: "Triangle base", symbol: "b", def: 4 }, { key: "t", label: "Triangle height", symbol: "t", def: 3 }, { ...P.l, def: 6 }],
  },
];

export const solidInfo = (kind) => SOLIDS.find((item) => item.id === kind) || SOLIDS[0];

/** The sizes of a solid, each one a usable number (anything missing or out of range falls back to its default). */
export function solidSizes(o) {
  const info = solidInfo(o?.kind);
  const out = {};
  for (const param of info.params) {
    const value = Number(o?.params?.[param.key]);
    out[param.key] = Number.isFinite(value) && value >= SOLID_LIMITS.min && value <= SOLID_LIMITS.max ? value : param.def;
  }
  return out;
}

export const defaultSizes = (kind) => Object.fromEntries(solidInfo(kind).params.map((param) => [param.key, param.def]));

/** A new solid for the middle of the view. */
export function newSolid(kind, { id, page, cx, cy }) {
  const info = solidInfo(kind);
  const w = 440, h = 400;
  return {
    id, type: "solid", page, kind: info.id, params: defaultSizes(info.id),
    x: Math.round((cx - w / 2) * 100) / 100, y: Math.round((cy - h / 2) * 100) / 100, w, h,
    color: SOLID_COLOR, azimuth: 38, elevation: 24,
    edges: true, seeThrough: false, labels: true, measures: true,
  };
}

/* --------------------------------- numbers --------------------------------- */

/** 12.5, 3.14 or 113.1 (at most two decimals, no trailing zeros). */
export function fmt(value) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return Math.abs(rounded) >= 1e9 ? rounded.toExponential(2) : String(rounded);
}

const sq = (n) => `${fmt(n)}²`;
const cube = (n) => `${fmt(n)}³`;
const PI = "π";

/**
 * Volume and surface area of a solid, with the formula and the working for each:
 * { volume, surface, formulas: { volume, surface }, working: { volume, surface }, extras: [{ label, text }] }.
 */
export function solidMeasures(o) {
  const s = solidSizes(o);
  const kind = solidInfo(o?.kind).id;
  let volume, surface, formulas, working, extras = [];

  switch (kind) {
    case "cube":
      volume = s.a ** 3; surface = 6 * s.a ** 2;
      formulas = { volume: "V = a³", surface: "S = 6a²" };
      working = { volume: `${cube(s.a)}`, surface: `6 × ${sq(s.a)}` };
      break;
    case "cuboid":
      volume = s.l * s.w * s.h; surface = 2 * (s.l * s.w + s.l * s.h + s.w * s.h);
      formulas = { volume: "V = l × w × h", surface: "S = 2(lw + lh + wh)" };
      working = { volume: `${fmt(s.l)} × ${fmt(s.w)} × ${fmt(s.h)}`, surface: `2(${fmt(s.l * s.w)} + ${fmt(s.l * s.h)} + ${fmt(s.w * s.h)})` };
      break;
    case "sphere":
      volume = (4 / 3) * Math.PI * s.r ** 3; surface = 4 * Math.PI * s.r ** 2;
      formulas = { volume: "V = 4⁄3 πr³", surface: "S = 4πr²" };
      working = { volume: `4⁄3 × ${PI} × ${cube(s.r)}`, surface: `4 × ${PI} × ${sq(s.r)}` };
      break;
    case "cylinder":
      volume = Math.PI * s.r ** 2 * s.h; surface = 2 * Math.PI * s.r * (s.r + s.h);
      formulas = { volume: "V = πr²h", surface: "S = 2πr(r + h)" };
      working = { volume: `${PI} × ${sq(s.r)} × ${fmt(s.h)}`, surface: `2 × ${PI} × ${fmt(s.r)} × ${fmt(s.r + s.h)}` };
      break;
    case "cone": {
      const slant = Math.hypot(s.r, s.h);
      volume = (Math.PI * s.r ** 2 * s.h) / 3; surface = Math.PI * s.r * (s.r + slant);
      formulas = { volume: "V = ⅓πr²h", surface: "S = πr(r + l)" };
      working = { volume: `⅓ × ${PI} × ${sq(s.r)} × ${fmt(s.h)}`, surface: `${PI} × ${fmt(s.r)} × ${fmt(s.r + slant)}` };
      extras = [{ label: "Slant height", text: `l = √(r² + h²) = ${fmt(slant)}` }];
      break;
    }
    case "pyramid": {
      const slant = Math.hypot(s.a / 2, s.h);
      volume = (s.a ** 2 * s.h) / 3; surface = s.a ** 2 + 2 * s.a * slant;
      formulas = { volume: "V = ⅓a²h", surface: "S = a² + 2al" };
      working = { volume: `⅓ × ${sq(s.a)} × ${fmt(s.h)}`, surface: `${sq(s.a)} + 2 × ${fmt(s.a)} × ${fmt(slant)}` };
      extras = [{ label: "Slant height", text: `l = √((a⁄2)² + h²) = ${fmt(slant)}` }];
      break;
    }
    default: { // prism: an isosceles triangle (base b, height t) stretched by length l
      const side = Math.hypot(s.b / 2, s.t);
      volume = 0.5 * s.b * s.t * s.l; surface = s.b * s.t + (s.b + 2 * side) * s.l;
      formulas = { volume: "V = ½bt × l", surface: "S = bt + (b + 2s)l" };
      working = { volume: `½ × ${fmt(s.b)} × ${fmt(s.t)} × ${fmt(s.l)}`, surface: `${fmt(s.b * s.t)} + ${fmt(s.b + 2 * side)} × ${fmt(s.l)}` };
      extras = [{ label: "Slanted side", text: `s = √((b⁄2)² + t²) = ${fmt(side)}` }];
    }
  }
  return { volume, surface, formulas, working, extras };
}

/** "V = ⅓πr²h = ⅓ × π × 2.5² × 6 = 39.27 cm³" */
export function measureLines(o) {
  const m = solidMeasures(o);
  const unit = typeof o?.unit === "string" ? o.unit.trim().slice(0, SOLID_LIMITS.unitLength) : "";
  const u2 = unit ? ` ${unit}²` : " square units";
  const u3 = unit ? ` ${unit}³` : " cubic units";
  return {
    volume: { label: "Volume", formula: m.formulas.volume, working: m.working.volume, answer: `${fmt(m.volume)}${u3}` },
    surface: { label: "Surface area", formula: m.formulas.surface, working: m.working.surface, answer: `${fmt(m.surface)}${u2}` },
    extras: m.extras,
  };
}

/* ------------------------- where the measurements go ------------------------- */

/** The overall size of the solid in each direction (x = across, y = up, z = depth), in its own units. */
export function solidExtent(o) {
  const s = solidSizes(o);
  switch (solidInfo(o?.kind).id) {
    case "cube": return { x: s.a, y: s.a, z: s.a };
    case "cuboid": return { x: s.l, y: s.h, z: s.w };
    case "sphere": return { x: 2 * s.r, y: 2 * s.r, z: 2 * s.r };
    case "cylinder": case "cone": return { x: 2 * s.r, y: s.h, z: 2 * s.r };
    case "pyramid": return { x: s.a, y: s.h, z: s.a };
    default: return { x: s.b, y: s.t, z: s.l };
  }
}

/**
 * The lines that show each size on the solid: { key, text, from, to } with points in the solid's own units,
 * centred on its middle (y is up). The label sits at the middle of the line.
 */
export function dimensionLines(o) {
  const s = solidSizes(o);
  const e = solidExtent(o);
  const hx = e.x / 2, hy = e.y / 2, hz = e.z / 2;
  const line = (key, from, to) => ({ key, text: `${key} = ${fmt(s[key])}`, from, to });
  switch (solidInfo(o?.kind).id) {
    case "cube": return [line("a", [-hx, -hy, hz], [hx, -hy, hz])];
    case "cuboid": return [
      line("l", [-hx, -hy, hz], [hx, -hy, hz]),
      line("h", [-hx, -hy, hz], [-hx, hy, hz]),
      line("w", [hx, -hy, -hz], [hx, -hy, hz]),
    ];
    case "sphere": return [line("r", [0, 0, 0], [s.r, 0, 0])];
    case "cylinder": return [
      line("r", [0, hy, 0], [s.r, hy, 0]),
      line("h", [s.r, -hy, 0], [s.r, hy, 0]),
    ];
    case "cone": return [
      line("r", [0, -hy, 0], [s.r, -hy, 0]),
      line("h", [0, -hy, 0], [0, hy, 0]),
    ];
    case "pyramid": return [
      line("a", [-hx, -hy, hz], [hx, -hy, hz]),
      line("h", [0, -hy, 0], [0, hy, 0]),
    ];
    default: return [ // the triangle is on the front face: base along x, height up the middle
      line("b", [-hx, -hy, hz], [hx, -hy, hz]),
      line("t", [0, -hy, hz], [0, hy, hz]),
      line("l", [hx, -hy, -hz], [hx, -hy, hz]),
    ];
  }
}

/** Is this a solid the server and the other clients can draw? Used for sanity checks on incoming objects. */
export const isSolidKind = (kind) => SOLIDS.some((item) => item.id === kind);

/* --------------------------------- the card --------------------------------- */

export const SOLID_MIN_SIZE = { w: 300, h: 280 };
export const SOLID_TITLE_HEIGHT = 30;
// No title set: the name of the solid. A title of only spaces hides it.
export const solidTitle = (o) => (o.title === undefined || o.title === null ? solidInfo(o.kind).label : String(o.title).trim());

/** Where things sit on the solid's card: the 3D view, and how much room the title and the measurements take. */
export function solidLayout(o) {
  const pad = 10;
  const header = solidTitle(o) === "" ? 0 : SOLID_TITLE_HEIGHT;
  const lines = o.measures === false ? 0 : 4 + solidMeasures(o).extras.length;
  const strip = lines ? 12 + lines * 19 : 0;
  return {
    pad, header, strip,
    viewport: { x: o.x + pad, y: o.y + header + 4, w: Math.max(40, o.w - pad * 2), h: Math.max(40, o.h - header - strip - pad - 4) },
  };
}
