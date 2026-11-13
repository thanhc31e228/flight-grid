import circle from "@turf/circle";

import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import { MAP_CONFIG } from "../../config/map.config";

import { createGrid, emptyGrid } from "../../features/grid/grid.factory";
import { lineString } from "@turf/helpers";
import bezierSpline from "@turf/bezier-spline";
import type { Feature, Point } from "geojson";
// hàm thêm các ô vuông
export function addGridLayers(map: MapLibreMap) {
  map.addSource("grid-source", {
    type: "geojson",
    data: createGrid(),
  });

  map.addLayer({
    id: "grid-fill",
    type: "fill",
    source: "grid-source",
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": 0.001,
    },
  });

  map.addLayer({
    id: "grid-outline",
    type: "line",
    source: "grid-source",
    paint: {
      "line-color": "#64748b",
      "line-width": 1,
      "line-opacity": 0.45,
    },
  });

  // hiển thị tọa độ của ô vuông
  map.addLayer({
    id: "grid-label",
    type: "symbol",
    source: "grid-source",
    layout: {
      "text-field": [
        "coalesce",
        ["get", "label"],
        ["to-string", ["*", ["get", "row"], ["get", "col"]]],
      ],
      "text-size": 11,
      "text-font": ["Open Sans Regular"],
      "text-anchor": "center",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#050e1c",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.2,
      "text-opacity": 0.8,
    },
  });

  map.addSource("grid-level-2", {
    type: "geojson",
    data: emptyGrid(),
  });

  map.addLayer({
    id: "grid-level-2-fill",
    type: "fill",
    source: "grid-level-2",
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": 0.001,
    },
  });

  map.addLayer({
    id: "grid-level-2-outline",
    type: "line",
    source: "grid-level-2",
    paint: {
      "line-color": "#94a3b8",
      "line-width": 0.8,
      "line-opacity": 0.5,
    },
  });

  map.addSource("grid-level-3", {
    type: "geojson",
    data: emptyGrid(),
  });

  map.addLayer({
    id: "grid-level-3-fill",
    type: "fill",
    source: "grid-level-3",
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": 0.001,
    },
  });

  map.addLayer({
    id: "grid-level-3-outline",
    type: "line",
    source: "grid-level-3",
    paint: {
      "line-color": "#64748b",
      "line-width": 0.7,
      "line-opacity": 0.55,
    },
  });
}
export function addRouteLayers(map: MapLibreMap) {
  // Đường bay
  map.addSource("route-source", {
    type: "geojson",
    data: emptyGrid(),
  });

  // Vùng glow bên ngoài
  map.addLayer({
    id: "route-glow",
    type: "line",
    source: "route-source",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#ef4444",
      "line-width": 13,
      "line-blur": 7,
      "line-opacity": 0.35,
    },
  });

  // Đường bay chính
  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route-source",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#ef4444",
      "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 3, 15, 4],
      "line-opacity": 0.95,
    },
  });

  // Hiệu ứng nét đứt chuyển động
  map.addLayer({
    id: "route-line-animation",
    type: "line",
    source: "route-source",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#fecaca",
      "line-width": 2,
      "line-opacity": 1,
      "line-dasharray": [0.5, 3],
    },
  });

  // Source máy bay địch
  map.addSource("enemy-aircraft-source", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  });

  // Vòng radar cảnh báo
  map.addLayer({
    id: "enemy-radar",
    type: "circle",
    source: "enemy-aircraft-source",
    paint: {
      "circle-radius": 18,
      "circle-color": "#ef4444",
      "circle-opacity": 0.12,
      "circle-stroke-color": "#ef4444",
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 0.8,
    },
  });

  // Điểm máy bay địch
  map.addLayer({
    id: "enemy-aircraft-icon",
    type: "symbol",
    source: "enemy-aircraft-source",
    layout: {
      "text-field": "✈",
      "text-font": ["Open Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 5, 20, 10, 28, 15, 36],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-rotation-alignment": "map",
      "text-rotate": ["get", "bearing"],
    },
    paint: {
      "text-color": "#ef4444",
      "text-halo-color": "#450a0a",
      "text-halo-width": 2,
      "text-opacity": 1,
    },
  });

  // Nhãn máy bay
  map.addLayer({
    id: "enemy-aircraft-label",
    type: "symbol",
    source: "enemy-aircraft-source",
    layout: {
      "text-field": "ENEMY AIRCRAFT",
      "text-size": 10,
      "text-font": ["Open Sans Semibold"],
      "text-offset": [0, 2.2],
      "text-anchor": "top",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#ef4444",
      "text-halo-color": "#0f172a",
      "text-halo-width": 2,
    },
  });

  // Waypoints
  map.addSource("points-source", {
    type: "geojson",
    data: emptyGrid(),
  });

  map.addLayer({
    id: "points-casing",
    type: "circle",
    source: "points-source",
    paint: {
      "circle-radius": 7,
      "circle-color": "#450a0a",
      "circle-stroke-color": "#ef4444",
      "circle-stroke-width": 2,
    },
  });

  map.addLayer({
    id: "points-layer",
    type: "circle",
    source: "points-source",
    paint: {
      "circle-radius": 3,
      "circle-color": "#fca5a5",
    },
  });

  map.addLayer({
    id: "points-label",
    type: "symbol",
    source: "points-source",
    layout: {
      "text-field": ["get", "name"],
      "text-size": 11,
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#fecaca",
      "text-halo-color": "#450a0a",
      "text-halo-width": 2,
    },
  });
}
export function updateFlightRoute(
  map: MapLibreMap,
  coordinates: [number, number][],
) {
  const routeSource = map.getSource("route-source") as
    | GeoJSONSource
    | undefined;

  const aircraftSource = map.getSource("enemy-aircraft-source") as
    | GeoJSONSource
    | undefined;

  if (!routeSource || !aircraftSource) return;

  if (coordinates.length < 2) {
    routeSource.setData(emptyGrid());

    aircraftSource.setData({
      type: "FeatureCollection",
      features: [],
    });

    return;
  }

  const originalRoute = lineString(coordinates);

  const smoothRoute = bezierSpline(originalRoute, {
    sharpness: 0.75,
    resolution: 1000,
  });

  routeSource.setData(smoothRoute);

  const routeCoordinates = smoothRoute.geometry.coordinates;

  const lastIndex = routeCoordinates.length - 1;

  const previousPoint = routeCoordinates[lastIndex - 1];
  const lastPoint = routeCoordinates[lastIndex];

  // Tính góc hướng máy bay
  const bearing =
    Math.atan2(
      lastPoint[0] - previousPoint[0],
      lastPoint[1] - previousPoint[1],
    ) *
    (180 / Math.PI);

  const aircraft: Feature<Point> = {
    type: "Feature",
    properties: {
      bearing,
      type: "enemy-aircraft",
    },
    geometry: {
      type: "Point",
      coordinates: lastPoint,
    },
  };

  aircraftSource.setData({
    type: "FeatureCollection",
    features: [aircraft],
  });
}
export function addAirportLayer(map: MapLibreMap) {
  const airportCircle = circle(
    MAP_CONFIG.CENTER,
    MAP_CONFIG.AIRPORT_RADIUS_KM,
    {
      steps: 128,
      units: "kilometers",
    },
  );

  map.addSource("kep-airport", {
    type: "geojson",
    data: airportCircle,
  });
  // Vùng sân bay - vùng cấm / nguy hiểm
  map.addLayer({
    id: "kep-airport-fill",
    type: "fill",
    source: "kep-airport",
    paint: {
      "fill-color": "#ef4444",
      "fill-opacity": 0.22,
    },
  });

  // Viền vùng cấm
  map.addLayer({
    id: "kep-airport-outline",
    type: "line",
    source: "kep-airport",
    paint: {
      "line-color": "#dc2626",
      "line-width": 2,
      "line-opacity": 0.9,
      "line-dasharray": [2, 1],
    },
  });
}

// hàm khởi tạo các thành phần trên map như grid, router, sân bay kép
export function initializeMapLayers(map: MapLibreMap) {
  addGridLayers(map);

  addRouteLayers(map);

  addAirportLayer(map);

  return animateFlightRoute(map);
}
// Cập nhật label cho các ô lưới
export function updateGridLabels(map: MapLibreMap, labels: string[]) {
  const source = map.getSource("grid-source") as GeoJSONSource | undefined;

  if (!source) return;

  // Lấy lại dữ liệu grid gốc
  const gridData = createGrid(labels);

  // Sắp xếp từ trên xuống dưới, trái sang phải
  const sortedFeatures = [...gridData.features].sort((a, b) => {
    const rowA = Number(a.properties?.row);
    const rowB = Number(b.properties?.row);

    if (rowA !== rowB) {
      return rowA - rowB;
    }

    const colA = Number(a.properties?.col);
    const colB = Number(b.properties?.col);

    return colA - colB;
  });

  // Gán label theo thứ tự đã sắp xếp
  sortedFeatures.forEach((feature, index) => {
    const properties = {
      ...(feature.properties ?? {}),
    };

    if (index < labels.length) {
      properties.label = labels[index];
    } else {
      // Xóa label tùy chỉnh để quay về label mặc định
      delete properties.label;
    }

    feature.properties = properties;
  });

  // Cập nhật dữ liệu GeoJSON
  source.setData(gridData);
}
export function animateFlightRoute(map: MapLibreMap) {
  let animationId = 0;
  let lastTime = 0;

  let phase = 0;

  const animate = (time: number) => {
    if (time - lastTime >= 60) {
      phase += 0.12;

      // Chạy nét sáng dọc đường bay
      if (map.getLayer("route-line-animation")) {
        const patterns = [
          [0.5, 3],
          [1, 2.5],
          [1.5, 2],
          [2, 1.5],
          [2.5, 1],
          [3, 0.5],
        ];

        const index = Math.floor(phase * 2) % patterns.length;

        map.setPaintProperty(
          "route-line-animation",
          "line-dasharray",
          patterns[index],
        );
      }

      // Nhấp nháy máy bay
      if (map.getLayer("enemy-aircraft-icon")) {
        const opacity = 0.5 + Math.abs(Math.sin(phase * 2)) * 0.5;

        map.setPaintProperty("enemy-aircraft-icon", "text-opacity", opacity);
      }

      // Radar lan rộng
      if (map.getLayer("enemy-radar")) {
        const radius = 12 + (Math.sin(phase) + 1) * 10;

        const opacity = 0.05 + (1 - Math.sin(phase)) * 0.1;

        map.setPaintProperty("enemy-radar", "circle-radius", radius);

        map.setPaintProperty("enemy-radar", "circle-opacity", opacity);
      }

      lastTime = time;
    }

    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(animationId);
  };
}
