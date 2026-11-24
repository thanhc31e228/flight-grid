import { useCallback, useState } from "react";
import { Place } from "../features/places/place.types";

const DEFAULT_PLACES: Place[] = [
  {
    id: "bchqs",
    name: "BCHQS Xã Lạng Giang",
    phone: "0xxx xxx xxx",
    lat: 21.363411,
    lng: 106.265561,
  },
];

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([...DEFAULT_PLACES]);

  const addLocation = useCallback((data: Omit<Place, "id">) => {
    setPlaces((prev) => [...prev, { ...data, id: crypto.randomUUID() }]);
  }, []);

  const removeLocation = useCallback((id: string) => {
    setPlaces((prev) => prev.filter((loc) => loc.id !== id));
  }, []);

  return { locations: places, addLocation, removeLocation };
}
