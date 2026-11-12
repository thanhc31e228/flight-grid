
import type { Point } from "../../features/route/route.types";
import type { GridFeature } from "../../features/grid/grid.types";

import RouteControls from "./RouteControls";
import GridRouteInput from "./GridRouteInput";
import PointList from "./PointList";

type Props = {
  points: Point[];
  gridIndex: Map<string, GridFeature>;

  onUndo: () => void;
  onClear: () => void;
  onCreateRoute: (points: Point[]) => void;
};

export default function MapControlPanel({
  points,
  gridIndex,
  onUndo,
  onClear,
  onCreateRoute,
}: Props) {
  return (
    <div className="map-control-panel">
      <RouteControls
        count={points.length}
        onUndo={onUndo}
        onClear={onClear}
      />

      <GridRouteInput
        gridIndex={gridIndex}
        onCreateRoute={onCreateRoute}
      />

      <PointList points={points} />
    </div>
  );
}
