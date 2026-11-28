import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import type { Map as MapLibreMap } from "maplibre-gl";

import { MAP_GRID_CONFIG } from "../../config/map.config";

import { createRoundedRoute } from "../../features/route/route.geometry";

import type { AirCraft } from "../MapTiler/types/map.types";

import type {
  ExerciseEntry,
  PlaybackController,
  PlaybackState,
} from "../MapTiler/playback/playback.types";
import {
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
  cloneAircraft,
  createExerciseId,
  defaultExerciseName,
  formatExerciseDate,
  loadExercises,
  saveExercises,
  type SavedExercise,
} from "../MapTiler/playback/exercise.storage";
import { useAirCraftContext } from "../../context/MakerContext";

// ======================================
// TYPES
// ======================================

type ExercisePanelProps = {
  // Ref giữ map instance của MapView (đọc mapRef.current như cũ)
  mapRef: RefObject<MapLibreMap | null>;
  // Map đã load xong và đã khởi tạo layer chưa
  mapReady: boolean;
  // Danh sách máy bay hiện có trên bản đồ (từ MapView)
  aircraftList: AirCraft[];
};

type PanelView = "list" | "detail";

// ======================================
// CONFIG
// ======================================

const STATUS_LABEL: Record<PlaybackState["status"], string> = {
  idle: "Sẵn sàng",
  playing: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
};

const EMPTY_ENTRIES: ExerciseEntry[] = [];

const formatPlaybackTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// ======================================
// EXERCISE PANEL
// ======================================

export default function ExercisePanel({
  mapRef,
  mapReady,
  aircraftList,
}: ExercisePanelProps) {
  // Playback bài tập đang mở
  const playbackRef = useRef<PlaybackController | null>(null);

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    status: "idle",
    progress: 0,
    elapsedTime: 0,
    totalTime: 0,
    speedMultiplier: 1,
    aircrafts: [],
  });
  const { aircrafts, removeAirCraft } = useAirCraftContext();
  const [isPlaybackPanelOpen, setIsPlaybackPanelOpen] = useState(false);

  // ======================================
  // THƯ VIỆN BÀI TẬP (localStorage)
  // ======================================

  const [exercises, setExercises] = useState<SavedExercise[]>(() =>
    loadExercises(),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<PanelView>("list");

  // Mỗi lần danh sách đổi thì ghi xuống localStorage
  useEffect(() => {
    saveExercises(exercises);
  }, [exercises]);

  const activeExercise = useMemo(
    () => exercises.find((ex) => ex.id === activeId) ?? null,
    [exercises, activeId],
  );

  const entries = activeExercise?.entries ?? EMPTY_ENTRIES;

  const updateExercise = useCallback(
    (id: string, fn: (exercise: SavedExercise) => SavedExercise) => {
      setExercises((prev) => {
        let changed = false;
        const next = prev.map((ex) => {
          if (ex.id !== id) return ex;
          const updated = fn(ex);
          if (updated !== ex) changed = true;
          return updated;
        });
        return changed ? next : prev;
      });
    },
    [],
  );

  // ======================================
  // GHI BÀI TẬP
  // Bấm ghi -> tạo bài tập mới (danh sách rỗng).
  // Máy bay được tạo trong lúc ghi sẽ tự thêm vào danh sách.
  // Bấm dừng -> chốt danh sách.
  // ======================================

  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recElapsed, setRecElapsed] = useState(0);
  const recordStartRef = useRef(0);
  // Máy bay không được tự thêm vào bài tập:
  // đã có sẵn trên bản đồ lúc bắt đầu ghi, hoặc đã bị xóa khỏi bài tập trong lúc ghi
  const ignoredIdsRef = useRef<Set<string>>(new Set());
  const isRecording = recordingId !== null;

  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(
      () => setRecElapsed(Date.now() - recordStartRef.current),
      250,
    );
    return () => clearInterval(id);
  }, [isRecording]);

  // Đang ghi: máy bay mới xuất hiện trên bản đồ -> thêm vào bài tập
  // (thời điểm xuất hiện = đồng hồ ghi); máy bay đã có thì cập nhật điểm bay mới nhất.
  useEffect(() => {
    if (!recordingId) return;

    const now = Date.now();
    const offset = now - recordStartRef.current;
    const ignored = ignoredIdsRef.current;
    const liveById = new Map(aircraftList.map((a) => [String(a.id), a]));

    updateExercise(recordingId, (ex) => {
      const known = new Set(
        ex.entries.map((e: ExerciseEntry) => String(e.aircraft.id)),
      );
      let changed = false;

      const next = ex.entries.map((e: ExerciseEntry) => {
        const live = liveById.get(String(e.aircraft.id));
        if (!live || live === e.aircraft) return e;
        changed = true;
        return { ...e, aircraft: live };
      });

      for (const aircraft of aircraftList) {
        const id = String(aircraft.id);
        if (known.has(id) || ignored.has(id)) continue;
        next.push({ aircraft, startOffset: offset });
        changed = true;
      }

      return changed ? { ...ex, entries: next, updatedAt: now } : ex;
    });
  }, [recordingId, aircraftList, updateExercise]);

  const startRecording = () => {
    const now = Date.now();
    const exercise: SavedExercise = {
      id: createExerciseId(),
      name: defaultExerciseName(now),
      createdAt: now,
      updatedAt: now,
      entries: [],
    };

    ignoredIdsRef.current = new Set(aircraftList.map((a) => String(a.id)));
    recordStartRef.current = now;

    setExercises((prev) => [exercise, ...prev]);
    setActiveId(exercise.id);
    setView("detail");
    setRecElapsed(0);
    setRecordingId(exercise.id);
  };

  const stopRecording = () => {
    if (!recordingId) return;

    const now = Date.now();
    const liveById = new Map(aircraftList.map((a) => [String(a.id), a]));

    // Chốt danh sách: chụp bản sao độc lập của từng máy bay
    updateExercise(recordingId, (ex) => ({
      ...ex,
      updatedAt: now,
      entries: ex.entries.map((e: ExerciseEntry) => ({
        ...e,
        aircraft: cloneAircraft(
          liveById.get(String(e.aircraft.id)) ?? e.aircraft,
        ),
      })),
    }));

    setRecordingId(null);
  };

  // ======================================
  // THAO TÁC TRÊN BÀI TẬP
  // ======================================

  const createNew = () => {
    setActiveId(null);
    setView("detail");
  };

  const openExercise = (id: string) => {
    setActiveId(id);
    setView("detail");
  };

  const openList = () => {
    if (isRecording) return;
    // activeId = null -> effect playback dọn máy bay/trail đang phát
    setActiveId(null);
    setView("list");
  };

  const deleteExercise = (exercise: SavedExercise) => {
    if (!window.confirm(`Xóa bài tập "${exercise.name}"?`)) return;
    setExercises((prev) => prev.filter((ex) => ex.id !== exercise.id));
    if (activeId === exercise.id) setActiveId(null);
  };

  const renameExercise = (name: string) => {
    if (!activeExercise) return;
    const trimmed = name.trim();
    const now = Date.now();
    updateExercise(activeExercise.id, (ex) =>
      trimmed && trimmed !== ex.name
        ? { ...ex, name: trimmed, updatedAt: now }
        : ex,
    );
  };

  const updateEntry = (
    aircraftId: string,
    patch: Partial<Omit<ExerciseEntry, "aircraft">>,
  ) => {
    if (!activeExercise) return;
    const now = Date.now();
    updateExercise(activeExercise.id, (ex) => ({
      ...ex,
      updatedAt: now,
      entries: ex.entries.map((e: ExerciseEntry) =>
        String(e.aircraft.id) === aircraftId ? { ...e, ...patch } : e,
      ),
    }));
  };

  // Xóa 1 máy bay khỏi bài tập (không xóa trên bản đồ)
  const removeAircraft = (aircraftId: string, label: string) => {
    if (!activeExercise) return;
    if (!window.confirm(`Xóa "${label}" khỏi bài tập?`)) return;

    // Đang ghi thì không cho tự thêm lại máy bay này
    ignoredIdsRef.current.add(aircraftId);

    const now = Date.now();
    updateExercise(activeExercise.id, (ex) => ({
      ...ex,
      updatedAt: now,
      entries: ex.entries
        .filter((e: ExerciseEntry) => String(e.aircraft.id) !== aircraftId)
        .map((e: ExerciseEntry) =>
          // Máy bay đang xuất hiện "sau máy bay vừa xóa" -> chuyển về giờ cố định, giữ nguyên thời điểm hiện tại
          e.appearAfter && String(e.appearAfter.aircraftId) === aircraftId
            ? {
                ...e,
                appearAfter: undefined,
                startOffset:
                  resolvedStarts.get(String(e.aircraft.id)) ??
                  e.startOffset ??
                  0,
              }
            : e,
        ),
    }));
    removeAirCraft(aircraftId);
  };

  // Thời điểm xuất hiện thật sự (ms) của từng máy bay, dùng để hiển thị
  const resolvedStarts = useMemo(
    () =>
      new Map(
        resolveStartOffsets(entries, PLAYBACK_SEGMENT_DURATION).map((e) => [
          String(e.aircraft.id),
          e.startOffset ?? 0,
        ]),
      ),
    [entries],
  );

  // ======================================
  // AIRCRAFT PLAYBACK - CHỈ PHÁT MÁY BAY TRONG BÀI TẬP ĐANG MỞ
  // Tất cả máy bay chạy trong cùng một timeline.
  // Mỗi máy bay có path riêng, startOffset riêng.
  // ======================================

  const playbackEntries = useMemo<ExerciseEntry[]>(
    () =>
      entries
        .filter((entry: ExerciseEntry) => entry.aircraft.points.length > 0)
        .map((entry: ExerciseEntry) => {
          const path =
            entry.aircraft.points.length >= 2
              ? (createRoundedRoute(
                  entry.aircraft.points,
                  MAP_GRID_CONFIG.ROUTE_RADIUS,
                  MAP_GRID_CONFIG.ROUTE_STEPS,
                ) as [number, number][])
              : undefined;

          return {
            aircraft: entry.aircraft,
            path,
            startOffset: entry.startOffset ?? 0,
            appearAfter: entry.appearAfter,
          };
        }),
    [entries],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    playbackRef.current?.stop();
    playbackRef.current = null;

    clearPlaybackAircraft(map);
    clearPlaybackTrail(map);
    setOriginalRouteVisible(map, true);

    if (playbackEntries.length === 0) {
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
    const controller = createExercisePlayback(playbackEntries, {
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

      // Khi MapView unmount, cleanup của cha chạy trước cleanup của con:
      // map đã bị remove và mapRef.current = null -> bỏ qua để khỏi gọi lên map đã hủy.
      if (mapRef.current === map) {
        clearPlaybackAircraft(map);
        clearPlaybackTrail(map);
        setOriginalRouteVisible(map, true);
      }
    };
  }, [mapRef, mapReady, playbackEntries]);

  // ======================================
  // RENDER
  // ======================================

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

  const hasPlaybackRoute = entries.some(
    (entry: ExerciseEntry) => entry.aircraft.points.length >= 2,
  );

  // ===== SEEK TRÊN THANH PROGRESS =====
  const progressBarRef = useRef<HTMLDivElement>(null);
  const wasPlayingRef = useRef(false);
  // null = không kéo; số = vị trí đang kéo (0..1)
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);

  const canSeek =
    hasPlaybackRoute &&
    !isRecording &&
    playbackAircraftCount > 0 &&
    playbackState.totalTime > 0;

  const displayProgress = Math.max(
    0,
    Math.min(1, scrubProgress ?? playbackState.progress),
  );

  const ratioFromClientX = (clientX: number) => {
    const el = progressBarRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const seekTo = (ratio: number) => {
    if (mapRef.current) setOriginalRouteVisible(mapRef.current, false);
    playbackRef.current?.seekTo(ratio);
  };

  const handleScrubStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    // Đang chạy thì tạm dừng trong lúc kéo, thả ra sẽ chạy tiếp
    wasPlayingRef.current = playbackState.status === "playing";
    if (wasPlayingRef.current) playbackRef.current?.pause();

    const ratio = ratioFromClientX(e.clientX);
    setScrubProgress(ratio);
    seekTo(ratio);
  };

  const handleScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubProgress === null) return;
    const ratio = ratioFromClientX(e.clientX);
    setScrubProgress(ratio);
    seekTo(ratio);
  };

  const handleScrubEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubProgress === null) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setScrubProgress(null);

    if (wasPlayingRef.current) playbackRef.current?.resume();
    wasPlayingRef.current = false;
  };

  // Bàn phím: ← → tua 5 giây, Home/End về đầu/cuối
  const handleScrubKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    const total = playbackState.totalTime;
    const step = 5000 / total;
    let next: number | null = null;

    if (e.key === "ArrowRight") next = playbackState.progress + step;
    else if (e.key === "ArrowLeft") next = playbackState.progress - step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 1;

    if (next === null) return;
    e.preventDefault();
    seekTo(Math.min(1, Math.max(0, next)));
  };

  return (
    <>
      {/* ======================================
    PLAYBACK TOGGLE BUTTON
====================================== */}
      <button
        type="button"
        onClick={() => setIsPlaybackPanelOpen((prev) => !prev)}
        className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-slate-300 bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm transition hover:bg-slate-50"
      >
        <span className="text-xs font-semibold text-slate-700">
          {isPlaybackPanelOpen ? "Ẩn " : "Bài tập"}
        </span>

        <span className="text-xs text-slate-500">
          {isPlaybackPanelOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* ======================================
    PLAYBACK PANEL
====================================== */}
      {isPlaybackPanelOpen && (
        <div className="pointer-events-auto absolute bottom-16 left-1/2 z-10 flex max-h-[calc(100%-5rem)] w-[360px] max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-col gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-sm">
          {/* ===================== DANH SÁCH BÀI TẬP ĐÃ LƯU ===================== */}
          {view === "list" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Bài tập đã lưu
                  </div>

                  <div className="truncate text-sm font-semibold text-slate-800">
                    {exercises.length} bài tập
                  </div>
                </div>

                <button
                  type="button"
                  onClick={createNew}
                  className="shrink-0 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  + Tạo bài tập mới
                </button>
              </div>

              {exercises.length === 0 ? (
                <p className="rounded bg-slate-50 p-2 text-xs text-slate-500">
                  Chưa có bài tập nào. Bấm “Tạo bài tập mới”, ghi lại rồi bài
                  tập sẽ được lưu ở đây.
                </p>
              ) : (
                <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
                  {exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="flex items-center gap-1.5 rounded bg-slate-50 p-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => openExercise(exercise.id)}
                        className="min-w-0 flex-1 rounded px-1 py-0.5 text-left hover:bg-slate-100"
                      >
                        <div className="truncate text-xs font-medium text-slate-800">
                          {exercise.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {exercise.entries.length} máy bay ·{" "}
                          {formatExerciseDate(exercise.updatedAt)}
                        </div>
                      </button>

                      <button
                        type="button"
                        aria-label={`Xóa bài tập ${exercise.name}`}
                        title="Xóa bài tập"
                        onClick={() => deleteExercise(exercise)}
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===================== CHI TIẾT BÀI TẬP ===================== */}
          {view === "detail" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={openList}
                  className="rounded px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Danh sách
                </button>

                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {STATUS_LABEL[playbackState.status]}
                </span>
              </div>

              {activeExercise ? (
                <input
                  key={`${activeExercise.id}:${activeExercise.name}`}
                  type="text"
                  aria-label="Tên bài tập"
                  defaultValue={activeExercise.name}
                  onBlur={(e) => renameExercise(e.target.value)}
                  className="w-full rounded border border-transparent px-1.5 py-0.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-200 focus:border-blue-400"
                />
              ) : (
                <div className="px-1.5 text-sm font-semibold text-slate-800">
                  Bài tập mới
                </div>
              )}

              {/* ===== Ghi bài tập: bài tập mới hoặc đang ghi ===== */}
              {(!activeExercise || isRecording) && (
                <div className="flex flex-col gap-1.5 rounded border border-slate-200 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`rounded px-3 py-1.5 text-xs font-medium text-white ${
                        isRecording
                          ? "bg-slate-700 hover:bg-slate-800"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {isRecording ? "■ Dừng ghi" : "● Bắt đầu ghi"}
                    </button>

                    {isRecording && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-red-600">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                        REC {formatPlaybackTime(recElapsed)}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {isRecording
                      ? "Máy bay bạn tạo trên bản đồ sẽ được thêm vào bài tập. Bấm “Dừng ghi” để chốt danh sách."
                      : "Máy bay bạn tạo trên bản đồ sau khi bấm ghi sẽ được thêm vào bài tập."}
                  </p>
                </div>
              )}

              {/* ===== Danh sách máy bay trong bài tập ===== */}
              {activeExercise && (
                <div className="flex flex-col gap-1.5 rounded border border-slate-200 p-2">
                  <div className="text-xs font-medium text-slate-600">
                    Máy bay trong bài tập ({entries.length})
                  </div>

                  {entries.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      {isRecording
                        ? "Hãy tạo máy bay trên bản đồ."
                        : "Bài tập chưa có máy bay nào."}
                    </p>
                  ) : (
                    <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                      {entries.map((entry: ExerciseEntry) => {
                        const id = String(entry.aircraft.id);
                        const label = entry.aircraft.name ?? id;
                        return (
                          <AppearRow
                            key={id}
                            entry={entry}
                            label={label}
                            resolvedMs={resolvedStarts.get(id) ?? 0}
                            others={entries
                              .filter(
                                (e: ExerciseEntry) =>
                                  String(e.aircraft.id) !== id,
                              )
                              .map((e: ExerciseEntry) => ({
                                id: String(e.aircraft.id),
                                label: e.aircraft.name ?? String(e.aircraft.id),
                              }))}
                            onChange={(patch) => updateEntry(id, patch)}
                            onRemove={() => removeAircraft(id, label)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeExercise && (
                <>
                  {/* Aircraft status */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="rounded bg-emerald-50 px-2 py-1 text-center">
                      <div className="text-[10px] text-emerald-600">
                        Đang bay
                      </div>
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
                      <div className="text-[10px] text-slate-500">
                        Hoàn thành
                      </div>
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
                        playbackRef.current?.setSpeed(
                          Number(event.target.value),
                        )
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

                  {/* Progress (kéo / bấm để tua) */}
                  <div
                    ref={progressBarRef}
                    role="slider"
                    tabIndex={canSeek ? 0 : -1}
                    aria-label="Tua bài tập"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(displayProgress * 100)}
                    aria-disabled={!canSeek}
                    onPointerDown={handleScrubStart}
                    onPointerMove={handleScrubMove}
                    onPointerUp={handleScrubEnd}
                    onPointerCancel={handleScrubEnd}
                    onKeyDown={handleScrubKey}
                    className={`group relative flex h-4 w-full touch-none select-none items-center ${
                      canSeek
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full bg-blue-600 ${
                          scrubProgress === null ? "transition-[width]" : ""
                        }`}
                        style={{ width: `${displayProgress * 100}%` }}
                      />
                    </div>

                    {/* Núm kéo */}
                    <div
                      className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-600 bg-white shadow transition-opacity ${
                        canSeek
                          ? scrubProgress !== null
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                          : "opacity-0"
                      }`}
                      style={{ left: `${displayProgress * 100}%` }}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

// ======================================
// APPEAR ROW
// ======================================

type AppearRowProps = {
  entry: ExerciseEntry;
  label: string;
  resolvedMs: number;
  others: { id: string; label: string }[];
  onChange: (patch: Partial<Omit<ExerciseEntry, "aircraft">>) => void;
  onRemove: () => void;
};

function AppearRow({
  entry,
  label,
  resolvedMs,
  others,
  onChange,
  onRemove,
}: AppearRowProps) {
  const rule = entry.appearAfter;
  const mode = rule ? "after" : "minute";

  return (
    <div className="flex flex-col gap-1 rounded bg-slate-50 p-1.5 text-xs text-slate-700">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
        <span className="shrink-0 tabular-nums text-slate-500">
          xuất hiện {formatClock(resolvedMs)}
        </span>
        <button
          type="button"
          aria-label={`Xóa ${label} khỏi bài tập`}
          title="Xóa khỏi bài tập"
          onClick={onRemove}
          className="shrink-0 rounded px-1.5 py-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          ✕
        </button>
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
