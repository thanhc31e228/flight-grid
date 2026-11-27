import type { ExpressionSpecification } from "maplibre-gl";

export const byZoom = (...stops: number[]) =>
  ["interpolate", ["linear"], ["zoom"], ...stops] as ExpressionSpecification;
