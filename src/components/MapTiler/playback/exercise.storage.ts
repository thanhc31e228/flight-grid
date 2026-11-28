import type { ExerciseEntry } from "./playback.types";

// ======================================
// TYPES
// ======================================

export type SavedExercise = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  // Danh sách máy bay của bài tập (kèm lịch xuất hiện).
  // Lưu nguyên bản chụp aircraft để phát lại được kể cả khi máy bay không còn trên bản đồ.
  entries: ExerciseEntry[];
};

// ======================================
// CONFIG
// ======================================

export const EXERCISE_STORAGE_KEY = "map.exercises.v1";

// ======================================
// HELPERS
// ======================================

export function createExerciseId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatExerciseDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function defaultExerciseName(timestamp: number): string {
  return `Bài tập ${formatExerciseDate(timestamp)}`;
}

// Chụp bản sao độc lập (không còn dính tham chiếu tới state của context)
export function cloneAircraft<T>(aircraft: T): T {
  return JSON.parse(JSON.stringify(aircraft)) as T;
}

function isValidExercise(value: unknown): value is SavedExercise {
  if (!value || typeof value !== "object") return false;
  const ex = value as Partial<SavedExercise>;

  return (
    typeof ex.id === "string" &&
    typeof ex.name === "string" &&
    Array.isArray(ex.entries) &&
    ex.entries.every(
      (e) => !!e && !!e.aircraft && Array.isArray(e.aircraft.points),
    )
  );
}

// ======================================
// LOAD / SAVE
// ======================================

export function loadExercises(): SavedExercise[] {
  try {
    const raw = localStorage.getItem(EXERCISE_STORAGE_KEY);
    if (!raw) return [];

    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    return data.filter(isValidExercise).map((ex) => ({
      ...ex,
      createdAt: typeof ex.createdAt === "number" ? ex.createdAt : Date.now(),
      updatedAt: typeof ex.updatedAt === "number" ? ex.updatedAt : Date.now(),
    }));
  } catch (error) {
    console.error("Không đọc được danh sách bài tập:", error);
    return [];
  }
}

export function saveExercises(exercises: SavedExercise[]): void {
  try {
    const plain = exercises.map((ex) => ({
      ...ex,
      // path được tính lại lúc phát, không cần lưu
      entries: ex.entries.map(({ aircraft, startOffset, appearAfter }) => ({
        aircraft,
        startOffset,
        appearAfter,
      })),
    }));

    localStorage.setItem(EXERCISE_STORAGE_KEY, JSON.stringify(plain));
  } catch (error) {
    console.error("Không lưu được danh sách bài tập:", error);
  }
}
