import type { Map as MapLibreMap } from "maplibre-gl";

import { EMPTY_FEATURE_COLLECTION, LAYER, SOURCE } from "./constants";
import { routeHoverFilter, addWaypointLayers } from "./index";
import { byZoom } from "./layer.utils";

function addRouteLines(map: MapLibreMap) {
  map.addSource(SOURCE.route, {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  });

  const roundLine = {
    "line-cap": "round",
    "line-join": "round",
  } as const;

  map.addLayer({
    id: "route-line",
    type: "line",
    source: SOURCE.route,
    layout: roundLine,
    paint: {
      "line-color": ["get", "color"],
      "line-width": byZoom(4, 1, 8, 1.5, 12, 2, 16, 2.5),
      "line-opacity": 0.9,
    },
  });

  // Đường vô hình, dày hơn để dễ rê chuột vào
  map.addLayer({
    id: LAYER.routeHitbox,
    type: "line",
    source: SOURCE.route,
    layout: roundLine,
    paint: {
      "line-color": "#ffffff",
      "line-width": byZoom(4, 15, 8, 20, 12, 25, 16, 30),
      "line-opacity": 0,
    },
  });
}

function addAircraftLayer(map: MapLibreMap) {
  map.addSource(SOURCE.aircraft, {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  });

  map.addLayer({
    id: "aircraft-icon",
    type: "symbol",
    source: SOURCE.aircraft,
    layout: {
      "text-field": "✈",
      "text-font": ["Open Sans Regular"],
      "text-size": byZoom(5, 20, 10, 25, 15, 30),
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-rotation-alignment": "viewport",
    },
    paint: {
      "text-color": ["get", "color"],
      "text-halo-color": "#0f172a",
      "text-halo-width": 1.5,
    },
  });
}

function addRouteHoverLayer(map: MapLibreMap) {
  map.addLayer({
    id: LAYER.routeHover,
    type: "line",
    source: SOURCE.route,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#10340be8",
      "line-width": byZoom(4, 2, 8, 2.5, 12, 3, 16, 4),
      "line-opacity": 1,
    },
    filter: routeHoverFilter(""),
  });
}

export function addRouteLayers(map: MapLibreMap) {
  addRouteLines(map);
  addAircraftLayer(map);
  addWaypointLayers(map);
  addRouteHoverLayer(map);
}
