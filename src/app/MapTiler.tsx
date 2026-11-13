import { useMemo, useState } from "react";

import MapView from "../components/map/MapView";

import MapControlPanel from "../components/controls/MapControlPanel";

import { useRoutePoints } from "../hooks/useRoutePoints";

import { createLevel3Index } from "../features/grid/grid.index";

import "../styles/map.css";
import { GridCell } from "../components/MapTiler/types/map.types";

export default function MapTiler() {
  const { points, addPoint, undoPoint, clearPoints, setRoute } =
    useRoutePoints();

  // Chỉ tạo index một lần.
  const gridIndex = useMemo(() => createLevel3Index(), []);
  const [contextMenu, setContextMenu] = useState<{
    cell: GridCell;
    x: number;
    y: number;
  } | null>(null);

  const handleOpenGridContextMenu = (data: {
    cell: GridCell;
    x: number;
    y: number;
  }) => {
    setContextMenu(data);
  };
  return (
    <div className="map-container">
      <MapView
        points={points}
        onAddPoint={addPoint}
        onOpenGridContextMenu={handleOpenGridContextMenu}
      />

      <MapControlPanel
        points={points}
        gridIndex={gridIndex}
        onUndo={undoPoint}
        onClear={clearPoints}
        onCreateRoute={setRoute}
      />
      {contextMenu && (
        <div
          className="grid-context-menu"
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 999999,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="context-menu-title">
            Tọa độ: {contextMenu.cell.row}
            {contextMenu.cell.col}
          </div>

          <button
            onClick={() => {
              console.log("Selected cell:", contextMenu.cell);
              setContextMenu(null);
            }}
          >
            Chọn ô này
          </button>

          <button onClick={() => setContextMenu(null)}>Đóng</button>
        </div>
      )}
    </div>
  );
}
