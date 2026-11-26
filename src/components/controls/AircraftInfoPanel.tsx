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

// Một dòng thông tin
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">
        {value || "—"}
      </span>
    </div>
  );
}

export default function AircraftInfoPanel({ aircraft }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  if (!aircraft) return null;

  return (
    <div className="pointer-events-auto w-56 select-none rounded-md border border-slate-300 bg-white/80 text-slate-900 shadow-sm backdrop-blur-sm">
      {/* Tiêu đề - bấm để ẩn / hiện */}
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {/* Icon máy bay SVG */}
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0"
          style={{ color: aircraft.color }}
          fill="currentColor"
        >
          <path
            d="M12 1.5
       L13.4 8
       L22.1 11
       L22.5 13
       L13.7 11.7
       L14.2 18.3
       L17 20.2
       L16.6 22
       L12 20.8
       L7.4 22
       L7 20.2
       L9.8 18.3
       L10.3 11.7
       L1.5 13
       L1.9 11
       L10.6 8
       Z"
          />
        </svg>

        <span className="flex-1 truncate text-sm font-semibold">
          Tốp {aircraft.name || aircraft.id}
        </span>

        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>

      {/* Thông tin */}
      {isOpen && (
        <div className="space-y-1 border-t border-slate-200 px-3 py-2">
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
      )}
    </div>
  );
}
