import { createContext, ReactNode, useContext, useMemo } from "react";
import { useMap } from "../hooks/useMap";

export type GridSType = {
  lat: number;
  lng: number;
  id: string;
};

interface MapContextType {
  gridSelected: GridSType | undefined;
  commitGridSelected: (grid: GridSType) => void;
}
const MapContext = createContext<MapContextType | undefined>(undefined);
export default function MapProvider({ children }: { children: ReactNode }) {
  const { gridSelected, commitGridSelected } = useMap();

  const value = useMemo(
    () => ({
      gridSelected,
      commitGridSelected,
    }),
    [gridSelected, commitGridSelected],
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error("useMap must be used inside MakerProvider");
  }

  return context;
}
