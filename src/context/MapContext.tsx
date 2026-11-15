import { createContext, ReactNode, useContext } from "react";
interface Point {
  pointList: number;
}

// kiểu của context
interface MapContextType {
  point: Point;
}
// tạo context
const MapContext = createContext<MapContextType | undefined>(undefined);

//provider cung cấp dữ liệu cho context
export default function MapProvider({ children }: { children: ReactNode }) {
  const point: Point = {
    pointList: 0,
  };
  const value: MapContextType = {
    point: point,
  };
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}
// Custom Hook
export function useMap() {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error("useMap must be used inside MapProvider");
  }

  return context;
}
