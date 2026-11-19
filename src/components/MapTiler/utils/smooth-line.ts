export type Position = [number, number];

/**
 * Bo tròn góc đường nối waypoint.
 *
 * cornerCut: tỷ lệ chiều dài đoạn đường được bo trước/sau waypoint.
 * curveSegments: số đoạn nhỏ để dựng đường cong.
 */
export function smoothLine(
  points: Position[],
  cornerCut = 0.25,
  curveSegments = 12,
): Position[] {
  if (points.length <= 2) return points;

  const result: Position[] = [];

  const lerp = (a: Position, b: Position, t: number): Position => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];

  const distance = (a: Position, b: Position) =>
    Math.hypot(b[0] - a[0], b[1] - a[1]);

  // Điểm đầu giữ nguyên
  result.push(points[0]);

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const next = points[i + 1];

    const d1 = distance(prev, current);
    const d2 = distance(current, next);

    if (d1 === 0 || d2 === 0) {
      result.push(current);
      continue;
    }

    // Tỷ lệ bo góc dựa trên đoạn ngắn hơn
    const cut = Math.min(d1, d2) * cornerCut;

    // Điểm bắt đầu bo góc (trước waypoint)
    const entry = lerp(current, prev, cut / d1);

    // Điểm kết thúc bo góc (sau waypoint)
    const exit = lerp(current, next, cut / d2);

    result.push(entry);

    // Quadratic Bezier:
    // entry -> current (control) -> exit
    for (let j = 1; j <= curveSegments; j++) {
      const t = j / curveSegments;
      const oneMinusT = 1 - t;

      const lng =
        oneMinusT * oneMinusT * entry[0] +
        2 * oneMinusT * t * current[0] +
        t * t * exit[0];

      const lat =
        oneMinusT * oneMinusT * entry[1] +
        2 * oneMinusT * t * current[1] +
        t * t * exit[1];

      result.push([lng, lat]);
    }
  }

  // Điểm cuối giữ nguyên
  result.push(points[points.length - 1]);

  return result;
}
