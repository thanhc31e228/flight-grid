import { useSyncExternalStore } from "react";

export interface PickInfo {
  lng: number;
  lat: number;
  mil: string;
  bearingDeg: number;
  distanceMeters: number;
  // Vị trí chuột trên màn hình, để đặt menu
  clientX: number;
  clientY: number;
}

let current: PickInfo | null = null;
const listeners = new Set<() => void>();

export const getPick = () => current;

export function setPick(info: PickInfo | null) {
  current = info;
  listeners.forEach((listener) => listener());
}

export function subscribePick(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePick() {
  return useSyncExternalStore(subscribePick, getPick);
}
