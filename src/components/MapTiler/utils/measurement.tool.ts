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

// Mũi tên: đầu nhọn nằm đúng tâm ảnh (32, 32) nên icon-anchor "center"
// đặt đầu nhọn trúng vị trí chuột
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

  // Đường đo
  if (!map.getSource(lineSourceId)) {
    map.addSource(lineSourceId, { type: "geojson", data: EMPTY_LINE });
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

  // Mũi tên ở đầu chuột
  addArrowImage(map);

  if (!map.getSource(arrowSourceId)) {
    map.addSource(arrowSourceId, { type: "geojson", data: EMPTY_COLLECTION });
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

  // Vòng đánh dấu điểm đầu (hiện khi đã click chốt điểm)
  if (!map.getSource(pickSourceId)) {
    map.addSource(pickSourceId, { type: "geojson", data: EMPTY_COLLECTION });
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

  const setData = (id: string, data: object) =>
    (map.getSource(id) as GeoJSONSource | undefined)?.setData(data as never);

  const popup = new Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
  });

  let isMeasuring = false;
  // Đã click chốt điểm, đang chờ người dùng chọn trong menu
  let frozen = false;

  const clearAll = () => {
    isMeasuring = false;
    setData(lineSourceId, EMPTY_LINE);
    setData(arrowSourceId, EMPTY_COLLECTION);
    setData(pickSourceId, EMPTY_COLLECTION);
    popup.remove();
  };

  const hideMeasurement = () => {
    if (!isMeasuring || frozen) return;
    clearAll();
  };

  const measure = (event: MapMouseEvent) => {
    const target: Position = [event.lngLat.lng, event.lngLat.lat];
    const bearingDeg = getBearing(origin, target);

    return {
      target,
      bearingDeg,
      distanceMeters: getDistanceMeters(origin, target),
      mil: formatMil(bearingToMil(bearingDeg)),
    };
  };

  const handleMouseMove = (event: MapMouseEvent) => {
    if (frozen) return;

    if (!event.originalEvent.ctrlKey) {
      hideMeasurement();
      return;
    }

    isMeasuring = true;

    const { target, bearingDeg, distanceMeters, mil } = measure(event);

    // Góc mũi tên tính theo màn hình, khớp đường đang vẽ kể cả khi bản đồ xoay
    const p1 = map.project(origin);
    const p2 = map.project(target);
    const angle = (Math.atan2(p2.x - p1.x, -(p2.y - p1.y)) * 180) / Math.PI;

    setData(lineSourceId, {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [origin, target] },
    });

    setData(arrowSourceId, {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { angle },
          geometry: { type: "Point", coordinates: target },
        },
      ],
    });

    popup
      .setLngLat(event.lngLat)
      .setHTML(
        `
        <div style="font-size:13px; line-height:1.7; min-width:120px;">
          <div><b>Phương vị:</b> ${mil}</div>
          <div><b>Góc:</b> ${bearingDeg.toFixed(1)}°</div>
          <div><b>Cự ly:</b> ${distanceMeters} m</div>
        </div>
      `,
      )
      .addTo(map);
  };

  // Click khi popup đo đang hiện: chốt điểm và mở menu
  const handleClick = (event: MapMouseEvent) => {
    if (!isMeasuring || frozen || !event.originalEvent.ctrlKey) return;

    frozen = true;
    popup.remove(); // số liệu sẽ hiện trong menu

    const { target, bearingDeg, distanceMeters, mil } = measure(event);

    setData(pickSourceId, {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: target },
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

  // Menu đóng (pick về null) thì dọn đường, mũi tên và vòng đánh dấu
  const unsubscribePick = subscribePick(() => {
    if (frozen && !getPick()) {
      frozen = false;
      clearAll();
    }
  });

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Control") hideMeasurement();
  };

  const handleMouseLeave = () => hideMeasurement();

  map.on("mousemove", handleMouseMove);
  map.on("click", handleClick);
  map.getCanvas().addEventListener("mouseleave", handleMouseLeave);
  window.addEventListener("keyup", handleKeyUp);

  return () => {
    unsubscribePick();
    map.off("mousemove", handleMouseMove);
    map.off("click", handleClick);
    map.getCanvas().removeEventListener("mouseleave", handleMouseLeave);
    window.removeEventListener("keyup", handleKeyUp);
    popup.remove();
    setPick(null);

    for (const id of [pickLayerId, arrowLayerId, lineLayerId]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    for (const id of [pickSourceId, arrowSourceId, lineSourceId]) {
      if (map.getSource(id)) map.removeSource(id);
    }
    if (map.hasImage(ARROW_IMAGE_ID)) map.removeImage(ARROW_IMAGE_ID);
  };
}
