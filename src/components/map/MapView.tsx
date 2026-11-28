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
  stopWaypointPlaneBlink,
  syncWaypointPlaneBlink,
} from "./layers/waypoint.animation";
import { getFireZoneRadius } from "./layers/layer.utils";
import type {
  ExerciseEntry,
  PlaybackController,
  PlaybackState,
} from "../MapTiler/playback/playback.types";
import {
  addPlaybackLayer,
  clearPlaybackAircraft,
  clearPlaybackTrail,
  setOriginalRouteVisible,
  updatePlaybackFrames,
} from "../MapTiler/playback/playback.layers";
import { createExercisePlayback } from "../MapTiler/playback/exercise.playback";
import {
  formatClock,
  msToMinutes,
  PLAYBACK_SEGMENT_DURATION,
  resolveStartOffsets,
} from "../MapTiler/playback/playback.utils";
import {
  createExerciseRecorder,
  ExerciseRecorder,
  RecorderState,
} from "../MapTiler/playback/exercise.recorder";

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
    progress: 0,
    elapsedTime: 0,
    totalTime: 0,
    speedMultiplier: 1,
    aircrafts: [],
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
    setSelectedAircraftId,
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
  useEffect(() => {
    const map = mapRef.current; // tên ref giữ map instance trong MapView
    if (!map) return;
    map.on("click", "points-layer", (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const properties = feature.properties;
      if (properties?.aircraftId) {
        setSelectedAircraftId(properties?.aircraftId);
      }
    });
  }, [mapReady, setSelectedAircraftId]);

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
  // Đồng bộ nháy theo TẤT CẢ máy bay, không phụ thuộc máy bay đang chọn

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
  // RECORDER + LỊCH XUẤT HIỆN
  // ======================================

  const [newAppearMinute, setNewAppearMinute] = useState("");
  const newAppearMinuteRef = useRef("");

  const [recState, setRecState] = useState<RecorderState>({
    status: "idle",
    elapsedTime: 0,
    entries: [],
    events: [],
  });
  const [recElapsed, setRecElapsed] = useState(0);

  const recorderRef = useRef<ExerciseRecorder | null>(null);
  if (!recorderRef.current) {
    recorderRef.current = createExerciseRecorder({ onChange: setRecState });
  }
  const isRecording = recState.status === "recording";

  useEffect(() => {
    if (!isRecording) {
      setRecElapsed(recState.elapsedTime);
      return;
    }
    const id = setInterval(
      () => setRecElapsed(recorderRef.current?.getElapsed() ?? 0),
      250,
    );
    return () => clearInterval(id);
  }, [isRecording, recState.elapsedTime]);

  // Máy bay mới xuất hiện trong aircraftList -> đăng ký vào recorder
  // (đang ghi: tự lấy theo đồng hồ ghi; có nhập phút: dùng số đó; còn lại: 0)
  const knownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    const known = knownIdsRef.current;
    const currentIds = new Set(aircraftList.map((a) => String(a.id)));
    let usedManualMinute = false;

    for (const aircraft of aircraftList) {
      const id = String(aircraft.id);
      if (known.has(id)) continue;
      known.add(id);

      const raw = newAppearMinuteRef.current.trim();
      const minute = raw === "" ? undefined : Number(raw);
      const hasMinute = minute !== undefined && Number.isFinite(minute);
      if (hasMinute) usedManualMinute = true;

      recorder.addAircraft(aircraft, {
        appearAtMinute: hasMinute ? minute : undefined,
      });
    }

    for (const id of Array.from(known)) {
      if (!currentIds.has(id)) {
        known.delete(id);
        recorder.removeAircraft(id);
      }
    }

    // Dùng xong thì xóa để máy bay sau không bị dính giá trị cũ
    if (usedManualMinute) {
      newAppearMinuteRef.current = "";
      setNewAppearMinute("");
    }
  }, [aircraftList]);

  // Entry của recorder giữ bản aircraft cũ (lúc mới tạo, ít point).
  // resolveStartOffsets cần số point MỚI NHẤT để kẹp pointIndex,
  // nên luôn ghép lại aircraft mới từ aircraftList.
  const liveEntries = useMemo<ExerciseEntry[]>(() => {
    const byId = new Map(aircraftList.map((a) => [String(a.id), a]));
    return recState.entries.map((e) => ({
      ...e,
      aircraft: byId.get(String(e.aircraft.id)) ?? e.aircraft,
    }));
  }, [recState.entries, aircraftList]);

  // Thời điểm xuất hiện thật sự (ms) của từng máy bay, dùng để hiển thị
  const resolvedStarts = useMemo(
    () =>
      new Map(
        resolveStartOffsets(liveEntries, PLAYBACK_SEGMENT_DURATION).map((e) => [
          String(e.aircraft.id),
          e.startOffset ?? 0,
        ]),
      ),
    [liveEntries],
  );

  // Khóa để playback dựng lại khi lịch xuất hiện đổi
  const scheduleKey = useMemo(
    () =>
      recState.entries
        .map((e) =>
          [
            e.aircraft.id,
            e.startOffset ?? 0,
            e.appearAfter
              ? `${e.appearAfter.aircraftId}:${e.appearAfter.pointIndex}:${e.appearAfter.delay ?? 0}`
              : "",
          ].join("|"),
        )
        .join("||"),
    [recState.entries],
  );
  // ======================================
  // AIRCRAFT PLAYBACK - MULTIPLE AIRCRAFT
  // Tất cả máy bay chạy trong cùng một timeline.
  // Mỗi máy bay có path riêng, startOffset riêng.
  // ======================================

  // HHmm -> offset tương đối tính từ máy bay xuất hiện sớm nhất

  // Khóa playback chỉ đổi khi dữ liệu bài tập thực sự thay đổi
  const playbackKey = useMemo(() => {
    return aircraftList
      .map((aircraft) => {
        const points = aircraft.points
          .map((p) => `${p.lng},${p.lat}`)
          .join(";");

        return [
          aircraft.id,
          aircraft.color,
          aircraft.points.length,
          points,
        ].join("|");
      })
      .join("||");
  }, [aircraftList]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    playbackRef.current?.stop();
    playbackRef.current = null;

    clearPlaybackAircraft(map);
    clearPlaybackTrail(map);
    setOriginalRouteVisible(map, true);

    // Lịch xuất hiện lấy từ recorder, aircraft lấy bản mới nhất từ aircraftList
    const scheduleById = new Map(
      (recorderRef.current?.getEntries() ?? []).map((e) => [
        String(e.aircraft.id),
        e,
      ]),
    );
    // Tạo ExerciseEntry cho TẤT CẢ máy bay
    const entries: ExerciseEntry[] = aircraftList
      .filter((aircraft) => aircraft.points.length > 0)
      .map((aircraft) => {
        const path =
          aircraft.points.length >= 2
            ? (createRoundedRoute(
                aircraft.points,
                MAP_GRID_CONFIG.ROUTE_RADIUS,
                MAP_GRID_CONFIG.ROUTE_STEPS,
              ) as [number, number][])
            : undefined;

        const schedule = scheduleById.get(String(aircraft.id));

        return {
          aircraft,
          path,
          startOffset: schedule?.startOffset ?? 0,
          appearAfter: schedule?.appearAfter,
        };
      });
    if (entries.length === 0) {
      setPlaybackState({
        status: "idle",
        progress: 0,
        elapsedTime: 0,
        totalTime: 0,
        speedMultiplier: 1,
        aircrafts: [],
      });

      return;
    }

    // Tạo bộ điều khiển bài tập nhiều máy bay
    const controller = createExercisePlayback(entries, {
      segmentDuration: PLAYBACK_SEGMENT_DURATION, // 30s/chặng, thay cho 10_000
      speedMultiplier: 1,

      // Mỗi frame cập nhật toàn bộ máy bay và trail
      onFrame: (frames) => {
        updatePlaybackFrames(map, frames);
      },

      onStateChange: (state) => {
        setPlaybackState(state);
      },

      onComplete: () => {
        // Khi hoàn thành:
        // - Ẩn tất cả máy bay playback
        // - Giữ lại toàn bộ trail
        // - Ẩn đường bay gốc
        clearPlaybackAircraft(map);
        setOriginalRouteVisible(map, false);
      },
    });

    playbackRef.current = controller;
    setPlaybackState(controller.getState());

    return () => {
      controller.stop();

      if (playbackRef.current === controller) {
        playbackRef.current = null;
      }

      clearPlaybackAircraft(map);
      clearPlaybackTrail(map);
      setOriginalRouteVisible(map, true);
    };
  }, [mapReady, playbackKey, aircraftList]);
  function parseAltitudeM(raw: unknown): number | null {
    const n = parseFloat(String(raw ?? "").replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return n * MAP_CONFIG.ALTITUDE_UNIT_M;
  }
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const baseCoords = getBaseCoordinates();

    const nearIds = aircraftList
      .filter((aircraft) => {
        const lastPoint = aircraft.points.at(-1);
        if (!lastPoint) return false;

        const altitudeM = parseAltitudeM(aircraft.altitude);
        if (altitudeM === null) return false;

        const radiusM = getFireZoneRadius(MAP_CONFIG.FIRE_RANGE_M, altitudeM);

        return isAircraftNearPoint(
          [lastPoint.lng, lastPoint.lat],
          baseCoords,
          radiusM,
        );
      })
      .map((aircraft) => aircraft.id);

    syncWaypointPlaneBlink(map, nearIds);
  }, [mapReady, aircraftList]);
  // Chỉ dừng animation khi component unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) stopWaypointPlaneBlink(mapRef.current);
    };
  }, []);
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
  const playbackAircraftCount = playbackState.aircrafts.length;

  const flyingCount = playbackState.aircrafts.filter(
    (aircraft) => aircraft.status === "flying",
  ).length;

  const waitingCount = playbackState.aircrafts.filter(
    (aircraft) => aircraft.status === "waiting",
  ).length;

  const completedCount = playbackState.aircrafts.filter(
    (aircraft) => aircraft.status === "completed",
  ).length;

  const hasPlaybackRoute = aircraftList.some(
    (aircraft) => aircraft.points.length >= 2,
  );
  const [isPlaybackPanelOpen, setIsPlaybackPanelOpen] = useState(false);

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

      {/* Playback controls: đặt giữa phía dưới để không đè panel trái / hàng nút phía trên */}
      {/* Playback controls - multi aircraft */}
      {/* ======================================
    PLAYBACK TOGGLE BUTTON
====================================== */}
      <button
        type="button"
        onClick={() => setIsPlaybackPanelOpen((prev) => !prev)}
        className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-slate-300 bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm transition hover:bg-slate-50"
      >
        <span className="text-xs font-semibold text-slate-700">
          {isPlaybackPanelOpen ? "Ẩn " : "Tạo bài tập"}
        </span>

        <span className="text-xs text-slate-500">
          {isPlaybackPanelOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* ======================================
    PLAYBACK PANEL
====================================== */}
      {isPlaybackPanelOpen && (
        <div className="pointer-events-auto absolute bottom-16 left-1/2 z-10 flex w-[360px] max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Bài tập
                {/* {PLAYBACK_SEGMENT_DURATION / 1000} giây / chặng */}
              </div>

              <div className="truncate text-sm font-semibold text-slate-800">
                {playbackAircraftCount} máy bay
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {STATUS_LABEL[playbackState.status]}
            </span>
          </div>

          {/* ===== Ghi bài tập ===== */}
          <div className="flex flex-col gap-1.5 rounded border border-slate-200 p-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={playbackState.status === "playing"}
                onClick={() =>
                  isRecording
                    ? recorderRef.current?.stop()
                    : recorderRef.current?.start()
                }
                className={`rounded px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 ${
                  isRecording
                    ? "bg-slate-700 hover:bg-slate-800"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isRecording ? "■ Dừng ghi" : "● Bắt đầu ghi"}
              </button>

              <span
                className={`flex items-center gap-1.5 text-xs tabular-nums ${
                  isRecording ? "font-semibold text-red-600" : "text-slate-500"
                }`}
              >
                {isRecording && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                )}
                {isRecording ? "REC" : "Đã ghi"}{" "}
                {formatPlaybackTime(recElapsed)}
              </span>
            </div>
            {/* 
            <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
              <span>Máy bay mới xuất hiện từ phút</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={newAppearMinute}
                onChange={(e) => {
                  newAppearMinuteRef.current = e.target.value;
                  setNewAppearMinute(e.target.value);
                }}
                placeholder={isRecording ? "tự động" : "0"}
                className="w-20 rounded border border-slate-200 px-2 py-0.5 text-right text-xs outline-none focus:border-blue-400"
              />
            </label> */}

            {/* Thời gian xuất hiện của từng máy bay (sửa được) */}
            {liveEntries.length > 0 && (
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {liveEntries.map((entry) => {
                  const id = String(entry.aircraft.id);
                  return (
                    <AppearRow
                      key={id}
                      entry={entry}
                      label={entry.aircraft.name ?? id}
                      resolvedMs={resolvedStarts.get(id) ?? 0}
                      others={liveEntries
                        .filter((e) => String(e.aircraft.id) !== id)
                        .map((e) => ({
                          id: String(e.aircraft.id),
                          label: e.aircraft.name ?? String(e.aircraft.id),
                        }))}
                      onChange={(patch) =>
                        recorderRef.current?.updateEntry(id, patch)
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Aircraft status */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded bg-emerald-50 px-2 py-1 text-center">
              <div className="text-[10px] text-emerald-600">Đang bay</div>
              <div className="text-sm font-semibold text-emerald-700">
                {flyingCount}
              </div>
            </div>

            <div className="rounded bg-amber-50 px-2 py-1 text-center">
              <div className="text-[10px] text-amber-600">Chờ</div>
              <div className="text-sm font-semibold text-amber-700">
                {waitingCount}
              </div>
            </div>

            <div className="rounded bg-slate-100 px-2 py-1 text-center">
              <div className="text-[10px] text-slate-500">Hoàn thành</div>
              <div className="text-sm font-semibold text-slate-700">
                {completedCount}
              </div>
            </div>
          </div>

          {/* Buttons: Play/Replay bị khóa khi đang ghi */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              disabled={!hasPlaybackRoute || isRecording}
              onClick={() => {
                if (mapRef.current) {
                  setOriginalRouteVisible(mapRef.current, false);
                }

                if (playbackState.status === "paused") {
                  playbackRef.current?.resume();
                } else {
                  playbackRef.current?.play();
                }
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
              disabled={playbackAircraftCount === 0}
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
              disabled={!hasPlaybackRoute || isRecording}
              onClick={() => {
                if (mapRef.current) {
                  setOriginalRouteVisible(mapRef.current, false);
                }

                playbackRef.current?.replay();
              }}
              className="rounded bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Replay
            </button>
          </div>

          {/* Time + speed */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <span className="tabular-nums">
              {formatPlaybackTime(playbackState.elapsedTime)}
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
              {formatPlaybackTime(playbackState.totalTime)}
            </span>
          </div>

          {/* Progress */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width]"
              style={{
                width: `${Math.max(0, Math.min(1, playbackState.progress)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
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
type AppearRowProps = {
  entry: ExerciseEntry;
  label: string;
  resolvedMs: number;
  others: { id: string; label: string }[];
  onChange: (patch: Partial<Omit<ExerciseEntry, "aircraft">>) => void;
};

function AppearRow({
  entry,
  label,
  resolvedMs,
  others,
  onChange,
}: AppearRowProps) {
  const rule = entry.appearAfter;
  const mode = rule ? "after" : "minute";

  return (
    <div className="flex flex-col gap-1 rounded bg-slate-50 p-1.5 text-xs text-slate-700">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">{label}</span>
        <span className="shrink-0 tabular-nums text-slate-500">
          xuất hiện {formatClock(resolvedMs)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <select
          value={mode}
          onChange={(e) => {
            if (e.target.value === "after" && others.length > 0) {
              onChange({
                appearAfter: { aircraftId: others[0].id, pointIndex: 1 },
              });
            } else {
              // Về nhập tay: giữ nguyên thời điểm đang có
              onChange({ appearAfter: undefined, startOffset: resolvedMs });
            }
          }}
          className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs outline-none focus:border-blue-400"
        >
          <option value="minute">Từ phút</option>
          <option value="after" disabled={others.length === 0}>
            Sau máy bay
          </option>
        </select>

        {rule ? (
          <>
            <select
              value={rule.aircraftId}
              onChange={(e) =>
                onChange({
                  appearAfter: { ...rule, aircraftId: e.target.value },
                })
              }
              className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-xs outline-none focus:border-blue-400"
            >
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>

            <span className="shrink-0 text-slate-500">bay</span>
            <input
              key={rule.pointIndex}
              type="number"
              min={0}
              step={1}
              defaultValue={rule.pointIndex}
              onBlur={(e) =>
                onChange({
                  appearAfter: {
                    ...rule,
                    pointIndex: Math.max(
                      0,
                      Math.floor(Number(e.target.value) || 0),
                    ),
                  },
                })
              }
              className="w-12 rounded border border-slate-200 px-1 py-0.5 text-right text-xs outline-none focus:border-blue-400"
            />
            <span className="shrink-0 text-slate-500">chặng</span>
          </>
        ) : (
          <input
            key={entry.startOffset ?? 0}
            type="number"
            min={0}
            step={0.5}
            defaultValue={msToMinutes(entry.startOffset ?? 0)}
            onBlur={(e) =>
              onChange({
                startOffset: Math.round((Number(e.target.value) || 0) * 60_000),
              })
            }
            className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-right text-xs outline-none focus:border-blue-400"
          />
        )}
      </div>
    </div>
  );
}
