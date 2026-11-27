import { distance } from "@turf/distance";
import type { Position } from "geojson";

export function isAircraftNearPoint(
  aircraftPosition: Position,
  targetPosition: Position,
  thresholdMeters: number,
): boolean {
  const km = distance(aircraftPosition, targetPosition, {
    units: "metres",
  });

  return km <= thresholdMeters;
}
