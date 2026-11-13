import { useMemo, useState } from "react";

import MapView from "../components/map/MapView";
import MapControlPanel from "../components/controls/MapControlPanel";

import { useRoutePoints } from "../hooks/useRoutePoints";

import { createLevel3Index } from "../features/grid/grid.index";

import "../styles/map.css";
import { GridCell } from "../components/MapTiler/types/map.types";

export default function MapTiler() {
  const [labelInput, setLabelInput] = useState("");
  const { points, addPoint, undoPoint, clearPoints, setRoute } =
    useRoutePoints();
  const gridLabels = useMemo(() => {
    return labelInput.trim().split(/\s+/).filter(Boolean);
  }, [labelInput]);
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
      <div className="grid-label-control">
        <label>Nhập label cho các ô lưới</label>

        <input
          type="text"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          placeholder="Ví dụ: 101 102 103 104 105"
        />

        <div>Số label đã nhập: {gridLabels.length}</div>
      </div>
      <MapView
        gridLabels={gridLabels}
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
