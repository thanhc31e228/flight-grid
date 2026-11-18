import circle from "@turf/circle";

import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import { MAP_CONFIG } from "../../config/map.config";

import { createGrid, emptyGrid } from "../../features/grid/grid.factory";
import { lineString } from "@turf/helpers";
import type { Feature, Point } from "geojson";
import { AirCraft } from "../MapTiler/types/map.types";

const EMPTY_FEATURE_COLLECTION = {
  type: "FeatureCollection" as const,
  features: [],
};

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

function addWaypointTriangleImage(map: MapLibreMap) {
  if (map.hasImage("waypoint-triangle")) return;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(60, 58);
  ctx.lineTo(4, 58);
  ctx.closePath();
  ctx.fill();

  const imageData = ctx.getImageData(0, 0, 64, 64);

  map.addImage("waypoint-triangle", imageData, {
    sdf: true,
  });
}

export function addRouteLayers(map: MapLibreMap) {
  // =========================
  // ROUTE SOURCE
  // =========================

  map.addSource("route-source", {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  });

  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route-source",

    layout: {
      "line-cap": "round",
      "line-join": "round",
    },

    paint: {
      "line-color": ["get", "color"],
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        4,
        1,
        8,
        1.5,
        12,
        2,
        16,
        2.5,
      ],
      "line-opacity": 0.9,
    },
  });

  // =========================
  // AIRCRAFT SOURCE
  // =========================

  map.addSource("aircraft-source", {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  });

  map.addLayer({
    id: "aircraft-icon",
    type: "symbol",
    source: "aircraft-source",

    layout: {
      "text-field": "✈",
      "text-font": ["Open Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 5, 20, 10, 25, 15, 30],
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

  // map.addLayer({
  //   id: "aircraft-label",
  //   type: "symbol",
  //   source: "aircraft-source",

  //   layout: {
  //     "text-field": ["get", "name"],
  //     "text-size": 9,
  //     "text-font": ["Open Sans Semibold"],
  //     "text-offset": [0, 2],
  //     "text-anchor": "top",
  //     "text-allow-overlap": true,
  //   },

  //   paint: {
  //     "text-color": ["get", "color"],
  //     "text-halo-color": "#0f172a",
  //     "text-halo-width": 1.5,
  //   },
  // });

  // =========================
  // WAYPOINT SOURCE
  // =========================

  // =========================
  // WAYPOINT SOURCE
  // =========================

  addWaypointTriangleImage(map);
  addWaypointCircleImage(map);
  map.addSource("points-source", {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  });
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <path d="M12 52 L52 12"
        stroke="#4e1010"
        stroke-width="10"
        stroke-linecap="round"
        fill="none"/>
</svg>
`;

  const img = new Image(64, 64);
  img.onload = () => {
    if (!map.hasImage("half-v")) {
      map.addImage("half-v", img);
    }
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  // Tam giác
  map.addLayer({
    id: "points-layer",
    type: "symbol",
    source: "points-source",
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "isFirst"], true],
        "waypoint-circle",
        "half-v",
      ],
      "icon-size": ["case", ["==", ["get", "isFirst"], true], 0.5, 0.2],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-anchor": "center",
    },
    paint: {
      "icon-color": ["get", "color"],
    },
  });

  // Waypoint label
  map.addLayer({
    id: "points-label",
    type: "symbol",
    source: "points-source",

    layout: {
      "text-field": ["get", "appearanceTime"], // label hiển thị ở tam giác
      "text-size": 15,
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      "text-allow-overlap": true,
    },

    paint: {
      "text-color": ["get", "color"],
      "text-halo-color": "#293184", // màu của time
      "text-halo-width": 2,
    },
  });
}
//Hàm này nhận danh sách tọa độ và cập nhật đường bay, vị trí máy bay.

export function updateFlightRoute(
  map: MapLibreMap,
  coordinates: [number, number][],
) {
  const routeSource = map.getSource("route-source") as
    | GeoJSONSource
    | undefined;

  const aircraftSource = map.getSource("aircraft-source") as
    | GeoJSONSource
    | undefined;

  if (!routeSource || !aircraftSource) return;

  // Không có điểm: xóa cả máy bay và đường bay
  if (coordinates.length === 0) {
    routeSource.setData(EMPTY_FEATURE_COLLECTION);
    aircraftSource.setData(EMPTY_FEATURE_COLLECTION);
    return;
  }

  // Lấy tọa độ cuối cùng
  const lastPoint = coordinates[coordinates.length - 1];

  // Luôn hiển thị máy bay khi có ít nhất một điểm
  const aircraft: Feature<Point> = {
    type: "Feature",
    properties: {
      type: "aircraft",
      name: "Aircraft",
      color: "#ef4444",
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

  // Chỉ vẽ đường bay khi có ít nhất 2 điểm
  if (coordinates.length >= 2) {
    const route = lineString(coordinates, {
      color: "#ef4444",
    });

    routeSource.setData(route);
  } else {
    // Một điểm thì không có đường nối
    routeSource.setData(EMPTY_FEATURE_COLLECTION);
  }
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

export function updateWaypoints(map: MapLibreMap, aircrafts: AirCraft[]) {
  const pointsSource = map.getSource("points-source") as
    | GeoJSONSource
    | undefined;

  const routeSource = map.getSource("route-source") as
    | GeoJSONSource
    | undefined;

  const aircraftSource = map.getSource("aircraft-source") as
    | GeoJSONSource
    | undefined;

  if (!pointsSource || !routeSource || !aircraftSource) return;

  const pointFeatures: Feature<Point>[] = [];
  const aircraftFeatures: Feature<Point>[] = [];
  const routeFeatures: Feature<GeoJSON.LineString>[] = [];

  aircrafts.forEach((aircraft) => {
    // Lấy tọa độ waypoint của từng máy bay
    const coordinates: [number, number][] = aircraft.points.map(
      (point, index) => {
        pointFeatures.push({
          type: "Feature",
          properties: {
            name: `${aircraft.id} - ${index + 1}`,
            aircraftId: aircraft.id,
            color: aircraft.color,
            isFirst: index === 0,
            aircraftCode: "0122",
            altitude: "005",
            appearanceTime: 5,
          },
          geometry: {
            type: "Point",
            coordinates: [point.lng, point.lat],
          },
        });

        return [point.lng, point.lat];
      },
    );

    // Máy bay luôn hiển thị nếu có ít nhất 1 waypoint
    if (coordinates.length > 0) {
      aircraftFeatures.push({
        type: "Feature",
        properties: {
          type: "aircraft",
          name: aircraft.id,
          color: aircraft.color,
        },
        geometry: {
          type: "Point",
          coordinates: coordinates[coordinates.length - 1],
        },
      });
    }

    // Nối các waypoint nếu có từ 2 điểm trở lên
    if (coordinates.length >= 2) {
      routeFeatures.push({
        type: "Feature",
        properties: {
          color: aircraft.color,
          aircraftId: aircraft.id,
        },
        geometry: {
          type: "LineString",
          coordinates,
        },
      });
    }
  });

  // Cập nhật waypoint
  pointsSource.setData({
    type: "FeatureCollection",
    features: pointFeatures,
  });

  // Cập nhật đường bay
  routeSource.setData({
    type: "FeatureCollection",
    features: routeFeatures,
  });

  // Cập nhật vị trí máy bay
  aircraftSource.setData({
    type: "FeatureCollection",
    features: aircraftFeatures,
  });
}
function addWaypointCircleImage(map: MapLibreMap) {
  if (map.hasImage("waypoint-circle")) return;

  const size = 50;
  const canvas = document.createElement("canvas");

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.arc(16, 16, 12, 0, Math.PI * 2);
  ctx.stroke();

  map.addImage("waypoint-circle", ctx.getImageData(0, 0, size, size), {
    sdf: true,
  });
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
