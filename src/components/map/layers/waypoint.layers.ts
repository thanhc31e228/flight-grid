import type { Map as MapLibreMap } from "maplibre-gl";

import { EMPTY_FEATURE_COLLECTION, SOURCE } from "./constants";
import { addWaypointImages } from "./index";

export function addWaypointLayers(map: MapLibreMap) {
  addWaypointImages(map);

  map.addSource(SOURCE.points, {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  });

  // Vạch ngang waypoint
  map.addLayer({
    id: "waypoint-ticks",
    type: "line",
    source: SOURCE.points,
    layout: { "line-cap": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 2,
      "line-opacity": 1,
    },
  });

  map.addLayer({
    id: "points-layer",
    type: "symbol",
    source: SOURCE.points,
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "isFirst"], true],
        "waypoint-circle",
        ["==", ["get", "isLast"], true],
        "waypoint-plane",
        "waypoint-tick",
      ],
      "icon-size": [
        "case",
        ["==", ["get", "isFirst"], true],
        0.5,
        ["==", ["get", "isLast"], true],
        0.4,
        0.4,
      ],
      "icon-rotate": [
        "case",
        ["==", ["get", "isLast"], true],
        ["get", "planeRotate"],
        ["get", "tickRotate"],
      ],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-anchor": "center",
    },
    paint: {
      "icon-color": ["get", "color"],
    },
  });

  // Giờ xuất hiện tại từng điểm (điểm đầu đã có label riêng dạng Marker)
  // Thời gian xuất hiện - chỉ hiện ở point STT lẻ (3, 5, 7...)
  map.addLayer({
    id: "points-label",
    type: "symbol",
    source: SOURCE.points,
    filter: ["==", ["get", "isShowTime"], true],
    layout: {
      "text-field": ["get", "appearanceTime"],
      "text-size": 8,
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": ["get", "color"],
      "text-halo-color": "#032b19",
      "text-halo-width": 0.5,
    },
  });
}
