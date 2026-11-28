import { ExerciseEntry } from "./playback.types";

export function parseHHmm(value?: string): number {
  if (!value) return 0;

  const digits = value.replace(/\D/g, "").padStart(4, "0");

  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));

  return hours * 60 * 60 + minutes * 60;
}

// Giữa 2 point liên tiếp luôn là 30 giây ở tốc độ 1x
export const PLAYBACK_SEGMENT_DURATION = 30_000; // 30 giây

// "Xuất hiện từ phút" (có thể nhập số lẻ, vd 1.5 = 1 phút 30 giây) -> ms
export function minutesToMs(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) return 0;
  return Math.round(minutes * 60_000);
}

// ms -> phút (để đổ lại vào ô nhập "xuất hiện từ phút")
export function msToMinutes(ms: number): number {
  return Math.round((ms / 60_000) * 100) / 100;
}

// ms -> "mm:ss" để hiện đồng hồ ghi / phát
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Mốc thời gian (ms) khi máy bay bay tới point thứ n (n chặng x segmentDuration)
export function pointToMs(pointIndex: number, segmentDuration: number): number {
  return Math.max(0, Math.floor(pointIndex)) * segmentDuration;
}

// Đổi mọi appearAfter thành startOffset tuyệt đối. Hỗ trợ chuỗi: C chờ B, B chờ A.
// Tham chiếu vòng hoặc máy bay không tồn tại thì giữ nguyên startOffset gốc.
export function resolveStartOffsets(
  entries: ExerciseEntry[],
  segmentDuration: number,
): ExerciseEntry[] {
  const byId = new Map(entries.map((e) => [String(e.aircraft.id), e]));
  const cache = new Map<string, number>();
  const visiting = new Set<string>();

  function resolve(entry: ExerciseEntry): number {
    const id = String(entry.aircraft.id);
    const cached = cache.get(id);
    if (cached !== undefined) return cached;

    let offset = Math.max(0, entry.startOffset ?? 0);
    const rule = entry.appearAfter;

    if (rule) {
      const refId = String(rule.aircraftId);
      const ref = byId.get(refId);

      if (ref && refId !== id && !visiting.has(refId)) {
        visiting.add(id);
        const refStart = resolve(ref);
        visiting.delete(id);

        // Không vượt quá điểm cuối của máy bay tham chiếu
        const lastIndex = Math.max(0, ref.aircraft.points.length - 1);
        const k = Math.min(Math.max(0, Math.floor(rule.pointIndex)), lastIndex);

        offset = refStart + pointToMs(k, segmentDuration) + (rule.delay ?? 0);
      }
    }

    cache.set(id, offset);
    return offset;
  }

  return entries.map((e) => ({ ...e, startOffset: resolve(e) }));
}
