
import { useMemo } from "react";

import MapView from "../components/map/MapView";

import MapControlPanel from "../components/controls/MapControlPanel";

import { useRoutePoints } from "../hooks/useRoutePoints";

import { createLevel3Index } from "../features/grid/grid.index";

import "../styles/map.css";

export default function MapTiler() {
  const {
    points,
    addPoint,
    undoPoint,
    clearPoints,
    setRoute,
  } = useRoutePoints();

  // Chỉ tạo index một lần.
  const gridIndex = useMemo(
    () => createLevel3Index(),
    []
  );

  return (
    <div className="map-container">

      <MapView
        points={points}
        onAddPoint={addPoint}
      />

      <MapControlPanel
        points={points}
        gridIndex={gridIndex}
        onUndo={undoPoint}
        onClear={clearPoints}
        onCreateRoute={setRoute}
      />

    </div>
  );
}
