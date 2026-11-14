import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";

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
  onUndo: () => number;
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
  const [editorAnimated, setEditorAnimated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 10 label hàng và 10 label cột
  const [rowLabels, setRowLabels] = useState<string[]>([]);
  const [colLabels, setColLabels] = useState<string[]>([]);

  const gridLabels = useMemo(() => {
    return labelInput.trim().split(/\s+/).filter(Boolean);
  }, [labelInput]);

  // Hiệu ứng mở modal bằng Tailwind
  useEffect(() => {
    if (!showEditor) {
      setEditorAnimated(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setEditorAnimated(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [showEditor]);

  // Mở bảng chỉnh sửa
  const handleOpenEditor = () => {
    // Nếu đã có 100 tọa độ thì tách lại thành hàng/cột
    if (gridLabels.length === 100) {
      setRowLabels(
        Array.from({ length: 10 }, (_, i) => {
          return gridLabels[i * 10]?.slice(0, -1) ?? "";
        }),
      );

      setColLabels(
        Array.from({ length: 10 }, (_, i) => {
          return gridLabels[i]?.slice(-1) ?? "";
        }),
      );
    } else {
      setRowLabels(Array(10).fill(""));
      setColLabels(Array(10).fill(""));
    }

    setError("");
    setShowEditor(true);
  };

  // Thay đổi label hàng
  const handleRowChange = (index: number, value: string) => {
    setRowLabels((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  // Thay đổi label cột
  const handleColChange = (index: number, value: string) => {
    setColLabels((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  // Xác nhận và lưu
  const handleAccept = async () => {
    const rows = rowLabels.map((label) => label.trim());
    const cols = colLabels.map((label) => label.trim());

    if (
      rows.length !== 10 ||
      cols.length !== 10 ||
      rows.some((label) => !label) ||
      cols.some((label) => !label)
    ) {
      setError("Vui lòng nhập đầy đủ 10 label hàng và 10 label cột.");
      return;
    }

    const labels = rows.flatMap((row) => cols.map((col) => `${row}${col}`));

    if (new Set(labels).size !== 100) {
      setError("Các tọa độ bị trùng nhau. Vui lòng kiểm tra lại label.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await onSaveLabels(labels);

      onLabelInputChange(labels.join(" "));
      setShowEditor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu tọa độ.");
    } finally {
      setSaving(false);
    }
  };

  const filledRows = rowLabels.filter((label) => label.trim()).length;
  const filledCols = colLabels.filter((label) => label.trim()).length;

  return (
    <>
      {/* Main control panel */}
      <div className="relative h-full w-full overflow-y-auto bg-white p-4 shadow-lg">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-800">
              Danh sách tọa độ
            </label>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              {gridLabels.length}/100
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenEditor}
            className="
              flex w-full items-center justify-center gap-2
              rounded-lg border border-blue-200
              bg-blue-50 px-4 py-3
              text-sm font-semibold text-blue-700
              transition-all duration-200
              hover:-translate-y-0.5
              hover:border-blue-400 hover:bg-blue-100
              hover:shadow-sm
              active:scale-[0.98]
            "
          >
            <span className="text-lg">▦</span>
            Thay đổi tọa độ
          </button>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Số tọa độ hiện tại</span>

            <span className="font-medium text-gray-700">
              {gridLabels.length} / 100
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${Math.min(gridLabels.length / 100, 1) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="my-4 border-t border-gray-100" />

        <RouteControls
          count={points.length}
          onUndo={onUndo}
          onClear={onClear}
        />

        <GridRouteInput gridIndex={gridIndex} onCreateRoute={onCreateRoute} />

        <PointList points={points} />
      </div>

      {/* Popup thiết lập tọa độ */}
      {showEditor &&
        createPortal(
          <div
            className={`
              fixed inset-0 z-[99999]
              flex items-center justify-center
              bg-black/50 backdrop-blur-sm
              p-4 sm:p-6
              transition-opacity duration-200 ease-out
              ${editorAnimated ? "opacity-100" : "opacity-0"}
            `}
            onClick={() => !saving && setShowEditor(false)}
          >
            {/* Modal */}
            <div
              className={`
                flex w-full max-w-5xl
                max-h-[85vh] flex-col
                overflow-hidden rounded-2xl
                bg-white shadow-2xl
                transition-all duration-200 ease-out
                ${
                  editorAnimated
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-3 scale-95 opacity-0"
                }
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
                <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                  Thiết lập tọa độ
                </h3>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowEditor(false)}
                  className="
                    flex h-9 w-9 items-center justify-center
                    rounded-full bg-gray-100
                    text-2xl text-gray-500
                    transition-all duration-200
                    hover:rotate-90
                    hover:bg-red-50 hover:text-red-500
                    disabled:opacity-50
                  "
                >
                  ×
                </button>
              </div>

              {/* Nội dung */}
              <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
                <div className="mb-5">
                  <h4 className="text-base font-bold text-gray-800">
                    Label hàng và xem trước tọa độ
                  </h4>
                </div>

                {/* Bảng tọa độ */}
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-[70px_repeat(10,minmax(0,1fr))] gap-2">
                      {/* Góc trên bên trái */}
                      <div className="flex h-12 items-center justify-center text-sm text-gray-400">
                        Hàng
                      </div>

                      {/* Label cột */}
                      {colLabels.map((label, index) => (
                        <div key={index} className="min-w-0">
                          <input
                            type="text"
                            value={label}
                            maxLength={10}
                            disabled={saving}
                            onChange={(e) =>
                              handleColChange(index, e.target.value)
                            }
                            placeholder={`${index + 1}`}
                            className="
                              h-12 w-full min-w-0
                              rounded-lg border border-gray-200
                              bg-gray-50 px-2 text-center
                              text-sm font-medium outline-none
                              transition-all duration-200
                              focus:border-blue-500
                              focus:bg-white focus:ring-2
                              focus:ring-blue-100
                              disabled:cursor-not-allowed
                              disabled:opacity-60
                            "
                          />
                        </div>
                      ))}

                      {/* Label hàng và các ô tọa độ */}
                      {rowLabels.map((rowLabel, rowIndex) => (
                        <div key={`row-group-${rowIndex}`} className="contents">
                          {/* Label hàng */}
                          <div className="min-w-0">
                            <input
                              type="text"
                              value={rowLabel}
                              maxLength={10}
                              disabled={saving}
                              onChange={(e) =>
                                handleRowChange(rowIndex, e.target.value)
                              }
                              placeholder={`${rowIndex + 1}`}
                              className="
                                h-12 w-full min-w-0
                                rounded-lg border border-gray-200
                                bg-gray-50 px-2 text-center
                                text-sm font-medium outline-none
                                transition-all duration-200
                                focus:border-blue-500
                                focus:bg-white focus:ring-2
                                focus:ring-blue-100
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                              "
                            />
                          </div>

                          {/* 10 ô tọa độ */}
                          {colLabels.map((colLabel, colIndex) => {
                            const coordinate = `${rowLabel.trim()}${colLabel.trim()}`;

                            return (
                              <div
                                key={`cell-${rowIndex}-${colIndex}`}
                                className={`
                                  flex h-12 min-w-0
                                  items-center justify-center
                                  overflow-hidden rounded-lg
                                  border px-2
                                  text-sm font-semibold
                                  transition-colors duration-200
                                  ${
                                    coordinate.length > 0
                                      ? "border-blue-100 bg-blue-50 text-blue-700"
                                      : "border-gray-200 bg-gray-50 text-gray-300"
                                  }
                                `}
                              >
                                <span className="truncate">
                                  {coordinate || "—"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Thông báo lỗi */}
                {error && (
                  <div
                    className="
                    mt-6 rounded-lg border border-red-200
                    bg-red-50 px-4 py-3
                    text-sm text-red-600
                  "
                  >
                    ⚠ {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="
                flex shrink-0 flex-col gap-3
                border-t border-gray-100
                bg-gray-50 px-5 py-4
                sm:flex-row sm:items-center
                sm:justify-between sm:px-6
              "
              >
                <span className="text-sm font-medium text-gray-500">
                  {filledRows + filledCols}/20 label đã nhập
                </span>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowEditor(false)}
                    className="
                      rounded-lg border border-gray-300
                      bg-white px-5 py-2.5
                      text-sm font-semibold text-gray-600
                      transition-colors duration-200
                      hover:bg-gray-100
                      disabled:opacity-50
                    "
                  >
                    Hủy
                  </button>

                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={saving}
                    className="
                      rounded-lg bg-blue-600
                      px-5 py-2.5
                      text-sm font-semibold text-white
                      shadow-sm
                      transition-all duration-200
                      hover:-translate-y-0.5
                      hover:bg-blue-700 hover:shadow-md
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >
                    {saving ? "Đang lưu..." : "✓ Xác nhận"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
