import type {
  Map as MapLibreMap,
  GeoJSONSource,
  MapLayerMouseEvent,
} from "maplibre-gl";

import type { Feature, FeatureCollection, Point } from "geojson";
import { SOURCE, Place } from "./index";

const LAYER = {
  pulse: "places-pulse",
  point: "places-point",
  name: "places-name",
  phone: "places-phone",
} as const;
const placeClickHandlers = new WeakMap<
  MapLibreMap,
  (event: MapLayerMouseEvent) => void
>();
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

export function addPlacesLayers(
  map: MapLibreMap,
  onPlaceClick?: (place: Place) => void,
) {
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
  // Gỡ handler cũ nếu addPlacesLayers được gọi lại
  const previousHandler = placeClickHandlers.get(map);

  if (previousHandler) {
    map.off("click", LAYER.point, previousHandler);
    map.off("click", LAYER.name, previousHandler);
  }

  const handlePlaceClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature?.properties) return;

    if (feature.geometry.type !== "Point") return;

    const [lng, lat] = feature.geometry.coordinates;

    const place: Place = {
      id: feature.properties.id,
      name: feature.properties.name,
      phone: feature.properties.phone,
      lng,
      lat,
    };

    onPlaceClick?.(place);
  };

  placeClickHandlers.set(map, handlePlaceClick);

  map.on("click", LAYER.point, handlePlaceClick);
  map.on("click", LAYER.name, handlePlaceClick);

  // Cursor khi hover marker/name
  map.on("mouseenter", LAYER.point, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", LAYER.point, () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("mouseenter", LAYER.name, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", LAYER.name, () => {
    map.getCanvas().style.cursor = "";
  });
}
