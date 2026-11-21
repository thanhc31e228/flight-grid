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
    <div className="mb-4 w-full rounded-xl border border-gray-200 bg-white p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="mt-0.5 text-xs text-gray-500">waypoint</p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="text-sm font-semibold tabular-nums">{count}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={disabled}
          className="
            flex items-center justify-center gap-2
            rounded-lg border border-amber-200
            bg-amber-50 px-3 py-2.5
            text-sm font-medium text-amber-700
            transition-all duration-200
            hover:bg-amber-100 hover:border-amber-300
            active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-40
          "
        >
          <span className="text-lg leading-none">↶</span>
          <span>Hoàn tác</span>
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="
            flex items-center justify-center gap-2
            rounded-lg border border-red-200
            bg-red-50 px-3 py-2.5
            text-sm font-medium text-red-600
            transition-all duration-200
            hover:bg-red-100 hover:border-red-300
            active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-40
          "
        >
          <span className="text-base leading-none">⌫</span>
          <span>Xóa tất cả</span>
        </button>
      </div>
    </div>
  );
}
