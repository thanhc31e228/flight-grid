import { useEffect, useRef, useState } from "react";

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

import {
  initializeMapLayers,
  setFireZoneLayer,
  toggleAzimuthLayers,
  togglePlaceLabel,
  updateGridLabels,
  updateWaypoints,
} from "./MapLayers";

import { registerMapEvents } from "./MapEvents";

import { registerWaypointHoverEvents } from "./MapHoverEvents";

import { createRoundedRoute } from "../../features/route/route.geometry";

import type { GridCell, AirCraft } from "../MapTiler/types/map.types";

import { useAirCraftContext } from "../../context/MakerContext";
import type { Place } from "../../features/places/place.types";
import { useMapContext } from "../../context/MapContext";
import { usePlaceContext } from "../../context/PlaceContext";
import {
  addPlaces,
  togglePlaceLayers,
} from "../../features/places/places.layers";

// ======================================
// TYPES
// ======================================

type MapViewProps = {
  // Giữ prop này để không làm hỏng component cha hiện tại.
  // Dữ liệu từ Context được ưu tiên.
  aircrafts: AirCraft[];
  // Danh sách địa điểm: nguồn duy nhất là prop này (từ useLocations ở trang cha)
  places: Place[];
  focusTarget?: { lat: number; lng: number; nonce: number } | null;
  onOpenGridContextMenu: (data: {
    cell: GridCell;
    x: number;
    y: number;
  }) => void;

  gridLabels: string[];
};

// ======================================
// CONFIG
// ======================================

const API_KEY = process.env.REACT_APP_MAPTILER_API_KEY;

setWorkerUrl(
  new URL(
    "maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url,
  ).toString(),
);

// ======================================
// MAP VIEW
// ======================================

export default function MapView({
  aircrafts: propAircrafts,
  onOpenGridContextMenu,
  gridLabels,
  focusTarget,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  // Map đã load xong và đã khởi tạo layer chưa.
  // Dùng state (không dùng ref) để các effect phía dưới chạy lại khi map sẵn sàng.
  const [mapReady, setMapReady] = useState(false);

  // ======================================
  // CONTEXT
  // ======================================

  const {
    selectedAircraftId,
    aircrafts: contextAircrafts,
    addPoint,
    getLastPoint,
  } = useAirCraftContext();
  const {
    commitGridSelected,
    showAzimuth,
    showPlace: showPlaceLabel,
    baseCoordinates,
  } = useMapContext();
  const { places, showPlace } = usePlaceContext();
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    toggleAzimuthLayers(map, showAzimuth);
  }, [showAzimuth]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    togglePlaceLayers(map, showPlace);
  }, [showPlace]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    togglePlaceLabel(map, showPlaceLabel);
  }, [showPlaceLabel]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setFireZoneLayer(map, baseCoordinates);
  }, [baseCoordinates]);
  // Context là nguồn dữ liệu chính.
  // Props chỉ là phương án dự phòng.
  const aircraftList = contextAircrafts ?? propAircrafts;

  // ======================================
  // LATEST VALUES REFS
  // ======================================

  const aircraftsRef = useRef<AirCraft[]>(aircraftList);

  const selectedAircraftIdRef = useRef<string | null>(selectedAircraftId);

  const addPointRef = useRef(addPoint);

  const gridLabelsRef = useRef<string[]>(gridLabels);

  const onOpenGridContextMenuRef = useRef(onOpenGridContextMenu);

  // ======================================
  // SYNC REFS
  // ======================================

  useEffect(() => {
    aircraftsRef.current = aircraftList;
  }, [aircraftList]);

  useEffect(() => {
    selectedAircraftIdRef.current = selectedAircraftId;
  }, [selectedAircraftId]);

  useEffect(() => {
    addPointRef.current = addPoint;
  }, [addPoint]);

  useEffect(() => {
    gridLabelsRef.current = gridLabels;
  }, [gridLabels]);

  useEffect(() => {
    onOpenGridContextMenuRef.current = onOpenGridContextMenu;
  }, [onOpenGridContextMenu]);

  // ======================================
  // UPDATE PLACE LABELS
  // Chạy khi map sẵn sàng và mỗi khi danh sách địa điểm đổi (thêm/sửa/xóa)
  // ======================================

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    addPlaces(map, places);
  }, [mapReady, places]);

  // Bay tới địa điểm được chọn
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focusTarget) return;

    map.flyTo({
      center: [focusTarget.lng, focusTarget.lat], // MapLibre là [lng, lat], đừng đảo
      zoom: Math.max(map.getZoom(), 14),
      essential: true,
    });
  }, [mapReady, focusTarget]);

  // ======================================
  // UPDATE GRID LABELS
  // ======================================
  useEffect(() => {
    if (!mapRef.current) return;

    updateWaypoints(mapRef.current, aircraftList);
  }, [aircraftList]);
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) return;

    updateGridLabels(map, gridLabelsRef.current);
  }, [gridLabels]);

  // ======================================
  // UPDATE AIRCRAFT ROUTES
  // ======================================

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    updateAircraftRoutes(map, aircraftList);
  }, [aircraftList]);

  // ======================================
  // HANDLE GRID CONTEXT MENU
  // ======================================

  const handleGridContextMenu = (e: MapMouseEvent) => {
    e.preventDefault();

    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) return;

    const features = map.queryRenderedFeatures(e.point, {
      layers: ["grid-fill"],
    });

    const gridFeature = features.find(
      (feature) => feature.layer.id === "grid-fill",
    );

    if (!gridFeature) return;

    const properties = gridFeature.properties;

    if (properties?.row === undefined || properties?.col === undefined) {
      return;
    }

    // onOpenGridContextMenuRef.current({
    //   cell,
    //   x: e.originalEvent.clientX,
    //   y: e.originalEvent.clientY,
    // });
  };

  // ======================================
  // INITIALIZE MAP
  // ======================================
  // cấu hình zoom gần xa,ẩn hiện địa danh
  // function configurePlaceLabelZoom(map: MapLibreMap) {
  //   const zoomRules: Record<string, number> = {
  //     "Village labels": 20,
  //     "Town labels": 8,
  //     "City labels": 6,
  //     "Capital city labels": 4,
  //   };

  //   for (const [layerId, minZoom] of Object.entries(zoomRules)) {
  //     if (!map.getLayer(layerId)) {
  //       console.warn(`[Map] Layer not found: ${layerId}`);
  //       continue;
  //     }

  //     map.setLayerZoomRange(layerId, minZoom, 24);
  //   }
  // }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !API_KEY) {
      console.error("Không tìm thấy MapTiler API Key");
      return;
    }

    let disposed = false;
    let initialized = false;

    let cleanupLayers: (() => void) | undefined;
    let cleanupEvents: (() => void) | undefined;
    let cleanupAnimation: (() => void) | undefined;
    let cleanupHover: (() => void) | undefined;

    const map = new MapLibreMap({
      container,
      style: `${MAP_CONFIG.STYLE_URL}?key=${API_KEY}`,
      center: MAP_CONFIG.CENTER_GRID,
      zoom: MAP_CONFIG.INITIAL_ZOOM,
      dragRotate: false, // tắt kéo chuột phải / Ctrl + kéo để xoay, nghiêng
      pitchWithRotate: false, // không cho nghiêng khi xoay
      touchPitch: false, // tắt nghiêng bằng cảm ứng (nếu có)
    });

    mapRef.current = map;
    map.addControl(new NavigationControl(), "bottom-right");

    // ======================================
    // MAP LOAD
    // ======================================

    const handleLoad = () => {
      if (disposed || initialized) return;

      initialized = true;
      // cấu hình tên địa danh là tiếng việt
      map
        .getStyle()
        .layers.filter((l) => l.type === "symbol" && l.layout?.["text-field"])
        .forEach((l) => {
          map.setLayoutProperty(l.id, "text-field", [
            "coalesce",
            ["get", "name:vi"],
            ["get", "name"],
          ]);
        });
      // Điều chỉnh độ chi tiết tên địa danh theo zoom

      // Khởi tạo toàn bộ source và layer.
      // Giữ lại hàm dọn dẹp (xóa marker label, hover, cache...) để gọi khi unmount.
      cleanupLayers = initializeMapLayers(map);

      // Đồng bộ dữ liệu mới nhất.
      updateGridLabels(map, gridLabelsRef.current);

      updateAircraftRoutes(map, aircraftsRef.current);

      // Đăng ký hover.
      cleanupHover = registerWaypointHoverEvents(map);

      // Đăng ký click và waypoint.
      cleanupEvents = registerMapEvents(
        map,
        (aircraftId, point) => {
          return addPointRef.current(aircraftId, point);
        },
        () => selectedAircraftIdRef.current,
        getLastPoint,
        commitGridSelected,
      );

      // Context menu của grid.
      map.on("contextmenu", "grid-fill", handleGridContextMenu);

      map.getCanvas().style.cursor = "crosshair";

      // Báo map đã sẵn sàng -> effect "UPDATE PLACE LABELS" sẽ vẽ các địa điểm
      setMapReady(true);
    };

    // ======================================
    // MAP ERROR
    // ======================================

    const handleError = (event: ErrorEvent) => {
      console.error("Map error:", event.error);
    };

    map.on("load", handleLoad);
    map.on("error", handleError);

    // ======================================
    // CLEANUP
    // ======================================

    return () => {
      disposed = true;
      setMapReady(false);

      map.off("load", handleLoad);
      map.off("error", handleError);

      // Xóa các event đã đăng ký.
      map.off("contextmenu", "grid-fill", handleGridContextMenu);

      cleanupHover?.();
      cleanupEvents?.();
      cleanupAnimation?.();
      cleanupLayers?.();

      // Xóa map.
      map.remove();

      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, [getLastPoint]);

  // ======================================
  // RENDER
  // ======================================

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
// UPDATE AIRCRAFT ROUTES
// ======================================

function updateAircraftRoutes(map: MapLibreMap, aircrafts: AirCraft[]) {
  const routeSource = map.getSource("route-source") as
    | GeoJSONSource
    | undefined;

  const pointsSource = map.getSource("points-source") as
    | GeoJSONSource
    | undefined;

  if (!routeSource || !pointsSource) return;

  // ======================================
  // ROUTES GEOJSON
  // Mỗi máy bay là một LineString riêng.
  // ======================================
  routeSource.setData({
    type: "FeatureCollection",

    features: aircrafts
      .filter((aircraft) => aircraft.points.length >= 2)
      .map((aircraft) => ({
        type: "Feature" as const,

        properties: {
          aircraftId: aircraft.id,
          name: aircraft.name,
          color: aircraft.color,
        },

        geometry: {
          type: "LineString" as const,

          coordinates: createRoundedRoute(
            aircraft.points,
            MAP_GRID_CONFIG.ROUTE_RADIUS,
            MAP_GRID_CONFIG.ROUTE_STEPS,
          ),
        },
      })),
  });

  // ======================================
  // WAYPOINTS GEOJSON
  // Mỗi điểm thuộc về một máy bay.
  // ======================================

  pointsSource.setData({
    type: "FeatureCollection",

    features: aircrafts.flatMap((aircraft) =>
      aircraft.points.map((point, index) => ({
        type: "Feature" as const,

        properties: {
          aircraftId: aircraft.id,
          aircraftName: aircraft.name,
          color: aircraft.color,

          index: index + 1,

          lng: point.lng,
          lat: point.lat,
        },

        geometry: {
          type: "Point" as const,

          coordinates: [point.lng, point.lat] as [number, number],
        },
      })),
    ),
  });
}
