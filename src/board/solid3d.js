// Draws a solid with three.js into the board's canvas: lit, with its edges, optionally see-through, and with
// each size marked on it. Loaded only when a solid is on the board (see render.js), like the 3D graphs.
import * as THREE from "three";
import { dimensionLines, solidExtent, solidInfo, solidSizes } from "./solids.js";

const sceneCache = new Map();
let renderer;
let rendererUnavailable = false;

const FLAT = new Set(["cube", "cuboid", "pyramid", "prism"]);

function buildGeometry(kind, s, k) {
  switch (kind) {
    case "cube": return new THREE.BoxGeometry(s.a * k, s.a * k, s.a * k);
    case "cuboid": return new THREE.BoxGeometry(s.l * k, s.h * k, s.w * k);
    case "sphere": return new THREE.SphereGeometry(s.r * k, 64, 40);
    case "cylinder": return new THREE.CylinderGeometry(s.r * k, s.r * k, s.h * k, 80, 1);
    case "cone": return new THREE.ConeGeometry(s.r * k, s.h * k, 80, 1);
    case "pyramid": {
      const geometry = new THREE.ConeGeometry((s.a * k) / Math.SQRT2, s.h * k, 4, 1);
      geometry.rotateY(Math.PI / 4); // square base lined up with the axes
      return geometry;
    }
    default: {
      const b = s.b * k, t = s.t * k, l = s.l * k;
      const shape = new THREE.Shape([new THREE.Vector2(-b / 2, -t / 2), new THREE.Vector2(b / 2, -t / 2), new THREE.Vector2(0, t / 2)]);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: l, bevelEnabled: false });
      geometry.translate(0, 0, -l / 2);
      return geometry;
    }
  }
}

function circle(radius, plane) {
  const points = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const c = Math.cos(a) * radius, d = Math.sin(a) * radius;
    points.push(plane === "xz" ? new THREE.Vector3(c, 0, d) : plane === "xy" ? new THREE.Vector3(c, d, 0) : new THREE.Vector3(0, c, d));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

export function solidScene(o) {
  const kind = solidInfo(o.kind).id;
  const s = solidSizes(o);
  const color = typeof o.color === "string" && /^#[0-9a-f]{3,8}$/i.test(o.color) ? o.color : "#2540D9";
  const seeThrough = o.seeThrough === true;
  const edges = o.edges !== false;
  const key = JSON.stringify([kind, s, color, seeThrough, edges]);
  if (sceneCache.has(key)) {
    const hit = sceneCache.get(key);
    sceneCache.delete(key);
    sceneCache.set(key, hit);
    return hit;
  }

  const extent = solidExtent(o);
  const k = 2 / Math.max(extent.x, extent.y, extent.z); // the largest direction always spans 2 units
  const geometry = buildGeometry(kind, s, k);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#ffffff");
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a93a8, 2.1));
  const light = new THREE.DirectionalLight(0xffffff, 2.3);
  light.position.set(3, 5, 4);
  scene.add(light);

  const floor = new THREE.GridHelper(4, 8, 0xcfcdc5, 0xe4e2dc);
  floor.position.y = -(extent.y * k) / 2 - 0.005;
  scene.add(floor);

  const material = new THREE.MeshStandardMaterial({
    color, roughness: 0.58, metalness: 0, flatShading: FLAT.has(kind),
    transparent: seeThrough, opacity: seeThrough ? 0.3 : 1, depthWrite: !seeThrough,
    side: seeThrough ? THREE.DoubleSide : THREE.FrontSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, // lets the edges sit cleanly on the faces
  });
  scene.add(new THREE.Mesh(geometry, material));

  if (edges) {
    const ink = new THREE.LineBasicMaterial({ color: 0x17181c, transparent: true, opacity: 0.85 });
    if (kind === "sphere") {
      const soft = new THREE.LineBasicMaterial({ color: 0x17181c, transparent: true, opacity: 0.35 });
      const r = s.r * k;
      for (const plane of ["xz", "xy", "yz"]) scene.add(new THREE.Line(circle(r * 1.002, plane), soft));
    } else {
      scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 28), ink));
    }
  }

  const result = { scene, k, geometry, material };
  sceneCache.set(key, result);
  if (sceneCache.size > 16) {
    const oldestKey = sceneCache.keys().next().value;
    const oldest = sceneCache.get(oldestKey);
    oldest.geometry.dispose();
    oldest.material.dispose();
    sceneCache.delete(oldestKey);
  }
  return result;
}

export function cameraFor(o, aspect, radius = 1.75) {
  const camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 100);
  const azimuth = ((o.azimuth ?? 38) * Math.PI) / 180;
  const elevation = (Math.max(4, Math.min(86, o.elevation ?? 24)) * Math.PI) / 180;
  // Far enough back that the whole solid fits at any angle, in a wide view or a tall one
  const distance = Math.max(3.2, (radius * 1.22) / Math.tan((34 / 2) * (Math.PI / 180))) * Math.max(1, 1 / aspect);
  camera.position.set(
    distance * Math.cos(elevation) * Math.sin(azimuth),
    distance * Math.sin(elevation),
    distance * Math.cos(elevation) * Math.cos(azimuth),
  );
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

const MARK = "#1c32b4";

// Each size is drawn as a line on the solid with its label, on top of the 3D picture
export function drawDimensions(ctx, o, camera, k, rect) {
  const project = ([x, y, z]) => {
    const v = new THREE.Vector3(x * k, y * k, z * k).project(camera);
    return v.z > 1 ? null : { x: rect.x + (v.x * 0.5 + 0.5) * rect.width, y: rect.y + (-v.y * 0.5 + 0.5) * rect.height };
  };
  const size = Math.max(11, Math.min(15, rect.width / 26));
  ctx.save();
  ctx.font = `600 ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineCap = "round";
  for (const item of dimensionLines(o)) {
    const a = project(item.from);
    const b = project(item.to);
    if (!a || !b) continue;
    ctx.strokeStyle = MARK;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    for (const end of [a, b]) {
      ctx.beginPath();
      ctx.arc(end.x, end.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = MARK;
      ctx.fill();
    }
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const width = ctx.measureText(item.text).width + 12;
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.strokeStyle = MARK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(mx - width / 2, my - size * 0.85, width, size * 1.7, 6) : ctx.rect(mx - width / 2, my - size * 0.85, width, size * 1.7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = MARK;
    ctx.fillText(item.text, mx, my + 0.5);
  }
  ctx.restore();
}

/** Draw the solid into `rect` ({ x, y, width, height } in board units). Returns an error message, or null. */
export function drawSolid3d(ctx, o, rect) {
  if (rendererUnavailable) return "WebGL is unavailable in this browser.";
  try {
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setClearColor("#ffffff", 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    const { scene, k } = solidScene(o);
    // Render at the sharpness the screen shows (zoom and display density), within a sensible limit
    const m = ctx.getTransform();
    let scale = Math.min(3, Math.max(0.5, Math.hypot(m.a, m.b) || 1));
    scale = Math.min(scale, 2048 / Math.max(rect.width, rect.height));
    const width = Math.max(1, Math.round(rect.width * scale));
    const height = Math.max(1, Math.round(rect.height * scale));
    renderer.setSize(width, height, false);
    const extent = solidExtent(o);
    const camera = cameraFor(o, width / height, (Math.hypot(extent.x, extent.y, extent.z) * k) / 2);
    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, rect.x, rect.y, rect.width, rect.height);
    if (o.labels !== false) drawDimensions(ctx, o, camera, k, rect);
    return null;
  } catch (error) {
    if (!renderer) rendererUnavailable = true;
    return error instanceof Error ? error.message : "The 3D solid could not be drawn.";
  }
}
