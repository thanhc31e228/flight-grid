import { useCallback, useRef, useState } from "react";

import type { AirCraft, Point } from "../components/MapTiler/types/map.types";

export function useAircrafts() {
  // danh sach cac duong bay quan ly
  const aircraftsRef = useRef<AirCraft[]>([]);
  const [aircrafts, setAircrafts] = useState<AirCraft[]>([]);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(
    null,
  );
  // Đồng bộ ref và state
  /// LƯU VÀO DATABASE
  const commitAircrafts = useCallback((updated: AirCraft[]) => {
    aircraftsRef.current = updated;
    setAircrafts(updated);
  }, []);

  // Thêm máy bay
  const addAircraft = useCallback(
    (aircraft: AirCraft) => {
      const updated = [...aircraftsRef.current, aircraft];
      commitAircrafts(updated);

      return updated.length;
    },
    [commitAircrafts],
  );
  const isExistsAir = useCallback(
    (idAircraft: string) => {
      return aircrafts.find((a) => a.id === idAircraft);
    },
    [aircrafts],
  );

  // Xóa máy bay theo ID
  const removeAircraft = useCallback(
    (aircraftId: string) => {
      const updated = aircraftsRef.current.filter(
        (aircraft) => aircraft.id !== aircraftId,
      );

      commitAircrafts(updated);
      return updated.length;
    },
    [commitAircrafts],
  );

  // Thêm point cho một máy bay
  const addPoint = useCallback(
    (aircraftId: string, point: Point) => {
      const newPoint = {
        ...point,
      };
      const updated = aircraftsRef.current.map((aircraft) =>
        aircraft.id === aircraftId
          ? {
              ...aircraft,
              points: [...aircraft.points, newPoint],
            }
          : aircraft,
      );

      commitAircrafts(updated);

      const target = updated.find((a) => a.id === aircraftId);
      console.log("target", target);

      return target?.points.length ?? 0;
    },
    [commitAircrafts],
  );

  // Undo point của một máy bay
  const undoPoint = useCallback(
    (aircraftId: string) => {
      const updated = aircraftsRef.current.map((aircraft) =>
        aircraft.id === aircraftId
          ? {
              ...aircraft,
              points: aircraft.points.slice(0, -1),
            }
          : aircraft,
      );

      commitAircrafts(updated);

      const target = updated.find((a) => a.id === aircraftId);
      return target?.points.length ?? 0;
    },
    [commitAircrafts],
  );

  // Xóa toàn bộ point của một máy bay
  const clearPoints = useCallback(
    (aircraftId: string) => {
      const updated = aircraftsRef.current.map((aircraft) =>
        aircraft.id === aircraftId ? { ...aircraft, points: [] } : aircraft,
      );

      commitAircrafts(updated);
    },
    [commitAircrafts],
  );

  // Thay thế route của một máy bay
  const setRoute = useCallback(
    (aircraftId: string, points: Point[]) => {
      const updated = aircraftsRef.current.map((aircraft) =>
        aircraft.id === aircraftId
          ? { ...aircraft, points: [...points] }
          : aircraft,
      );

      commitAircrafts(updated);
    },
    [commitAircrafts],
  );

  return {
    aircrafts,
    selectedAircraftId,
    setSelectedAircraftId,
    aircraftsRef,
    addAircraft,
    removeAircraft,
    addPoint,
    undoPoint,
    isExistsAir,
    clearPoints,
    setRoute,
  };
}
