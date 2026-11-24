import { useEffect, useState } from "react";
import { Crosshair, Save, MapPin } from "lucide-react";
import { useMapContext } from "../../context/MapContext";
import { DEFAULT_PLACES } from "../MapTiler/map.constants";

export default function CenterSettings() {
  const { baseCoordinates, setBaseCoordinates } = useMapContext();

  // Hiển thị theo thứ tự Lat, Lng
  const [coordinates, setCoordinates] = useState(
    `${baseCoordinates[1]}, ${baseCoordinates[0]}`,
  );

  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [error, setError] = useState("");

  // Đồng bộ tọa độ khi Context thay đổi
  useEffect(() => {
    setCoordinates(`${baseCoordinates[1]}, ${baseCoordinates[0]}`);

    const matchedPlace = DEFAULT_PLACES.find(
      (place) =>
        place.lat === baseCoordinates[1] && place.lng === baseCoordinates[0],
    );

    setSelectedPlaceId(matchedPlace?.id ?? "");
  }, [baseCoordinates]);

  // Chọn địa điểm có sẵn
  const handleSelectPlace = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setError("");

    if (!placeId) return;

    const place = DEFAULT_PLACES.find((p) => p.id === placeId);
    if (!place) return;

    setCoordinates(`${place.lat}, ${place.lng}`);
  };

  // Nhập tọa độ thủ công
  const handleChangeCoordinates = (value: string) => {
    setCoordinates(value);
    setSelectedPlaceId("");
    setError("");
  };

  // Lưu tọa độ
  const handleSave = () => {
    const values = coordinates.split(",").map((value) => value.trim());

    if (values.length !== 2 || values.some((value) => value === "")) {
      setError("Định dạng không hợp lệ. Ví dụ: 21.123456, 106.123456");
      return;
    }

    const [lat, lng] = values.map(Number);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Vui lòng nhập tọa độ hợp lệ.");
      return;
    }

    if (lat < -90 || lat > 90) {
      setError("Vĩ độ phải nằm trong khoảng -90 đến 90.");
      return;
    }

    if (lng < -180 || lng > 180) {
      setError("Kinh độ phải nằm trong khoảng -180 đến 180.");
      return;
    }

    // MapLibre sử dụng thứ tự [lng, lat]
    setBaseCoordinates([lng, lat]);
    setError("");
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2">
          <Crosshair size={20} className="text-gray-600" />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800">
            Thiết lập tâm tọa độ
          </p>

          <p className="text-xs text-gray-500">
            Chọn địa điểm hoặc nhập tọa độ trung tâm
          </p>
        </div>
      </div>

      {/* Chọn địa điểm */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Địa điểm có sẵn
        </label>

        <div className="relative">
          <MapPin
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <select
            value={selectedPlaceId}
            onChange={(e) => handleSelectPlace(e.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Chọn địa điểm --</option>

            {DEFAULT_PLACES.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        </div>

        {selectedPlaceId && (
          <p className="mt-1.5 text-xs text-blue-500">
            Đã chọn:{" "}
            {DEFAULT_PLACES.find((p) => p.id === selectedPlaceId)?.name}
          </p>
        )}
      </div>

      {/* Nhập tọa độ */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Tọa độ (Latitude, Longitude)
        </label>

        <input
          type="text"
          value={coordinates}
          onChange={(e) => handleChangeCoordinates(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder="21.123456, 106.123456"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <p className="mt-1.5 text-xs text-gray-400">
          Định dạng: Vĩ độ, Kinh độ (lat, lng)
        </p>
      </div>

      {/* Thông báo lỗi */}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-400">Tọa độ hiện tại</p>

          <p className="truncate text-xs font-medium text-gray-600">
            {baseCoordinates[1]}, {baseCoordinates[0]}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 active:scale-95"
        >
          <Save size={16} />
          Lưu tọa độ
        </button>
      </div>
    </section>
  );
}
