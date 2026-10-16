// Corner points of the polygon-like shapes (rectangle, diamond, triangle, hexagon, star, rounded rectangle).
export function shapeOutline(kind, x, y, w, h) {
  if (kind === "rect") return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  if (kind === "diamond") return [[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]];
  if (kind === "triangle") return [[x + w / 2, y], [x + w, y + h], [x, y + h]];
  if (kind === "hexagon") return [[x + w * 0.25, y], [x + w * 0.75, y], [x + w, y + h / 2], [x + w * 0.75, y + h], [x + w * 0.25, y + h], [x, y + h / 2]];
  if (kind === "star") {
    const points = [];
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? 1 : 0.45;
      points.push([x + w / 2 + Math.cos(angle) * w / 2 * radius, y + h / 2 + Math.sin(angle) * h / 2 * radius]);
    }
    return points;
  }
  if (kind === "roundedRect") {
    const radius = Math.min(12, w / 4, h / 4);
    const corners = [
      [x + w - radius, y + radius, -Math.PI / 2],
      [x + w - radius, y + h - radius, 0],
      [x + radius, y + h - radius, Math.PI / 2],
      [x + radius, y + radius, Math.PI],
    ];
    return corners.flatMap(([cx, cy, start]) =>
      Array.from({ length: 9 }, (_, i) => {
        const angle = start + (Math.PI / 2) * (i / 8);
        return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
      })
    );
  }
  return [];
}
