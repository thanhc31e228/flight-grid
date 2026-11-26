import { Settings } from "lucide-react";
import { useCursorCoords } from "../MapTiler/utils/cursor.store";
import { formatGridId } from "../../utils/formatGridId";
import { formatDistanceMetersToKm } from "../MapTiler/utils/measurement";

type Props = {
  onOpenSettings: () => void;
};

export default function MeasurementBar({ onOpenSettings }: Props) {
  const coords = useCursorCoords();

  return (
    <div className="relative z-[1001] flex h-11 w-full shrink-0 items-center justify-center border-b border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm">
      <div className="flex items-center justify-center gap-8 whitespace-nowrap">
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
        <div className="flex items-center gap-2">
          <span className="font-semibold">Tọa độ 5x5:</span>
          <span className="w-28 font-mono tabular-nums text-orange-700">
            {coords ? `${formatGridId(coords.gridId)}` : "--"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">Phương vị:</span>
          <span className="w-28 font-mono tabular-nums text-orange-700">
            {coords ? `${coords.mil}` : "--"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">Cự ly:</span>
          <span className="w-28 font-mono tabular-nums text-orange-700">
            {coords
              ? `${coords.distance}m | ${formatDistanceMetersToKm(coords.distance)}km `
              : "--"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        title="Cài đặt"
        className="
          absolute right-3 flex h-8 w-8 items-center justify-center
          rounded-lg border border-gray-200 bg-white text-gray-600
          transition-all hover:bg-gray-100 hover:text-gray-900
          active:scale-95
        "
      >
        <Settings size={17} />
      </button>
    </div>
  );
}
