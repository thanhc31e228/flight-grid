import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { useMap } from "../hooks/useMap";
import { MAP_CONFIG } from "../config/map.config";
import { BASE_COORDINATES_KEY } from "../utils/map.storage";

export type GridSType = {
  lat: number;
  lng: number;
  id: string;
};

type Coordinates = [lng: number, lat: number];

interface MapContextType {
  gridSelected: GridSType | undefined;
  commitGridSelected: (grid: GridSType) => void;

  showAzimuth: boolean;
  showPlace: boolean;

  setShowAzimuth: React.Dispatch<React.SetStateAction<boolean>>;
  toggleAzimuth: () => void;
  togglePlace: () => void;

  setBaseCoordinates: (coordinates: Coordinates) => void;
  baseCoordinates: Coordinates;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export default function MapProvider({ children }: { children: ReactNode }) {
  const { gridSelected, commitGridSelected } = useMap();

  const [showAzimuth, setShowAzimuth] = useState(true);
  const [showPlace, setShowPlace] = useState(true);

  // Khởi tạo từ localStorage, nếu chưa có thì lấy MAP_CONFIG
  const [baseCoordinates, setBaseCoordinatesState] = useState<Coordinates>(
    () => {
      try {
        const saved = localStorage.getItem(BASE_COORDINATES_KEY);

        if (saved) {
          const coordinates = JSON.parse(saved);

          if (
            Array.isArray(coordinates) &&
            coordinates.length === 2 &&
            coordinates.every(
              (value) => typeof value === "number" && Number.isFinite(value),
            )
          ) {
            return coordinates as Coordinates;
          }
        }
      } catch (error) {
        console.error("Không thể đọc baseCoordinates:", error);
      }

      return [...MAP_CONFIG.BASE_COORDINATES] as Coordinates;
    },
  );

  // Cập nhật state và localStorage
  const setBaseCoordinates = (coordinates: Coordinates) => {
    setBaseCoordinatesState(coordinates);

    try {
      localStorage.setItem(BASE_COORDINATES_KEY, JSON.stringify(coordinates));
    } catch (error) {
      console.error("Không thể lưu baseCoordinates:", error);
    }
  };

  const toggleAzimuth = () => {
    setShowAzimuth((prev) => !prev);
  };

  const togglePlace = () => {
    setShowPlace((prev) => !prev);
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
      value={{
        ...value,
        showAzimuth,
        showPlace,
        baseCoordinates,
        setBaseCoordinates,
        setShowAzimuth,
        togglePlace,
        toggleAzimuth,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error("useMapContext must be used inside MapProvider");
  }

  return context;
}
