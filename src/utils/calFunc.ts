import { point } from "@turf/helpers";
import distance from "@turf/distance";
import { Point } from "../components/MapTiler/types/map.types";

/**
 * Tính vận tốc từ 2 tọa độ.
 * @param previousPoint Điểm trước
 * @param currentPoint Điểm hiện tại
 * @param timeSeconds Thời gian di chuyển (giây)
 * @returns Vận tốc (m/s)
 */
export function calculateSpeed(
  previousPoint: Point | undefined,
  currentPoint: Point | undefined,
  timeSeconds: number = 30,
): number {
  if (
    timeSeconds <= 0 ||
    previousPoint === undefined ||
    currentPoint === undefined
  )
    return 0;

  const distanceMeters = distance(
    point([previousPoint.lng, previousPoint.lat]),
    point([currentPoint.lng, currentPoint.lat]),
    { units: "meters" },
  );

  return distanceMeters / timeSeconds;
}
