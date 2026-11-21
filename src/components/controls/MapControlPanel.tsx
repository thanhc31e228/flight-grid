import { useState, useMemo, useEffect } from "react";

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

  const { aircrafts, selectedAircraftId, undoPoint, clearPoints } =
    useAirCraftContext();

  const selectedAircraft = useMemo(
    () => aircrafts.find((item) => item.id === selectedAircraftId) ?? null,
    [aircrafts, selectedAircraftId],
  );

  const points = selectedAircraft?.points ?? [];

  const gridLabels = useMemo(
    () => labelInput.trim().split(/\s+/).filter(Boolean),
    [labelInput],
  );

  // Animation modal

  const handleUndo = () => {
    if (selectedAircraftId) undoPoint(selectedAircraftId);
  };

  const handleClear = () => {
    if (selectedAircraftId) clearPoints(selectedAircraftId);
  };

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
