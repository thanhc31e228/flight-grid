import { useMaker } from "../../context/MakerContext";
import { hidePointPopup } from "../map/MapPopup";

type Props = {
  count: number;
  onUndo: () => number;
  onClear: () => void;
};

export default function RouteControls({ count, onUndo, onClear }: Props) {
  const { points, undoPoint, clearPoints } = useMaker();
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
          onClick={() => {
            if (undoPoint() === 0) {
              hidePointPopup();
            }
          }}
          disabled={count === 0}
        >
          Hoàn tác
        </button>

        <button
          onClick={() => {
            clearPoints();
            hidePointPopup();
          }}
          disabled={count === 0}
        >
          Xóa tất cả
        </button>
      </div>
    </div>
  );
}
