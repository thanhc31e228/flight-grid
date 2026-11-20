import { createContext, useContext, useState } from "react";
import type { Place } from "../features/places/place.types";

type PlaceContextType = {
  places: Place[];
  addPlace: (place: Place) => void;
  removePlace: (id: string) => void;
};

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export function PlaceProvider({ children }: { children: React.ReactNode }) {
  const [places, setPlaces] = useState<Place[]>([]);

  const addPlace = (place: Place) => {
    setPlaces((prev) => [...prev, place]);
  };

  const removePlace = (id: string) => {
    setPlaces((prev) => prev.filter((place) => place.id !== id));
  };

  return (
    <PlaceContext.Provider value={{ places, addPlace, removePlace }}>
      {children}
    </PlaceContext.Provider>
  );
}

export function usePlace() {
  const context = useContext(PlaceContext);

  if (!context) {
    throw new Error("usePlace phải được sử dụng bên trong PlaceProvider");
  }

  return context;
}
