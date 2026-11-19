import {
  type Map as MapLibreMap,
  type MapMouseEvent,
  type GeoJSONSource,
} from "maplibre-gl";
import {
  bearingToMil,
  formatMil,
  getBearing,
  getDistanceKm,
} from "./measurement";
import { setMeasurement } from "./measurement.store";

type Position = [number, number];

const EMPTY_LINE = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "LineString" as const,
    coordinates: [] as Position[],
  },
};

export function addMeasurementTool(
  map: MapLibreMap,
  origin: Position,
  options: { showLine?: boolean } = {},
) {
  const { showLine = false } = options; // hiển thị đường kẻ

  const sourceId = "measurement-line-source";
  const layerId = "measurement-line";

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data: EMPTY_LINE,
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#ef4444", // màu của đường kẻ
        "line-width": 2.5,
        "line-dasharray": [2, 1],
      },
    });
  }

  const handleMouseMove = (event: MapMouseEvent) => {
    const target: Position = [event.lngLat.lng, event.lngLat.lat];

    const distanceKm = getDistanceKm(origin, target);
    const bearingDeg = getBearing(origin, target);
    const mil = bearingToMil(bearingDeg);

    if (showLine) {
      const source = map.getSource(sourceId) as GeoJSONSource | undefined;

      source?.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [origin, target],
        },
      });
    }

    setMeasurement({
      mil: formatMil(mil),
      bearingDeg,
      distanceKm,
    });
  };

  // Chuột rời khỏi bản đồ thì xóa đường đo và đưa thanh bar về "--"
  const handleMouseLeave = () => {
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    source?.setData(EMPTY_LINE);
    setMeasurement(null);
  };

  map.on("mousemove", handleMouseMove);
  map.getCanvas().addEventListener("mouseleave", handleMouseLeave);

  return () => {
    map.off("mousemove", handleMouseMove);
    map.getCanvas().removeEventListener("mouseleave", handleMouseLeave);
    setMeasurement(null);

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  };
}
