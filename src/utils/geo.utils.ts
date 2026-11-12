
import { MAP_CONFIG } from "../config/map.config";

const [CENTER_LNG, CENTER_LAT] = MAP_CONFIG.CENTER;

export function getMetersPerDegree() {
  return {
    lat: 111320,
    lng:
      111320 *
      Math.cos((CENTER_LAT * Math.PI) / 180),
  };
}

export function metersToLngLat(
  x: number,
  y: number
): [number, number] {
  const meters = getMetersPerDegree();

  return [
    CENTER_LNG + x / meters.lng,
    CENTER_LAT + y / meters.lat,
  ];
}

export function lngLatToMeters(
  lng: number,
  lat: number
) {
  const meters = getMetersPerDegree();

  return {
    x: (lng - CENTER_LNG) * meters.lng,
    y: (lat - CENTER_LAT) * meters.lat,
  };
}
