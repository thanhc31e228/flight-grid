import { useCallback, useRef, useState } from "react";
import { Place } from "../features/places/place.types";

const DEFAULT_PLACE: Place[] = [
  {
    id: "bchqs-lang-giang",
    name: "BCHQS Huyện Lạng Giang",
    phone: "09182",
    lat: 21.371283,
    lng: 106.266907,
    side: "right",
  },
];

export function usePlace() {
  // Khởi tạo từ danh sách mặc định (trước đây là [] nên không hiện gì)
  const placesRef = useRef<Place[]>(DEFAULT_PLACE);
  const [places, setPlaces] = useState<Place[]>(DEFAULT_PLACE);

  // Đồng bộ ref và state
  /// LƯU VÀO DATABASE
  const commitPlaces = useCallback((updated: Place[]) => {
    placesRef.current = updated;
    setPlaces(updated);
  }, []);

  // Thêm địa điểm
  const addPlace = useCallback(
    (place: Place) => {
      const updated = [...placesRef.current, place];
      commitPlaces(updated);

      return updated.length;
    },
    [commitPlaces],
  );

  // Xóa địa điểm (panel có nút ✕ cần hàm này)
  const removePlace = useCallback(
    (id: string) => {
      commitPlaces(placesRef.current.filter((place) => place.id !== id));
    },
    [commitPlaces],
  );

  return {
    places,
    addPlace,
    removePlace,
  };
}
