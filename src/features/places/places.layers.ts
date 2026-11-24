import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";

import type { Feature, FeatureCollection, Point } from "geojson";
import { Place } from "./place.types";
import { SOURCE } from "../../components/MapTiler/map.constants";

const LAYER = {
  pulse: "places-pulse",
  point: "places-point",
  name: "places-name",
  phone: "places-phone",
} as const;

/* =========================================
   SOURCE
========================================= */

export function addPlaces(map: MapLibreMap, places: Place[]) {
  const geojson: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: places.map(
      (place): Feature<Point> => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [place.lng, place.lat],
        },
        properties: {
          id: place.id,
          name: place.name,
          phone: place.phone,
        },
      }),
    ),
  };

  const existing = map.getSource(SOURCE.places) as GeoJSONSource | undefined;

  if (existing) {
    existing.setData(geojson);
    return;
  }

  map.addSource(SOURCE.places, {
    type: "geojson",
    data: geojson,
  });
}
/* =========================================
   LAYERS
========================================= */
/** Ẩn/hiện địa điểm được đánh dấu. */
export function togglePlaceLayers(map: MapLibreMap, visible: boolean) {
  const visibility = visible ? "visible" : "none";

  Object.values(LAYER).forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visibility);
    }
  });
}

export function addPlacesLayers(map: MapLibreMap) {
  // Xóa layer cũ để áp dụng lại style từ đầu
  [LAYER.phone, LAYER.name, LAYER.point, LAYER.pulse].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });

  // 2. Marker trung tâm
  map.addLayer({
    id: LAYER.point,
    type: "circle",
    source: SOURCE.places,
    paint: {
      "circle-radius": 3,
      "circle-color": "#ff2020",
      "circle-opacity": 1,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  // 3. Tên địa điểm phía trên
  map.addLayer({
    id: LAYER.name,
    type: "symbol",
    source: SOURCE.places,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Open Sans Bold"],
      "text-size": 9,
      "text-anchor": "bottom",
      "text-offset": [0, -1.5],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#111820",
      "text-halo-width": 2,
      "text-halo-blur": 0.5,
    },
  });
}
