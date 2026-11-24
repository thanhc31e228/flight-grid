// components/LayerToggleMenu.tsx
import { useEffect, useRef, useState } from "react";
import { usePlaceContext } from "../../context/PlaceContext";
import { useMapContext } from "../../context/MapContext";

// Các lớp có thể bật/tắt
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

// Danh sách menu, muốn thêm mục mới chỉ cần thêm 1 dòng
const ITEMS: { key: keyof LayerVisibility; text: string }[] = [
  { key: "labels", text: "Nhãn" },
  { key: "places", text: "Địa điểm" },
  { key: "bearingRings", text: "Vòng phương vị" },
];

export default function LayerToggleMenu({
  value,
  onChange,
  label = "Lớp",
  className = "",
}: LayerToggleMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { showPlace, togglePlace } = usePlaceContext();
  const { showAzimuth, toggleAzimuth } = useMapContext();

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

  // Trạng thái hiện tại của từng lớp: nhãn lấy từ props, 2 lớp còn lại lấy từ context
  const checked: Record<keyof LayerVisibility, boolean> = {
    labels: value.labels,
    places: showPlace,
    bearingRings: showAzimuth,
  };

  // Hành động khi bấm vào từng lớp
  const toggle = (key: keyof LayerVisibility) => {
    if (key === "places") return togglePlace();
    if (key === "bearingRings") return toggleAzimuth();
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div ref={rootRef} className={`absolute bottom-4 left-4 z-10 ${className}`}>
      {/* Popup menu */}
      {open && (
        <div className="absolute bottom-full left-0 mb-1 min-w-[180px] rounded border border-gray-300 bg-white py-1 shadow-sm">
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
