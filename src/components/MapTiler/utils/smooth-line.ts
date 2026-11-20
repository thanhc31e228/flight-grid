export type Position = [number, number];

/**
 * Catmull-Rom spline
 * - Đi qua tất cả waypoint
 * - Chuyển hướng mượt hơn
 * - Không bo góc độc lập từng waypoint
 *
 * smoothness:
 *   0.5 = ít cong
 *   1.0 = tự nhiên
 *   1.3 = cong mềm hơn
 */
export function smoothLine(
  points: Position[],
  smoothness = 1.0,
  curveSegments = 24,
): Position[] {
  if (points.length <= 2) return points;

  const result: Position[] = [];

  const subtract = (a: Position, b: Position): Position => [
    a[0] - b[0],
    a[1] - b[1],
  ];

  const add = (a: Position, b: Position): Position => [
    a[0] + b[0],
    a[1] + b[1],
  ];

  const scale = (p: Position, s: number): Position => [p[0] * s, p[1] * s];

  const tension = Math.max(0, smoothness);
  const segments = Math.max(4, curveSegments);

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // Ngoại suy điểm đầu/cuối để tangent không bị khựng
    const p0 = i === 0 ? subtract(scale(p1, 2), p2) : points[i - 1];

    const p3 =
      i + 2 >= points.length ? subtract(scale(p2, 2), p1) : points[i + 2];

    // Tangent Catmull-Rom
    const m1 = scale(subtract(p2, p0), tension / 6);
    const m2 = scale(subtract(p3, p1), tension / 6);

    // Cubic Bezier control points
    const c1 = add(p1, m1);
    const c2 = subtract(p2, m2);

    if (i === 0) {
      result.push(p1);
    }

    // Nội suy cubic Bezier từ p1 đến p2
    for (let j = 1; j <= segments; j++) {
      const t = j / segments;
      const u = 1 - t;

      const x =
        u * u * u * p1[0] +
        3 * u * u * t * c1[0] +
        3 * u * t * t * c2[0] +
        t * t * t * p2[0];

      const y =
        u * u * u * p1[1] +
        3 * u * u * t * c1[1] +
        3 * u * t * t * c2[1] +
        t * t * t * p2[1];

      result.push([x, y]);
    }
  }

  return result;
}
