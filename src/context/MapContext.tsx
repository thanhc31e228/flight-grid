import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useMap } from "../hooks/useMap";
import { MAP_CONFIG } from "../config/map.config";
import { BASE_COORDINATES_KEY } from "../utils/map.storage";
import { loadMapStyleId, type MapStyleId } from "../features/map/baseMaps";
import { Place } from "../features/places/place.types";

export type GridSType = {
  lat: number;
  lng: number;
  id: string;
};

type Coordinates = [lng: number, lat: number];

interface MapContextType {
  gridSelected: GridSType | undefined;
  commitGridSelected: (grid: GridSType) => void;
  placeSelected: Place | null;
  setPlaceSelected: (place: Place | null) => void;
  // Base map style
  mapStyleId: MapStyleId;
  setMapStyleId: (id: MapStyleId) => void;

  // Layer visibility
  showAzimuth: boolean;
  showPlace: boolean;
  setShowAzimuth: React.Dispatch<React.SetStateAction<boolean>>;
  toggleAzimuth: () => void;
  togglePlace: () => void;

  // Base coordinates
  setBaseCoordinates: (coordinates: Coordinates) => void;
  baseCoordinates: Coordinates;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export default function MapProvider({ children }: { children: ReactNode }) {
  const { gridSelected, commitGridSelected } = useMap();
  const [placeSelected, setPlaceSelected] = useState<Place | null>(null);
  // ================= BASE MAP =================
  // Khởi tạo từ localStorage (chưa có thì loadMapStyleId tự ghi giá trị mặc định)
  const [mapStyleId, setMapStyleIdState] = useState<MapStyleId>(loadMapStyleId);

  // Đổi style và lưu vào localStorage
  const setMapStyleId = useCallback((id: MapStyleId) => {
    localStorage.setItem(MAP_CONFIG.STORAGE_KEY, id);
    setMapStyleIdState(id);
  }, []);

  // ================= LAYER VISIBILITY =================
  const [showAzimuth, setShowAzimuth] = useState(true);
  const [showPlace, setShowPlace] = useState(true);

  // ================= BASE COORDINATES =================
  const [baseCoordinates, setBaseCoordinatesState] = useState<Coordinates>(
    () => {
      try {
        const saved = localStorage.getItem(BASE_COORDINATES_KEY);

        if (saved) {
          const coordinates: unknown = JSON.parse(saved);

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

  // ================= UPDATE COORDINATES =================
  const setBaseCoordinates = useCallback((coordinates: Coordinates) => {
    setBaseCoordinatesState(coordinates);

    try {
      localStorage.setItem(BASE_COORDINATES_KEY, JSON.stringify(coordinates));
    } catch (error) {
      console.error("Không thể lưu baseCoordinates:", error);
    }
  }, []);

  // ================= TOGGLE AZIMUTH =================
  const toggleAzimuth = useCallback(() => {
    setShowAzimuth((prev) => !prev);
  }, []);

  // ================= TOGGLE PLACE =================
  const togglePlace = useCallback(() => {
    setShowPlace((prev) => !prev);
  }, []);

  // ================= CONTEXT VALUE =================
  const value = useMemo<MapContextType>(
    () => ({
      gridSelected,
      commitGridSelected,

      // Places
      placeSelected,
      setPlaceSelected,

      mapStyleId,
      setMapStyleId,

      showAzimuth,
      showPlace,
      setShowAzimuth,
      toggleAzimuth,
      togglePlace,

      baseCoordinates,
      setBaseCoordinates,
    }),
    [
      gridSelected,
      commitGridSelected,

      // Places
      placeSelected,
      setPlaceSelected,

      mapStyleId,
      setMapStyleId,
      showAzimuth,
      showPlace,
      toggleAzimuth,
      togglePlace,
      baseCoordinates,
      setBaseCoordinates,
    ],
  );
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error("useMapContext must be used inside MapProvider");
  }

  return context;
}
