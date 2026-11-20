type Props = {
  count: number;
  aircraftId: string | null;
  onUndo: (aircraftId: string) => number;
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
    if (!aircraftId || count === 0) return;
    onUndo(aircraftId);
  };

  const handleClear = () => {
    if (!aircraftId || count === 0) return;
    onClear(aircraftId);
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-wide text-slate-800">
            QUẢN LÝ TUYẾN ĐƯỜNG
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Điều khiển các điểm trên tuyến bay
          </p>
        </div>

        <div className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-blue-50 px-3 text-sm font-bold text-blue-600">
          {count}
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
        <span className="text-sm text-slate-500">Tổng số waypoint</span>

        <span className="text-lg font-bold tabular-nums text-slate-800">
          {count}
        </span>
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
            text-sm font-semibold text-amber-700
            transition-all duration-200
            hover:border-amber-300 hover:bg-amber-100
            active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-40
          "
        >
          <span className="text-lg">↶</span>
          Hoàn tác
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="
            flex items-center justify-center gap-2
            rounded-lg border border-red-200
            bg-red-50 px-3 py-2.5
            text-sm font-semibold text-red-600
            transition-all duration-200
            hover:border-red-300 hover:bg-red-100
            active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-40
          "
        >
          <span className="text-base">⌫</span>
          Xóa tất cả
        </button>
      </div>
    </div>
  );
}
