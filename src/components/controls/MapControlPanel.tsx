import { useMemo } from "react";

import type { GridFeature } from "../../features/grid/grid.types";
import RouteControls from "./RouteControls";
import GridRouteInput from "./GridRouteInput";
import { useAirCraftContext } from "../../context/MakerContext";

type Props = {
  gridIndex: Map<string, GridFeature>;
};

export default function MapControlPanel({ gridIndex }: Props) {
  const { aircrafts, selectedAircraftId, undoPoint, clearPoints } =
    useAirCraftContext();

  const selectedAircraft = useMemo(
    () => aircrafts.find((item) => item.id === selectedAircraftId) ?? null,
    [aircrafts, selectedAircraftId],
  );

  const points = selectedAircraft?.points ?? [];

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
