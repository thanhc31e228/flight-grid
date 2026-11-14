import { useEffect, useRef } from "react";
import { registerWaypointHoverEvents } from "./MapHoverEvents";
import {
  Map as MapLibreMap,
  NavigationControl,
  GeoJSONSource,
  setWorkerUrl,
  type MapMouseEvent,
  type ErrorEvent,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import { MAP_CONFIG, MAP_GRID_CONFIG } from "../../config/map.config";

import { initializeMapLayers, updateGridLabels } from "./MapLayers";
import { registerMapEvents } from "./MapEvents";

import { createRoundedRoute } from "../../features/route/route.geometry";
import type { Point } from "../../features/route/route.types";
import type { GridCell } from "../MapTiler/types/map.types";

type MapViewProps = {
  points: Point[];
  onAddPoint: (point: Point) => number;
  onOpenGridContextMenu: (data: {
    cell: GridCell;
    x: number;
    y: number;
  }) => void;
  gridLabels: string[];
};

// MapTiler API Key
const API_KEY = process.env.REACT_APP_MAPTILER_API_KEY;

setWorkerUrl(
  new URL(
    "maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url,
  ).toString(),
);

export default function MapView({
  points,
  onAddPoint,
  onOpenGridContextMenu,
  gridLabels,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const gridLabelsRef = useRef(gridLabels);

  useEffect(() => {
    gridLabelsRef.current = gridLabels;
  }, [gridLabels]);
  // Giữ callback mới nhất
  const onAddPointRef = useRef(onAddPoint);
  const onOpenGridContextMenuRef = useRef(onOpenGridContextMenu);
  let cleanupEvents: (() => void) | undefined;
  let cleanupAnimation: (() => void) | undefined;
  let cleanupHover: (() => void) | undefined;
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) return;
    // map.on("mouseenter", "points-casing", (e) => {
    //   console.log("ádasdasdas");
    //   map.getCanvas().style.cursor = "pointer";
    // });
    updateGridLabels(map, gridLabels);
  }, [gridLabels]);
  // Giữ points mới nhất
  const pointsRef = useRef(points);

  useEffect(() => {
    onAddPointRef.current = onAddPoint;
  }, [onAddPoint]);

  useEffect(() => {
    onOpenGridContextMenuRef.current = onOpenGridContextMenu;
  }, [onOpenGridContextMenu]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // ======================================
  // HANDLE GRID CONTEXT MENU
  // ======================================

  const handleGridContextMenu = (e: MapMouseEvent) => {
    e.preventDefault();
    console.log("1. Đã bắt được chuột phải");
    const map = mapRef.current;
    if (!map) {
      console.log("Không tìm thấy map");
      return;
    }
    // Kiểm tra feature tại vị trí chuột
    const features = map.queryRenderedFeatures(e.point);
    console.log(
      "2. Các layer tại vị trí chuột:",
      features.map((feature) => feature.layer.id),
    );
    const gridFeature = features.find(
      (feature) => feature.layer.id === "grid-fill",
    );

    if (!gridFeature) {
      console.log("Không tìm thấy grid-fill tại vị trí chuột");
      return;
    }

    const properties = gridFeature.properties;

    console.log("3. Grid properties:", properties);

    if (properties?.row === undefined || properties?.col === undefined) {
      console.log("Grid không có row hoặc col");
      return;
    }

    const cell: GridCell = {
      row: Number(properties.row),
      col: Number(properties.col),
    };

    console.log("4. Cell được chọn:", cell);

    onOpenGridContextMenuRef.current({
      cell,
      x: e.originalEvent.clientX,
      y: e.originalEvent.clientY,
    });

    console.log("5. Đã gọi onOpenGridContextMenu");
  };

  // ======================================
  // INITIALIZE MAP
  // ======================================

  useEffect(() => {
    if (!containerRef.current || !API_KEY) {
      console.error("Không tìm thấy MapTiler API Key");
      return;
    }

    const map = new MapLibreMap({
      container: containerRef.current,
      style: `${MAP_CONFIG.STYLE_URL}?key=${API_KEY}`,
      center: MAP_CONFIG.CENTER,
      zoom: MAP_CONFIG.INITIAL_ZOOM,
    });

    mapRef.current = map;

    map.addControl(new NavigationControl(), "top-right");

    let cleanupEvents: (() => void) | undefined;
    let cleanupAnimation: (() => void) | undefined;
    const handleLoad = () => {
      cleanupAnimation = initializeMapLayers(map);

      updateGridLabels(map, gridLabelsRef.current);

      // Đăng ký hover sau khi layer đã được tạo
      cleanupHover = registerWaypointHoverEvents(map);

      cleanupEvents = registerMapEvents(map, (point) =>
        onAddPointRef.current(point),
      );

      map.on("contextmenu", "grid-fill", handleGridContextMenu);

      map.getCanvas().style.cursor = "crosshair";

      updateRoute(map, pointsRef.current);
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Map error:", event.error);
    };

    map.on("load", handleLoad);
    map.on("error", handleError);

    return () => {
      map.off("load", handleLoad);
      map.off("error", handleError);

      map.off("contextmenu", "grid-fill", handleGridContextMenu);

      cleanupHover?.();
      cleanupEvents?.();
      cleanupAnimation?.();

      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ======================================
  // UPDATE ROUTE
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

function updateRoute(map: MapLibreMap, points: Point[]) {
  const routeSource = map.getSource("route-source") as
    | GeoJSONSource
    | undefined;

  const pointsSource = map.getSource("points-source") as
    | GeoJSONSource
    | undefined;

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
                  MAP_GRID_CONFIG.ROUTE_STEPS,
                ),
              },
            },
          ]
        : [],
  });

  // thêm đánh dấu điểm
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
