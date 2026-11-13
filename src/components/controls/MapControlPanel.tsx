import { useState } from "react";

import type { Point } from "../../features/route/route.types";
import type { GridFeature } from "../../features/grid/grid.types";

import RouteControls from "./RouteControls";
import GridRouteInput from "./GridRouteInput";
import PointList from "./PointList";

type Props = {
  points: Point[];
  gridIndex: Map<string, GridFeature>;

  labelInput: string;
  onLabelInputChange: (value: string) => void;

  onUndo: () => void;
  onClear: () => void;
  onCreateRoute: (points: Point[]) => void;
};

export default function MapControlPanel({
  points,
  gridIndex,
  labelInput,
  onLabelInputChange,
  onUndo,
  onClear,
  onCreateRoute,
}: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  const labels = labelInput.trim().split(/\s+/).filter(Boolean);

  const handleConfirm = () => {
    if (labels.length === 0) return;
    setShowConfirm(true);
  };
  const handleAccept = () => {
    setShowConfirm(false);

    // Thực hiện hành động xác nhận label tại đây
    console.log("Confirmed labels:", labels);
  };
  return (
    <>
      <div className="map-control-panel">
        <div className="grid-label-control">
          <label>Nhập tọa độ</label>

          <div className="grid-label-input-row">
            <input
              type="text"
              value={labelInput}
              onChange={(e) => onLabelInputChange(e.target.value)}
              placeholder="Ví dụ: 101 102 103 104 105"
            />

            <button
              type="button"
              className="grid-label-confirm"
              onClick={handleConfirm}
              disabled={labels.length === 0}
              title="Xác nhận tọa độ"
            >
              ✓
            </button>

            <div className="grid-label-info">
              <button
                type="button"
                className="grid-label-info-icon"
                aria-label="Xem cách sắp xếp label"
              >
                ⓘ
              </button>

              <div className="grid-label-tooltip">
                <div className="grid-label-tooltip-title">
                  Thứ tự hiển thị tọa độ
                </div>

                <div className="grid-label-preview">
                  {Array.from({ length: 25 }, (_, index) => (
                    <div className="grid-label-preview-cell" key={index}>
                      {index + 1}
                    </div>
                  ))}
                </div>

                <div className="grid-label-tooltip-description">
                  Tọa độ được sắp xếp từ trái sang phải, từ trên xuống dưới.
                </div>
              </div>
            </div>
          </div>

          <div className="grid-label-count">
            Số tọa độ đã nhập: {labels.length}
          </div>
        </div>

        <RouteControls
          count={points.length}
          onUndo={onUndo}
          onClear={onClear}
        />

        <GridRouteInput gridIndex={gridIndex} onCreateRoute={onCreateRoute} />

        <PointList points={points} />
      </div>

      {showConfirm && (
        <div
          className="grid-label-modal-overlay"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="grid-label-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Xác nhận tọa độ</h3>

            <p>
              Bạn có chắc chắn muốn sử dụng {labels.length} tọa độ đã nhập
              không?
            </p>

            <div className="grid-label-modal-actions">
              <button
                type="button"
                className="grid-label-cancel"
                onClick={() => setShowConfirm(false)}
              >
                Hủy
              </button>

              <button
                type="button"
                className="grid-label-accept"
                onClick={handleAccept}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
