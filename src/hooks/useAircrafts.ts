import { useCallback, useMemo, useRef, useState } from "react";
import { AirCraft, Point } from "../components/MapTiler/types/map.types";
import { AircraftDetails } from "../components/controls/factory/aircraft.factory";
import distance from "@turf/distance";
import { point as turfPoint } from "@turf/helpers";

export function useAircrafts() {
  // danh sach cac duong bay quan ly
  const aircraftsRef = useRef<AirCraft[]>([]);
  const [aircrafts, setAircrafts] = useState<AirCraft[]>([]);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(
    null,
  );

  // Tốp đang chọn: suy ra từ aircrafts + selectedAircraftId nên không bao giờ bị cũ
  const aircraftSelected = useMemo(
    () =>
      aircrafts.find((aircraft) => aircraft.id === selectedAircraftId) ?? null,
    [aircrafts, selectedAircraftId],
  );

  // Giữ API cũ: chọn theo object nhưng thực chất chỉ lưu id
  const setAircraftSelected = useCallback((aircraft: AirCraft | null) => {
    setSelectedAircraftId(aircraft?.id ?? null);
  }, []);

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
      return aircraft;
    },
    [commitAircrafts],
  );
  // Cập nhật vận tốc của máy bay
  const updateSpeed = useCallback(
    (aircraftId: string, speed: number) => {
      const updated = aircraftsRef.current.map((aircraft) =>
        aircraft.id === aircraftId ? { ...aircraft, speed } : aircraft,
      );

      commitAircrafts(updated);
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

      // Nếu đang chọn Tốp bị xóa thì chuyển sang Tốp cuối còn lại (hoặc bỏ chọn)
      setSelectedAircraftId((prev) =>
        prev === aircraftId ? (updated.at(-1)?.id ?? null) : prev,
      );

      return updated.length;
    },
    [commitAircrafts],
  );

  // Thêm point cho một máy bay
  const addPoint = useCallback(
    (aircraftId: string, point: Point) => {
      const updated = aircraftsRef.current.map((aircraft) => {
        if (aircraft.id !== aircraftId) return aircraft;

        const previousPoint = aircraft.points.at(-1);

        const newPoints = [...aircraft.points, { ...point }];

        let speed = aircraft.speed ?? 0;

        if (previousPoint) {
          const distanceMeters = distance(
            turfPoint([previousPoint.lng, previousPoint.lat]),
            turfPoint([point.lng, point.lat]),
            { units: "meters" },
          );

          speed = distanceMeters / 30;
        }

        return {
          ...aircraft,
          points: newPoints,
          speed,
        };
      });

      commitAircrafts(updated);

      const target = updated.find((a) => a.id === aircraftId);
      return target?.points.length ?? 0;
    },
    [commitAircrafts],
  );

  // Undo point của một máy bay (hết điểm thì xóa luôn Tốp)
  const undoPoint = useCallback(
    (aircraftId: string) => {
      const target = aircraftsRef.current.find((a) => a.id === aircraftId);
      if (!target) return 0;

      const remaining = target.points.length - 1;

      if (remaining <= 0) {
        removeAircraft(aircraftId);
        setAircraftSelected(null);
        setSelectedAircraftId(null);
        return 0;
      }

      const updated = aircraftsRef.current.map((aircraft) =>
        aircraft.id === aircraftId
          ? { ...aircraft, points: aircraft.points.slice(0, -1) }
          : aircraft,
      );

      commitAircrafts(updated);
      return remaining;
    },
    [commitAircrafts, removeAircraft, setAircraftSelected],
  );

  // Xóa toàn bộ point của một máy bay -> không còn điểm nào nên xóa luôn Tốp
  const clearPoints = useCallback(
    (aircraftId: string) => {
      removeAircraft(aircraftId);
    },
    [removeAircraft],
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
    aircraftSelected,
    setSelectedAircraftId,
    setAircraftSelected,
    aircraftsRef,
    addAircraft,
    updateAircraft,
    updateSpeed,
    removeAircraft,
    addPoint,
    undoPoint,
    getLastPoint,
    clearPoints,
    setRoute,
  };
}
