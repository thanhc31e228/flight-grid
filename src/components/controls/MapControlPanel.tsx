import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";

import type { GridFeature } from "../../features/grid/grid.types";
import RouteControls from "./RouteControls";
import GridRouteInput from "./GridRouteInput";
import { useAirCraftContext } from "../../context/MakerContext";

type Props = {
  gridIndex: Map<string, GridFeature>;
  labelInput: string;
  onLabelInputChange: (value: string) => void;
  onSaveLabels: (labels: string[]) => Promise<void>;
};

const inputClass = `
  h-12 w-full min-w-0 rounded-lg border border-gray-200
  bg-gray-50 px-2 text-center text-sm font-medium outline-none
  transition-all duration-200
  focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100
  disabled:cursor-not-allowed disabled:opacity-60
`;

export default function MapControlPanel({
  gridIndex,
  labelInput,
  onLabelInputChange,
  onSaveLabels,
}: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const [editorAnimated, setEditorAnimated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { aircrafts, selectedAircraftId, undoPoint, clearPoints } =
    useAirCraftContext();

  const selectedAircraft = useMemo(
    () => aircrafts.find((item) => item.id === selectedAircraftId) ?? null,
    [aircrafts, selectedAircraftId],
  );

  const points = selectedAircraft?.points ?? [];
  const [rowLabels, setRowLabels] = useState<string[]>([]);
  const [colLabels, setColLabels] = useState<string[]>([]);

  const gridLabels = useMemo(
    () => labelInput.trim().split(/\s+/).filter(Boolean),
    [labelInput],
  );

  // Animation modal
  useEffect(() => {
    if (!showEditor) {
      setEditorAnimated(false);
      return;
    }

    const frame = requestAnimationFrame(() => setEditorAnimated(true));
    return () => cancelAnimationFrame(frame);
  }, [showEditor]);

  // Mở editor và khởi tạo label
  const handleOpenEditor = () => {
    if (gridLabels.length === 100) {
      setRowLabels(
        Array.from(
          { length: 10 },
          (_, i) => gridLabels[i * 10]?.slice(0, -1) ?? "",
        ),
      );

      setColLabels(
        Array.from({ length: 10 }, (_, i) => gridLabels[i]?.slice(-1) ?? ""),
      );
    } else {
      setRowLabels(Array(10).fill(""));
      setColLabels(Array(10).fill(""));
    }

    setError("");
    setShowEditor(true);
  };

  const handleRowChange = (index: number, value: string) => {
    setRowLabels((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleColChange = (index: number, value: string) => {
    setColLabels((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleUndo = () => {
    if (selectedAircraftId) undoPoint(selectedAircraftId);
  };

  const handleClear = () => {
    if (selectedAircraftId) clearPoints(selectedAircraftId);
  };

  // Lưu label tọa độ
  const handleAccept = async () => {
    const rows = rowLabels.map((label) => label.trim());
    const cols = colLabels.map((label) => label.trim());

    if (rows.some((label) => !label) || cols.some((label) => !label)) {
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

  const filledCount =
    rowLabels.filter((label) => label.trim()).length +
    colLabels.filter((label) => label.trim()).length;

  const renderLabelInput = (
    value: string,
    placeholder: string,
    onChange: (value: string) => void,
  ) => (
    <input
      value={value}
      maxLength={10}
      disabled={saving}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );

  return (
    <>
      <div className="relative flex h-full w-full flex-col gap-3 bg-white p-4 shadow-lg">
        {/* Máy bay đang chọn */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: selectedAircraft?.color }}
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {selectedAircraft?.name ?? "Chưa chọn máy bay"}
            </p>
            <p className="text-xs tabular-nums text-gray-500">
              {points.length} waypoint
            </p>
          </div>
        </div>

        <RouteControls
          count={points.length}
          aircraftId={selectedAircraftId}
          onUndo={handleUndo}
          onClear={handleClear}
        />

        <GridRouteInput gridIndex={gridIndex} />
      </div>

      {/* Coordinate editor modal */}
    </>
  );
}
