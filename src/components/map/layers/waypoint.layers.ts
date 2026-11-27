import type { Map as MapLibreMap } from "maplibre-gl";

import { EMPTY_FEATURE_COLLECTION, SOURCE } from "./constants";
import { addWaypointImages } from "./index";
export function startWaypointPlaneBlink(map: MapLibreMap) {
  let frameId = 0;
  let startTime: number | null = null;

  const DURATION = 1200;
  const MIN_RADIUS = 4;
  const MAX_RADIUS = 15;

  function animate(now: number) {
    if (startTime === null) startTime = now;

    const elapsed = now - startTime;

    // Nháy máy bay
    const isRed = Math.floor(elapsed / 400) % 2 === 0;

    map.setPaintProperty("points-layer", "icon-color", [
      "case",
      ["==", ["get", "isLast"], true],
      isRed ? "#ff0000" : ["get", "color"],
      ["get", "color"],
    ]);

    // Tính tiến trình của mỗi vòng
    const progress1 = (elapsed % DURATION) / DURATION;
    const progress2 = ((elapsed + DURATION / 2) % DURATION) / DURATION;

    updatePulse("waypoint-pulse-1", progress1);
    updatePulse("waypoint-pulse-2", progress2);

    frameId = requestAnimationFrame(animate);
  }

  function updatePulse(layerId: string, progress: number) {
    const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * progress;

    // Vòng càng lan rộng càng mờ
    const opacity = 1 - progress;

    map.setPaintProperty(layerId, "circle-radius", radius);
    map.setPaintProperty(layerId, "circle-stroke-opacity", opacity);
    map.setPaintProperty(layerId, "circle-opacity", 0);
  }

  frameId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(frameId);

    map.setPaintProperty("points-layer", "icon-color", ["get", "color"]);

    for (const id of ["waypoint-pulse-1", "waypoint-pulse-2"]) {
      map.setPaintProperty(id, "circle-stroke-opacity", 0);
      map.setPaintProperty(id, "circle-opacity", 0);
    }
  };
}
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
