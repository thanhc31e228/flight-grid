import bearing from "@turf/bearing";

import type { LngLat } from "./constants";
import { normalizeAngle } from "./helpers";

// Góc giữa nửa vạch và đường bay (độ)
const TICK_ANGLE = 40;
// Góc rẽ phải tối thiểu (độ) để đổi vạch sang bên trái
const TICK_TURN_THRESHOLD = 40;

// Góc xoay của nửa vạch tại điểm index
export function getTickRotation(coordinates: LngLat[], index: number) {
  if (coordinates.length < 2) return 0;

  const prev = coordinates[Math.max(index - 1, 0)];
  const current = coordinates[index];
  const next = coordinates[Math.min(index + 1, coordinates.length - 1)];

  // Hướng tiếp tuyến của đường bay tại điểm
  const tangent = bearing(prev, next);

  // Mặc định (điểm đầu, điểm cuối, đường thẳng): vạch ở bên phải.
  // Điểm giữa đường bay: rẽ phải (turn > ngưỡng) => góc nhỏ ở bên phải
  // => vạch nằm bên trái (phía góc lớn); các trường hợp còn lại vạch bên phải.
  const isMiddlePoint = index > 0 && index < coordinates.length - 1;
  const turn = isMiddlePoint
    ? normalizeAngle(bearing(current, next) - bearing(prev, current))
    : 0;
  const side = turn > TICK_TURN_THRESHOLD ? "left" : "right";

  // Nửa vạch lùi về sau, lệch TICK_ANGLE so với đường bay
  const tickOffset = side === "right" ? -TICK_ANGLE : TICK_ANGLE;

  return tangent + 180 + tickOffset - 90;
}

export function getPlaneRotation(coordinates: LngLat[], index: number): number {
  if (coordinates.length < 2 || index <= 0 || index >= coordinates.length) {
    return 0;
  }

  const prev = coordinates[index - 1];
  const current = coordinates[index];

  if (!prev || !current) return 0;

  return normalizeAngle(bearing(prev, current));
}
