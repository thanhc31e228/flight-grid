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
import { smoothLine } from "../MapTiler/utils/smooth-line";
import { CENTER } from "../MapTiler/map.constants";
import bearing from "@turf/bearing";
import { Place } from "../../features/places/place.types";

// =========================
// CONSTANTS & SHARED HELPERS
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

const escapeHtml = (value: unknown) =>
  String(value).replace(
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
// GRID
// =========================

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

function addGridLevel(
  map: MapLibreMap,
  id: string,
  line: { color: string; width: number; opacity: number },
) {
  map.addSource(id, {
    type: "geojson",
    data: emptyGrid(),
  });

  map.addLayer({
    id: `${id}-fill`,
    type: "fill",
    source: id,
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": 0.001,
    },
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

  map.addSource(SOURCE.grid, {
    type: "geojson",
    data: grid,
  });

  map.addSource(SOURCE.gridLabel, {
    type: "geojson",
    data: createGridLabelPoints(grid),
  });

  map.addLayer({
    id: "grid-fill",
    type: "fill",
    source: SOURCE.grid,
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": 0.001,
    },
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

export function updateGridLabels(map: MapLibreMap, labels: string[]) {
  const source = getGeoJSONSource(map, SOURCE.grid);
  if (!source) return;

  const gridData = createGrid(labels);

  const sortedFeatures = [...gridData.features].sort((a, b) => {
    const rowDiff = Number(a.properties?.row) - Number(b.properties?.row);

    if (rowDiff !== 0) return rowDiff;

    return Number(a.properties?.col) - Number(b.properties?.col);
  });

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
  ctx.arc(size / 2, size / 2, 12, 0, Math.PI * 2);
  ctx.stroke();

  map.addImage("waypoint-circle", ctx.getImageData(0, 0, size, size), {
    sdf: true,
  });
}

function addWaypointTickImage(map: MapLibreMap) {
  if (map.hasImage("waypoint-tick")) return;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.strokeStyle = "#ffffff"; // SDF: màu thật lấy từ icon-color
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(size / 2, size / 2); // gốc vạch tại tâm
  ctx.lineTo(size - 4, size / 2); // đầu vạch bên phải
  ctx.stroke();

  map.addImage("waypoint-tick", ctx.getImageData(0, 0, size, size), {
    sdf: true,
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

const firstWaypointMarkers = new Map<string, Marker>();

function syncLabelHighlight(force = false) {
  const activeId = hoverState.label ?? hoverState.line;

  if (!force && activeId === appliedLabelHoverId) return;
  appliedLabelHoverId = activeId ?? "";

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
  if (hoverState[source] === aircraftId) return;

  hoverState[source] = aircraftId;

  const activeId = hoverState.label ?? hoverState.line ?? "";

  if (activeId !== appliedHoverId) {
    appliedHoverId = activeId;

    if (map.getLayer("route-line-hover")) {
      map.setFilter("route-line-hover", [
        "==",
        ["get", "aircraftId"],
        activeId,
      ]);
    }
  }

  syncLabelHighlight();
}

function resetHover(map?: MapLibreMap) {
  hoverState.line = null;
  hoverState.label = null;

  appliedHoverId = "";
  appliedLabelHoverId = "";

  if (map?.getLayer("route-line-hover")) {
    map.setFilter("route-line-hover", ["==", ["get", "aircraftId"], ""]);
  }

  firstWaypointMarkers.forEach((marker) => {
    marker
      .getElement()
      .querySelectorAll<HTMLElement>("[data-hit]")
      .forEach((el) => {
        el.style.background = "transparent";
        el.style.boxShadow = "none";
      });
  });
}

// =========================
// FIRST WAYPOINT LABEL
// =========================
// =========================
// LOCATION LABEL (địa điểm cố định + số điện thoại)
// =========================

interface LocationLabel {
  id: string;
  name: string;
  phone?: string;
  lng: number;
  lat: number;
  side?: "left" | "right"; // label nằm bên nào so với điểm
}

const LOCATION_LABELS: LocationLabel[] = [
  {
    id: "bchqs",
    name: "BCHQS",
    phone: "0xxx xxx xxx", // thay số điện thoại thật
    lng: 106.265561, // lưu ý: lng trước, lat sau
    lat: 21.363411,
    side: "left",
  },
];

const locationMarkers = new Map<string, Marker>();

// Kích thước đường kẻ (pixel)
const LEADER_STUB = 30; // đoạn dựng đứng từ điểm đi lên
const LEADER_RUN = 70; // đoạn xiên đi ngang sang trái/phải
const LEADER_LIFT = 10; // đoạn xiên nhích lên thêm

function buildLocationHtml(loc: LocationLabel) {
  const isRight = loc.side === "right";
  const sign = isRight ? 1 : -1;

  const endX = sign * LEADER_RUN;
  const endY = -(LEADER_STUB + LEADER_LIFT);

  // Ô label: cạnh sát đầu đường kẻ, căn giữa theo chiều dọc
  const boxPos = isRight
    ? `left:${endX}px; transform:translate(0,-50%);`
    : `left:${endX}px; transform:translate(-100%,-50%);`;

  const phone = loc.phone
    ? `<div style="font-size:13px; font-weight:500; margin-top:2px;">
         ☎ <a href="tel:${escapeHtml(loc.phone.replace(/\s/g, ""))}"
              style="color:#0369a1; text-decoration:none;">
           ${escapeHtml(loc.phone)}
         </a>
       </div>`
    : "";

  return `
    <svg width="1" height="1"
      style="position:absolute; left:0; top:0; overflow:visible; pointer-events:none;">
      <polyline
        points="0,0 0,${-LEADER_STUB} ${endX},${endY}"
        fill="none" stroke="#0f172a" stroke-width="2"
        stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="0" cy="0" r="4" fill="#0f172a" stroke="#fff" stroke-width="1.5" />
    </svg>

    <div style="
      position:absolute; top:${endY}px; ${boxPos}
      padding:4px 10px; white-space:nowrap; pointer-events:auto;
      background:#fff; border:2px solid #0f172a; border-radius:4px;
      color:#0f172a; text-align:center; line-height:1.3;
    ">
      <div style="font-size:16px; font-weight:700;">${escapeHtml(loc.name)}</div>
      ${phone}
    </div>
  `;
}

//==========================
//   LOCATION MARKER
//=========================

export function addLocationLabels(map: MapLibreMap, places: Place[]) {
  places.forEach((loc) => {
    const element = document.createElement("div");

    // Phần tử gốc 0x0 nằm đúng tại tọa độ, các phần con định vị tuyệt đối quanh nó
    element.style.cssText = "width:0;height:0;pointer-events:none;";
    element.innerHTML = buildLocationHtml(loc);

    const marker = new Marker({ element, anchor: "center" })
      .setLngLat([loc.lng, loc.lat])
      .addTo(map);

    locationMarkers.set(loc.id, marker);
  });

  return () => {
    locationMarkers.forEach((marker) => marker.remove());
    locationMarkers.clear();
  };
}
function buildFirstWaypointHtml(
  aircraft: AirCraft,
  firstPoint: AirCraft["points"][number],
  direction: "left" | "right",
) {
  const color = escapeHtml(aircraft.color);
  const isRight = direction === "right";

  const outline = "text-shadow:-1px 0 #fff,1px 0 #fff,0 -1px #fff,0 1px #fff;";

  const boxSide = isRight ? "left:8px;" : "right:8px;";
  const timeSide = isRight ? "right:7px;" : "left:7px;";
  const flexDir = isRight ? "row-reverse" : "row";
  const bracket = isRight ? "(" : ")";

  const bracketMargin = isRight
    ? "margin-left:-8px; margin-right:-2px;"
    : "margin-left:-2px; margin-right:-8px;";

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
    ${outline}
  ">
    <span style="
      display:inline-flex; align-items:center;
      flex-direction:row;
      font-size:16px; font-weight:700; position:relative;
    ">
      ${
        isRight
          ? `<span style="font-size:25px; font-weight:300; line-height:0.5; ${bracketMargin}">${bracket}</span>`
          : ""
      }
      ${escapeHtml(aircraft.id)}
      ${
        !isRight
          ? `<span style="font-size:25px; font-weight:300; line-height:0.5; ${bracketMargin}">${bracket}</span>`
          : ""
      }
    </span>

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
    ${outline}
  ">${escapeHtml(firstPoint.appearanceTime)}</span>
`;
}

function getAircraftLabelDirection(
  map: MapLibreMap,
  aircraftLng: number,
): "left" | "right" {
  const centerLng = CENTER[0];

  return aircraftLng >= centerLng ? "right" : "left";
}

function updateFirstWaypointLabels(map: MapLibreMap, aircrafts: AirCraft[]) {
  const aircraftsWithPoints = aircrafts.filter(
    (aircraft) => aircraft.points.length > 0,
  );

  const activeIds = new Set(aircraftsWithPoints.map((aircraft) => aircraft.id));

  firstWaypointMarkers.forEach((marker, id) => {
    if (activeIds.has(id)) return;

    marker.remove();
    firstWaypointMarkers.delete(id);

    if (hoverState.label === id) {
      setHover(map, "label", null);
    }

    if (hoverState.line === id) {
      setHover(map, "line", null);
    }
  });

  aircraftsWithPoints.forEach((aircraft) => {
    const firstPoint = aircraft.points[0];

    let marker = firstWaypointMarkers.get(aircraft.id);

    if (!marker) {
      const element = document.createElement("div");

      element.style.cssText = "width:0;height:0;pointer-events:none;";

      element.addEventListener("mouseenter", () => {
        setHover(map, "label", aircraft.id);
      });

      element.addEventListener("mouseleave", () => {
        setHover(map, "label", null);
      });

      marker = new Marker({
        element,
        anchor: "center",
      })
        .setLngLat([firstPoint.lng, firstPoint.lat])
        .addTo(map);

      firstWaypointMarkers.set(aircraft.id, marker);
    }

    const direction = getAircraftLabelDirection(map, firstPoint.lng);

    marker.setLngLat([firstPoint.lng, firstPoint.lat]);

    const html = buildFirstWaypointHtml(aircraft, firstPoint, direction);

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

// Góc giữa nửa vạch và đường bay (độ)
const TICK_ANGLE = 40;

// Đưa góc về khoảng (-180, 180]
const normalizeAngle = (angle: number) => ((angle + 540) % 360) - 180;

// Góc xoay của nửa vạch tại điểm index
function getTickRotation(coordinates: [number, number][], index: number) {
  if (coordinates.length < 2) return 0;

  const prev = coordinates[Math.max(index - 1, 0)];
  const current = coordinates[index];
  const next = coordinates[Math.min(index + 1, coordinates.length - 1)];

  // Hướng tiếp tuyến của đường bay tại điểm
  const tangent = bearing(prev, next);

  // Mặc định (điểm đầu, điểm cuối, đường thẳng): vạch ở bên phải
  let side: "left" | "right" = "right";

  if (index > 0 && index < coordinates.length - 1) {
    // turn > 40: rẽ phải => góc nhỏ ở bên phải => vạch ở bên trái (góc lớn)
    // turn < 40: rẽ trái => góc nhỏ ở bên trái => vạch ở bên phải (góc lớn)
    const turn = normalizeAngle(
      bearing(current, next) - bearing(prev, current),
    );

    if (turn > 40) side = "left";
  }

  // Nửa vạch lùi về sau, lệch TICK_ANGLE so với đường bay
  return side === "right"
    ? tangent + 180 - TICK_ANGLE - 90
    : tangent + 180 + TICK_ANGLE - 90;
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
    paint: {
      "line-color": ["get", "color"],
      "line-width": 2,
      "line-opacity": 1,
    },
    layout: {
      "line-cap": "round",
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

function addRouteHoverLayer(map: MapLibreMap) {
  map.addLayer({
    id: "route-line-hover",
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
  let cursorActive = false;

  const handleMouseMove = (e: MapLayerMouseEvent) => {
    const aircraftId = e.features?.[0]?.properties?.aircraftId;

    if (aircraftId === undefined || aircraftId === null) {
      if (cursorActive) {
        map.getCanvas().style.cursor = "";
        cursorActive = false;
      }

      setHover(map, "line", null);
      return;
    }

    if (!cursorActive) {
      map.getCanvas().style.cursor = "pointer";
      cursorActive = true;
    }

    setHover(map, "line", String(aircraftId));
  };

  const handleMouseLeave = () => {
    if (cursorActive) {
      map.getCanvas().style.cursor = "";
      cursorActive = false;
    }

    setHover(map, "line", null);
  };

  map.on("mousemove", "route-line-hitbox", handleMouseMove);
  map.on("mouseleave", "route-line-hitbox", handleMouseLeave);

  return () => {
    map.off("mousemove", "route-line-hitbox", handleMouseMove);
    map.off("mouseleave", "route-line-hitbox", handleMouseLeave);

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
  Map<
    string,
    {
      signature: string;
      coordinates: [number, number][];
    }
  >
>();

function getRouteCache(map: MapLibreMap) {
  let cache = routeGeometryCache.get(map);

  if (!cache) {
    cache = new Map();
    routeGeometryCache.set(map, cache);
  }

  return cache;
}

export function updateFlightRoute(
  map: MapLibreMap,
  coordinates: [number, number][],
) {
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
      color: "#ef4444",
    },
    geometry: {
      type: "Point",
      coordinates: coordinates[coordinates.length - 1],
    },
  };

  aircraftSource.setData({
    type: "FeatureCollection",
    features: [aircraft],
  });

  routeSource.setData(
    coordinates.length >= 2
      ? lineString(coordinates, { color: "#ef4444" })
      : EMPTY_FEATURE_COLLECTION,
  );
}

// =========================
// WAYPOINT UPDATE
// =========================

function getSmoothedRoute(
  map: MapLibreMap,
  aircraftId: string,
  coordinates: [number, number][],
): [number, number][] {
  const cache = getRouteCache(map);
  const signature = JSON.stringify(coordinates);
  const cached = cache.get(aircraftId);

  if (cached?.signature === signature) {
    return cached.coordinates;
  }

  const smoothed = smoothLine(coordinates, 1.0, 24);

  cache.set(aircraftId, {
    signature,
    coordinates: smoothed,
  });

  return smoothed;
}

export function updateWaypoints(map: MapLibreMap, aircrafts: AirCraft[]) {
  const pointsSource = getGeoJSONSource(map, SOURCE.points);
  const routeSource = getGeoJSONSource(map, SOURCE.route);
  const aircraftSource = getGeoJSONSource(map, SOURCE.aircraft);

  if (!pointsSource || !routeSource || !aircraftSource) return;

  // Signature theo từng aircraft, tránh serialize lặp cả mảng lớn
  // và cho phép chỉ smooth lại route thay đổi.
  const aircraftSignatures = aircrafts.map((aircraft) =>
    JSON.stringify(aircraft),
  );

  const signature = JSON.stringify(aircraftSignatures);

  if (waypointDataCache.get(map) === signature) return;

  waypointDataCache.set(map, signature);

  // Cache smooth route của aircraft đã bị loại bỏ.
  const activeIds = new Set(aircrafts.map((aircraft) => aircraft.id));
  const routeCache = getRouteCache(map);
  routeCache.forEach((_, aircraftId) => {
    if (!activeIds.has(aircraftId)) {
      routeCache.delete(aircraftId);
    }
  });

  // updateWaypoints là nguồn dữ liệu chính cho các source này.
  flightRouteCache.delete(map);

  const pointFeatures: Feature<Point>[] = [];
  const aircraftFeatures: Feature<Point>[] = [];
  const routeFeatures: Feature<LineString>[] = [];

  aircrafts.forEach((aircraft) => {
    // Tạo coordinates trước để tính bearing
    const coordinates: [number, number][] = aircraft.points.map((point) => [
      point.lng,
      point.lat,
    ]);

    aircraft.points.forEach((point, index) => {
      pointFeatures.push({
        type: "Feature",
        properties: {
          name: `${aircraft.id} - ${index + 1}`,
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
      });
    });

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

  pointsSource.setData({
    type: "FeatureCollection",
    features: pointFeatures,
  });

  routeSource.setData({
    type: "FeatureCollection",
    features: routeFeatures,
  });

  aircraftSource.setData({
    type: "FeatureCollection",
    features: aircraftFeatures,
  });

  updateFirstWaypointLabels(map, aircrafts);
}

// =========================
// AIRPORT AREA
// =========================

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
// AZIMUTH
// =========================

export function addAzimuthLayers(
  map: MapLibreMap,
  center: [number, number],
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
// INITIALIZATION & CLEANUP
// =========================
export function updateLocationLabels(map: MapLibreMap, locations: Place[]) {
  const activeIds = new Set(locations.map((loc) => loc.id));

  // Xóa marker của địa điểm đã bị xóa khỏi danh sách
  locationMarkers.forEach((marker, id) => {
    if (activeIds.has(id)) return;
    marker.remove();
    locationMarkers.delete(id);
  });

  locations.forEach((loc) => {
    let marker = locationMarkers.get(loc.id);

    if (!marker) {
      const element = document.createElement("div");
      element.style.cssText = "width:0;height:0;pointer-events:none;";

      marker = new Marker({ element, anchor: "center" })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);

      locationMarkers.set(loc.id, marker);
    }

    marker.setLngLat([loc.lng, loc.lat]);

    // Chỉ rebuild DOM khi nội dung thay đổi
    const html = buildLocationHtml(loc);
    const element = marker.getElement();

    if (element.dataset.labelHtml !== html) {
      element.innerHTML = html;
      element.dataset.labelHtml = html;
    }
  });
}
export function initializeMapLayers(map: MapLibreMap) {
  addGridLayers(map);
  addRouteLayers(map);
  addAirportLayer(map);
  // const cleanupLocations = addLocationLabels(map); // <-- thêm
  const cleanupMeasurement = addMeasurementTool(map, MAP_CONFIG.CENTER_MIL);
  const cleanupCursor = addCursorTracker(map);

  addAzimuthLayers(map, MAP_CONFIG.CENTER_MIL, 40);

  const cleanupRouteHover = addRouteHoverEvents(map);

  return () => {
    cleanupRouteHover();
    cleanupMeasurement();
    cleanupCursor();
    // cleanupLocations();
    clearFirstWaypointLabels();

    // Dọn cache theo map instance
    flightRouteCache.delete(map);
    waypointDataCache.delete(map);
    routeGeometryCache.delete(map);

    resetHover(map);
  };
}
