import { useState, useMemo } from "react";

import type { Point } from "../../features/route/route.types";
import type { GridFeature } from "../../features/grid/grid.types";

import RouteControls from "./RouteControls";
import GridRouteInput from "./GridRouteInput";
import PointList from "./PointList";

const DEFAULT_GRID_LABELS = [
  "43",
  "45",
  "49",
  "40",
  "44",
  "41",
  "42",
  "48",
  "46",
  "47",
  "13",
  "15",
  "19",
  "10",
  "14",
  "11",
  "12",
  "18",
  "16",
  "17",
  "93",
  "95",
  "99",
  "90",
  "94",
  "91",
  "92",
  "98",
  "96",
  "97",
  "33",
  "35",
  "39",
  "30",
  "34",
  "31",
  "35",
  "38",
  "36",
  "37",
  "63",
  "65",
  "69",
  "60",
  "64",
  "61",
  "62",
  "68",
  "66",
  "67",
  "03",
  "05",
  "09",
  "00",
  "04",
  "01",
  "02",
  "08",
  "06",
  "07",
  "85",
  "83",
  "89",
  "80",
  "84",
  "81",
  "82",
  "88",
  "86",
  "87",
  "25",
  "23",
  "29",
  "20",
  "24",
  "21",
  "22",
  "28",
  "26",
  "27",
  "53",
  "55",
  "59",
  "50",
  "54",
  "51",
  "52",
  "58",
  "56",
  "57",
];

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
  const [showEditor, setShowEditor] = useState(false);

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
  const handleAccept = () => {
    const newLabels = editingLabels.map((label) => label.trim());

    // Cập nhật danh sách tọa độ
    onLabelInputChange(newLabels.join(" "));

    setShowEditor(false);
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
                >
                  ✓ Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
