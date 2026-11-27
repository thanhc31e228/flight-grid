export type AircraftSide = "friendly" | "enemy";

export const SIDE_CONFIG = {
  enemy: { prefix: 4, color: "#2563eb" },
  friendly: { prefix: 5, color: "#dc2626" },
} as const;
