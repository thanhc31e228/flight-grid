import { useAirCraftContext } from "../../context/MakerContext";

export default function RouteControls() {
  const { aircrafts, selectedAircraftId, undoPoint, clearPoints } =
    useAirCraftContext();

  // Số waypoint của Tốp đang chọn
  const count =
    aircrafts.find((item) => item.id === selectedAircraftId)?.points.length ??
    0;

  const disabled = !selectedAircraftId || count === 0;

  const handleUndo = () => {
    if (disabled || !selectedAircraftId) return;
    undoPoint(selectedAircraftId);
  };

  const handleClear = () => {
    if (disabled || !selectedAircraftId) return;
    clearPoints(selectedAircraftId);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={handleUndo}
        disabled={disabled}
        className="
          flex h-9 items-center justify-center gap-2 rounded-md
          border border-gray-300 bg-white px-3
          text-sm font-medium text-gray-700 transition-colors
          hover:bg-gray-50
          focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900
          disabled:cursor-not-allowed disabled:opacity-40
        "
      >
        <span aria-hidden="true" className="leading-none">
          ↶
        </span>
        Hoàn tác
      </button>

      <button
        type="button"
        onClick={handleClear}
        disabled={disabled}
        className="
          flex h-9 items-center justify-center gap-2 rounded-md
          border border-gray-300 bg-white px-3
          text-sm font-medium text-gray-700 transition-colors
          hover:bg-gray-50
          focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900
          disabled:cursor-not-allowed disabled:opacity-40
        "
      >
        <span aria-hidden="true" className="leading-none">
          ⌫
        </span>
        Xóa tất cả
      </button>
    </div>
  );
}
