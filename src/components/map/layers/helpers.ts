import {
  Marker,
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
import type { Feature } from "geojson";

import type { LngLat } from "./constants";

export const getGeoJSONSource = (map: MapLibreMap, id: string) =>
  map.getSource(id) as GeoJSONSource | undefined;

export const toFeatureCollection = <T extends Feature>(features: T[]) => ({
  type: "FeatureCollection" as const,
  features,
});

// export const byZoom = (...stops: number[]) =>
//   ["interpolate", ["linear"], ["zoom"], ...stops] as ExpressionSpecification;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value: unknown) =>
  String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

// Đưa góc về khoảng (-180, 180]
export const normalizeAngle = (angle: number) => ((angle + 540) % 360) - 180;

/** Marker 0x0 đặt đúng tại tọa độ; các phần tử con định vị tuyệt đối quanh nó. */
export function createAnchorMarker(map: MapLibreMap, lngLat: LngLat) {
  const element = document.createElement("div");
  element.style.cssText = "width:0;height:0;pointer-events:none;";

  return new Marker({ element, anchor: "center" }).setLngLat(lngLat).addTo(map);
}
