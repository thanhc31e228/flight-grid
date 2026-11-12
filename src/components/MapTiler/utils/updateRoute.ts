import {
  Map as MapLibreMap,
  GeoJSONSource,
} from "maplibre-gl";

import { Point } from "../types/map.types";

// Cập nhật đường nối và các điểm đánh dấu trên bản đồ
export function updateRoute(
  map: MapLibreMap,
  points: Point[]
) {
  // Lấy nguồn dữ liệu đường đi
  const routeSource = map.getSource(
    "route-source"
  ) as GeoJSONSource | undefined;

  // Lấy nguồn dữ liệu các điểm
  const pointsSource = map.getSource(
    "points-source"
  ) as GeoJSONSource | undefined;

  // Nếu nguồn dữ liệu chưa được khởi tạo thì dừng
  if (!routeSource || !pointsSource) return;

  // =================================
  // 1. CẬP NHẬT ĐƯỜNG NỐI
  // =================================

  routeSource.setData({
    type: "FeatureCollection",

    // Chỉ vẽ đường khi có ít nhất 2 điểm
    features:
      points.length >= 2
        ? [
            {
              type: "Feature",
              properties: {},

              geometry: {
                type: "LineString",

                // Chuyển danh sách điểm thành tọa độ GeoJSON
                coordinates: points.map((point) => [
                  point.lng,
                  point.lat,
                ]),
              },
            },
          ]
        : [],
  });

  // =================================
  // 2. CẬP NHẬT CÁC ĐIỂM ĐÁNH DẤU
  // =================================

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