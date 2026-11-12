
import { useEffect, useRef } from "react";

import {
  Map as MapLibreMap,
  NavigationControl,
  GeoJSONSource,
  setWorkerUrl,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  MAP_CONFIG,
  MAP_GRID_CONFIG,
} from "../../config/map.config";

import { initializeMapLayers } from "./MapLayers";
import { registerMapEvents } from "./MapEvents";

import { createRoundedRoute } from "../../features/route/route.geometry";
import type { Point } from "../../features/route/route.types";

type MapViewProps = {
  points: Point[];
  onAddPoint: (point: Point) => number;
};

// Nếu dùng Vite:
const API_KEY = process.env.REACT_APP_MAPTILER_API_KEY;

setWorkerUrl(
  new URL(
    "maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url
  ).toString()
);

export default function MapView({
  points,
  onAddPoint,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const onAddPointRef = useRef(onAddPoint);

  // Luôn cập nhật callback mới nhất, không cần tạo lại map.
  useEffect(() => {
    onAddPointRef.current = onAddPoint;
  }, [onAddPoint]);

  // ======================================
  // INITIALIZE MAP - CHỈ CHẠY MỘT LẦN
  // ======================================

  useEffect(() => {
    if (!containerRef.current || !API_KEY) {
      console.error("Không tìm thấy MapTiler API Key");
      return;
    }
    // Khởi tạo bản đồ
    const map = new MapLibreMap({
      container: containerRef.current,
      style: `${MAP_CONFIG.STYLE_URL}?key=${API_KEY}`,
      center: MAP_CONFIG.CENTER,
      zoom: MAP_CONFIG.INITIAL_ZOOM,
    });

    mapRef.current = map;

    map.addControl(
      new NavigationControl(),
      "top-right"
    );

    let cleanupEvents: (() => void) | undefined;
    // Khi bản đồ đã tải xong, khởi tạo các layer và đăng ký sự kiện
    const handleLoad = () => {
      initializeMapLayers(map);

      cleanupEvents = registerMapEvents(
        map,
        (point) => onAddPointRef.current(point)
      );

      map.getCanvas().style.cursor = "crosshair";

      // Cập nhật dữ liệu route sau khi các layer đã sẵn sàng.
      updateRoute(map, pointsRef.current);
    };

    map.on("load", handleLoad);

    map.on("error", (event) => {
      console.error("Map error:", event.error);
    });

    return () => {
      map.off("load", handleLoad);

      cleanupEvents?.();

      map.remove();

      mapRef.current = null;
    };
  }, []);

  // ======================================
  // KEEP LATEST POINTS
  // ======================================

  const pointsRef = useRef(points);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // ======================================
  // UPDATE ROUTE - KHÔNG RELOAD MAP
  // ======================================

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) return;

    updateRoute(map, points);
  }, [points]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#eee",
        borderRadius: 8,
      }}
    />
  );
}

// ======================================
// UPDATE ROUTE DATA
// ======================================

function updateRoute(
  map: MapLibreMap,
  points: Point[]
) {
  const routeSource = map.getSource(
    "route-source"
  ) as GeoJSONSource | undefined;

  const pointsSource = map.getSource(
    "points-source"
  ) as GeoJSONSource | undefined;

  if (!routeSource || !pointsSource) return;

  routeSource.setData({
    type: "FeatureCollection",
    features:
      points.length >= 2
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: createRoundedRoute(
                  points,
                  MAP_GRID_CONFIG.ROUTE_RADIUS,
                  MAP_GRID_CONFIG.ROUTE_STEPS
                ),
              },
            },
          ]
        : [],
  });

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
