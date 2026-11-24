import { MAP_CONFIG } from "../config/map.config";

export const BASE_COORDINATES_KEY = "base_coordinates";

export function getBaseCoordinates(): [number, number] {
  const saved = localStorage.getItem(BASE_COORDINATES_KEY);

  if (saved) {
    try {
      const coordinates = JSON.parse(saved);

      if (
        Array.isArray(coordinates) &&
        coordinates.length === 2 &&
        coordinates.every((value) => typeof value === "number")
      ) {
        return coordinates as [number, number];
      }
    } catch {
      // Dữ liệu lỗi thì fallback
    }
  }

  setBaseCoordinates(MAP_CONFIG.BASE_COORDINATES);
  return MAP_CONFIG.BASE_COORDINATES;
}

/** Lưu tọa độ trung tâm bản đồ */
export function setBaseCoordinates(coordinates: [number, number]): void {
  localStorage.setItem(BASE_COORDINATES_KEY, JSON.stringify(coordinates));
}
