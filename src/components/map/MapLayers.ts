import circle from "@turf/circle";
import centroid from "@turf/centroid";
import { lineString } from "@turf/helpers";
import {
  MapLayerMouseEvent,
  Marker,
  type ExpressionSpecification,
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
import type { Feature, LineString, Point } from "geojson";

import { MAP_CONFIG } from "../../config/map.config";
import { createGrid, emptyGrid } from "../../features/grid/grid.factory";
import { createAzimuth } from "../../features/grid/azimuth.factory";
import type { AirCraft } from "../MapTiler/types/map.types";
import { addMeasurementTool } from "../MapTiler/utils/measurement.tool";
import { addCursorTracker } from "../MapTiler/utils/cursor.tracker";

// =========================
// HẰNG SỐ & HÀM DÙNG CHUNG
// =========================

const EMPTY_FEATURE_COLLECTION = {
  type: "FeatureCollection" as const,
  features: [],
};

const SOURCE = {
  grid: "grid-source",
  gridLabel: "grid-label-source",
  route: "route-source",
  aircraft: "aircraft-source",
  points: "points-source",
} as const;

const getGeoJSONSource = (map: MapLibreMap, id: string) =>
  map.getSource(id) as GeoJSONSource | undefined;

// Giá trị thay đổi theo zoom: byZoom(zoom1, value1, zoom2, value2, ...)
const byZoom = (...stops: number[]) =>
  ["interpolate", ["linear"], ["zoom"], ...stops] as ExpressionSpecification;

const AZIMUTH_TEXT_SIZE = byZoom(
  4,
  8,
  6,
  10,
  8,
  12,
  10,
  14,
  12,
  16,
  14,
  18,
  16,
  20,
);

// undefined / null -> chuỗi rỗng (tránh hiện chữ "undefined" trên nhãn)
const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!,
  );

// =========================
// LƯỚI Ô VUÔNG
// =========================

// Mỗi ô vuông -> 1 điểm ở tâm ô (giữ nguyên properties) để label không bị nhân bản theo tile
function createGridLabelPoints(grid: ReturnType<typeof createGrid>) {
  return {
    type: "FeatureCollection" as const,
    features: grid.features.map((feature) => {
      const point = centroid(feature);
      point.properties = { ...(feature.properties ?? {}) };
      return point;
    }),
  };
}

// Cấp lưới phụ: lớp tô gần như trong suốt (để bắt sự kiện) + lớp viền
function addGridLevel(
  map: MapLibreMap,
  id: string,
  line: { color: string; width: number; opacity: number },
) {
  map.addSource(id, { type: "geojson", data: emptyGrid() });

  map.addLayer({
    id: `${id}-fill`,
    type: "fill",
    source: id,
    paint: { "fill-color": "#ffffff", "fill-opacity": 0.001 },
  });

  map.addLayer({
    id: `${id}-outline`,
    type: "line",
    source: id,
    paint: {
      "line-color": line.color,
      "line-width": line.width,
      "line-opacity": line.opacity,
    },
  });
}

export function addGridLayers(map: MapLibreMap) {
  const grid = createGrid();

  map.addSource(SOURCE.grid, { type: "geojson", data: grid });
  map.addSource(SOURCE.gridLabel, {
    type: "geojson",
    data: createGridLabelPoints(grid),
  });

  map.addLayer({
    id: "grid-fill",
    type: "fill",
    source: SOURCE.grid,
    paint: { "fill-color": "#ffffff", "fill-opacity": 0.001 },
  });

  map.addLayer({
    id: "grid-outline",
    type: "line",
    source: SOURCE.grid,
    paint: {
      "line-color": "#64748b",
      "line-width": 1,
      "line-opacity": 0.45,
    },
  });

  // Tọa độ của ô vuông
  map.addLayer({
    id: "grid-label",
    type: "symbol",
    source: SOURCE.gridLabel,
    layout: {
      "text-field": [
        "coalesce",
        ["get", "label"],
        ["to-string", ["*", ["get", "row"], ["get", "col"]]],
      ],
      "text-size": 16,
      "text-font": ["Open Sans Bold"],
      "text-anchor": "center",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#020617",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
      "text-opacity": 1,
    },
  });

  addGridLevel(map, "grid-level-2", {
    color: "#94a3b8",
    width: 0.8,
    opacity: 0.5,
  });
  addGridLevel(map, "grid-level-3", {
    color: "#64748b",
    width: 0.7,
    opacity: 0.55,
  });
}

// Cập nhật label cho các ô lưới
export function updateGridLabels(map: MapLibreMap, labels: string[]) {
  const source = getGeoJSONSource(map, SOURCE.grid);
  if (!source) return;

  const gridData = createGrid(labels);

  // Sắp xếp từ trên xuống dưới, trái sang phải
  const sortedFeatures = [...gridData.features].sort((a, b) => {
    const rowDiff = Number(a.properties?.row) - Number(b.properties?.row);
    if (rowDiff !== 0) return rowDiff;

    return Number(a.properties?.col) - Number(b.properties?.col);
  });

  // Gán label theo thứ tự; ô không có label tùy chỉnh thì quay về label mặc định
  sortedFeatures.forEach((feature, index) => {
    const properties = { ...(feature.properties ?? {}) };

    if (index < labels.length) {
      properties.label = labels[index];
    } else {
      delete properties.label;
    }

    feature.properties = properties;
  });

  source.setData(gridData);
  getGeoJSONSource(map, SOURCE.gridLabel)?.setData(
    createGridLabelPoints(gridData),
  );
}

// =========================
// ẢNH ICON
// =========================

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
  // Vẽ đúng tâm ảnh (25, 25) để khớp với icon-anchor "center"
  ctx.arc(size / 2, size / 2, 12, 0, Math.PI * 2);
  ctx.stroke();

  // SDF để đổi màu theo "icon-color"
  map.addImage("waypoint-circle", ctx.getImageData(0, 0, size, size), {
    sdf: true,
  });
}

function addHalfVImage(map: MapLibreMap) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <path d="M12 52 L52 12"
            stroke="#4e1010"
            stroke-width="10"
            stroke-linecap="round"
            fill="none"/>
    </svg>`;

  const img = new Image(64, 64);
  img.onload = () => {
    if (!map.hasImage("half-v")) {
      map.addImage("half-v", img);
    }
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// =========================
// NHÃN WAYPOINT ĐẦU TIÊN
// =========================
//
//   401)  ──0122──  ◯ 01
//          005
//
// Marker có kích thước 0x0 đặt đúng tâm vòng tròn, các phần tử bên trong
// dùng position:absolute để lệch ra xung quanh tâm.

// =========================
// HOVER: ĐƯỜNG BAY + NHÃN
// =========================
// Hai nguồn hover độc lập. Gộp lại để chuyển chuột từ đường sang nhãn
// (hoặc ngược lại) không bị nguồn này xóa mất hiệu ứng của nguồn kia.

const hoverState = {
  line: null as string | null,
  label: null as string | null,
};
let appliedHoverId = "";

function syncLabelHighlight() {
  const activeId = hoverState.label ?? hoverState.line;

  firstWaypointMarkers.forEach((marker, aircraftId) => {
    const active = aircraftId === activeId;

    marker
      .getElement()
      .querySelectorAll<HTMLElement>("[data-hit]")
      .forEach((el) => {
        el.style.background = active ? "rgba(255,255,255,0.85)" : "transparent";
        el.style.boxShadow = active ? "0 0 0 1.5px currentColor" : "none";
      });
  });
}

function setHover(
  map: MapLibreMap,
  source: "line" | "label",
  aircraftId: string | null,
) {
  hoverState[source] = aircraftId;

  const id = hoverState.label ?? hoverState.line ?? "";
  if (id === appliedHoverId) return;
  appliedHoverId = id;

  // Tô sáng đường bay (layer route-line-hover)
  if (map.getLayer("route-line-hover")) {
    map.setFilter("route-line-hover", ["==", ["get", "aircraftId"], id]);
  }

  // Tô sáng nhãn
  syncLabelHighlight();
}

function resetHover() {
  hoverState.line = null;
  hoverState.label = null;
  appliedHoverId = "";
}
const firstWaypointMarkers = new Map<string, Marker>();

function buildFirstWaypointHtml(
  aircraft: AirCraft,
  firstPoint: AirCraft["points"][number],
) {
  const color = escapeHtml(aircraft.color);

  // Viền trắng quanh chữ để đọc được trên mọi nền bản đồ
  const outline = "text-shadow:-1px 0 #fff,1px 0 #fff,0 -1px #fff,0 1px #fff;";

  return `
    <div data-hit style="
      position:absolute; right:8px; top:0;
      transform:translateY(-50%);
      display:flex; align-items:center; gap:2px;
      padding:1px 3px; border-radius:4px;
      white-space:nowrap; pointer-events:auto; cursor:pointer;
      color:${color}; font-weight:700; font-size:15px; ${outline}
    ">
      <span>${escapeHtml(aircraft.name)})</span>

      <div style="
        display:grid; grid-template-rows:auto 2px auto;
        min-width:56px; text-align:center;
        font-size:13px; line-height:1.15;
      ">
        <span>${escapeHtml(aircraft.aircraftCode)}</span>
        <span style="background:${color};"></span>
        <span>${escapeHtml(aircraft.altitude)}</span>
      </div>
    </div>

    <span data-hit style="
      position:absolute; left:7px; bottom:7px;
      padding:0 2px; border-radius:4px;
      white-space:nowrap; pointer-events:auto; cursor:pointer;
      color:${color}; font-weight:700; font-size:13px; ${outline}
    ">${escapeHtml(firstPoint.appearanceTime)}</span>`;
}

function updateFirstWaypointLabels(map: MapLibreMap, aircrafts: AirCraft[]) {
  const aircraftsWithPoints = aircrafts.filter(
    (aircraft) => aircraft.points.length > 0,
  );
  const activeIds = new Set(aircraftsWithPoints.map((aircraft) => aircraft.id));

  // Xóa nhãn của máy bay không còn
  firstWaypointMarkers.forEach((marker, id) => {
    if (activeIds.has(id)) return;

    marker.remove();
    firstWaypointMarkers.delete(id);

    if (hoverState.label === id) setHover(map, "label", null);
    if (hoverState.line === id) setHover(map, "line", null);
  });

  aircraftsWithPoints.forEach((aircraft) => {
    const [firstPoint] = aircraft.points;

    let marker = firstWaypointMarkers.get(aircraft.id);
    if (!marker) {
      const element = document.createElement("div");
      // Phần tử gốc 0x0 không nhận chuột, chỉ các phần tử con (data-hit) nhận
      element.style.cssText = "width:0;height:0;pointer-events:none;";

      // mouseenter/mouseleave của phần tử gốc vẫn kích hoạt khi chuột
      // vào các phần tử con, và không bị mất khi innerHTML được vẽ lại
      element.addEventListener("mouseenter", () =>
        setHover(map, "label", aircraft.id),
      );
      element.addEventListener("mouseleave", () =>
        setHover(map, "label", null),
      );

      marker = new Marker({ element, anchor: "center" })
        .setLngLat([firstPoint.lng, firstPoint.lat])
        .addTo(map);

      firstWaypointMarkers.set(aircraft.id, marker);
    }

    marker.setLngLat([firstPoint.lng, firstPoint.lat]);
    marker.getElement().innerHTML = buildFirstWaypointHtml(
      aircraft,
      firstPoint,
    );
  });

  // innerHTML vừa được vẽ lại nên cần áp lại màu tô sáng
  syncLabelHighlight();
}

function clearFirstWaypointLabels() {
  firstWaypointMarkers.forEach((marker) => marker.remove());
  firstWaypointMarkers.clear();
}

// =========================
// ĐƯỜNG BAY, MÁY BAY, WAYPOINT
// =========================

function addRouteLines(map: MapLibreMap) {
  map.addSource(SOURCE.route, {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  });

  const roundLine = { "line-cap": "round", "line-join": "round" } as const;

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

  // Vùng trong suốt, rộng hơn đường bay, để dễ bắt hover
  map.addLayer({
    id: "route-line-hitbox",
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

function addWaypointLayers(map: MapLibreMap) {
  addWaypointCircleImage(map);
  addHalfVImage(map);

  map.addSource(SOURCE.points, {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  });

  // Waypoint đầu: hình tròn, các waypoint còn lại: nửa chữ V
  map.addLayer({
    id: "points-layer",
    type: "symbol",
    source: SOURCE.points,
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

  // Thời gian xuất hiện bên dưới các waypoint thường.
  // Waypoint đầu hiển thị thời gian ở góc trên phải vòng tròn (xem nhãn Marker).
  map.addLayer({
    id: "points-label",
    type: "symbol",
    source: SOURCE.points,
    filter: ["!=", ["get", "isFirst"], true],
    layout: {
      "text-field": ["get", "appearanceTime"],
      "text-size": 15,
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

// Làm nổi bật đường bay khi rê chuột (lọc theo aircraftId)
function addRouteHoverLayer(map: MapLibreMap) {
  map.addLayer({
    id: "route-line-hover",
    type: "line",
    source: SOURCE.route,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#4bf035e8",
      "line-width": byZoom(4, 2, 8, 2.5, 12, 3, 16, 4),
      "line-opacity": 1,
    },
    filter: ["==", ["get", "aircraftId"], ""],
  });
}

export function addRouteLayers(map: MapLibreMap) {
  addRouteLines(map);
  addAircraftLayer(map);
  addWaypointLayers(map);
  addRouteHoverLayer(map);
}

export function addRouteHoverEvents(map: MapLibreMap) {
  const handleMouseMove = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = "pointer";

    const aircraftId = e.features?.[0]?.properties?.aircraftId;
    if (aircraftId === undefined) return;

    setHover(map, "line", String(aircraftId));
  };

  const handleMouseLeave = () => {
    map.getCanvas().style.cursor = "";
    setHover(map, "line", null);
  };

  map.on("mousemove", "route-line-hitbox", handleMouseMove);
  map.on("mouseleave", "route-line-hitbox", handleMouseLeave);

  return () => {
    map.off("mousemove", "route-line-hitbox", handleMouseMove);
    map.off("mouseleave", "route-line-hitbox", handleMouseLeave);
    resetHover();
  };
}

// Cập nhật đường bay và vị trí máy bay từ một danh sách tọa độ
export function updateFlightRoute(
  map: MapLibreMap,
  coordinates: [number, number][],
) {
  const routeSource = getGeoJSONSource(map, SOURCE.route);
  const aircraftSource = getGeoJSONSource(map, SOURCE.aircraft);
  if (!routeSource || !aircraftSource) return;

  // Không có điểm: xóa cả máy bay và đường bay
  if (coordinates.length === 0) {
    routeSource.setData(EMPTY_FEATURE_COLLECTION);
    aircraftSource.setData(EMPTY_FEATURE_COLLECTION);
    return;
  }

  const aircraft: Feature<Point> = {
    type: "Feature",
    properties: { type: "aircraft", name: "Aircraft", color: "#ef4444" },
    geometry: {
      type: "Point",
      coordinates: coordinates[coordinates.length - 1],
    },
  };

  aircraftSource.setData({ type: "FeatureCollection", features: [aircraft] });

  // Đường bay cần ít nhất 2 điểm
  routeSource.setData(
    coordinates.length >= 2
      ? lineString(coordinates, { color: "#ef4444" })
      : EMPTY_FEATURE_COLLECTION,
  );
}

export function updateWaypoints(map: MapLibreMap, aircrafts: AirCraft[]) {
  const pointsSource = getGeoJSONSource(map, SOURCE.points);
  const routeSource = getGeoJSONSource(map, SOURCE.route);
  const aircraftSource = getGeoJSONSource(map, SOURCE.aircraft);
  if (!pointsSource || !routeSource || !aircraftSource) return;

  const pointFeatures: Feature<Point>[] = [];
  const aircraftFeatures: Feature<Point>[] = [];
  const routeFeatures: Feature<LineString>[] = [];

  aircrafts.forEach((aircraft) => {
    const coordinates: [number, number][] = aircraft.points.map(
      (point, index) => {
        pointFeatures.push({
          type: "Feature",
          properties: {
            name: `${aircraft.id} - ${index + 1}`,
            aircraftId: aircraft.id,
            color: aircraft.color,
            isFirst: index === 0,
            // Lấy theo thông tin người dùng nhập (chưa nhập thì để rỗng)
            aircraftCode: aircraft.aircraftCode ?? "",
            altitude: aircraft.altitude ?? "",
            appearanceTime: point.appearanceTime,
          },
          geometry: { type: "Point", coordinates: [point.lng, point.lat] },
        });

        return [point.lng, point.lat];
      },
    );

    if (coordinates.length === 0) return;

    // Máy bay nằm ở waypoint cuối
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

    // Nối các waypoint khi có từ 2 điểm
    if (coordinates.length >= 2) {
      routeFeatures.push({
        type: "Feature",
        properties: { color: aircraft.color, aircraftId: aircraft.id },
        geometry: { type: "LineString", coordinates },
      });
    }
  });

  pointsSource.setData({ type: "FeatureCollection", features: pointFeatures });
  routeSource.setData({ type: "FeatureCollection", features: routeFeatures });
  aircraftSource.setData({
    type: "FeatureCollection",
    features: aircraftFeatures,
  });

  updateFirstWaypointLabels(map, aircrafts);
}

// =========================
// VÙNG SÂN BAY
// =========================

export function addAirportLayer(map: MapLibreMap) {
  const airportCircle = circle(
    MAP_CONFIG.CENTER,
    MAP_CONFIG.AIRPORT_RADIUS_KM,
    { steps: 128, units: "kilometers" },
  );

  map.addSource("kep-airport", { type: "geojson", data: airportCircle });

  // Vùng cấm / nguy hiểm
  map.addLayer({
    id: "kep-airport-fill",
    type: "fill",
    source: "kep-airport",
    paint: { "fill-color": "#ef4444", "fill-opacity": 0.22 },
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

// =========================
// VÒNG TRÒN PHƯƠNG VỊ (độ + mil)
// =========================

export function addAzimuthLayers(
  map: MapLibreMap,
  center: [number, number],
  radiusKm = 20,
) {
  const data = createAzimuth(center, radiusKm, 6);

  // Vòng tròn chung
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

  // Vạch chia chung
  map.addSource("azimuth-ticks-source", { type: "geojson", data: data.ticks });
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

  // Nhãn độ (ngoài) và mil (trong) dùng chung 1 source, phân biệt bằng "kind"
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

// =========================
// KHỞI TẠO
// =========================

// Thêm lưới, đường bay, sân bay, vòng phương vị và các công cụ đo.
// Trả về hàm dọn dẹp.
export function initializeMapLayers(map: MapLibreMap) {
  addGridLayers(map);
  addRouteLayers(map);
  addAirportLayer(map);

  const cleanupMeasurement = addMeasurementTool(map, MAP_CONFIG.CENTER_MIL);
  const cleanupCursor = addCursorTracker(map);

  addAzimuthLayers(map, MAP_CONFIG.CENTER_MIL, 40); // bán kính 40km
  const cleanupRouteHover = addRouteHoverEvents(map);
  return () => {
    cleanupRouteHover();
    cleanupMeasurement();
    cleanupCursor();
    clearFirstWaypointLabels();
  };
}
