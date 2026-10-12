// Graph form helpers shared by the "Add graph" dialog and the live graph inspector.
// Pure functions (no React) so they can be unit tested.
import { compileExpression, compileImplicitEquation, compileInequalitySystem } from "./graphMath.js";

export const GRAPH_3D_MODES = ["surface3d", "curve3d", "parametricSurface3d"];
export const is3dMode = (mode) => GRAPH_3D_MODES.includes(mode);
export const isMultiInputMode = (mode) => ["parametric", "curve3d", "parametricSurface3d", "inequality"].includes(mode);

export const MODE_LABELS = {
  explicit: "Function y = f(x)",
  implicit: "Implicit equation",
  inequality: "Inequalities",
  surface3d: "3D surface",
  curve3d: "3D curve",
  parametricSurface3d: "3D parametric surface",
  parametric: "Parametric curve",
  polar: "Polar curve",
};

export const GRAPH_ELEMENT_FIELDS = {
  point: ["x", "y"],
  vector: ["x", "y", "dx", "dy"],
  segment: ["x1", "y1", "x2", "y2"],
  ray: ["x1", "y1", "x2", "y2"],
  polygon: [],
  angle: ["ax", "ay", "vx", "vy", "cx", "cy"],
};

const LIMIT = 1_000_000;
const TWO_PI = 6.283185307;

export function validateGraphExpressions({ mode, expression, xExpression, yExpression, zExpression }) {
  if (mode === "implicit") compileImplicitEquation(expression);
  else if (mode === "inequality") compileInequalitySystem(expression);
  else if (mode === "surface3d") compileExpression(expression, ["x", "y"]);
  else if (mode === "parametric") {
    compileExpression(xExpression, ["t"]);
    compileExpression(yExpression, ["t"]);
  } else if (mode === "curve3d") {
    compileExpression(xExpression, ["t"]);
    compileExpression(yExpression, ["t"]);
    compileExpression(zExpression, ["t"]);
  } else if (mode === "parametricSurface3d") {
    compileExpression(xExpression, ["u", "v"]);
    compileExpression(yExpression, ["u", "v"]);
    compileExpression(zExpression, ["u", "v"]);
  } else compileExpression(expression, mode === "polar" ? ["t"] : ["x"]);
}

export function validateGraphGeometry(elements) {
  if (!Array.isArray(elements) || elements.length > 24) throw new Error("A graph can contain up to 24 geometry elements.");
  for (const element of elements) {
    const fields = GRAPH_ELEMENT_FIELDS[element.kind];
    if (!fields || typeof element.id !== "string" || element.id.length > 48
      || typeof element.label !== "string" || element.label.length > 24) {
      throw new Error("Check each geometry element and keep labels under 24 characters.");
    }
    if (element.kind === "polygon") {
      if (!Array.isArray(element.vertices) || element.vertices.length < 3 || element.vertices.length > 12
        || element.vertices.some((point) => !Array.isArray(point) || point.length !== 2
          || point.some((value) => !Number.isFinite(Number(value)) || Math.abs(Number(value)) > LIMIT))) {
        throw new Error("Polygons need 3–12 finite coordinate pairs within ±1,000,000.");
      }
      continue;
    }
    if (fields.some((field) => String(element[field]).trim() === "" || !Number.isFinite(Number(element[field])) || Math.abs(Number(element[field])) > LIMIT)) {
      throw new Error("Check geometry coordinates and keep them within ±1,000,000.");
    }
    if (element.kind === "angle") {
      if (Number(element.ax) === Number(element.vx) && Number(element.ay) === Number(element.vy)
        || Number(element.cx) === Number(element.vx) && Number(element.cy) === Number(element.vy)) {
        throw new Error("An angle needs two non-zero arms.");
      }
      if (!["degrees", "radians"].includes(element.angleUnit)) throw new Error("Choose degrees or radians for the angle measurement.");
    }
    if ((element.kind === "segment" || element.kind === "ray") && element.showMeasure !== undefined && typeof element.showMeasure !== "boolean") {
      throw new Error("Choose whether to show the length measurement.");
    }
  }
}

/** "y = x^2" → "x^2" for explicit-style modes. Implicit equations and inequalities keep their text. */
export function normalizeEquation(mode, expression) {
  const text = String(expression ?? "");
  if (mode === "implicit" || mode === "inequality") return text.trim();
  return text.trim().replace(mode === "surface3d" ? /^[yz]\s*=\s*/i : /^y\s*=\s*/i, "");
}

/** Every editable graph field as a string, ready for inputs. */
export function graphToForm(graph) {
  const str = (value, fallback) => String(value ?? fallback);
  return {
    expression: graph.expression ?? "",
    xExpression: graph.xExpression || "cos(t)",
    yExpression: graph.yExpression || "sin(t)",
    zExpression: graph.zExpression || "t",
    tMin: str(graph.tMin, 0), tMax: str(graph.tMax, TWO_PI),
    uMin: str(graph.uMin, 0), uMax: str(graph.uMax, TWO_PI),
    vMin: str(graph.vMin, 0), vMax: str(graph.vMax, TWO_PI),
    xMin: str(graph.xMin, -10), xMax: str(graph.xMax, 10),
    yMin: str(graph.yMin, -10), yMax: str(graph.yMax, 10),
    zMin: str(graph.zMin, -10), zMax: str(graph.zMax, 10),
    azimuth: str(graph.azimuth, 42), elevation: str(graph.elevation, 32),
  };
}

const num = (value) => (String(value ?? "").trim() === "" ? NaN : Number(value));
const fail = (section, message) => ({ ok: false, section, message });

/**
 * Validate the form + geometry and build the patch that would be stored on the graph.
 * Returns { ok: true, patch } or { ok: false, section, message } where `section` is the tab
 * that holds the problem: "equation" | "range" | "geometry" | "view3d".
 */
export function buildGraphPatch(mode, form, geometry) {
  const ranges = [form.xMin, form.xMax, form.yMin, form.yMax].map(num);
  const parameters = [form.tMin, form.tMax].map(num);
  const surfaceParameters = [form.uMin, form.uMax, form.vMin, form.vMax].map(num);
  const vertical = [form.zMin, form.zMax].map(num);
  const camera = [form.azimuth, form.elevation].map(num);
  const expressionLimit = mode === "inequality" ? 967 : 120;

  if (form.expression.length > expressionLimit || form.xExpression.length > 120 || form.yExpression.length > 120 || form.zExpression.length > 120) {
    return fail("equation", `Keep each equation under ${expressionLimit} characters.`);
  }
  if (!ranges.every(Number.isFinite) || !parameters.every(Number.isFinite) || !surfaceParameters.every(Number.isFinite)
    || [...ranges, ...parameters, ...surfaceParameters].some((value) => Math.abs(value) > LIMIT)
    || ranges[0] >= ranges[1] || ranges[2] >= ranges[3] || parameters[0] >= parameters[1]
    || surfaceParameters[0] >= surfaceParameters[1] || surfaceParameters[2] >= surfaceParameters[3]) {
    return fail("range", "Use finite numbers within ±1,000,000, with each minimum smaller than its maximum.");
  }
  if (!vertical.every(Number.isFinite) || !camera.every(Number.isFinite) || vertical.some((value) => Math.abs(value) > LIMIT)
    || Math.abs(camera[0]) > 360_000 || vertical[0] >= vertical[1] || camera[1] < 12 || camera[1] > 82) {
    return fail("view3d", "z min must be below z max, and elevation must be between 12° and 82°.");
  }

  const equation = normalizeEquation(mode, form.expression);
  try {
    validateGraphExpressions({ mode, expression: equation, xExpression: form.xExpression, yExpression: form.yExpression, zExpression: form.zExpression });
  } catch (err) {
    return fail("equation", err instanceof Error ? err.message : "Enter a valid equation.");
  }

  let normalizedGeometry;
  try {
    validateGraphGeometry(geometry);
    normalizedGeometry = geometry.map((element) => ({
      ...element,
      ...Object.fromEntries((GRAPH_ELEMENT_FIELDS[element.kind] || []).map((field) => [field, Number(element[field])])),
      ...(element.kind === "polygon" ? { vertices: element.vertices.map((point) => point.map(Number)), filled: Boolean(element.filled) } : {}),
      ...(element.kind === "segment" || element.kind === "ray" ? { showMeasure: Boolean(element.showMeasure) } : {}),
    }));
  } catch (err) {
    return fail("geometry", err instanceof Error ? err.message : "Check the geometry elements.");
  }

  return {
    ok: true,
    patch: {
      mode, expression: equation, xExpression: form.xExpression, yExpression: form.yExpression, zExpression: form.zExpression,
      tMin: parameters[0], tMax: parameters[1],
      uMin: surfaceParameters[0], uMax: surfaceParameters[1], vMin: surfaceParameters[2], vMax: surfaceParameters[3],
      xMin: ranges[0], xMax: ranges[1], yMin: ranges[2], yMax: ranges[3], zMin: vertical[0], zMax: vertical[1],
      azimuth: camera[0], elevation: camera[1], geometry: normalizedGeometry,
    },
  };
}
