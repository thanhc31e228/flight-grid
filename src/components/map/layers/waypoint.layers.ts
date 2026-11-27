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
  // Vòng lan cảnh báo 1
  map.addLayer({
    id: "waypoint-pulse-1",
    type: "circle",
    source: SOURCE.points,
    filter: ["==", ["get", "isLast"], true],
    paint: {
      "circle-radius": 8,
      "circle-color": "#ff0000",
      "circle-opacity": 0,
      "circle-stroke-color": "#ff2525",
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 0,
    },
  });

  // Vòng lan cảnh báo 2
  map.addLayer({
    id: "waypoint-pulse-2",
    type: "circle",
    source: SOURCE.points,
    filter: ["==", ["get", "isLast"], true],
    paint: {
      "circle-radius": 8,
      "circle-color": "#ff0000",
      "circle-opacity": 0,
      "circle-stroke-color": "#ff2525",
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 0,
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
      "text-offset": [0, 0.5], // Giảm khoảng cách giữa label time với
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
