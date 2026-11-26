import { usePlaceContext } from "../../context/PlaceContext";
import type { Place } from "../../features/places/place.types";

type Props = {
  place: Place | null;
};

// Format tọa độ
function formatCoordinate(value?: number) {
  if (value === undefined || value === null) return null;
  return value.toFixed(6);
}

// Một dòng thông tin
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="break-all text-right font-medium text-slate-900">
        {value || "—"}
      </span>
    </div>
  );
}

export default function PlaceInfoPanel({ place }: Props) {
  const { setPlaceSelected } = usePlaceContext();

  if (!place) return null;

  return (
    <div className="pointer-events-auto w-56 select-none rounded-md border border-slate-300 bg-white/80 text-slate-900 shadow-sm backdrop-blur-sm">
      {/* Tiêu đề + nút đóng */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />

        <span className="flex-1 truncate text-sm font-semibold">
          {place.name || place.id}
        </span>

        {/* Nút X: đóng panel và bỏ chọn place */}
        <button
          type="button"
          title="Đóng"
          onClick={() => setPlaceSelected(null)}
          className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      {/* Thông tin */}
      <div className="space-y-1 border-t border-slate-200 px-3 py-2">
        <Row label="ID" value={place.id} />
        <Row label="Điện thoại" value={place.phone} />
        <Row label="Vĩ độ" value={formatCoordinate(place.lat)} />
        <Row label="Kinh độ" value={formatCoordinate(place.lng)} />
      </div>
    </div>
  );
}
