import { useSyncExternalStore } from "react";

export interface MeasurementInfo {
  mil: string; // ví dụ "15-00"
  bearingDeg: number; // 0-360
  distanceKm: number;
}

let current: MeasurementInfo | null = null;
const listeners = new Set<() => void>();

export function setMeasurement(info: MeasurementInfo | null) {
  current = info;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMeasurement() {
  return useSyncExternalStore(subscribe, () => current);
}
