import { useSyncExternalStore } from "react";

export interface CursorCoords {
  lng: number;
  lat: number;
  gridId: string;
  distance: number;
  azimuth: number;
}

let current: CursorCoords | null = null;
const listeners = new Set<() => void>();

export function setCursorCoords(coords: CursorCoords | null) {
  current = coords;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCursorCoords() {
  return useSyncExternalStore(subscribe, () => current);
}
