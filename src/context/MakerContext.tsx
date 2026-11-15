import { createContext, ReactNode, useContext, useMemo } from "react";
import { useRoutePoints } from "../hooks/useRoutePoints";
import type { Point } from "../features/route/route.types";

// kiểu của context
interface MakerContextType {
  points: Point[];
  addPoint: (point: Point) => number;
  undoPoint: () => number;
  clearPoints: () => void;
  setRoute: (points: Point[]) => void;
}
// tạo context
const MakerContext = createContext<MakerContextType | undefined>(undefined);

//provider cung cấp dữ liệu cho context
export default function MakerProvider({ children }: { children: ReactNode }) {
  const { points, addPoint, undoPoint, clearPoints, setRoute } =
    useRoutePoints();
  // muốn truyền nhiều data thì thêm field ở đây

  // Gom dữ liệu vào một object
  const value = useMemo(
    () => ({
      points,
      addPoint,
      undoPoint,
      clearPoints,
      setRoute,
    }),
    [points, addPoint, undoPoint, clearPoints, setRoute],
  );
  return (
    <MakerContext.Provider value={value}>{children}</MakerContext.Provider>
  );
}
// Custom Hook
export function useMaker() {
  const context = useContext(MakerContext);

  if (!context) {
    throw new Error("useMaker must be used inside MakerProvider");
  }

  return context;
}
