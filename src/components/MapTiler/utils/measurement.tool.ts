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
  getDistanceKm,
  getDistanceMeters,
} from "./measurement";

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

// Vẽ mũi tên: đầu nhọn nằm đúng tâm ảnh (32, 32),
// thân nằm phía sau, nên icon-anchor "center" sẽ đặt đầu nhọn đúng vị trí chuột
function addArrowImage(map: MapLibreMap) {
  if (map.hasImage(ARROW_IMAGE_ID)) return;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.beginPath();
  ctx.moveTo(32, 32); // đầu nhọn
  ctx.lineTo(18, 62); // góc đáy trái
  ctx.lineTo(32, 54); // khuyết đáy
  ctx.lineTo(46, 62); // góc đáy phải
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

  // Đường đo
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

  // Mũi tên ở đầu chuột
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

  const popup = new Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
  });

  let isMeasuring = false;

  const hideMeasurement = () => {
    if (!isMeasuring) return;
    isMeasuring = false;

    (map.getSource(lineSourceId) as GeoJSONSource | undefined)?.setData(
      EMPTY_LINE,
    );
    (map.getSource(arrowSourceId) as GeoJSONSource | undefined)?.setData(
      EMPTY_COLLECTION,
    );

    popup.remove();
  };

  const handleMouseMove = (event: MapMouseEvent) => {
    if (!event.originalEvent.ctrlKey) {
      hideMeasurement();
      return;
    }

    isMeasuring = true;

    const target: Position = [event.lngLat.lng, event.lngLat.lat];

    const distance = getDistanceMeters(origin, target);
    const bearing = getBearing(origin, target);
    const mil = bearingToMil(bearing);

    // Góc của mũi tên tính theo màn hình (0 = hướng lên, theo chiều kim đồng hồ),
    // khớp đúng với đường thẳng đang vẽ, kể cả khi bản đồ bị xoay
    const p1 = map.project(origin);
    const p2 = map.project(target);
    const angle = (Math.atan2(p2.x - p1.x, -(p2.y - p1.y)) * 180) / Math.PI;

    (map.getSource(lineSourceId) as GeoJSONSource | undefined)?.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [origin, target],
      },
    });

    (map.getSource(arrowSourceId) as GeoJSONSource | undefined)?.setData({
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

    popup
      .setLngLat(event.lngLat)
      .setHTML(
        `
        <div style="font-size:13px; line-height:1.7; min-width:120px;">
          <div><b>Phương vị:</b> ${formatMil(mil)}</div>
          <div><b>Góc:</b> ${bearing.toFixed(1)}°</div>
          <div><b>Cự ly:</b> ${distance} m</div>
        </div>
      `,
      )
      .addTo(map);
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Control") {
      hideMeasurement();
    }
  };

  const handleMouseLeave = () => hideMeasurement();

  map.on("mousemove", handleMouseMove);
  map.getCanvas().addEventListener("mouseleave", handleMouseLeave);
  window.addEventListener("keyup", handleKeyUp);

  return () => {
    map.off("mousemove", handleMouseMove);
    map.getCanvas().removeEventListener("mouseleave", handleMouseLeave);
    window.removeEventListener("keyup", handleKeyUp);
    popup.remove();

    if (map.getLayer(arrowLayerId)) map.removeLayer(arrowLayerId);
    if (map.getSource(arrowSourceId)) map.removeSource(arrowSourceId);
    if (map.hasImage(ARROW_IMAGE_ID)) map.removeImage(ARROW_IMAGE_ID);

    if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
    if (map.getSource(lineSourceId)) map.removeSource(lineSourceId);
  };
}
