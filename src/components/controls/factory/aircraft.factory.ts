import { AirCraft, Point } from "../../MapTiler/types/map.types";

export type AircraftSide = "friendly" | "enemy";

const SIDE_CONFIG = {
  enemy: { prefix: 4, color: "#dc2626" }, // 401, 402, ...
  friendly: { prefix: 5, color: "#2563eb" }, // 501, 502, ...
} as const;

// Giá trị mặc định cho máy bay mới
const DEFAULT_AIRCRAFT_CODE = undefined;
const DEFAULT_ALTITUDE = undefined;

// Id nhỏ nhất còn trống của phe đó (4xx hoặc 5xx). Đủ 99 máy bay thì trả về null.
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
): AirCraft | null {
  const id = getNextAircraftId(aircrafts, side);
  if (!id) return null;

  return {
    id,
    name: id, // name giống id
    color: SIDE_CONFIG[side].color,
    points: [firstPoint],
    aircraftCode: DEFAULT_AIRCRAFT_CODE,
    altitude: DEFAULT_ALTITUDE,
    appearanceTime: firstPoint.appearanceTime,
  };
}
