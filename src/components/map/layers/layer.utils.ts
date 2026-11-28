import type { ExpressionSpecification } from "maplibre-gl";

export const byZoom = (...stops: number[]) =>
  ["interpolate", ["linear"], ["zoom"], ...stops] as ExpressionSpecification;
// Bán kính vùng hỏa lực trên mặt đất (m)

export const getFireZoneRadius = (range: number, altitude: number): number => {
  // Độ cao không hợp lệ => coi như ngoài tầm, không nháy nhầm
  if (!Number.isFinite(altitude) || altitude < 0) return 0;
  if (altitude >= range) return 0;
  return Math.sqrt(range * range - altitude * altitude);
};
