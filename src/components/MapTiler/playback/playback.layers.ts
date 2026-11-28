import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";

import type { AircraftFrame } from "./playback.types";

const AIRCRAFT_SOURCE = "aircraft-playback-source";
const AIRCRAFT_LAYER = "aircraft-playback-layer";
const TRAIL_SOURCE = "aircraft-playback-trail-source";
const TRAIL_LAYER = "aircraft-playback-trail-layer";
const ORIGINAL_ROUTE_LAYERS = [
  "route-line",
  "route-line-hover",
  "route-line-hitbox",
];

function emptyCollection() {
  return {
    type: "FeatureCollection" as const,
    features: [] as GeoJSON.Feature[],
  };
}

export function addPlaybackLayer(map: MapLibreMap) {
  if (!map.getSource(AIRCRAFT_SOURCE)) {
    map.addSource(AIRCRAFT_SOURCE, {
      type: "geojson",
      data: emptyCollection(),
    });
  }

  if (!map.getSource(TRAIL_SOURCE)) {
    map.addSource(TRAIL_SOURCE, { type: "geojson", data: emptyCollection() });
  }

  // Trail layer goes below the playback aircraft symbol.
  if (!map.getLayer(TRAIL_LAYER)) {
    map.addLayer({
      id: TRAIL_LAYER,
      type: "line",
      source: TRAIL_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 2,
        "line-opacity": 0.95,
      },
    });
  }

  if (!map.getLayer(AIRCRAFT_LAYER)) {
    map.addLayer({
      id: AIRCRAFT_LAYER,
      type: "symbol",
      source: AIRCRAFT_SOURCE,
      layout: {
        "icon-image": "waypoint-plane",
        "icon-size": 0.4,
        "icon-rotate": ["get", "bearing"],
        "icon-rotation-alignment": "map",
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: { "icon-color": ["get", "color"] },
    });
  }
}

// Vẽ TẤT CẢ máy bay + vệt bay của frame hiện tại: mỗi source chỉ setData 1 lần / frame.
// Mỗi máy bay là 1 feature riêng, màu lấy từ chính máy bay đó.
export function updatePlaybackFrames(
  map: MapLibreMap,
  frames: AircraftFrame[],
) {
  const aircraftSource = map.getSource(AIRCRAFT_SOURCE) as
    | GeoJSONSource
    | undefined;
  const trailSource = map.getSource(TRAIL_SOURCE) as GeoJSONSource | undefined;
  if (!aircraftSource || !trailSource) return;

  const aircraftFeatures: GeoJSON.Feature[] = [];
  const trailFeatures: GeoJSON.Feature[] = [];

  for (const frame of frames) {
    // Chưa xuất hiện / đã kết thúc thì không vẽ icon (vệt bay vẫn giữ)
    if (frame.visible && frame.position) {
      aircraftFeatures.push({
        type: "Feature",
        properties: {
          id: frame.id,
          bearing: frame.bearing,
          color: frame.color,
        },
        geometry: {
          type: "Point",
          coordinates: [frame.position.lng, frame.position.lat],
        },
      });
    }

    if (frame.trail.length >= 2) {
      trailFeatures.push({
        type: "Feature",
        properties: { id: frame.id, color: frame.color },
        geometry: { type: "LineString", coordinates: frame.trail },
      });
    }
  }

  aircraftSource.setData({
    type: "FeatureCollection",
    features: aircraftFeatures,
  });
  trailSource.setData({ type: "FeatureCollection", features: trailFeatures });
}

export function clearPlaybackAircraft(map: MapLibreMap) {
  const source = map.getSource(AIRCRAFT_SOURCE) as GeoJSONSource | undefined;
  source?.setData(emptyCollection());
}

export function clearPlaybackTrail(map: MapLibreMap) {
  const source = map.getSource(TRAIL_SOURCE) as GeoJSONSource | undefined;
  source?.setData(emptyCollection());
}

export function setOriginalRouteVisible(map: MapLibreMap, visible: boolean) {
  ORIGINAL_ROUTE_LAYERS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        visible ? "visible" : "none",
      );
    }
  });
}
// Layer chứa marker của waypoint (vạch ở điểm giữa, máy bay ở điểm cuối).
// Nếu vạch / máy bay nằm ở layer khác thì thêm id đó vào đây.
const WAYPOINT_MARKER_LAYERS = ["points-layer"];

type LayerFilter = ReturnType<MapLibreMap["getFilter"]>;
type SetFilterArg = Parameters<MapLibreMap["setFilter"]>[1];

// Lưu filter gốc của từng layer để khôi phục lại chính xác
const savedFilters = new WeakMap<MapLibreMap, Record<string, LayerFilter>>();

// Chỉ giữ lại điểm đầu (isFirst hoặc index = 1)
const FIRST_POINT_ONLY = [
  "any",
  ["==", ["get", "isFirst"], true],
  ["==", ["get", "index"], 1],
] as unknown as SetFilterArg;

// visible = false: ẩn vạch ở các điểm giữa và máy bay ở điểm cuối, chỉ giữ điểm đầu
// visible = true: trả về filter gốc
export function setWaypointMarkersVisible(
  map: MapLibreMap,
  visible: boolean,
  layerIds: string[] = WAYPOINT_MARKER_LAYERS,
) {
  // Dùng const để TypeScript giữ được kiểu non-undefined trong callback
  const saved = savedFilters.get(map) ?? {};
  savedFilters.set(map, saved);

  layerIds.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;

    if (visible) {
      if (layerId in saved) {
        map.setFilter(layerId, (saved[layerId] ?? null) as SetFilterArg);
        delete saved[layerId];
      }
      return;
    }

    // Chỉ lưu filter gốc ở lần ẩn đầu tiên
    if (!(layerId in saved)) saved[layerId] = map.getFilter(layerId);

    const original = saved[layerId];
    map.setFilter(
      layerId,
      (original
        ? ["all", original, FIRST_POINT_ONLY]
        : FIRST_POINT_ONLY) as SetFilterArg,
    );
  });
}
