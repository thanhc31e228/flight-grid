import type { ExpressionSpecification } from "maplibre-gl";

export const byZoom = (...stops: number[]) =>
  ["interpolate", ["linear"], ["zoom"], ...stops] as ExpressionSpecification;
// Bán kính vùng hỏa lực trên mặt đất (m)

export const getFireZoneRadius = (range: number, altitude: number): number => {
  //altitude , độ cao, range :tầm bắn
  if (altitude >= range) return 0; // máy bay ngoài tầm bắn
  return Math.sqrt(range * range - altitude * altitude);
};
