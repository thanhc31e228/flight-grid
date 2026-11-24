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

export function addPlacesLayers(map: MapLibreMap) {
  // Xóa layer cũ để áp dụng lại style từ đầu
  [LAYER.phone, LAYER.name, LAYER.point, LAYER.pulse].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });

  // 1. Vòng pulse
  map.addLayer({
    id: LAYER.pulse,
    type: "circle",
    source: SOURCE.places,
    paint: {
      "circle-radius": 10,
      "circle-color": "#ff3030",
      "circle-opacity": 0.25,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ff4545",
      "circle-stroke-opacity": 0.7,
    },
  });

  // 2. Marker trung tâm
  map.addLayer({
    id: LAYER.point,
    type: "circle",
    source: SOURCE.places,
    paint: {
      "circle-radius": 5,
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
      "text-size": 14,
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

  // 4. Số điện thoại phía dưới
  map.addLayer({
    id: LAYER.phone,
    type: "symbol",
    source: SOURCE.places,
    layout: {
      "text-field": ["get", "phone"],
      "text-font": ["Open Sans Regular"],
      "text-size": 11,
      "text-anchor": "bottom",
      "text-offset": [0, -0.3],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#42e8ff",
      "text-halo-color": "#111820",
      "text-halo-width": 2,
    },
  });

  // 5. Hiệu ứng pulse
  let step = 0;

  const pulseInterval = window.setInterval(() => {
    if (!map.getLayer(LAYER.pulse)) return;

    step = (step + 1) % 20;

    const progress = step / 20;

    map.setPaintProperty(LAYER.pulse, "circle-radius", 8 + progress * 14);

    map.setPaintProperty(LAYER.pulse, "circle-opacity", 0.45 * (1 - progress));

    map.setPaintProperty(
      LAYER.pulse,
      "circle-stroke-opacity",
      0.8 * (1 - progress),
    );
  }, 50);

  return () => {
    window.clearInterval(pulseInterval);
  };
}
