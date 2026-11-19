import { GeoJSONSource, MapLibreMap } from "maplibre-gl";
import { smoothLine } from "./smooth-line";
import { Point } from "../types/map.types";

export function updateRoute(map: MapLibreMap, points: Point[]) {
  const routeSource = map.getSource("route-source") as
    | GeoJSONSource
    | undefined;

  const pointsSource = map.getSource("points-source") as
    | GeoJSONSource
    | undefined;

  if (!routeSource || !pointsSource) return;

  const coordinates: [number, number][] = points.map((point) => [
    point.lng,
    point.lat,
  ]);

  // Làm mượt đường nối
  const smoothCoordinates = smoothLine(coordinates, 16);

  routeSource.setData({
    type: "FeatureCollection",
    features:
      coordinates.length >= 2
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: smoothCoordinates,
              },
            },
          ]
        : [],
  });

  // Các điểm waypoint vẫn giữ nguyên tọa độ gốc
  pointsSource.setData({
    type: "FeatureCollection",
    features: points.map((point, index) => ({
      type: "Feature",
      properties: {
        name: `P${index + 1}`,
        lng: point.lng,
        lat: point.lat,
      },
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
    })),
  });
}
