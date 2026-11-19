import {
  type Map as MapLibreMap,
  type MapMouseEvent,
  type GeoJSONSource,
  Popup,
} from "maplibre-gl";

import {
  bearingToMil,
  formatMil,
  getBearing,
  getDistanceMeters,
} from "./measurement";

import { getPick, setPick, subscribePick } from "./pick.store";
import { addCursorTracker } from "./cursor.tracker";
import { MAP_CONFIG } from "../../../config/map.config";
import {
  addAirportLayer,
  addAzimuthLayers,
  addGridLayers,
  addRouteHoverEvents,
  addRouteLayers,
} from "../../map/MapLayers";

type Position = [number, number];

const EMPTY_LINE = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "LineString" as const,
    coordinates: [] as Position[],
  },
};

const EMPTY_COLLECTION = {
  type: "FeatureCollection" as const,
  features: [] as never[],
};

const ARROW_IMAGE_ID = "measurement-arrow";

// Mũi tên: đầu nhọn nằm đúng tâm ảnh (32, 32)
function addArrowImage(map: MapLibreMap) {
  if (map.hasImage(ARROW_IMAGE_ID)) return;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.beginPath();
  ctx.moveTo(32, 32);
  ctx.lineTo(18, 62);
  ctx.lineTo(32, 54);
  ctx.lineTo(46, 62);
  ctx.closePath();

  ctx.fillStyle = "#ef4444";
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.stroke();

  map.addImage(ARROW_IMAGE_ID, ctx.getImageData(0, 0, size, size));
}

export function addMeasurementTool(map: MapLibreMap, origin: Position) {
  const lineSourceId = "measurement-line-source";
  const lineLayerId = "measurement-line";

  const arrowSourceId = "measurement-arrow-source";
  const arrowLayerId = "measurement-arrow";

  const pickSourceId = "measurement-pick-source";
  const pickLayerId = "measurement-pick";

  // =========================================
  // LINE LAYER
  // =========================================

  if (!map.getSource(lineSourceId)) {
    map.addSource(lineSourceId, {
      type: "geojson",
      data: EMPTY_LINE,
    });

    map.addLayer({
      id: lineLayerId,
      type: "line",
      source: lineSourceId,
      paint: {
        "line-color": "#ef4444",
        "line-width": 2.5,
        "line-dasharray": [2, 1],
      },
    });
  }

  // =========================================
  // ARROW IMAGE
  // =========================================

  addArrowImage(map);

  if (!map.getSource(arrowSourceId)) {
    map.addSource(arrowSourceId, {
      type: "geojson",
      data: EMPTY_COLLECTION,
    });

    map.addLayer({
      id: arrowLayerId,
      type: "symbol",
      source: arrowSourceId,
      layout: {
        "icon-image": ARROW_IMAGE_ID,
        "icon-size": 0.7,
        "icon-anchor": "center",
        "icon-rotate": ["get", "angle"],
        "icon-rotation-alignment": "viewport",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
  }

  // =========================================
  // PICK POINT LAYER
  // =========================================

  if (!map.getSource(pickSourceId)) {
    map.addSource(pickSourceId, {
      type: "geojson",
      data: EMPTY_COLLECTION,
    });

    map.addLayer({
      id: pickLayerId,
      type: "circle",
      source: pickSourceId,
      paint: {
        "circle-radius": 8,
        "circle-color": "#ef4444",
        "circle-opacity": 0.25,
        "circle-stroke-color": "#ef4444",
        "circle-stroke-width": 3,
      },
    });
  }

  // =========================================
  // SOURCE HELPER
  // =========================================

  const setData = (id: string, data: object) => {
    (map.getSource(id) as GeoJSONSource | undefined)?.setData(data as never);
  };

  // =========================================
  // POPUP - TẠO DOM MỘT LẦN
  // =========================================

  const popup = new Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
  });

  const popupContent = document.createElement("div");

  popupContent.style.cssText =
    "font-size:13px;line-height:1.7;min-width:120px;";

  const createRow = (label: string) => {
    const row = document.createElement("div");
    const bold = document.createElement("b");
    const value = document.createElement("span");

    bold.textContent = `${label}: `;
    row.append(bold, value);

    return { row, value };
  };

  const milRow = createRow("Phương vị");
  const angleRow = createRow("Góc");
  const distanceRow = createRow("Cự ly");

  popupContent.append(milRow.row, angleRow.row, distanceRow.row);

  popup.setDOMContent(popupContent);

  // =========================================
  // STATE
  // =========================================

  let isMeasuring = false;
  let frozen = false;

  // RAF state
  let rafId: number | null = null;
  let latestEvent: MapMouseEvent | null = null;

  // =========================================
  // CLEAR
  // =========================================

  const clearAll = () => {
    isMeasuring = false;

    setData(lineSourceId, EMPTY_LINE);
    setData(arrowSourceId, EMPTY_COLLECTION);
    setData(pickSourceId, EMPTY_COLLECTION);

    popup.remove();
  };

  const cancelPendingFrame = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    latestEvent = null;
  };

  const hideMeasurement = () => {
    if (!isMeasuring || frozen) return;
    clearAll();
  };

  // =========================================
  // MEASURE
  // =========================================

  const measure = (event: MapMouseEvent) => {
    const target: Position = [event.lngLat.lng, event.lngLat.lat];

    const bearingDeg = getBearing(origin, target);
    const distanceMeters = getDistanceMeters(origin, target);

    return {
      target,
      bearingDeg,
      distanceMeters,
      mil: formatMil(bearingToMil(bearingDeg)),
    };
  };

  // =========================================
  // RENDER MEASUREMENT
  // Chạy tối đa một lần mỗi animation frame
  // =========================================

  const renderMeasurement = () => {
    rafId = null;

    const event = latestEvent;
    latestEvent = null;

    if (!event || frozen) return;

    // Ctrl đã bị nhả trước khi RAF chạy
    if (!event.originalEvent.ctrlKey) {
      hideMeasurement();
      return;
    }

    isMeasuring = true;

    const { target, bearingDeg, distanceMeters, mil } = measure(event);

    // Tính góc arrow theo tọa độ màn hình
    // đảm bảo đúng hướng khi map bị rotate
    const p1 = map.project(origin);
    const p2 = map.project(target);

    const angle = (Math.atan2(p2.x - p1.x, -(p2.y - p1.y)) * 180) / Math.PI;

    // Update line
    setData(lineSourceId, {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [origin, target],
      },
    });

    // Update arrow
    setData(arrowSourceId, {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { angle },
          geometry: {
            type: "Point",
            coordinates: target,
          },
        },
      ],
    });

    // Update popup DOM, không tạo HTML mới
    milRow.value.textContent = mil;
    angleRow.value.textContent = `${bearingDeg.toFixed(1)}°`;
    distanceRow.value.textContent = `${distanceMeters} m`;

    popup.setLngLat(event.lngLat);

    if (!popup.isOpen()) {
      popup.addTo(map);
    }
  };

  // =========================================
  // MOUSE MOVE
  // Gom event và chỉ render ở frame kế tiếp
  // =========================================

  const handleMouseMove = (event: MapMouseEvent) => {
    if (frozen) return;

    if (!event.originalEvent.ctrlKey) {
      cancelPendingFrame();
      hideMeasurement();
      return;
    }

    // Luôn giữ event mới nhất
    latestEvent = event;

    // Frame đã được lên lịch thì không tạo thêm
    if (rafId !== null) return;

    rafId = requestAnimationFrame(renderMeasurement);
  };

  // =========================================
  // CLICK - CHỐT ĐIỂM
  // =========================================

  const handleClick = (event: MapMouseEvent) => {
    if (!isMeasuring || frozen || !event.originalEvent.ctrlKey) {
      return;
    }

    // Tránh RAF đang chờ tiếp tục vẽ sau khi chốt
    cancelPendingFrame();

    frozen = true;
    popup.remove();

    const { target, bearingDeg, distanceMeters, mil } = measure(event);

    setData(pickSourceId, {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: target,
          },
        },
      ],
    });

    setPick({
      lng: target[0],
      lat: target[1],
      mil,
      bearingDeg,
      distanceMeters,
      clientX: event.originalEvent.clientX,
      clientY: event.originalEvent.clientY,
    });
  };

  // =========================================
  // PICK STORE
  // Menu đóng thì dọn measurement
  // =========================================

  const unsubscribePick = subscribePick(() => {
    if (frozen && !getPick()) {
      frozen = false;
      clearAll();
    }
  });

  // =========================================
  // KEYUP
  // =========================================

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Control") {
      cancelPendingFrame();
      hideMeasurement();
    }
  };

  // =========================================
  // MOUSE LEAVE
  // =========================================

  const handleMouseLeave = () => {
    cancelPendingFrame();
    hideMeasurement();
  };

  // =========================================
  // EVENT REGISTRATION
  // =========================================

  map.on("mousemove", handleMouseMove);
  map.on("click", handleClick);

  map.getCanvas().addEventListener("mouseleave", handleMouseLeave);

  window.addEventListener("keyup", handleKeyUp);

  // =========================================
  // CLEANUP
  // =========================================

  return () => {
    cancelPendingFrame();
    unsubscribePick();

    map.off("mousemove", handleMouseMove);
    map.off("click", handleClick);

    map.getCanvas().removeEventListener("mouseleave", handleMouseLeave);

    window.removeEventListener("keyup", handleKeyUp);

    popup.remove();
    setPick(null);

    for (const id of [pickLayerId, arrowLayerId, lineLayerId]) {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
    }

    for (const id of [pickSourceId, arrowSourceId, lineSourceId]) {
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    }

    if (map.hasImage(ARROW_IMAGE_ID)) {
      map.removeImage(ARROW_IMAGE_ID);
    }
  };
}

// =========================================
// INITIALIZE MAP LAYERS
// =========================================

export function initializeMapLayers(map: MapLibreMap) {
  addGridLayers(map);
  addRouteLayers(map);
  addAirportLayer(map);

  const cleanupMeasurement = addMeasurementTool(map, MAP_CONFIG.CENTER_MIL);

  const cleanupCursor = addCursorTracker(map);

  addAzimuthLayers(map, MAP_CONFIG.CENTER_MIL, 40);

  const cleanupRouteHover = addRouteHoverEvents(map);

  return () => {
    cleanupRouteHover();
    cleanupMeasurement();
    cleanupCursor();
    // clearFirstWaypointLabels();
  };
}
