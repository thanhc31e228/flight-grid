import circle from "@turf/circle";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import { MAP_CONFIG } from "../../../config/map.config";

// Vùng hỏa lực đơn vị
export function setFireZoneLayer(
  map: MapLibreMap,
  coordinates: [lng: number, lat: number],
) {
  const fireZoneCircle = circle(coordinates, MAP_CONFIG.FIRE_ZONE_RADIUS_KM, {
    steps: 128,
    units: "kilometers",
  });

  const source = map.getSource("base-fire-zone") as GeoJSONSource | undefined;

  if (source) {
    source.setData(fireZoneCircle);
    return;
  }

  map.addSource("base-fire-zone", {
    type: "geojson",
    data: fireZoneCircle,
  });

  map.addLayer({
    id: "base-fire-zone-fill",
    type: "fill",
    source: "base-fire-zone",
    paint: {
      "fill-color": "#ef4444",
      "fill-opacity": 0.22,
    },
  });

  map.addLayer({
    id: "base-fire-zone-outline",
    type: "line",
    source: "base-fire-zone",
    paint: {
      "line-color": "#dc2626",
      "line-width": 2,
      "line-opacity": 0.9,
      "line-dasharray": [2, 1],
    },
  });
}
