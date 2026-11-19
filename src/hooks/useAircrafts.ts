import { useCallback, useRef, useState } from "react";
import { AirCraft } from "../components/MapTiler/types/map.types";
import { AircraftDetails } from "../components/controls/factory/aircraft.factory";
import { Point } from "../features/route/route.types";

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

  // Sửa thông tin máy bay (SL-KL, độ cao, thời gian)
  const updateAircraft = useCallback(
    (aircraftId: string, details: AircraftDetails) => {
      const updated = aircraftsRef.current.map((aircraft) => {
        if (aircraft.id !== aircraftId) return aircraft;

        // Nhãn điểm đầu hiển thị thời gian của waypoint đầu, nên sửa luôn ở đó
        const [first, ...rest] = aircraft.points;

        return {
          ...aircraft,
          aircraftCode: details.aircraftCode,
          altitude: details.altitude,
          appearanceTime: details.appearanceTime,
          points: first
            ? [{ ...first, appearanceTime: details.appearanceTime }, ...rest]
            : aircraft.points,
        };
      });

      commitAircrafts(updated);
    },
    [commitAircrafts],
  );

  // lay diem cuoi cua aircraft
  const getLastPoint = useCallback((aircraftId: string): Point | undefined => {
    const aircraft = aircraftsRef.current.find((a) => a.id === aircraftId);
    return aircraft?.points.at(-1);
  }, []);

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
      const updated = aircraftsRef.current.map((aircraft) =>
        aircraft.id === aircraftId
          ? { ...aircraft, points: [...aircraft.points, { ...point }] }
          : aircraft,
      );

      commitAircrafts(updated);

      const target = updated.find((a) => a.id === aircraftId);
      return target?.points.length ?? 0;
    },
    [commitAircrafts],
  );

  // Undo point của một máy bay
  const undoPoint = useCallback(
    (aircraftId: string) => {
      const updated = aircraftsRef.current.map((aircraft) =>
        aircraft.id === aircraftId
          ? { ...aircraft, points: aircraft.points.slice(0, -1) }
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
    updateAircraft,
    removeAircraft,
    addPoint,
    undoPoint,
    getLastPoint,
    clearPoints,
    setRoute,
  };
}
