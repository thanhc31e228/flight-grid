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
  const DEFAULT_GRID_LABELS = [
    "43",
    "45",
    "49",
    "40",
    "44",
    "41",
    "42",
    "48",
    "46",
    "47",
    "13",
    "15",
    "19",
    "10",
    "14",
    "11",
    "12",
    "18",
    "16",
    "17",
    "93",
    "95",
    "99",
    "90",
    "94",
    "91",
    "92",
    "98",
    "96",
    "97",
    "33",
    "35",
    "39",
    "30",
    "34",
    "31",
    "35",
    "38",
    "36",
    "37",
    "63",
    "65",
    "69",
    "60",
    "64",
    "61",
    "62",
    "68",
    "66",
    "67",
    "03",
    "05",
    "09",
    "00",
    "04",
    "01",
    "02",
    "08",
    "06",
    "07",
    "85",
    "83",
    "89",
    "80",
    "84",
    "81",
    "82",
    "88",
    "86",
    "87",
    "25",
    "23",
    "29",
    "20",
    "24",
    "21",
    "22",
    "28",
    "26",
    "27",
    "53",
    "55",
    "59",
    "50",
    "54",
    "51",
    "52",
    "58",
    "56",
    "57",
  ];
  const [labelInput, setLabelInput] = useState(DEFAULT_GRID_LABELS.join(" "));

  const gridLabels = useMemo(() => {
    return labelInput.trim().split(/\s+/).filter(Boolean);
  }, [labelInput]);

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
        gridLabels={gridLabels}
        points={points}
        onAddPoint={addPoint}
        onOpenGridContextMenu={handleOpenGridContextMenu}
      />

      <MapControlPanel
        points={points}
        gridIndex={gridIndex}
        labelInput={labelInput}
        onLabelInputChange={setLabelInput}
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
