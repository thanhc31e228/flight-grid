import { useCallback, useRef, useState } from "react";
import { Place } from "../features/places/place.types";

export function usePlace() {
  const placesRef = useRef<Place[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  // Đồng bộ ref và state
  /// LƯU VÀO DATABASE
  const commitPlaces = useCallback((updated: Place[]) => {
    placesRef.current = updated;
    setPlaces(updated);
  }, []);

  // Thêm dia diem
  const addPlace = useCallback(
    (place: Place) => {
      const updated = [...placesRef.current, place];
      commitPlaces(updated);

      return updated.length;
    },
    [commitPlaces],
  );
  return {
    places,
    addPlace,
  };
}
