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

  // 10 label hàng và 10 label cột
  const [rowLabels, setRowLabels] = useState<string[]>([]);
  const [colLabels, setColLabels] = useState<string[]>([]);

  const gridLabels = useMemo(() => {
    return labelInput.trim().split(/\s+/).filter(Boolean);
  }, [labelInput]);

  // Tự động tạo 100 tọa độ
  const generatedLabels = useMemo(() => {
    return rowLabels.flatMap((row) =>
      colLabels.map((col) => `${row.trim()}${col.trim()}`),
    );
  }, [rowLabels, colLabels]);

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
      <div className="absolute left-3 top-3 z-20 w-[280px] max-w-[calc(100%-24px)] rounded-xl bg-white p-4 shadow-lg">
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
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 active:scale-[0.98]"
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

      {/* Popup chỉnh sửa */}
      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => !saving && setShowEditor(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Thiết lập tọa độ
                </h3>
                {/* <p className="mt-1 text-xs text-gray-500">
                  Nhập 10 label hàng và 10 label cột để tự động tạo 100 tọa độ.
                </p> */}
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => setShowEditor(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Nội dung */}

            {/* Nội dung */}
            <div className="overflow-y-auto p-4 sm:p-6">
              {/* Label hàng bên trái + lưới bên phải */}

              {/* Label hàng + Preview */}
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-bold text-gray-800">
                  Label hàng và xem trước tọa độ
                </h4>

                {/* Grid 11 cột: 1 cột label hàng + 10 cột tọa độ */}
                <div className="grid grid-cols-[48px_repeat(10,minmax(0,1fr))] gap-2">
                  {/* Góc trên bên trái */}
                  <div className="flex h-10 items-center justify-center text-xs text-gray-400">
                    Hàng
                  </div>

                  {/* Label cột nằm ngang */}
                  {colLabels.map((label, index) => (
                    <div key={index} className="min-w-0">
                      <input
                        type="text"
                        value={label}
                        maxLength={10}
                        disabled={saving}
                        onChange={(e) => handleColChange(index, e.target.value)}
                        placeholder={`${index + 1}`}
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-0.5 text-center text-xs font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  ))}

                  {/* Label hàng + tọa độ */}
                  {rowLabels.map((rowLabel, rowIndex) => (
                    <>
                      {/* Label hàng */}
                      <div key={`row-${rowIndex}`} className="min-w-0">
                        <input
                          type="text"
                          value={rowLabel}
                          maxLength={10}
                          disabled={saving}
                          onChange={(e) =>
                            handleRowChange(rowIndex, e.target.value)
                          }
                          placeholder={`${rowIndex + 1}`}
                          className="h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-0.5 text-center text-xs font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      {/* 10 ô tọa độ tương ứng */}
                      {colLabels.map((colLabel, colIndex) => {
                        const coordinate = `${rowLabel.trim()}${colLabel.trim()}`;

                        return (
                          <div
                            key={`cell-${rowIndex}-${colIndex}`}
                            className={`flex h-10 min-w-0 items-center justify-center overflow-hidden rounded-lg border px-0.5 text-[10px] font-semibold sm:text-xs ${
                              coordinate.length > 0
                                ? "border-blue-100 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-gray-50 text-gray-300"
                            }`}
                          >
                            <span className="truncate">
                              {coordinate || "—"}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  ⚠ {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-medium text-gray-500">
                {filledRows + filledCols}/20 label đã nhập
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowEditor(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "✓ Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
