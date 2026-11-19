// import { hidePointPopup } from "../map/MapPopup";

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
  const handleUndo = () => {
    if (!aircraftId) return;

    onUndo(aircraftId);

    // if (remainingPoints === 0) {
    //   hidePointPopup();
    // }
  };

  const handleClear = () => {
    if (!aircraftId) return;

    onClear(aircraftId);
    // hidePointPopup();
  };

  return (
    <div className="route-controls">
      <strong>QUẢN LÝ TUYẾN ĐƯỜNG</strong>

      <p>
        Số điểm: <strong>{count}</strong>
      </p>

      <div className="grid-info">
        <div>Grid cấp 1: 20.000m</div>
        <div>Grid cấp 2: 2000m × 2000m</div>
        <div>Grid cấp 3: 5 ô / ô cấp 2</div>
      </div>

      <div className="route-buttons">
        <button
          type="button"
          onClick={handleUndo}
          disabled={!aircraftId || count === 0}
        >
          Hoàn tác
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={!aircraftId || count === 0}
        >
          Xóa tất cả
        </button>
      </div>
    </div>
  );
}
