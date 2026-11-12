
import type { Point } from "./route.types";

import {
  lngLatToMeters,
  metersToLngLat,
} from "../../utils/geo.utils";

export function createRoundedRoute(
  points: Point[],
  radius = 0.25,
  steps = 12
): [number, number][] {
  if (points.length < 3) {
    return points.map((p) => [p.lng, p.lat]);
  }

  const result: [number, number][] = [];

  const xy = points.map((p) =>
    lngLatToMeters(p.lng, p.lat)
  );

  result.push(
    metersToLngLat(xy[0].x, xy[0].y)
  );

  for (let i = 1; i < xy.length - 1; i++) {
    const A = xy[i - 1];
    const B = xy[i];
    const C = xy[i + 1];

    const dx1 = A.x - B.x;
    const dy1 = A.y - B.y;

    const dx2 = C.x - B.x;
    const dy2 = C.y - B.y;

    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);

    if (len1 === 0 || len2 === 0) continue;

    const cut = Math.min(
      len1 * radius,
      len2 * radius,
      200
    );

    const P1 = {
      x: B.x + (dx1 / len1) * cut,
      y: B.y + (dy1 / len1) * cut,
    };

    const P2 = {
      x: B.x + (dx2 / len2) * cut,
      y: B.y + (dy2 / len2) * cut,
    };

    result.push(
      metersToLngLat(P1.x, P1.y)
    );

    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      const mt = 1 - t;

      const x =
        mt * mt * P1.x +
        2 * mt * t * B.x +
        t * t * P2.x;

      const y =
        mt * mt * P1.y +
        2 * mt * t * B.y +
        t * t * P2.y;

      result.push(metersToLngLat(x, y));
    }
  }

  const last = xy[xy.length - 1];

  result.push(
    metersToLngLat(last.x, last.y)
  );

  return result;
}
