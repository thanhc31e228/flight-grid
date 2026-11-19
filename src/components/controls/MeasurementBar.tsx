import { useCursorCoords } from "../MapTiler/utils/cursor.store";

export default function MeasurementBar() {
  const coords = useCursorCoords();

  return (
    <div
      className="
        relative z-[1001] flex h-11 w-full shrink-0
        items-center justify-center gap-8
        overflow-x-auto whitespace-nowrap
        border-b border-gray-200 bg-white px-4
        text-sm text-gray-700 shadow-sm
      "
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold">Kinh độ:</span>
        <span className="w-28 font-mono tabular-nums text-sky-700">
          {coords ? `${coords.lng.toFixed(6)}°` : "--"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-semibold">Vĩ độ:</span>
        <span className="w-28 font-mono tabular-nums text-orange-700">
          {coords ? `${coords.lat.toFixed(6)}°` : "--"}
        </span>
      </div>
    </div>
  );
}
