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
} from "./measurement";

type Position = [number, number];

export function addMeasurementTool(map: MapLibreMap, origin: Position) {
  const sourceId = "measurement-line-source";
  const layerId = "measurement-line";

  // Tạo source và layer đường đo
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [],
        },
      },
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#ef4444",
        "line-width": 2.5,
        "line-dasharray": [2, 1],
      },
    });
  }

  const popup = new Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
  });

  const hideMeasurement = () => {
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;

    source?.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [],
      },
    });

    popup.remove();
  };

  const handleMouseMove = (event: MapMouseEvent) => {
    if (!event.originalEvent.ctrlKey) {
      hideMeasurement();
      return;
    }

    const target: Position = [event.lngLat.lng, event.lngLat.lat];

    const distance = getDistanceKm(origin, target);
    const bearing = getBearing(origin, target);
    const mil = bearingToMil(bearing);

    const source = map.getSource(sourceId) as GeoJSONSource;

    source.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [origin, target],
      },
    });

    popup
      .setLngLat(event.lngLat)
      .setHTML(
        `
        <div style="font-size:13px; line-height:1.7; min-width:120px;">
          <div><b>Phương vị:</b> ${formatMil(mil)}</div>
          <div><b>Góc:</b> ${bearing.toFixed(1)}°</div>
          <div><b>Cự ly:</b> ${distance.toFixed(2)} km</div>
        </div>
      `,
      )
      .addTo(map);
  };

  map.on("mousemove", handleMouseMove);

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Control") {
      hideMeasurement();
    }
  };

  window.addEventListener("keyup", handleKeyUp);

  // Hàm dọn dẹp khi không còn sử dụng
  return () => {
    map.off("mousemove", handleMouseMove);
    window.removeEventListener("keyup", handleKeyUp);
    popup.remove();

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  };
}
