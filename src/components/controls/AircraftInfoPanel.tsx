import { useState } from "react";
import type { AirCraft } from "../MapTiler/types/map.types";

// Đổi "1106" -> "11h06"
function formatAppearanceTime(value?: string) {
  if (!value) return null;

  const digits = value.replace(/\D/g, "").padStart(4, "0");
  return `${digits.slice(0, 2)}h${digits.slice(2, 4)}`;
}

// Đổi độ cao hm -> m. Ví dụ "005" -> "005 hm (500 m)"
function formatAltitude(value?: string) {
  if (!value) return null;

  const hm = Number(value);
  if (Number.isNaN(hm)) return value;

  return `${value} hm (${hm * 100} m)`;
}

// Đổi tốc độ m/s -> km/h
function formatSpeed(value?: number) {
  if (value === undefined || value === null) return null;

  return `${value.toFixed(2)} m/s (${(value * 3.6).toFixed(0)} km/h)`;
}

type Props = {
  aircraft: AirCraft | null;
};

// Row thông tin
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-xs font-medium text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-slate-800">
        {value || "—"}
      </span>
    </div>
  );
}

export default function AircraftInfoPanel({ aircraft }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  if (!aircraft) return null;

  return (
    <div
      className={`
    pointer-events-none
    flex items-start
    transition-transform duration-300 ease-in-out
    ${isOpen ? "translate-x-0" : "translate-x-[266px]"}
  `}
    >
      {/* Nút ẩn / hiện */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? "Ẩn thông tin" : "Hiện thông tin"}
        className="
          pointer-events-auto mr-1 mt-1
          flex h-8 w-7 shrink-0 items-center justify-center
          rounded-md border border-slate-300
          bg-white text-slate-700
          shadow-sm
          transition-colors
          hover:bg-slate-100
          active:scale-95
        "
      >
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 transition-transform duration-300 ${
            isOpen ? "rotate-0" : "rotate-180"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 4l6 6-6 6" />
        </svg>
      </button>

      {/* Panel thông tin */}
      <div
        className={`
          mr-4 w-[250px] shrink-0 select-none
          rounded-lg border border-slate-300
          bg-slate-50/95 p-3
          shadow-md
          transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0"}
        `}
      >
        {/* Tiêu đề */}
        <div className="mb-2 flex items-center gap-2 border-b border-slate-300 pb-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-slate-400"
            style={{ backgroundColor: aircraft.color }}
          />

          <span className="truncate text-sm font-bold text-slate-900">
            Tốp {aircraft.name || aircraft.id}
          </span>
        </div>

        {/* Thông tin */}
        <div className="space-y-1.5">
          <Row label="Số hiệu" value={aircraft.id} />

          <Row label="SL - KL" value={aircraft.aircraftCode} />

          <Row label="Độ cao" value={formatAltitude(aircraft.altitude)} />

          <Row
            label="Xuất hiện"
            value={formatAppearanceTime(aircraft.appearanceTime)}
          />

          <Row label="Tốc độ" value={formatSpeed(aircraft.speed)} />

          <Row label="Số điểm" value={String(aircraft.points.length)} />
        </div>
      </div>
    </div>
  );
}
