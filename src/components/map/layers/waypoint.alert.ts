import { distance } from "@turf/distance";
import type { Position } from "geojson";

export function isAircraftNearPoint(
  aircraftPosition: Position,
  targetPosition: Position,
  thresholdMeters: number,
): boolean {
  const meters = distance(aircraftPosition, targetPosition, {
    units: "metres",
  });

  return meters <= thresholdMeters;
}
