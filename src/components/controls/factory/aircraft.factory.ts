import { AirCraft, Point } from "../../MapTiler/types/map.types";

export type AircraftSide = "friendly" | "enemy";

const SIDE_CONFIG = {
  enemy: { prefix: 4, color: "#dc2626" },
  friendly: { prefix: 5, color: "#2563eb" },
} as const;

// Giá trị mặc định
const DEFAULT_AIRCRAFT_CODE = "chưa xác định";
const DEFAULT_ALTITUDE = "chưa xác định";

export type AircraftDetails = {
  aircraftCode?: string;
  altitude?: string;
  appearanceTime?: string;
};

function getNextAircraftId(
  aircrafts: AirCraft[],
  side: AircraftSide,
): string | null {
  const { prefix } = SIDE_CONFIG[side];
  const used = new Set(aircrafts.map((aircraft) => aircraft.id));

  for (let n = 1; n <= 99; n++) {
    const id = `${prefix}${String(n).padStart(2, "0")}`;
    if (!used.has(id)) return id;
  }

  return null;
}

export function createAircraft(
  aircrafts: AirCraft[],
  side: AircraftSide,
  firstPoint: Point,
  details?: AircraftDetails,
): AirCraft | null {
  const id = getNextAircraftId(aircrafts, side);
  if (!id) return null;

  return {
    id,
    color: SIDE_CONFIG[side].color,
    points: [firstPoint],
    aircraftCode: details?.aircraftCode ?? DEFAULT_AIRCRAFT_CODE,
    altitude: details?.altitude ?? DEFAULT_ALTITUDE,
    appearanceTime: firstPoint.appearanceTime,
  };
}
