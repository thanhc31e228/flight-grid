import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { useMap } from "../hooks/useMap";

export type GridSType = {
  lat: number;
  lng: number;
  id: string;
};

interface MapContextType {
  gridSelected: GridSType | undefined;
  commitGridSelected: (grid: GridSType) => void;
  showAzimuth: boolean;
  setShowAzimuth: React.Dispatch<React.SetStateAction<boolean>>;
  toggleAzimuth: () => void;
}
const MapContext = createContext<MapContextType | undefined>(undefined);
export default function MapProvider({ children }: { children: ReactNode }) {
  const { gridSelected, commitGridSelected } = useMap();
  const [showAzimuth, setShowAzimuth] = useState(true);

  const toggleAzimuth = () => {
    setShowAzimuth((prev) => !prev);
  };
  const value = useMemo(
    () => ({
      gridSelected,
      commitGridSelected,
    }),
    [gridSelected, commitGridSelected],
  );

  return (
    <MapContext.Provider
      value={{ ...value, showAzimuth, setShowAzimuth, toggleAzimuth }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error("useMap must be used inside MakerProvider");
  }

  return context;
}
