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
