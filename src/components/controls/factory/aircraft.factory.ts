import { AirCraft, Point } from "../../MapTiler/types/map.types";

export type AircraftSide = "friendly" | "enemy";

export const SIDE_CONFIG = {
  enemy: { prefix: 4, color: "#2563eb" },
  friendly: { prefix: 5, color: "#dc2626" },
} as const;

const DEFAULT_AIRCRAFT_CODE = "chưa xác định";
const DEFAULT_ALTITUDE = "chưa xác định";

export type AircraftDetails = {
  id: string;
  aircraftCode?: string;
  altitude?: string;
  appearanceTime?: string;
};

export function createAircraft(
  aircrafts: AirCraft[],
  side: AircraftSide,
  firstPoint: Point,
  details: AircraftDetails,
): AirCraft | null {
  const id = details.id.trim();

  // Không cho phép ID trống
  if (!id) return null;

  // Không cho phép ID trùng
  if (aircrafts.some((aircraft) => aircraft.id === id)) {
    return null;
  }
  // Lấy ID ô lưới cấp 3
  // const gridFeatures = map.queryRenderedFeatures(event.point, {
  //   layers: ["grid-level-3-fill"],
  // });
  return {
    id,
    color: SIDE_CONFIG[side].color,
    points: [firstPoint],
    aircraftCode: details.aircraftCode ?? DEFAULT_AIRCRAFT_CODE,
    altitude: details.altitude ?? DEFAULT_ALTITUDE,
    appearanceTime: details.appearanceTime ?? firstPoint.appearanceTime,
  };
}
