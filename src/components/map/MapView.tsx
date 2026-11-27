import { useEffect, useMemo, useRef, useState } from "react";

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

import { registerMapEvents } from "./MapEvents";

import { registerWaypointHoverEvents } from "./MapHoverEvents";

import { createRoundedRoute } from "../../features/route/route.geometry";

import type { GridCell, AirCraft } from "../MapTiler/types/map.types";

import { useAirCraftContext } from "../../context/MakerContext";
import type { Place } from "../../features/places/place.types";
import { useMapContext } from "../../context/MapContext";
import { usePlaceContext } from "../../context/PlaceContext";
import { addPlaces, addPlacesLayers, togglePlaceLayers } from "./layers";
import { setMeasurementTool } from "../MapTiler/utils/measurement.tool";
import {
  getMapStyleUrl,
  keepCustomLayers,
  loadMapStyleId,
  MapStyleId,
} from "../../features/map/baseMaps";
import { toggleAzimuthLayers } from "./layers/azimuth.layers";
import { togglePlaceLabel } from "./layers/place-label.toggle";
import { setFireZoneLayer } from "./layers/fire-zone.layer";
import { updateWaypoints } from "./layers/waypoint.update";
import { updateGridLabels } from "./layers/grid.layers";
import { initializeMapLayers } from "./layers/initialize";
import { getBaseCoordinates } from "../../utils/map.storage";
import { isAircraftNearPoint } from "./layers/waypoint.alert";
import {
  startWaypointPlaneBlink,
  stopWaypointPlaneBlink,
} from "./layers/waypoint.animation";
import { getFireZoneRadius } from "./layers/layer.utils";
import type {
  PlaybackController,
  PlaybackState,
} from "../MapTiler/playback/playback.types";
import {
  addPlaybackLayer,
  clearPlaybackAircraft,
  updatePlaybackAircraft,
  updatePlaybackTrail,
  clearPlaybackTrail,
  setOriginalRouteVisible,
  setWaypointMarkersVisible,
} from "../MapTiler/playback/playback.layers";
import { createAircraftPlayback } from "../MapTiler/playback/aircraft.playback";

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
const STATUS_LABEL: Record<PlaybackState["status"], string> = {
  idle: "Sẵn sàng",
  playing: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
};

const formatPlaybackTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};
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

  // Playback bài tập cho aircraft đang được chọn
  const playbackRef = useRef<PlaybackController | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    status: "idle",
    currentPointIndex: 0,
    progress: 0,
    elapsedTime: 0,
    totalTime: 0,
    speedMultiplier: 1,
  });

  // ======================================
  // CONTEXT
  // ======================================

  const {
    selectedAircraftId,
    aircrafts: contextAircrafts,
    addPoint,
    getLastPoint,
    setAircraftSelected,
    aircraftSelected,
  } = useAirCraftContext();

  const {
    commitGridSelected,
    showAzimuth,
    showPlace: showPlaceLabel,
    baseCoordinates,
    mapStyleId,
  } = useMapContext();

  // Style đang áp dụng trên map (lúc tạo map dùng style nào thì khởi tạo bằng style đó)
  const appliedStyleRef = useRef<MapStyleId>(mapStyleId);

  // Khi tạo map, dùng style đã lưu thay vì style cố định:
  // new maplibregl.Map({ container, style: getMapStyleUrl(mapStyleId), ... })

  // Đổi style khi người dùng chọn trong menu
  useEffect(() => {
    const map = mapRef.current; // tên ref giữ map instance trong MapView
    if (!map) return;
    if (appliedStyleRef.current === mapStyleId) return;

    appliedStyleRef.current = mapStyleId;
    map.setStyle(`${getMapStyleUrl(mapStyleId)}?key=${API_KEY}`, {
      transformStyle: keepCustomLayers,
    });
  }, [mapStyleId]);

  const { places, showPlace, setPlaceSelected } = usePlaceContext();

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

  // Scale label theo mức zoom của map
  useEffect(() => {
    const map = mapRef.current;

    // Map chưa load thì chưa gắn sự kiện
    if (!map || !mapReady) return;

    const BASE_ZOOM = 12; // mức zoom mà label có kích thước gốc (scale = 1)
    const MIN_SCALE = 0.6;
    const MAX_SCALE = 1.6;

    const updateLabelScale = () => {
      // Mỗi cấp zoom thay đổi ~15% kích thước, giới hạn trong [MIN, MAX]
      const raw = 1 + (map.getZoom() - BASE_ZOOM) * 0.15;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw));
      map.getContainer().style.setProperty("--label-scale", scale.toFixed(3));
    };

    updateLabelScale(); // áp dụng ngay lần đầu
    map.on("zoom", updateLabelScale);
    addPlacesLayers(map, (place) => {
      console.log("Địa điểm được click:", place);
      setPlaceSelected(place);
    });
    return () => {
      map.off("zoom", updateLabelScale);
    };
  }, [mapReady, setPlaceSelected]);

  // Cập nhật FireZone và Measurement theo tọa độ mới
  useEffect(() => {
    const map = mapRef.current;

    // Map chưa load thì chưa khởi tạo Measurement
    if (!map || !mapReady) return;

    // Cập nhật vùng FireZone theo tọa độ mới
    setFireZoneLayer(map, baseCoordinates, MAP_CONFIG.FIRE_RANGE_M, 100);

    // Khởi tạo Measurement theo tâm mới
    const cleanupMeasurement = setMeasurementTool(map, baseCoordinates);

    return () => {
      cleanupMeasurement();
    };
  }, [mapReady, baseCoordinates]);
  // Cập nhật vùng hỏa lực theo độ cao tốp máy bay đang chọn
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // altitude lưu theo hm (có thể là string) -> ép sang number rồi đổi sang m
    const altitudeHm = Number(aircraftSelected?.altitude);
    const altitudeM = Number.isFinite(altitudeHm) ? altitudeHm * 100 : 0;

    setFireZoneLayer(
      mapRef.current,
      getBaseCoordinates(),
      MAP_CONFIG.FIRE_RANGE_M,
      altitudeM,
    );
  }, [mapReady, aircraftSelected?.altitude, aircraftSelected?.id]);
  useEffect(() => {
    if (!mapReady || !mapRef.current || !aircraftSelected) return;

    const lastPoint = aircraftSelected.points.at(-1);
    if (!lastPoint) return;
    const radiusM = getFireZoneRadius(
      MAP_CONFIG.FIRE_RANGE_M,
      Number(aircraftSelected?.altitude),
    );

    const isNear = isAircraftNearPoint(
      [lastPoint.lng, lastPoint.lat], // Điểm cuối máy bay
      getBaseCoordinates(), // Vị trí mục tiêu
      radiusM, // Ngưỡng vào trong vùng hỏa lực
    );
    if (isNear) {
      startWaypointPlaneBlink(mapRef.current);
    } else {
      stopWaypointPlaneBlink(mapRef.current);
    }
    return () => {
      if (mapRef.current) {
        stopWaypointPlaneBlink(mapRef.current);
      }
    };
  }, [mapReady, aircraftSelected?.points, aircraftSelected]);
  // useEffect(() => {
  //   const map = mapRef.current;
  //   if (!map || !mapReady || !selectedAircraftId) return;
  //   pinAircraft(map, selectedAircraftId);
  //   console.log("selectedAircraftId ", selectedAircraftId);
  // }, [selectedAircraftId, mapReady]);
  // Context là nguồn dữ liệu chính.
  // Props chỉ là phương án dự phòng.
  const aircraftList = contextAircrafts ?? propAircrafts;

  // ======================================
  // AIRCRAFT PLAYBACK
  // Mỗi chặng giữa hai waypoint chạy 10 giây ở tốc độ 1x.
  // Bay theo đúng đường bo góc đang vẽ trên map.
  // Chạy xong: ẩn đường gốc, chỉ giữ lại đường đã đi (trail).
  // ======================================

  // Khóa đại diện cho aircraft đang chọn: chỉ đổi khi id / màu / tọa độ đổi thật sự,
  // tránh playback bị khởi động lại khi context tạo object mới mà dữ liệu không đổi.
  const playbackKey = useMemo(() => {
    if (!aircraftSelected) return "";
    const coords = aircraftSelected.points
      .map((p) => `${p.lng},${p.lat}`)
      .join(";");
    return `${aircraftSelected.id}|${aircraftSelected.color ?? ""}|${coords}`;
  }, [aircraftSelected]);

  const aircraftSelectedRef = useRef(aircraftSelected);
  useEffect(() => {
    aircraftSelectedRef.current = aircraftSelected;
  }, [aircraftSelected]);

  useEffect(() => {
    const map = mapRef.current;
    const aircraft = aircraftSelectedRef.current;
    if (!map || !mapReady || !aircraft) return;

    const color = aircraft.color ?? "#22c55e";

    // Dọn playback cũ
    playbackRef.current?.stop();
    clearPlaybackAircraft(map);
    clearPlaybackTrail(map);
    setOriginalRouteVisible(map, true);

    // Đường đã bo góc - cùng đường với layer route trên map
    const path =
      aircraft.points.length >= 2
        ? (createRoundedRoute(
            aircraft.points,
            MAP_GRID_CONFIG.ROUTE_RADIUS,
            MAP_GRID_CONFIG.ROUTE_STEPS,
          ) as [number, number][])
        : undefined;

    const controller = createAircraftPlayback(aircraft, {
      segmentDuration: 10_000,
      speedMultiplier: 1,
      path,
      onPositionChange: (position, bearing, trail) => {
        updatePlaybackAircraft(map, position.lng, position.lat, bearing, color);
        updatePlaybackTrail(map, trail, color);
      },
      onStateChange: setPlaybackState,
      onComplete: () => {
        // Xong: bỏ máy bay playback, giữ đường đã đi,
        // KHÔNG hiện lại đường gốc.
        clearPlaybackAircraft(map);
        setOriginalRouteVisible(map, false);
      },
    });

    playbackRef.current = controller;
    setPlaybackState(controller.getState());

    return () => {
      controller.stop();
      if (playbackRef.current === controller) playbackRef.current = null;
      clearPlaybackAircraft(map);
      clearPlaybackTrail(map);
      setOriginalRouteVisible(map, true);
    };
  }, [mapReady, playbackKey]);
  // Trong lúc phát (đang chạy / tạm dừng): ẩn vạch ở các điểm giữa
  // và máy bay ở điểm cuối, chỉ giữ điểm đầu. Hết phát / Stop thì hiện lại.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const isPlaybackActive =
      playbackState.status === "playing" || playbackState.status === "paused";

    setWaypointMarkersVisible(map, !isPlaybackActive);
  }, [mapReady, playbackState.status]);
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
    updateWaypoints(mapRef.current, aircraftList, setAircraftSelected);
  }, [aircraftList, setAircraftSelected]);
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

    // Lấy style từ localStorage, chưa có thì hàm tự ghi giá trị mặc định
    const initialStyleId = loadMapStyleId();
    appliedStyleRef.current = initialStyleId;

    const map = new MapLibreMap({
      container,
      style: `${getMapStyleUrl(initialStyleId)}?key=${API_KEY}`,
      center: MAP_CONFIG.CENTER_GRID,
      zoom: MAP_CONFIG.INITIAL_ZOOM,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
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

      // Layer riêng để hiển thị máy bay đang playback, không ghi đè waypoint gốc.
      addPlaybackLayer(map);

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
      playbackRef.current?.stop();
      playbackRef.current = null;
      cleanupLayers?.();

      // Xóa map.
      map.remove();

      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, [getLastPoint, commitGridSelected]);

  // ======================================
  // RENDER
  // ======================================

  const formatPlaybackTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#eee",
          borderRadius: 8,
        }}
      />

      {/* Playback controls overlay */}
      {/* Playback controls: đặt giữa phía dưới để không đè panel trái / hàng nút phía trên */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 flex w-[340px] max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Bài tập · 10 giây / chặng
            </div>
            <div className="truncate text-sm font-semibold text-slate-800">
              {aircraftSelected?.id ?? "Chưa chọn máy bay"}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {STATUS_LABEL[playbackState.status]}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            disabled={!aircraftSelected || aircraftSelected.points.length < 2}
            onClick={() => {
              if (mapRef.current)
                setOriginalRouteVisible(mapRef.current, false);
              if (playbackState.status === "paused")
                playbackRef.current?.resume();
              else playbackRef.current?.play();
            }}
            className="rounded bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {playbackState.status === "paused" ? "Tiếp tục" : "Play"}
          </button>
          <button
            type="button"
            disabled={playbackState.status !== "playing"}
            onClick={() => playbackRef.current?.pause()}
            className="rounded bg-amber-500 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Pause
          </button>
          <button
            type="button"
            disabled={!aircraftSelected || aircraftSelected.points.length < 1}
            onClick={() => {
              playbackRef.current?.stop();
              if (mapRef.current) {
                clearPlaybackAircraft(mapRef.current);
                clearPlaybackTrail(mapRef.current);
                setOriginalRouteVisible(mapRef.current, true);
              }
            }}
            className="rounded bg-slate-600 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Stop
          </button>
          <button
            type="button"
            disabled={!aircraftSelected || aircraftSelected.points.length < 2}
            onClick={() => {
              if (mapRef.current)
                setOriginalRouteVisible(mapRef.current, false);
              playbackRef.current?.replay();
            }}
            className="rounded bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Replay
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
          <span className="tabular-nums">
            P
            {Math.min(
              playbackState.currentPointIndex + 1,
              aircraftSelected?.points.length ?? 0,
            )}
            {" / "}
            {aircraftSelected?.points.length ?? 0}
          </span>
          <select
            aria-label="Playback speed"
            value={playbackState.speedMultiplier}
            onChange={(event) =>
              playbackRef.current?.setSpeed(Number(event.target.value))
            }
            className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs outline-none focus:border-blue-400"
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
          <span className="tabular-nums">
            {formatPlaybackTime(playbackState.elapsedTime)} /{" "}
            {formatPlaybackTime(playbackState.totalTime)}
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{
              width: `${Math.max(0, Math.min(1, playbackState.progress)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
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
