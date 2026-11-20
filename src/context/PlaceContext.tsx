import { createContext, ReactNode, useMemo } from "react";
import { usePlace } from "../hooks/usePlace";
import { Place } from "../features/places/place.types";

interface PlaceContextType {
  places: Place[];
  addPlace: (place: Place) => number;
}
const PlaceContext = createContext<PlaceContextType | undefined>(undefined);
export default function MakerProvider({ children }: { children: ReactNode }) {
  const { addPlace, places } = usePlace();
  const value = useMemo(
    () => ({
      places,
      addPlace,
    }),
    [places, addPlace],
  );
  return (
    <PlaceContext.Provider value={value}>{children}</PlaceContext.Provider>
  );
}
