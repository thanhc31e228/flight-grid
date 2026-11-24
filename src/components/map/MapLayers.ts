import circle from "@turf/circle";
import centroid from "@turf/centroid";
import bearing from "@turf/bearing";
import { lineString } from "@turf/helpers";
import {
  Marker,
  type ExpressionSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import type { Feature, LineString, Point } from "geojson";

import { MAP_CONFIG } from "../../config/map.config";
import { createGrid, emptyGrid } from "../../features/grid/grid.factory";
import { createAzimuth } from "../../features/grid/azimuth.factory";
import type { AirCraft } from "../MapTiler/types/map.types";
import { addMeasurementTool } from "../MapTiler/utils/measurement.tool";
import { addCursorTracker } from "../MapTiler/utils/cursor.tracker";
import { smoothLine } from "../MapTiler/utils/smooth-line";
import { CENTER, DEFAULT_PLACES } from "../MapTiler/map.constants";
import {
  addPlaces,
  addPlacesLayers,
} from "../../features/places/places.layers";

// =========================
// CONSTANTS & SHARED HELPERS
// =========================

type LngLat = [number, number];
type LineStyle = { color: string; width: number; opacity: number };

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
  places: "places-source",
} as const;

const LAYER = {
  routeHitbox: "route-line-hitbox",
  routeHover: "route-line-hover",
} as const;

const FLIGHT_ROUTE_COLOR = "#ef4444";

const getGeoJSONSource = (map: MapLibreMap, id: string) =>
  map.getSource(id) as GeoJSONSource | undefined;

const toFeatureCollection = <T extends Feature>(features: T[]) => ({
  type: "FeatureCollection" as const,
  features,
});

const byZoom = (...stops: number[]) =>
  ["interpolate", ["linear"], ["zoom"], ...stops] as ExpressionSpecification;

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

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: unknown) =>
  String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/** Marker 0x0 đặt đúng tại tọa độ; các phần tử con định vị tuyệt đối quanh nó. */
function createAnchorMarker(map: MapLibreMap, lngLat: LngLat) {
  const element = document.createElement("div");
  element.style.cssText = "width:0;height:0;pointer-events:none;";

  return new Marker({ element, anchor: "center" }).setLngLat(lngLat).addTo(map);
}

// =========================
// GRID
// =========================

function createGridLabelPoints(grid: ReturnType<typeof createGrid>) {
  return toFeatureCollection(
    grid.features.map((feature) => {
      const point = centroid(feature);
      point.properties = { ...(feature.properties ?? {}) };
      return point;
    }),
  );
}

function addGridFillAndOutline(
  map: MapLibreMap,
  id: string,
  source: string,
  line: LineStyle,
) {
  // Fill gần như trong suốt, chỉ để bắt sự kiện chuột trên ô lưới
  map.addLayer({
    id: `${id}-fill`,
    type: "fill",
    source,
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": 0.001,
    },
  });

  map.addLayer({
    id: `${id}-outline`,
    type: "line",
    source,
    paint: {
      "line-color": line.color,
      "line-width": line.width,
      "line-opacity": line.opacity,
    },
  });
}

function addGridLevel(map: MapLibreMap, id: string, line: LineStyle) {
  map.addSource(id, {
    type: "geojson",
    data: emptyGrid(),
  });

  addGridFillAndOutline(map, id, id, line);
}

export function addGridLayers(map: MapLibreMap) {
  const grid = createGrid();

  map.addSource(SOURCE.grid, { type: "geojson", data: grid });
  map.addSource(SOURCE.gridLabel, {
    type: "geojson",
    data: createGridLabelPoints(grid),
  });

  addGridFillAndOutline(map, "grid", SOURCE.grid, {
    color: "#64748b",
    width: 1,
    opacity: 0.45,
  });

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
//quản lý GeoJSON source và dữ liệu.
// export function addPlaces(map: MapLibreMap, places: Place[]) {
//   const geojson: FeatureCollection<Point> = {
//     type: "FeatureCollection",
//     features: places.map((place) => ({
//       type: "Feature",
//       geometry: {
//         type: "Point",
//         coordinates: [place.lng, place.lat],
//       },
//       properties: {
//         id: place.id,
//         name: place.name,
//         phone: place.phone,
//       },
//     })),
//   };

//   const existingSource = map.getSource(SOURCE.places);

//   if (existingSource) {
//     (existingSource as GeoJSONSource).setData(geojson);
//     return;
//   }

//   map.addSource(SOURCE.places, {
//     type: "geojson",
//     data: geojson,
//   });
//   map.addLayer({
//     id: "places-layer",
//     type: "circle",
//     source: SOURCE.places,
//     paint: {
//       "circle-radius": 6,
//       "circle-color": "#ff9800",
//       "circle-stroke-width": 2,
//       "circle-stroke-color": "#ffffff",
//     },
//   });
// }
// //tạo marker, text tên, text SĐT và hiệu ứng nhấp nháy.
// export function addPlacesLayers(map: MapLibreMap) {
//   // Marker
//   if (!map.getLayer("places-point")) {
//     map.addLayer({
//       id: "places-point",
//       type: "circle",
//       source: SOURCE.places,
//       paint: {
//         "circle-radius": 6,
//         "circle-color": "#ff3030",
//         "circle-stroke-width": 2,
//         "circle-stroke-color": "#ffffff",
//         "circle-opacity": 1,
//         "circle-stroke-opacity": 1,
//       },
//     });
//   }

//   // Tên địa điểm
//   if (!map.getLayer("places-name")) {
//     map.addLayer({
//       id: "places-name",
//       type: "symbol",
//       source: SOURCE.places,
//       layout: {
//         "text-field": ["get", "name"],
//         "text-font": ["Open Sans Bold"],
//         "text-size": 14,
//         "text-anchor": "top",
//         "text-offset": [0, 1.2],
//         "text-allow-overlap": true,
//         "text-ignore-placement": true,
//       },
//       paint: {
//         "text-color": "#ffffff",
//         "text-halo-color": "#000000",
//         "text-halo-width": 2,
//       },
//     });
//   }

//   // Số điện thoại
//   if (!map.getLayer("places-phone")) {
//     map.addLayer({
//       id: "places-phone",
//       type: "symbol",
//       source: SOURCE.places,
//       layout: {
//         "text-field": ["get", "phone"],
//         "text-font": ["Open Sans Regular"],
//         "text-size": 12,
//         "text-anchor": "top",
//         "text-offset": [0, 2.4],
//         "text-allow-overlap": true,
//         "text-ignore-placement": true,
//       },
//       paint: {
//         "text-color": "#00e5ff",
//         "text-halo-color": "#000000",
//         "text-halo-width": 2,
//       },
//     });
//   }

//   // Hiệu ứng nhấp nháy marker
//   let visible = true;

//   const blinkInterval = window.setInterval(() => {
//     visible = !visible;

//     if (!map.getLayer("places-point")) return;

//     map.setPaintProperty("places-point", "circle-opacity", visible ? 1 : 0.2);

//     map.setPaintProperty(
//       "places-point",
//       "circle-stroke-opacity",
//       visible ? 1 : 0.3,
//     );
//   }, 500);

//   // Cleanup
//   return () => {
//     window.clearInterval(blinkInterval);
//   };
// }
export function updateGridLabels(map: MapLibreMap, labels: string[]) {
  const source = getGeoJSONSource(map, SOURCE.grid);
  if (!source) return;

  const gridData = createGrid(labels);

  // Sắp xếp theo hàng rồi theo cột để gán nhãn theo thứ tự
  const sortedFeatures = [...gridData.features].sort(
    (a, b) =>
      Number(a.properties?.row) - Number(b.properties?.row) ||
      Number(a.properties?.col) - Number(b.properties?.col),
  );

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
// WAYPOINT ICONS
// =========================

/** Thêm icon SDF (màu thật lấy từ `icon-color`, nên vẽ bằng màu trắng). */
function addSdfImage(
  map: MapLibreMap,
  name: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
) {
  if (map.hasImage(name)) return;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  draw(ctx, size);

  map.addImage(name, ctx.getImageData(0, 0, size, size), { sdf: true });
}

function addWaypointCircleImage(map: MapLibreMap) {
  addSdfImage(map, "waypoint-circle", 50, (ctx, size) => {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 12, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function addWaypointTickImage(map: MapLibreMap) {
  addSdfImage(map, "waypoint-tick", 64, (ctx, size) => {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2); // gốc vạch tại tâm
    ctx.lineTo(size - 4, size / 2); // đầu vạch bên phải
    ctx.stroke();
  });
}

// =========================
// HOVER STATE
// =========================

const hoverState = {
  line: null as string | null,
  label: null as string | null,
};

let appliedHoverId = "";
let appliedLabelHoverId = "";

/** Label đầu tiên của mỗi aircraft, key = aircraftId. */
const firstWaypointMarkers = new Map<string, Marker>();

/** Label được ưu tiên hơn đường bay; "" nghĩa là không có gì đang hover. */
const getActiveHoverId = () => hoverState.label ?? hoverState.line ?? "";

const routeHoverFilter = (aircraftId: string): FilterSpecification => [
  "==",
  ["get", "aircraftId"],
  aircraftId,
];

function setRouteHoverFilter(map: MapLibreMap, aircraftId: string) {
  if (map.getLayer(LAYER.routeHover)) {
    map.setFilter(LAYER.routeHover, routeHoverFilter(aircraftId));
  }
}

function setLabelHighlight(marker: Marker, active: boolean) {
  marker
    .getElement()
    .querySelectorAll<HTMLElement>("[data-hit]")
    .forEach((el) => {
      el.style.background = active ? "rgba(255,255,255,0.85)" : "transparent";
      el.style.boxShadow = active ? "0 0 0 1.5px currentColor" : "none";
    });
}

function syncLabelHighlight(force = false) {
  const activeId = getActiveHoverId();

  if (!force && activeId === appliedLabelHoverId) return;
  appliedLabelHoverId = activeId;

  firstWaypointMarkers.forEach((marker, aircraftId) => {
    setLabelHighlight(marker, aircraftId === activeId);
  });
}

function setHover(
  map: MapLibreMap,
  source: "line" | "label",
  aircraftId: string | null,
) {
  if (hoverState[source] === aircraftId) return;

  hoverState[source] = aircraftId;

  const activeId = getActiveHoverId();
  if (activeId !== appliedHoverId) {
    appliedHoverId = activeId;
    setRouteHoverFilter(map, activeId);
  }

  syncLabelHighlight();
}

function resetHover(map?: MapLibreMap) {
  hoverState.line = null;
  hoverState.label = null;

  appliedHoverId = "";
  appliedLabelHoverId = "";

  if (map) setRouteHoverFilter(map, "");

  firstWaypointMarkers.forEach((marker) => setLabelHighlight(marker, false));
}

// =========================
// FIRST WAYPOINT LABEL
// =========================

const TEXT_OUTLINE =
  "text-shadow:-1px 0 #fff,1px 0 #fff,0 -1px #fff,0 1px #fff;";

function buildFirstWaypointHtml(
  aircraft: AirCraft,
  firstPoint: AirCraft["points"][number],
  direction: "left" | "right",
) {
  const color = escapeHtml(aircraft.color);
  const isRight = direction === "right";

  const boxSide = isRight ? "left:8px;" : "right:8px;";
  const timeSide = isRight ? "right:7px;" : "left:7px;";
  const flexDir = isRight ? "row-reverse" : "row";
  const bracket = isRight ? "(" : ")";
  const bracketMargin = isRight
    ? "margin-left:-8px; margin-right:-2px;"
    : "margin-left:-2px; margin-right:-8px;";

  const bracketHtml = `<span style="font-size:25px; font-weight:300; line-height:0.5; ${bracketMargin}">${bracket}</span>`;
  const idHtml = escapeHtml(aircraft.id);
  const idWithBracket = isRight
    ? `${bracketHtml}${idHtml}`
    : `${idHtml}${bracketHtml}`;

  return `
  <div data-hit style="
    position:absolute; ${boxSide} top:0;
    transform:translateY(-50%);
    display:flex; flex-direction:${flexDir};
    align-items:center; gap:5px;
    padding:4px 0px; border-radius:6px;
    white-space:nowrap; pointer-events:auto; cursor:pointer;
    color:${color}; font-weight:700; font-size:16px;
    background:rgba(255,255,255,0.9);
    ${TEXT_OUTLINE}
  ">
    <span style="
      display:inline-flex; align-items:center;
      flex-direction:row;
      font-size:16px; font-weight:700; position:relative;
    ">${idWithBracket}</span>

    <div style="
      display:grid; grid-template-rows:auto 3px auto;
      min-width:80px; text-align:center;
      font-size:14px; line-height:1.3;
      gap:2px;
    ">
      <span>${escapeHtml(aircraft.aircraftCode)}</span>
      <span style="background:${color};"></span>
      <span>${escapeHtml(aircraft.altitude)}</span>
    </div>
  </div>

  <span data-hit style="
    position:absolute; ${timeSide} bottom:7px;
    padding:2px 5px; border-radius:4px;
    white-space:nowrap; pointer-events:auto; cursor:pointer;
    color:${color}; font-weight:700; font-size:14px;
    background:rgba(255,255,255,0.9);
    ${TEXT_OUTLINE}
  ">${escapeHtml(firstPoint.appearanceTime)}</span>
`;
}

/** Aircraft nằm bên phải tâm bản đồ thì label mở sang phải, ngược lại sang trái. */
function getAircraftLabelDirection(aircraftLng: number): "left" | "right" {
  return aircraftLng >= CENTER[0] ? "right" : "left";
}

function updateFirstWaypointLabels(map: MapLibreMap, aircrafts: AirCraft[]) {
  const aircraftsWithPoints = aircrafts.filter(
    (aircraft) => aircraft.points.length > 0,
  );
  const activeIds = new Set(aircraftsWithPoints.map((aircraft) => aircraft.id));

  // Xóa label của aircraft không còn tồn tại
  firstWaypointMarkers.forEach((marker, id) => {
    if (activeIds.has(id)) return;

    marker.remove();
    firstWaypointMarkers.delete(id);

    if (hoverState.label === id) setHover(map, "label", null);
    if (hoverState.line === id) setHover(map, "line", null);
  });

  aircraftsWithPoints.forEach((aircraft) => {
    const firstPoint = aircraft.points[0];
    const lngLat: LngLat = [firstPoint.lng, firstPoint.lat];

    let marker = firstWaypointMarkers.get(aircraft.id);

    if (!marker) {
      marker = createAnchorMarker(map, lngLat);

      const element = marker.getElement();
      element.addEventListener("mouseenter", () =>
        setHover(map, "label", aircraft.id),
      );
      element.addEventListener("mouseleave", () =>
        setHover(map, "label", null),
      );

      firstWaypointMarkers.set(aircraft.id, marker);
    }

    marker.setLngLat(lngLat);

    const html = buildFirstWaypointHtml(
      aircraft,
      firstPoint,
      getAircraftLabelDirection(firstPoint.lng),
    );
    const element = marker.getElement();

    // Chỉ rebuild DOM khi nội dung label thay đổi.
    if (element.dataset.labelHtml !== html) {
      element.innerHTML = html;
      element.dataset.labelHtml = html;
    }
  });

  syncLabelHighlight(true);
}

function clearFirstWaypointLabels() {
  firstWaypointMarkers.forEach((marker) => marker.remove());
  firstWaypointMarkers.clear();

  appliedLabelHoverId = "";
}

// =========================
// ROUTE / AIRCRAFT LAYERS
// =========================

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

// Góc giữa nửa vạch và đường bay (độ)
const TICK_ANGLE = 40;
// Góc rẽ phải tối thiểu (độ) để đổi vạch sang bên trái
const TICK_TURN_THRESHOLD = 40;

// Đưa góc về khoảng (-180, 180]
const normalizeAngle = (angle: number) => ((angle + 540) % 360) - 180;

// Góc xoay của nửa vạch tại điểm index
function getTickRotation(coordinates: LngLat[], index: number) {
  if (coordinates.length < 2) return 0;

  const prev = coordinates[Math.max(index - 1, 0)];
  const current = coordinates[index];
  const next = coordinates[Math.min(index + 1, coordinates.length - 1)];

  // Hướng tiếp tuyến của đường bay tại điểm
  const tangent = bearing(prev, next);

  // Mặc định (điểm đầu, điểm cuối, đường thẳng): vạch ở bên phải.
  // Điểm giữa đường bay: rẽ phải (turn > ngưỡng) => góc nhỏ ở bên phải
  // => vạch nằm bên trái (phía góc lớn); các trường hợp còn lại vạch bên phải.
  const isMiddlePoint = index > 0 && index < coordinates.length - 1;
  const turn = isMiddlePoint
    ? normalizeAngle(bearing(current, next) - bearing(prev, current))
    : 0;
  const side = turn > TICK_TURN_THRESHOLD ? "left" : "right";

  // Nửa vạch lùi về sau, lệch TICK_ANGLE so với đường bay
  const tickOffset = side === "right" ? -TICK_ANGLE : TICK_ANGLE;

  return tangent + 180 + tickOffset - 90;
}

function addWaypointLayers(map: MapLibreMap) {
  addWaypointCircleImage(map);
  addWaypointTickImage(map);

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
        "waypoint-tick",
      ],
      "icon-size": ["case", ["==", ["get", "isFirst"], true], 0.5, 0.4],
      "icon-rotate": ["get", "tickRotate"],
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
  map.addLayer({
    id: "points-label",
    type: "symbol",
    source: SOURCE.points,
    filter: ["!=", ["get", "isFirst"], true],
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
      "line-color": "#4bf035e8",
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

export function addRouteHoverEvents(map: MapLibreMap) {
  let cursorActive = false;

  const setPointerCursor = (active: boolean) => {
    if (cursorActive === active) return;

    map.getCanvas().style.cursor = active ? "pointer" : "";
    cursorActive = active;
  };

  const handleMouseMove = (e: MapLayerMouseEvent) => {
    const aircraftId = e.features?.[0]?.properties?.aircraftId;

    if (aircraftId === undefined || aircraftId === null) {
      setPointerCursor(false);
      setHover(map, "line", null);
      return;
    }

    setPointerCursor(true);
    setHover(map, "line", String(aircraftId));
  };

  const handleMouseLeave = () => {
    setPointerCursor(false);
    setHover(map, "line", null);
  };

  map.on("mousemove", LAYER.routeHitbox, handleMouseMove);
  map.on("mouseleave", LAYER.routeHitbox, handleMouseLeave);

  return () => {
    map.off("mousemove", LAYER.routeHitbox, handleMouseMove);
    map.off("mouseleave", LAYER.routeHitbox, handleMouseLeave);

    map.getCanvas().style.cursor = "";
    resetHover(map);
  };
}

// =========================
// FLIGHT ROUTE UPDATE
// =========================

// Cache theo map, tránh nhầm dữ liệu giữa nhiều map instance.
const flightRouteCache = new WeakMap<MapLibreMap, string>();

// Cache route-waypoint data theo map.
const waypointDataCache = new WeakMap<MapLibreMap, string>();

// Cache đường đã smooth theo map + aircraft.
const routeGeometryCache = new WeakMap<
  MapLibreMap,
  Map<string, { signature: string; coordinates: LngLat[] }>
>();

function getRouteCache(map: MapLibreMap) {
  let cache = routeGeometryCache.get(map);

  if (!cache) {
    cache = new Map();
    routeGeometryCache.set(map, cache);
  }

  return cache;
}

export function updateFlightRoute(map: MapLibreMap, coordinates: LngLat[]) {
  const routeSource = getGeoJSONSource(map, SOURCE.route);
  const aircraftSource = getGeoJSONSource(map, SOURCE.aircraft);

  if (!routeSource || !aircraftSource) return;

  const signature = JSON.stringify(coordinates);

  if (flightRouteCache.get(map) === signature) return;

  flightRouteCache.set(map, signature);

  // Hai API cùng dùng route/aircraft source:
  // invalidate cache updateWaypoints để tránh source bị stale.
  waypointDataCache.delete(map);

  if (coordinates.length === 0) {
    routeSource.setData(EMPTY_FEATURE_COLLECTION);
    aircraftSource.setData(EMPTY_FEATURE_COLLECTION);
    return;
  }

  const aircraft: Feature<Point> = {
    type: "Feature",
    properties: {
      type: "aircraft",
      name: "Aircraft",
      color: FLIGHT_ROUTE_COLOR,
    },
    geometry: {
      type: "Point",
      coordinates: coordinates[coordinates.length - 1],
    },
  };

  aircraftSource.setData(toFeatureCollection([aircraft]));

  routeSource.setData(
    coordinates.length >= 2
      ? lineString(coordinates, { color: FLIGHT_ROUTE_COLOR })
      : EMPTY_FEATURE_COLLECTION,
  );
}

// =========================
// WAYPOINT UPDATE
// =========================

function getSmoothedRoute(
  map: MapLibreMap,
  aircraftId: string,
  coordinates: LngLat[],
): LngLat[] {
  const cache = getRouteCache(map);
  const signature = JSON.stringify(coordinates);
  const cached = cache.get(aircraftId);

  if (cached?.signature === signature) {
    return cached.coordinates;
  }

  const smoothed = smoothLine(coordinates, 1.0, 24);

  cache.set(aircraftId, { signature, coordinates: smoothed });

  return smoothed;
}

/** Xóa cache đường smooth của aircraft đã bị loại bỏ. */
function pruneRouteCache(map: MapLibreMap, aircrafts: AirCraft[]) {
  const activeIds = new Set(aircrafts.map((aircraft) => aircraft.id));
  const cache = getRouteCache(map);

  cache.forEach((_, aircraftId) => {
    if (!activeIds.has(aircraftId)) {
      cache.delete(aircraftId);
    }
  });
}

function buildPointFeatures(
  aircraft: AirCraft,
  coordinates: LngLat[],
): Feature<Point>[] {
  return aircraft.points.map(
    (point, index): Feature<Point> => ({
      type: "Feature",
      properties: {
        name: `${aircraft.id} - ${index + 1}`,
        id: aircraft.id,
        coordinateGridId:
          point.coordinateGridId ?? `${aircraft.id} - ${index + 1}`,
        aircraftId: aircraft.id,
        color: aircraft.color,
        isFirst: index === 0,
        aircraftCode: aircraft.aircraftCode ?? "",
        altitude: aircraft.altitude ?? "",
        appearanceTime: point.appearanceTime,
        tickRotate: getTickRotation(coordinates, index),
      },
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
    }),
  );
}

export function updateWaypoints(map: MapLibreMap, aircrafts: AirCraft[]) {
  const pointsSource = getGeoJSONSource(map, SOURCE.points);
  const routeSource = getGeoJSONSource(map, SOURCE.route);
  const aircraftSource = getGeoJSONSource(map, SOURCE.aircraft);

  if (!pointsSource || !routeSource || !aircraftSource) return;

  const signature = JSON.stringify(aircrafts);

  if (waypointDataCache.get(map) === signature) return;

  waypointDataCache.set(map, signature);

  pruneRouteCache(map, aircrafts);

  // updateWaypoints là nguồn dữ liệu chính cho các source này.
  flightRouteCache.delete(map);

  const pointFeatures: Feature<Point>[] = [];
  const aircraftFeatures: Feature<Point>[] = [];
  const routeFeatures: Feature<LineString>[] = [];

  aircrafts.forEach((aircraft) => {
    // Tạo coordinates trước để tính bearing
    const coordinates = aircraft.points.map(
      (point): LngLat => [point.lng, point.lat],
    );

    pointFeatures.push(...buildPointFeatures(aircraft, coordinates));

    if (coordinates.length === 0) return;

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

    if (coordinates.length >= 2) {
      routeFeatures.push({
        type: "Feature",
        properties: {
          color: aircraft.color,
          aircraftId: aircraft.id,
        },
        geometry: {
          type: "LineString",
          coordinates: getSmoothedRoute(map, aircraft.id, coordinates),
        },
      });
    }
  });

  pointsSource.setData(toFeatureCollection(pointFeatures));
  routeSource.setData(toFeatureCollection(routeFeatures));
  aircraftSource.setData(toFeatureCollection(aircraftFeatures));

  updateFirstWaypointLabels(map, aircrafts);
}

// =========================
// Vùng hỏa lực đơn vị
// =========================

export function addFireZoneLayer(
  map: MapLibreMap,
  coordinates: [lng: number, lat: number],
) {
  const airportCircle = circle(coordinates, MAP_CONFIG.AIRPORT_RADIUS_KM, {
    steps: 128,
    units: "kilometers",
  });

  map.addSource("kep-airport", {
    type: "geojson",
    data: airportCircle,
  });

  map.addLayer({
    id: "kep-airport-fill",
    type: "fill",
    source: "kep-airport",
    paint: {
      "fill-color": "#ef4444",
      "fill-opacity": 0.22,
    },
  });

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
// AZIMUTH : vòng tròn phương vị
// =========================

const AZIMUTH_LAYER_IDS = [
  "azimuth-circle",
  "azimuth-ticks",
  "azimuth-labels",
  "azimuth-mil-labels",
];

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

// Lưu text-field gốc để khôi phục khi bật lại
const originalTextFields = new WeakMap<MapLibreMap, Map<string, unknown>>();

// Các layer của ứng dụng không được can thiệp
const EXCLUDED_LABEL_LAYERS = new Set(["grid-label", "points-layer"]);

export function togglePlaceLabel(map: MapLibreMap, visible: boolean) {
  const layers = map.getStyle()?.layers;
  if (!layers) return;

  let saved = originalTextFields.get(map);

  if (!saved) {
    saved = new Map();
    originalTextFields.set(map, saved);
  }

  layers.forEach((layer) => {
    // Chỉ xét symbol
    if (layer.type !== "symbol") return;

    // Bỏ qua layer của ứng dụng
    if (EXCLUDED_LABEL_LAYERS.has(layer.id)) return;

    // Chỉ xét layer có text-field
    const textField = map.getLayoutProperty(layer.id, "text-field");

    if (textField == null) return;

    // Lưu text-field gốc 1 lần
    if (!saved!.has(layer.id)) {
      saved!.set(layer.id, textField);
    }

    if (visible) {
      // Khôi phục text ban đầu
      map.setLayoutProperty(
        layer.id,
        "text-field",
        saved!.get(layer.id) as any,
      );
    } else {
      // Chỉ ẩn chữ, không ẩn toàn bộ layer
      map.setLayoutProperty(layer.id, "text-field", "");
    }
  });
}
// export function togglePlaceLabel(map: MapLibreMap, visible: boolean) {
//   const layers = map.getStyle().layers;
//   const visibility = visible ? "visible" : "none";
//   layers?.forEach((layer) => {
//     if (layer.type === "symbol") {
//       map.setLayoutProperty(layer.id, "visibility", visibility);
//     }
//   });
// }
// =========================
// INITIALIZATION & CLEANUP
// =========================

export function initializeMapLayers(map: MapLibreMap) {
  addGridLayers(map);
  addRouteLayers(map);
  addFireZoneLayer(map, MAP_CONFIG.BASE_COORDINATES);
  addPlaces(map, DEFAULT_PLACES);
  addPlacesLayers(map);

  const cleanupMeasurement = addMeasurementTool(map, MAP_CONFIG.CENTER_MIL);

  const cleanupCursor = addCursorTracker(map);

  addAzimuthLayers(map, MAP_CONFIG.CENTER_MIL, 40);

  const cleanupRouteHover = addRouteHoverEvents(map);

  return () => {
    cleanupRouteHover();
    cleanupMeasurement();
    cleanupCursor();
    clearFirstWaypointLabels();
    flightRouteCache.delete(map);
    waypointDataCache.delete(map);
    routeGeometryCache.delete(map);
    resetHover(map);
  };
}
