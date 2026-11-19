import { useCallback, useRef, useState } from "react";

import { hidePointPopup } from "../components/map/MapPopup";
import { MapLibreMap } from "maplibre-gl";
import { Point } from "../components/MapTiler/types/map.types";

export function useRoutePoints() {
  const pointsRef = useRef<Point[]>([]);

  const [points, setPoints] = useState<Point[]>([]);

  const commitPoints = useCallback((updated: Point[]) => {
    pointsRef.current = updated;
    setPoints(updated);
  }, []);

  const addPoint = useCallback(
    (point: Point) => {
      const updated = [...pointsRef.current, point];

      commitPoints(updated);
      return updated.length;
    },
    [commitPoints],
  );

  const setRoute = useCallback(
    (updated: Point[]) => {
      commitPoints(updated);
    },
    [commitPoints],
  );

  const undoPoint = useCallback(() => {
    const newPoints = pointsRef.current.slice(0, -1);
    commitPoints(newPoints);

    return newPoints.length;
  }, [commitPoints]);

  const clearPoints = useCallback(() => {
    commitPoints([]);
  }, [commitPoints]);

  // const showPopup = useCallback((point: PointPopupData, map: MapLibreMap) => {
  //   showPointPopup(point, map);
  // }, []);

  const hidePopup = useCallback(() => {
    hidePointPopup();
  }, []);
  return {
    points,
    pointsRef,
    addPoint,
    setRoute,
    undoPoint,
    // showPopup,
    hidePopup,
    clearPoints,
  };
}
