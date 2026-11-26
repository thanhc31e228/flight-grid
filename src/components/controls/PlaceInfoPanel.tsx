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

// Row thông tin
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-xs font-medium text-slate-500">
        {label}
      </span>

      <span className="break-all text-right text-sm font-semibold text-slate-800">
        {value || "—"}
      </span>
    </div>
  );
}

export default function PlaceInfoPanel({ place }: Props) {
  const { setPlaceSelected } = usePlaceContext();
  if (!place) return null;

  return (
    <div className="pointer-events-none flex items-start">
      {/* Nút X: đóng panel và bỏ chọn place */}
      <button
        type="button"
        onClick={() => setPlaceSelected(null)}
        title="Đóng"
        className="
          pointer-events-auto mr-1 mt-1
          flex h-8 w-7 shrink-0 items-center justify-center
          rounded-md border border-slate-300
          bg-white text-slate-700
          shadow-sm
          transition-colors
          hover:border-red-200 hover:bg-red-50 hover:text-red-600
          active:scale-95
        "
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

      {/* Panel thông tin */}
      <div
        className="
          mr-4 w-[250px] shrink-0 select-none
          rounded-lg border border-slate-300
          bg-slate-50/95 p-3
          shadow-md
        "
      >
        {/* Tiêu đề */}
        <div className="mb-2 flex items-center gap-2 border-b border-slate-300 pb-2">
          <span className="h-3 w-3 shrink-0 rounded-full border border-slate-400 bg-blue-500" />

          <span className="truncate text-sm font-bold text-slate-900">
            {place.name || place.id}
          </span>
        </div>

        {/* Thông tin */}
        <div className="space-y-1.5">
          <Row label="ID" value={place.id} />
          <Row label="Tên địa điểm" value={place.name} />
          <Row label="Điện thoại" value={place.phone} />
          <Row label="Vĩ độ" value={formatCoordinate(place.lat)} />
          <Row label="Kinh độ" value={formatCoordinate(place.lng)} />
        </div>
      </div>
    </div>
  );
}
