import { useState } from "react";
import { MapPin, X } from "lucide-react";
import { Place } from "../../features/places/place.types";

type Props = {
  locations: Place[];
  onAdd: (data: Omit<Place, "id">) => void;
  onRemove: (id: string) => void;
  onFocus: (loc: Place) => void;
};

const labelClass = "text-sm font-medium text-gray-900";

const fieldClass = `
  mt-1.5 h-9 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3
  text-sm text-gray-900 outline-none transition-colors
  placeholder:text-gray-400
  focus:border-gray-900 focus:ring-1 focus:ring-gray-900
`;

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900";

// "21.363411, 106.265561" -> { lat, lng }
function parseCoords(input: string) {
  const parts = input.split(/[,;\s]+/).filter(Boolean);
  if (parts.length !== 2) return null;

  const [lat, lng] = parts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat, lng };
}

export default function PlaceSettings({
  locations,
  onAdd,
  onRemove,
  onFocus,
}: Props) {
  const [name, setName] = useState("");
  const [coords, setCoords] = useState("");
  const [phone, setPhone] = useState("");
  const [side, setSide] = useState<"auto" | "left" | "right">("auto");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const parsed = parseCoords(coords);

    if (!name.trim()) {
      setError("Chưa nhập tên địa điểm");
      return;
    }

    if (!parsed) {
      setError("Tọa độ sai, nhập dạng: 21.363411, 106.265561");
      return;
    }

    onAdd({
      name: name.trim(),
      phone: phone.trim(),
      // side: side === "auto" ? undefined : side,
      ...parsed,
    });

    setName("");
    setCoords("");
    setPhone("");
    setSide("auto");
    setError("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      {/* Form thêm địa điểm */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
      >
        <h3 className="text-sm font-semibold text-gray-900">Thêm địa điểm</h3>

        <div>
          <label htmlFor="place-name" className={labelClass}>
            Tên
          </label>
          <input
            id="place-name"
            placeholder="VD: BCHQS"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="place-coords" className={labelClass}>
            Tọa độ
          </label>
          <input
            id="place-coords"
            placeholder="21.363411, 106.265561"
            value={coords}
            onChange={(e) => setCoords(e.target.value)}
            className={`${fieldClass} font-mono`}
          />
          <p className="mt-1 text-xs text-gray-500">Nhập dạng: lat, lng</p>
        </div>

        <div>
          <label htmlFor="place-phone" className={labelClass}>
            Số điện thoại
          </label>
          <input
            id="place-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="place-side" className={labelClass}>
            Vị trí label
          </label>
          <select
            id="place-side"
            value={side}
            onChange={(e) => setSide(e.target.value as typeof side)}
            className={fieldClass}
          >
            <option value="auto">Tự động</option>
            <option value="left">Bên trái</option>
            <option value="right">Bên phải</option>
          </select>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className={`
            inline-flex h-9 w-full items-center justify-center rounded-md
            bg-gray-900 px-4 text-sm font-medium text-white
            transition-colors hover:bg-gray-800 ${focusRing}
            focus-visible:ring-offset-2
          `}
        >
          Thêm địa điểm
        </button>
      </form>

      {/* Danh sách địa điểm */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sách địa điểm
          </h3>
          <span className="text-xs tabular-nums text-gray-500">
            {locations.length}
          </span>
        </header>

        {locations.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <MapPin size={24} className="text-gray-400" />
            <p className="mt-3 text-sm text-gray-500">
              Chưa có địa điểm nào được thêm
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 p-2">
            {locations.map((loc) => (
              <li key={loc.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onFocus(loc)}
                  className={`min-w-0 flex-1 rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-50 ${focusRing}`}
                >
                  <p className="truncate text-sm font-medium text-gray-900">
                    {loc.name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs tabular-nums text-gray-500">
                    {loc.lat}, {loc.lng}
                  </p>
                  {loc.phone && (
                    <p className="truncate text-xs text-gray-500">
                      {loc.phone}
                    </p>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onRemove(loc.id)}
                  aria-label={`Xóa ${loc.name}`}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 ${focusRing}`}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
