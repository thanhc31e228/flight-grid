import { useCallback, useEffect, useState } from "react";
import { Place } from "../features/places/place.types";

const STORAGE_KEY = "map-locations";

const DEFAULT_LOCATIONS: Place[] = [
  {
    id: "bchqs",
    name: "BCHQS",
    phone: "0xxx xxx xxx",
    lat: 21.363411,
    lng: 106.265561,
    side: "left",
  },
];

export function useLocations() {
  const [locations, setLocations] = useState<Place[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Place[]) : DEFAULT_LOCATIONS;
    } catch {
      return DEFAULT_LOCATIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
    } catch {
      /* bỏ qua nếu storage không dùng được */
    }
  }, [locations]);

  const addLocation = useCallback((data: Omit<Place, "id">) => {
    setLocations((prev) => [...prev, { ...data, id: crypto.randomUUID() }]);
  }, []);

  const removeLocation = useCallback((id: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
  }, []);

  return { locations, addLocation, removeLocation };
}
