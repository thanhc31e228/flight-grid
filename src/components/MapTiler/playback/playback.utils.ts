export function parseHHmm(value?: string): number {
  if (!value) return 0;

  const digits = value.replace(/\D/g, "").padStart(4, "0");

  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));

  return hours * 60 * 60 + minutes * 60;
}
export const PLAYBACK_SEGMENT_DURATION = 10_000; // 10 giây
