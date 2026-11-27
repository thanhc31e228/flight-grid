import type { Feature, LineString, Point } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";

import type { AirCraft } from "../../MapTiler/types/map.types";
import { smoothLine } from "../../MapTiler/utils/smooth-line";
import { SOURCE, type LngLat } from "./constants";
import { updateFirstWaypointLabels } from "./first-waypoint.label";
import { getGeoJSONSource, toFeatureCollection } from "./helpers";
import { getPlaneRotation, getTickRotation } from "./waypoint.rotation";

// Cache route-waypoint data theo map.
const waypointDataCache = new WeakMap<MapLibreMap, string>();

// Cache đường đã smooth theo map + aircraft.
const routeGeometryCache = new WeakMap<
  MapLibreMap,
  Map<string, { signature: string; coordinates: LngLat[] }>
>();

/** Xóa toàn bộ cache của một map (gọi khi cleanup). */
export function clearWaypointCaches(map: MapLibreMap) {
  waypointDataCache.delete(map);
  routeGeometryCache.delete(map);
}

function getRouteCache(map: MapLibreMap) {
  let cache = routeGeometryCache.get(map);

  if (!cache) {
    cache = new Map();
    routeGeometryCache.set(map, cache);
  }

  return cache;
}

function getSmoothedRoute(
  map: MapLibreMap,
  aircraftId: string,
  coordinates: LngLat[],
): LngLat[] {
  const cache = getRouteCache(map);
  const signature = JSON.stringify(coordinates);
  const cached = cache.get(aircraftId);

  if (cached?.signature === signature) {
    return cached.coordinates;
  }

  const smoothed = smoothLine(coordinates, 1.0, 24);

  cache.set(aircraftId, { signature, coordinates: smoothed });

  return smoothed;
}

/** Xóa cache đường smooth của aircraft đã bị loại bỏ. */
function pruneRouteCache(map: MapLibreMap, aircrafts: AirCraft[]) {
  const activeIds = new Set(aircrafts.map((aircraft) => aircraft.id));
  const cache = getRouteCache(map);

  cache.forEach((_, aircraftId) => {
    if (!activeIds.has(aircraftId)) {
      cache.delete(aircraftId);
    }
  });
}

function addMinutesToTime(time: string, minutes: number): string {
  const hours = Number(time.slice(0, 2));
  const mins = Number(time.slice(2, 4));

  const total = (hours * 60 + mins + minutes) % 1440;

  return (
    String(Math.floor(total / 60)).padStart(2, "0") +
    String(total % 60).padStart(2, "0")
  );
}

function buildPointFeatures(
  aircraft: AirCraft,
  coordinates: LngLat[],
): Feature<Point>[] {
  const firstPointTime = aircraft.points[0]?.appearanceTime ?? "";

  return aircraft.points.map((point, index): Feature<Point> => {
    // Chỉ point STT lẻ từ 3 trở đi mới hiển thị thời gian
    const isShowTime = index >= 2 && index % 2 === 0;

    // Point 3 +1 phút, point 5 +2 phút, point 7 +3 phút...
    const appearanceTime = isShowTime
      ? addMinutesToTime(firstPointTime, index / 2)
      : "";

    return {
      type: "Feature",
      properties: {
        name: `${aircraft.id} - ${index + 1}`,
        id: aircraft.id,
        coordinateGridId:
          point.coordinateGridId ?? `${aircraft.id} - ${index + 1}`,
        aircraftId: aircraft.id,
        color: aircraft.color,
        isFirst: index === 0,
        isLast: index === aircraft.points.length - 1,
        isShowTime,
        aircraftCode: aircraft.aircraftCode ?? "",
        altitude: aircraft.altitude ?? "",
        appearanceTime,
        tickRotate: getTickRotation(coordinates, index),
        planeRotate: getPlaneRotation(coordinates, index),
        speed: aircraft.speed,
      },
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
    };
  });
}

export function updateWaypoints(
  map: MapLibreMap,
  aircrafts: AirCraft[],
  setAircraftSelected: (aircraftSelected: AirCraft | null) => void,
) {
  const pointsSource = getGeoJSONSource(map, SOURCE.points);
  const routeSource = getGeoJSONSource(map, SOURCE.route);
  const aircraftSource = getGeoJSONSource(map, SOURCE.aircraft);

  if (!pointsSource || !routeSource || !aircraftSource) return;

  const signature = JSON.stringify(aircrafts);

  if (waypointDataCache.get(map) === signature) return;

  waypointDataCache.set(map, signature);

  pruneRouteCache(map, aircrafts);

  const pointFeatures: Feature<Point>[] = [];
  const aircraftFeatures: Feature<Point>[] = [];
  const routeFeatures: Feature<LineString>[] = [];

  aircrafts.forEach((aircraft) => {
    // Tạo coordinates trước để tính bearing
    const coordinates = aircraft.points.map(
      (point): LngLat => [point.lng, point.lat],
    );

    pointFeatures.push(...buildPointFeatures(aircraft, coordinates));
    if (coordinates.length === 0) return;

    aircraftFeatures.push({
      type: "Feature",
      properties: {
        type: "aircraft",
        name: aircraft.id,
        color: aircraft.color,
      },
      geometry: {
        type: "Point",
        coordinates: coordinates[coordinates.length - 1],
      },
    });

    if (coordinates.length >= 2) {
      routeFeatures.push({
        type: "Feature",
        properties: {
          color: aircraft.color,
          aircraftId: aircraft.id,
        },
        geometry: {
          type: "LineString",
          coordinates: getSmoothedRoute(map, aircraft.id, coordinates),
        },
      });
    }
  });

  pointsSource.setData(toFeatureCollection(pointFeatures));
  routeSource.setData(toFeatureCollection(routeFeatures));
  aircraftSource.setData(toFeatureCollection(aircraftFeatures));

  updateFirstWaypointLabels(map, aircrafts, setAircraftSelected);
}
