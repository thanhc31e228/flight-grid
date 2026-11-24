// components/LayerToggleMenu.tsx
import { useEffect, useRef, useState } from "react";
import { usePlaceContext } from "../../context/PlaceContext";
import { useMapContext } from "../../context/MapContext";
import {
  loadMapStyleId,
  MAP_STYLE_LABELS,
  type MapStyleId,
} from "../../features/map/baseMaps";

export interface LayerVisibility {
  labels: boolean; // Nhãn
  places: boolean; // Địa điểm
  bearingRings: boolean; // Vòng phương vị
}

interface LayerToggleMenuProps {
  value: LayerVisibility;
  onChange: (next: LayerVisibility) => void;
  label?: string; // chữ trên nút
  className?: string;
}

const ITEMS: { key: keyof LayerVisibility; text: string }[] = [
  { key: "labels", text: "Nhãn" },
  { key: "places", text: "Địa điểm" },
  { key: "bearingRings", text: "Vòng phương vị" },
];

// Danh sách style nền lấy từ BASE_MAPS
const STYLE_ITEMS = Object.entries(MAP_STYLE_LABELS) as [MapStyleId, string][];

export default function LayerToggleMenu({
  value,
  onChange,
  label = "Lớp",
  className = "",
}: LayerToggleMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { showPlace, togglePlace } = usePlaceContext();
  const {
    showAzimuth,
    toggleAzimuth,
    showPlace: showPlaceLabel,
    togglePlace: togglePlaceLabel,
    mapStyleId,
    setMapStyleId,
  } = useMapContext();
  // Lần đầu hiển thị: nếu style trong context lệch với localStorage thì kéo về cho khớp
  useEffect(() => {
    const saved = loadMapStyleId();
    if (saved !== mapStyleId) setMapStyleId(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Bấm ra ngoài thì đóng menu
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const checked: Record<keyof LayerVisibility, boolean> = {
    labels: showPlaceLabel,
    places: showPlace,
    bearingRings: showAzimuth,
  };

  const toggle = (key: keyof LayerVisibility) => {
    if (key === "places") return togglePlace();
    if (key === "bearingRings") return toggleAzimuth();
    if (key === "labels") return togglePlaceLabel();
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div ref={rootRef} className={`absolute bottom-4 left-4 z-10 ${className}`}>
      {/* Popup menu */}
      {open && (
        <div className="absolute bottom-full left-0 mb-1 min-w-[200px] rounded border border-gray-300 bg-white py-1 shadow-sm">
          {/* ===== Bật/tắt lớp ===== */}
          {ITEMS.map(({ key, text }) => (
            <label
              key={key}
              className="flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={checked[key]}
                onChange={() => toggle(key)}
                className="h-4 w-4 accent-gray-800"
              />
              {text}
            </label>
          ))}

          {/* ===== Đổi nền bản đồ ===== */}
          <div className="my-1 border-t border-gray-200" />
          <div className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Nền bản đồ
          </div>
          {STYLE_ITEMS.map(([id, text]) => (
            <label
              key={id}
              className="flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100"
            >
              <input
                type="radio"
                name="map-base-style"
                checked={mapStyleId === id}
                onChange={() => setMapStyleId(id)}
                className="h-4 w-4 accent-gray-800"
              />
              {text}
            </label>
          ))}
        </div>
      )}

      {/* Nút mở menu */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm hover:bg-gray-100"
      >
        {label}
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 transition-transform ${open ? "" : "rotate-180"}`}
          fill="currentColor"
        >
          <path d="M12 8l7 8H5z" />
        </svg>
      </button>
    </div>
  );
}
