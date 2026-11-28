import { useEffect, useState } from "react";
import {
  ExerciseEntry,
  PlaybackState,
} from "../MapTiler/playback/playback.types";
import { RecorderState } from "../MapTiler/playback/exercise.recorder";
import {
  formatClock,
  msToMinutes,
  PLAYBACK_SEGMENT_DURATION,
} from "../MapTiler/playback/playback.utils";

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

type ExercisePanelProps = {
  playbackState: PlaybackState;
  recorderState: RecorderState;
  /** Lấy thời gian ghi hiện tại (ms) từ recorder. Nên bọc useCallback ở nơi truyền vào. */
  getRecordingElapsed: () => number;
  /** Danh sách entry đã ghép aircraft mới nhất */
  entries: ExerciseEntry[];
  /** Thời điểm xuất hiện thật sự (ms) theo id máy bay */
  resolvedStarts: Map<string, number>;
  hasPlaybackRoute: boolean;

  onStartRecording: () => void;
  onStopRecording: () => void;
  onUpdateEntry: (
    id: string,
    patch: Partial<Omit<ExerciseEntry, "aircraft">>,
  ) => void;

  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onReplay: () => void;
  onSetSpeed: (speed: number) => void;
};

export default function ExercisePanel({
  playbackState,
  recorderState,
  getRecordingElapsed,
  entries,
  resolvedStarts,
  hasPlaybackRoute,
  onStartRecording,
  onStopRecording,
  onUpdateEntry,
  onPlay,
  onPause,
  onStop,
  onReplay,
  onSetSpeed,
}: ExercisePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);

  const isRecording = recorderState.status === "recording";
  type PlaybackAircraft = PlaybackState["aircrafts"][number];
  useEffect(() => {
    if (!isRecording) {
      setRecElapsed(recorderState.elapsedTime);
      return;
    }
    const id = setInterval(() => setRecElapsed(getRecordingElapsed()), 250);
    return () => clearInterval(id);
  }, [isRecording, recorderState.elapsedTime, getRecordingElapsed]);

  const aircraftCount = playbackState.aircrafts.length;
  const flyingCount = playbackState.aircrafts.filter(
    (a: PlaybackAircraft) => a.status === "flying",
  ).length;
  const waitingCount = playbackState.aircrafts.filter(
    (a: PlaybackAircraft) => a.status === "waiting",
  ).length;
  const completedCount = playbackState.aircrafts.filter(
    (a: PlaybackAircraft) => a.status === "completed",
  ).length;

  return (
    <>
      {/* Nút bật/tắt panel */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-slate-300 bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm transition hover:bg-slate-50"
      >
        <span className="text-xs font-semibold text-slate-700">
          {isOpen ? "Ẩn " : "Tạo bài tập"}
        </span>
        <span className="text-xs text-slate-500">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="pointer-events-auto absolute bottom-16 left-1/2 z-10 flex w-[360px] max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Bài tập bay · {PLAYBACK_SEGMENT_DURATION / 1000} giây / chặng
              </div>
              <div className="truncate text-sm font-semibold text-slate-800">
                {aircraftCount} máy bay
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {STATUS_LABEL[playbackState.status]}
            </span>
          </div>

          {/* Ghi bài tập */}
          <div className="flex flex-col gap-1.5 rounded border border-slate-200 p-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={playbackState.status === "playing"}
                onClick={isRecording ? onStopRecording : onStartRecording}
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

            {!isRecording && (
              <div className="text-[11px] text-slate-500">
                Bấm “Bắt đầu ghi” rồi click lên bản đồ để vẽ đường bay.
              </div>
            )}

            {/* Thời gian xuất hiện của từng máy bay (sửa được) */}
            {entries.length > 0 && (
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {entries.map((entry) => {
                  const id = String(entry.aircraft.id);
                  return (
                    <AppearRow
                      key={id}
                      entry={entry}
                      label={entry.aircraft.name ?? id}
                      resolvedMs={resolvedStarts.get(id) ?? 0}
                      others={entries
                        .filter((e) => String(e.aircraft.id) !== id)
                        .map((e) => ({
                          id: String(e.aircraft.id),
                          label: e.aircraft.name ?? String(e.aircraft.id),
                        }))}
                      onChange={(patch) => onUpdateEntry(id, patch)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Trạng thái máy bay */}
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

          {/* Play / Pause / Stop / Replay (Play, Replay bị khóa khi đang ghi) */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              disabled={!hasPlaybackRoute || isRecording}
              onClick={onPlay}
              className="rounded bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {playbackState.status === "paused" ? "Tiếp tục" : "Play"}
            </button>
            <button
              type="button"
              disabled={playbackState.status !== "playing"}
              onClick={onPause}
              className="rounded bg-amber-500 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Pause
            </button>
            <button
              type="button"
              disabled={aircraftCount === 0}
              onClick={onStop}
              className="rounded bg-slate-600 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Stop
            </button>
            <button
              type="button"
              disabled={!hasPlaybackRoute || isRecording}
              onClick={onReplay}
              className="rounded bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Replay
            </button>
          </div>

          {/* Thời gian + tốc độ */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <span className="tabular-nums">
              {formatPlaybackTime(playbackState.elapsedTime)}
            </span>
            <select
              aria-label="Playback speed"
              value={playbackState.speedMultiplier}
              onChange={(e) => onSetSpeed(Number(e.target.value))}
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
