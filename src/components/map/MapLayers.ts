import circle from "@turf/circle";

import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import { MAP_CONFIG } from "../../config/map.config";

import { createGrid, emptyGrid } from "../../features/grid/grid.factory";
import { lineString } from "@turf/helpers";
import bezierSpline from "@turf/bezier-spline";

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
  map.addSource("route-source", {
    type: "geojson",
    data: emptyGrid(),
  });

  // Lớp viền ngoài đường bay
  map.addLayer({
    id: "route-line-casing",
    type: "line",
    source: "route-source",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#0369a1",
      "line-width": 7,
      "line-opacity": 0.3,
    },
  });

  // Đường bay liên tục
  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route-source",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#00bfff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 3, 15, 4],
      "line-opacity": 1,
    },
  });

  // Source các waypoint
  map.addSource("points-source", {
    type: "geojson",
    data: emptyGrid(),
  });

  // Viền waypoint
  map.addLayer({
    id: "points-casing",
    type: "circle",
    source: "points-source",
    paint: {
      "circle-radius": 7,
      "circle-color": "#ffffff",
      "circle-stroke-color": "#0284c7",
      "circle-stroke-width": 1.5,
    },
  });

  // Tâm waypoint
  map.addLayer({
    id: "points-layer",
    type: "circle",
    source: "points-source",
    paint: {
      "circle-radius": 3.5,
      "circle-color": "#0284c7",
    },
  });

  // Nhãn waypoint
  map.addLayer({
    id: "points-label",
    type: "symbol",
    source: "points-source",
    layout: {
      "text-field": ["get", "name"],
      "text-size": 12,
      "text-font": ["Open Sans Semibold"],
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#0f172a",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    },
  });
}

export function updateFlightRoute(
  map: MapLibreMap,
  coordinates: [number, number][],
) {
  const source = map.getSource("route-source") as GeoJSONSource | undefined;

  if (!source) return;

  if (coordinates.length < 2) {
    source.setData(emptyGrid());
    return;
  }

  // Hai điểm thì chưa có khúc cua để nội suy
  if (coordinates.length === 2) {
    source.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates,
      },
    });

    return;
  }

  // Tạo đường bay gốc qua các waypoint
  const originalRoute = lineString(coordinates);

  // Nội suy đường cong Bezier
  const smoothRoute = bezierSpline(originalRoute, {
    sharpness: 0.75,
    resolution: 1000,
  });

  // Cập nhật đường bay
  source.setData(smoothRoute);
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
