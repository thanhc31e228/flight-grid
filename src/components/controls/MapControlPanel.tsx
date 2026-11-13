import { useState, useMemo } from "react";

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
  onSaveLabels: (labels: string[]) => Promise<void>;
  onUndo: () => void;
  onClear: () => void;
  onCreateRoute: (points: Point[]) => void;
};

export default function MapControlPanel({
  points,
  gridIndex,
  labelInput,
  onLabelInputChange,
  onSaveLabels,
  onUndo,
  onClear,
  onCreateRoute,
}: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingLabels, setEditingLabels] = useState<string[]>([]);
  const gridLabels = useMemo(() => {
    return labelInput.trim().split(/\s+/).filter(Boolean);
  }, [labelInput]);

  // Mở bảng chỉnh sửa
  const handleOpenEditor = () => {
    setEditingLabels(
      Array.from({ length: 100 }, (_, index) => {
        return gridLabels[index] ?? "";
      }),
    );

    setShowEditor(true);
  };

  // Thay đổi tọa độ từng ô
  const handleLabelChange = (index: number, value: string) => {
    setEditingLabels((prev) =>
      prev.map((label, i) => (i === index ? value : label)),
    );
  };

  // Xác nhận tọa độ
  const handleAccept = async () => {
    const newLabels = editingLabels.map((label) => label.trim());

    if (newLabels.some((label) => !label)) {
      setError("Vui lòng nhập đầy đủ 100 tọa độ.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await onSaveLabels(newLabels);

      onLabelInputChange(newLabels.join(" "));

      setShowEditor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu tọa độ.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="map-control-panel">
        {/* Khu vực thay đổi tọa độ */}
        <div className="grid-label-control">
          <label>Danh sách tọa độ</label>

          <button
            type="button"
            className="grid-label-open"
            onClick={handleOpenEditor}
          >
            <span>▦</span>
            Thay đổi tọa độ
          </button>

          <div className="grid-label-count">
            Số tọa độ: {gridLabels.length}/100
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

      {/* Popup chỉnh sửa 100 tọa độ */}
      {showEditor && (
        <div
          className="grid-label-modal-overlay"
          onClick={() => setShowEditor(false)}
        >
          <div
            className="grid-label-editor"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid-label-editor-header">
              <div>
                <h3>Thay đổi tọa độ</h3>
                <p>Nhấn vào ô để chỉnh sửa tọa độ</p>
              </div>

              <button
                type="button"
                className="grid-label-close"
                onClick={() => setShowEditor(false)}
              >
                ×
              </button>
            </div>

            {/* Lưới 10 x 10 */}
            <div className="grid-label-editor-grid">
              {editingLabels.map((label, index) => (
                <input
                  key={index}
                  type="text"
                  className="grid-label-editor-cell"
                  value={label}
                  maxLength={10}
                  onChange={(e) => handleLabelChange(index, e.target.value)}
                />
              ))}
            </div>

            <div className="grid-label-editor-footer">
              <span>
                {editingLabels.filter((label) => label.trim()).length}/100 ô
              </span>

              <div className="grid-label-modal-actions">
                <button
                  type="button"
                  className="grid-label-cancel"
                  onClick={() => setShowEditor(false)}
                >
                  Hủy
                </button>

                <button
                  type="button"
                  className="grid-label-accept"
                  onClick={handleAccept}
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "✓ Xác nhận"}
                </button>
                {error && <div className="grid-label-error">{error}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
