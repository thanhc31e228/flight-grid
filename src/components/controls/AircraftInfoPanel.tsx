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
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: aircraft.color }}
        />

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
