
import { useCallback, useRef, useState } from "react";

import type { Point } from "../features/route/route.types";

export function useRoutePoints() {
  const pointsRef = useRef<Point[]>([]);

  const [points, setPoints] = useState<Point[]>([]);

  const commitPoints = useCallback(
    (updated: Point[]) => {
      pointsRef.current = updated;
      setPoints(updated);
    },
    []
  );

 const addPoint = useCallback(
  (point: Point) => {
    const updated = [...pointsRef.current, point];

    commitPoints(updated);

    return updated.length;
  },
  [commitPoints]
);

  const setRoute = useCallback(
    (updated: Point[]) => {
      commitPoints(updated);
    },
    [commitPoints]
  );

  const undoPoint = useCallback(() => {
    commitPoints(pointsRef.current.slice(0, -1));
  }, [commitPoints]);

  const clearPoints = useCallback(() => {
    commitPoints([]);
  }, [commitPoints]);

  return {
    points,
    pointsRef,
    addPoint,
    setRoute,
    undoPoint,
    clearPoints,
  };
}
