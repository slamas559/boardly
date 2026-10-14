import * as THREE from "three";
import { compileExpression, paramConstants, paramKey } from "./graphMath.js";

const sceneCache = new Map();
let renderer;
let rendererUnavailable = false;

function validRanges(graph) {
  const ranges = [graph.xMin, graph.xMax, graph.yMin, graph.yMax, graph.zMin, graph.zMax];
  if (!ranges.every(Number.isFinite) || graph.xMin >= graph.xMax || graph.yMin >= graph.yMax || graph.zMin >= graph.zMax) {
    throw new Error("Use valid x, y, and z ranges.");
  }
}

function normalizedPoint(x, y, z, graph) {
  return [
    (2 * (x - graph.xMin) / (graph.xMax - graph.xMin) - 1),
    (2 * (z - graph.zMin) / (graph.zMax - graph.zMin) - 1),
    (2 * (y - graph.yMin) / (graph.yMax - graph.yMin) - 1),
  ];
}

export function sampleSurfaceMesh(graph, divisions = 48) {
  if (!Number.isInteger(divisions) || divisions < 2 || divisions > 128) {
    throw new Error("Mesh resolution must be between 2 and 128.");
  }
  validRanges(graph);
  const evaluate = compileExpression(graph.expression, ["x", "y"], paramConstants(graph));
  const sample = (x, y) => [x, y, evaluate(x, y)];
  return sampleParametricGrid(graph, divisions, sample);
}

export function sampleParametricSurfaceMesh(graph, divisions = 32) {
  if (!Number.isInteger(divisions) || divisions < 2 || divisions > 128
    || ![graph.uMin, graph.uMax, graph.vMin, graph.vMax].every(Number.isFinite)
    || graph.uMin >= graph.uMax || graph.vMin >= graph.vMax) {
    throw new Error("Use valid u and v ranges and a mesh resolution between 2 and 128.");
  }
  validRanges(graph);
  const constants = paramConstants(graph);
  const x = compileExpression(graph.xExpression, ["u", "v"], constants);
  const y = compileExpression(graph.yExpression, ["u", "v"], constants);
  const z = compileExpression(graph.zExpression, ["u", "v"], constants);
  return sampleParametricGrid(graph, divisions, (u, v) => [x(u, v), y(u, v), z(u, v)], graph.uMin, graph.uMax, graph.vMin, graph.vMax);
}

function sampleParametricGrid(graph, divisions, evaluate, uMin = graph.xMin, uMax = graph.xMax, vMin = graph.yMin, vMax = graph.yMax) {
  const vertices = [];
  const indices = [];
  const valid = new Uint8Array((divisions + 1) ** 2);
  for (let row = 0; row <= divisions; row++) {
    const v = vMin + (vMax - vMin) * row / divisions;
    for (let column = 0; column <= divisions; column++) {
      const u = uMin + (uMax - uMin) * column / divisions;
      const index = row * (divisions + 1) + column;
      const [x, y, z] = evaluate(u, v);
      if ([x, y, z].every(Number.isFinite)
        && x >= graph.xMin && x <= graph.xMax
        && y >= graph.yMin && y <= graph.yMax
        && z >= graph.zMin && z <= graph.zMax) {
        vertices.push(...normalizedPoint(x, y, z, graph));
        valid[index] = 1;
      } else {
        vertices.push(0, 0, 0);
      }
    }
  }
  for (let row = 0; row < divisions; row++) {
    for (let column = 0; column < divisions; column++) {
      const a = row * (divisions + 1) + column;
      const b = a + 1;
      const c = a + divisions + 1;
      const d = c + 1;
      if (valid[a] && valid[b] && valid[c]) indices.push(a, c, b);
      if (valid[b] && valid[c] && valid[d]) indices.push(b, c, d);
    }
  }
  return { vertices, indices, divisions };
}

export function sampleParametricCurve3d(graph, divisions = 512) {
  if (!Number.isInteger(divisions) || divisions < 2 || divisions > 2048
    || !Number.isFinite(graph.tMin) || !Number.isFinite(graph.tMax) || graph.tMin >= graph.tMax) {
    throw new Error("Use a valid parameter range and a curve resolution between 2 and 2048.");
  }
  validRanges(graph);
  const constants = paramConstants(graph);
  const x = compileExpression(graph.xExpression, ["t"], constants);
  const y = compileExpression(graph.yExpression, ["t"], constants);
  const z = compileExpression(graph.zExpression, ["t"], constants);
  const vertices = [];
  const indices = [];
  let previous = -1;
  for (let i = 0; i <= divisions; i++) {
    const t = graph.tMin + (graph.tMax - graph.tMin) * i / divisions;
    const values = [x(t), y(t), z(t)];
    if (!values.every(Number.isFinite)
      || values[0] < graph.xMin || values[0] > graph.xMax
      || values[1] < graph.yMin || values[1] > graph.yMax
      || values[2] < graph.zMin || values[2] > graph.zMax) {
      previous = -1;
      continue;
    }
    const vertex = vertices.length / 3;
    vertices.push(...normalizedPoint(values[0], values[1], values[2], graph));
    if (previous >= 0) indices.push(previous, vertex);
    previous = vertex;
  }
  return { vertices, indices, divisions };
}

function graphScene(graph, color) {
  const key = JSON.stringify([
    graph.mode, graph.expression, graph.xExpression, graph.yExpression, graph.zExpression,
    graph.xMin, graph.xMax, graph.yMin, graph.yMax, graph.zMin, graph.zMax,
    graph.tMin, graph.tMax, graph.uMin, graph.uMax, graph.vMin, graph.vMax, color, paramKey(graph),
  ]);
  if (sceneCache.has(key)) return sceneCache.get(key);
  const sampled = graph.mode === "surface3d"
    ? sampleSurfaceMesh(graph)
    : graph.mode === "parametricSurface3d"
      ? sampleParametricSurfaceMesh(graph)
      : sampleParametricCurve3d(graph);
  if (sampled.indices.length === 0) throw new Error("No valid 3D geometry falls within the selected ranges.");

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(sampled.vertices, 3));
  geometry.setIndex(sampled.indices);
  if (graph.mode !== "curve3d") geometry.computeVertexNormals();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#ffffff");
  scene.add(new THREE.HemisphereLight(0xffffff, 0x75809a, 2));
  const light = new THREE.DirectionalLight(0xffffff, 2.4);
  light.position.set(3, 5, 4);
  scene.add(light);
  if (graph.mode === "curve3d") {
    scene.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, linewidth: 2 })));
  } else {
    scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color,
      roughness: 0.68,
      metalness: 0,
      side: THREE.DoubleSide,
    })));
    const grid = new THREE.GridHelper(2.4, 12, 0x586174, 0xd8dce5);
    grid.position.y = -1.04;
    scene.add(grid);
  }
  scene.add(new THREE.AxesHelper(1.15));
  const result = { scene, geometry };
  sceneCache.set(key, result);
  if (sceneCache.size > 12) {
    const oldestKey = sceneCache.keys().next().value;
    const oldest = sceneCache.get(oldestKey);
    oldest.geometry.dispose();
    oldest.scene.traverse((item) => {
      if (item.material) item.material.dispose();
    });
    sceneCache.delete(oldestKey);
  }
  return result;
}

export function drawGraph3d(ctx, graph, rect) {
  if (rendererUnavailable) return "WebGL is unavailable in this browser.";
  try {
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setClearColor("#ffffff", 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    const { scene } = graphScene(graph, graph.color || "#2540D9");
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const azimuth = (graph.azimuth ?? 42) * Math.PI / 180;
    const elevation = Math.max(12, Math.min(82, graph.elevation ?? 32)) * Math.PI / 180;
    const distance = 4.4;
    camera.position.set(
      distance * Math.cos(elevation) * Math.sin(azimuth),
      distance * Math.sin(elevation),
      distance * Math.cos(elevation) * Math.cos(azimuth),
    );
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, rect.x, rect.y, rect.width, rect.height);
    return null;
  } catch (error) {
    if (!renderer) rendererUnavailable = true;
    return error instanceof Error ? error.message : "The 3D graph could not be rendered.";
  }
}
