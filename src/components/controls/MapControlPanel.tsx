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
      Array.from({ length: gridLabels.length }, (_, index) => {
        return gridLabels[index] ?? "";
      }),
    );

    setError("");
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

    if (newLabels.length !== 100 || newLabels.some((label) => !label)) {
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
      {/* Main control panel */}
      <div className="absolute left-3 top-3 z-20 w-[280px] max-w-[calc(100%-24px)] rounded-xl bg-white p-4 shadow-lg">
        {/* Khu vực thay đổi tọa độ */}
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

        <div className="border-t border-gray-100" />

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => !saving && setShowEditor(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Thay đổi tọa độ
                </h3>

                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  Nhấn vào ô để chỉnh sửa tọa độ
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => setShowEditor(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Nội dung */}
            <div className="overflow-y-auto p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Lưới tọa độ
                </span>

                <span className="text-xs text-gray-400">10 × 10</span>
              </div>

              {/* Lưới 10 x 10 */}
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-3">
                {editingLabels.map((label, index) => (
                  <input
                    key={index}
                    type="text"
                    aria-label={`Tọa độ ô ${index + 1}`}
                    value={label}
                    maxLength={10}
                    disabled={saving}
                    onChange={(e) => handleLabelChange(index, e.target.value)}
                    className="h-10 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-1 text-center text-xs font-medium text-gray-800 outline-none transition placeholder:text-gray-300 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-50 sm:h-11 sm:text-sm"
                  />
                ))}
              </div>

              {/* Thông báo lỗi */}
              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="text-xs font-medium text-gray-500">
                {editingLabels.filter((label) => label.trim()).length}/100 ô đã
                nhập
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowEditor(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Đang lưu...
                    </span>
                  ) : (
                    "✓ Xác nhận"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
