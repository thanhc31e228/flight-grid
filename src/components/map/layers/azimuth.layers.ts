import type { Map as MapLibreMap } from "maplibre-gl";

import { createAzimuth } from "../../../features/grid/azimuth.factory";
import { LngLat } from "./index";
import { byZoom } from "./layer.utils";

// prettier-ignore
const AZIMUTH_TEXT_SIZE = byZoom(
  4, 8,
  6, 10,
  8, 12,
  10, 14,
  12, 16,
  14, 18,
  16, 20,
);

const AZIMUTH_LAYER_IDS = [
  "azimuth-circle",
  "azimuth-ticks",
  "azimuth-labels",
  "azimuth-mil-labels",
];

// Vòng tròn phương vị
export function addAzimuthLayers(
  map: MapLibreMap,
  center: LngLat,
  radiusKm = 20,
) {
  const data = createAzimuth(center, radiusKm, 6);

  map.addSource("azimuth-circle-source", {
    type: "geojson",
    data: data.circle,
  });

  map.addLayer({
    id: "azimuth-circle",
    type: "line",
    source: "azimuth-circle-source",
    paint: {
      "line-color": "#0ea5e9",
      "line-width": 1.5,
      "line-opacity": 0.85,
    },
  });

  map.addSource("azimuth-ticks-source", {
    type: "geojson",
    data: data.ticks,
  });

  map.addLayer({
    id: "azimuth-ticks",
    type: "line",
    source: "azimuth-ticks-source",
    paint: {
      "line-color": "#0ea5e9",
      "line-width": ["case", ["==", ["get", "major"], true], 2, 1],
      "line-opacity": 0.9,
    },
  });

  map.addSource("azimuth-labels-source", {
    type: "geojson",
    data: data.labels,
  });

  const labelLayout = {
    "text-size": AZIMUTH_TEXT_SIZE,
    "text-anchor": "center",
    "text-allow-overlap": true,
    "text-ignore-placement": true,
  } as const;

  // Nhãn độ (°)
  map.addLayer({
    id: "azimuth-labels",
    type: "symbol",
    source: "azimuth-labels-source",
    filter: ["==", ["get", "kind"], "deg"],
    layout: {
      ...labelLayout,
      "text-field": ["concat", ["to-string", ["get", "degree"]], "°"],
      "text-font": ["Open Sans Semibold"],
    },
    paint: {
      "text-color": "#0369a1",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  });

  // Nhãn mil
  map.addLayer({
    id: "azimuth-mil-labels",
    type: "symbol",
    source: "azimuth-labels-source",
    filter: ["==", ["get", "kind"], "mil"],
    layout: {
      ...labelLayout,
      "text-field": ["get", "label"],
      "text-font": ["Open Sans Bold"],
    },
    paint: {
      "text-color": "#c2410c",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  });
}

/** Ẩn/hiện vòng tròn phương vị. */
export function toggleAzimuthLayers(map: MapLibreMap, visible: boolean) {
  const visibility = visible ? "visible" : "none";

  AZIMUTH_LAYER_IDS.forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visibility);
    }
  });
}
