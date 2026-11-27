export type LngLat = [number, number];
export type LineStyle = { color: string; width: number; opacity: number };

export const EMPTY_FEATURE_COLLECTION = {
  type: "FeatureCollection" as const,
  features: [],
};

export const SOURCE = {
  grid: "grid-source",
  gridLabel: "grid-label-source",
  route: "route-source",
  aircraft: "aircraft-source",
  points: "points-source",
  places: "places-source",
} as const;

export const LAYER = {
  routeHitbox: "route-line-hitbox",
  routeHover: "route-line-hover",
} as const;
