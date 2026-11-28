import type { AirCraft } from "../types/map.types";
import type { ExerciseEntry } from "./playback.types";
import { minutesToMs } from "./playback.utils";

export type RecorderStatus = "idle" | "recording";

export type RecordedEvent = {
  type:
    | "record-start"
    | "record-stop"
    | "aircraft-added"
    | "aircraft-updated"
    | "aircraft-removed";
  // ms tính từ lúc bấm "Bắt đầu ghi"
  at: number;
  aircraftId?: string;
};

export type RecorderState = {
  status: RecorderStatus;
  // ms đã ghi (đồng hồ ghi). Dừng ghi thì đứng yên ở giá trị cuối.
  elapsedTime: number;
  entries: ExerciseEntry[];
  events: RecordedEvent[];
};

export type AddAircraftOptions = {
  // "Xuất hiện từ phút": nhập tay thì dùng giá trị này,
  // không nhập thì: đang ghi -> tự lấy theo đồng hồ ghi, chưa ghi -> 0.
  appearAtMinute?: number;
  // Đường đã bo góc (nếu có), truyền thẳng vào ExerciseEntry.path
  path?: [number, number][];
  appearAfter?: ExerciseEntry["appearAfter"];
};

export type ExerciseRecorderOptions = {
  now?: () => number;
  onChange?: (state: RecorderState) => void;
};

export type ExerciseRecorder = {
  start: () => void;
  stop: () => void;
  clear: () => void;
  isRecording: () => boolean;
  getElapsed: () => number;

  addAircraft: (
    aircraft: AirCraft,
    options?: AddAircraftOptions,
  ) => ExerciseEntry;
  updateEntry: (
    aircraftId: string,
    patch: Partial<Omit<ExerciseEntry, "aircraft">> & { aircraft?: AirCraft },
  ) => void;
  setAppearAtMinute: (aircraftId: string, minute: number) => void;
  removeAircraft: (aircraftId: string) => void;

  // Đưa thẳng vào createExercisePlayback(entries, ...)
  getEntries: () => ExerciseEntry[];
  getState: () => RecorderState;
};

// Chỉ khi bấm "Bắt đầu ghi" thì thao tác (tạo / sửa / xóa máy bay) mới được ghi lại
// cùng mốc thời gian. Mốc thời gian 0 của lúc phát = lúc bấm "Bắt đầu ghi".
export function createExerciseRecorder(
  options: ExerciseRecorderOptions = {},
): ExerciseRecorder {
  const now = options.now ?? (() => performance.now());

  let recording = false;
  let startedAt = 0;
  let frozenElapsed = 0;

  let entries: ExerciseEntry[] = [];
  let events: RecordedEvent[] = [];

  const sameId = (entry: ExerciseEntry, id: string) =>
    String(entry.aircraft.id) === String(id);

  function getElapsed(): number {
    return recording ? Math.round(now() - startedAt) : frozenElapsed;
  }

  function getState(): RecorderState {
    return {
      status: recording ? "recording" : "idle",
      elapsedTime: getElapsed(),
      entries: [...entries],
      events: [...events],
    };
  }

  function emit() {
    options.onChange?.(getState());
  }

  // Chỉ ghi sự kiện khi đang ghi
  function log(type: RecordedEvent["type"], aircraftId?: string) {
    if (!recording) return;
    events = [...events, { type, at: getElapsed(), aircraftId }];
  }

  function start() {
    if (recording) return;

    recording = true;
    startedAt = now();
    frozenElapsed = 0;
    events = [{ type: "record-start", at: 0 }];

    emit();
  }

  function stop() {
    if (!recording) return;

    log("record-stop");
    frozenElapsed = getElapsed();
    recording = false;

    emit();
  }

  function clear() {
    recording = false;
    startedAt = 0;
    frozenElapsed = 0;
    entries = [];
    events = [];

    emit();
  }

  function addAircraft(
    aircraft: AirCraft,
    opts: AddAircraftOptions = {},
  ): ExerciseEntry {
    const startOffset =
      opts.appearAtMinute !== undefined
        ? minutesToMs(opts.appearAtMinute) // nhập tay
        : recording
          ? getElapsed() // tự ghi thời gian start khi click tạo máy bay
          : 0; // chưa bấm ghi -> không ghi thời gian

    const entry: ExerciseEntry = {
      aircraft,
      startOffset,
      ...(opts.path ? { path: opts.path } : {}),
      ...(opts.appearAfter ? { appearAfter: opts.appearAfter } : {}),
    };

    const index = entries.findIndex((e) => sameId(e, String(aircraft.id)));
    entries =
      index >= 0
        ? entries.map((e, i) => (i === index ? entry : e))
        : [...entries, entry];

    log("aircraft-added", String(aircraft.id));
    emit();

    return entry;
  }

  function updateEntry(
    aircraftId: string,
    patch: Partial<Omit<ExerciseEntry, "aircraft">> & { aircraft?: AirCraft },
  ) {
    if (!entries.some((e) => sameId(e, aircraftId))) return;

    entries = entries.map((e) =>
      sameId(e, aircraftId) ? { ...e, ...patch } : e,
    );

    log("aircraft-updated", aircraftId);
    emit();
  }

  function setAppearAtMinute(aircraftId: string, minute: number) {
    updateEntry(aircraftId, { startOffset: minutesToMs(minute) });
  }

  function removeAircraft(aircraftId: string) {
    if (!entries.some((e) => sameId(e, aircraftId))) return;

    entries = entries.filter((e) => !sameId(e, aircraftId));

    log("aircraft-removed", aircraftId);
    emit();
  }

  return {
    start,
    stop,
    clear,
    isRecording: () => recording,
    getElapsed,
    addAircraft,
    updateEntry,
    setAppearAtMinute,
    removeAircraft,
    getEntries: () => [...entries],
    getState,
  };
}
