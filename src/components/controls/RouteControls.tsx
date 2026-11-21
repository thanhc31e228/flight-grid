type Props = {
  count: number;
  aircraftId: string | null;
  onUndo: (aircraftId: string) => void;
  onClear: (aircraftId: string) => void;
};

export default function RouteControls({
  count,
  aircraftId,
  onUndo,
  onClear,
}: Props) {
  const disabled = !aircraftId || count === 0;

  const handleUndo = () => {
    if (disabled || !aircraftId) return;
    onUndo(aircraftId);
  };

  const handleClear = () => {
    if (disabled || !aircraftId) return;
    onClear(aircraftId);
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
