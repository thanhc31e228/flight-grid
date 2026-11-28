import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

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
  createExerciseRecorder,
  type ExerciseRecorder,
  type RecorderState,
} from "../MapTiler/playback/exercise.recorder";

// ======================================
// TYPES
// ======================================

type ExercisePanelProps = {
  // Ref giữ map instance của MapView (đọc mapRef.current như cũ)
  mapRef: RefObject<MapLibreMap | null>;
  // Map đã load xong và đã khởi tạo layer chưa
  mapReady: boolean;
  // Danh sách máy bay (đã ưu tiên Context, fallback props) từ MapView
  aircraftList: AirCraft[];
};

// ======================================
// CONFIG
// ======================================

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

// ======================================
// EXERCISE PANEL
// ======================================

export default function ExercisePanel({
  mapRef,
  mapReady,
  aircraftList,
}: ExercisePanelProps) {
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
  // RECORDER + LỊCH XUẤT HIỆN
  // ======================================

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
  // ======================================
  // AIRCRAFT PLAYBACK - MULTIPLE AIRCRAFT
  // Tất cả máy bay chạy trong cùng một timeline.
  // Mỗi máy bay có path riêng, startOffset riêng.
  // ======================================

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

      // Khi MapView unmount, cleanup của cha chạy trước cleanup của con:
      // map đã bị remove và mapRef.current = null -> bỏ qua để khỏi gọi lên map đã hủy.
      if (mapRef.current === map) {
        clearPlaybackAircraft(map);
        clearPlaybackTrail(map);
        setOriginalRouteVisible(map, true);
      }
    };
  }, [mapRef, mapReady, playbackKey, aircraftList]);

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

  const hasPlaybackRoute = aircraftList.some(
    (aircraft) => aircraft.points.length >= 2,
  );
  const [isPlaybackPanelOpen, setIsPlaybackPanelOpen] = useState(false);
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
      {/* Playback controls: đặt giữa phía dưới để không đè panel trái / hàng nút phía trên */}
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
              canSeek ? "cursor-pointer" : "cursor-not-allowed opacity-60"
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
