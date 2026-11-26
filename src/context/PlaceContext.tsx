import { createContext, useContext, useState } from "react";
import type { Place } from "../features/places/place.types";
import { DEFAULT_PLACES } from "../components/MapTiler/map.constants";

type PlaceContextType = {
  places: Place[];
  addPlace: (place: Place) => void;
  removePlace: (id: string) => void;
  togglePlace: () => void;
  showPlace: boolean;

  // Địa điểm đang được chọn
  placeSelected: Place | null;
  setPlaceSelected: (place: Place | null) => void;
};

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export function PlaceProvider({ children }: { children: React.ReactNode }) {
  const [places, setPlaces] = useState<Place[]>(DEFAULT_PLACES);
  const [showPlace, setShowPlace] = useState(true);

  // State địa điểm đang được chọn
  const [placeSelected, setPlaceSelected] = useState<Place | null>(null);

  const addPlace = (place: Place) => {
    setPlaces((prev) => [...prev, place]);
  };

  const togglePlace = () => {
    setShowPlace((prev) => !prev);
  };

  const removePlace = (id: string) => {
    setPlaces((prev) => prev.filter((place) => place.id !== id));

    // Nếu xóa địa điểm đang chọn thì bỏ chọn luôn
    setPlaceSelected((prev) => (prev?.id === id ? null : prev));
  };

  return (
    <PlaceContext.Provider
      value={{
        showPlace,
        places,
        addPlace,
        removePlace,
        togglePlace,
        placeSelected,
        setPlaceSelected,
      }}
    >
      {children}
    </PlaceContext.Provider>
  );
}

export function usePlaceContext() {
  const context = useContext(PlaceContext);

  if (!context) {
    throw new Error(
      "usePlaceContext phải được sử dụng bên trong PlaceProvider",
    );
  }

  return context;
}
