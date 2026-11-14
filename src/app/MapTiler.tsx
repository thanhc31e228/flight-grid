import { useEffect, useMemo, useState } from "react";

import MapView from "../components/map/MapView";
import MapControlPanel from "../components/controls/MapControlPanel";

import { useRoutePoints } from "../hooks/useRoutePoints";
import { createLevel3Index } from "../features/grid/grid.index";

import "../styles/map.css";
import { GridCell } from "../components/MapTiler/types/map.types";

export default function MapTiler() {
  const { points, addPoint, undoPoint, clearPoints, setRoute } =
    useRoutePoints();

  // Danh sách tọa độ mặc định
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
    "354",
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
    "123",
    "12312",
    "35t",
    "rtg",
    "k4",
    "h52343",
    "545",
    "t4",
    "h5jy",
    "5gk5",
  ];

  const [labelInput, setLabelInput] = useState(DEFAULT_GRID_LABELS.join(" "));

  // Danh sách labels
  const gridLabels = useMemo(() => {
    return labelInput.trim().split(/\s+/).filter(Boolean);
  }, [labelInput]);

  // Tạo grid index
  const gridIndex = useMemo(() => createLevel3Index(gridLabels), [gridLabels]);

  // Trạng thái panel
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    cell: GridCell;
    x: number;
    y: number;
  } | null>(null);

  // Mở context menu khi chuột phải vào grid
  const handleOpenGridContextMenu = (data: {
    cell: GridCell;
    x: number;
    y: number;
  }) => {
    setContextMenu(data);
  };

  // Xử lý phím Backspace
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Không undo khi đang nhập nội dung
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === "Backspace") {
        undoPoint();
      }

      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undoPoint]);

  // Lưu labels
  const handleSaveLabels = async (labels: string[]) => {
    // Có thể gọi API lưu tọa độ tại đây
    // const response = await fetch("/api/grid-labels", {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ labels }),
    // });
    // if (!response.ok) {
    //   throw new Error("Lưu tọa độ thất bại.");
    // }
  };

  return (
    <div className="map-container relative w-full h-screen overflow-hidden">
      {/* ================= MAP ================= */}
      <div className="absolute inset-0 z-0">
        <MapView
          gridLabels={gridLabels}
          points={points}
          onAddPoint={addPoint}
          onOpenGridContextMenu={handleOpenGridContextMenu}
        />
      </div>

      {/* ================= PANEL BÊN TRÁI ================= */}
      <div
        className={`
          absolute inset-y-0 left-0 z-[999]
          w-[300px] max-w-[90vw]
          transition-transform duration-300 ease-in-out
          ${isPanelOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <MapControlPanel
          onSaveLabels={handleSaveLabels}
          points={points}
          gridIndex={gridIndex}
          labelInput={labelInput}
          onLabelInputChange={setLabelInput}
          onUndo={undoPoint}
          onClear={clearPoints}
          onCreateRoute={setRoute}
        />

        {/* Nút đóng panel */}
        <button
          type="button"
          onClick={() => setIsPanelOpen(false)}
          className="
            absolute top-3 -right-10
            flex h-9 w-9 items-center justify-center
            rounded-r-lg bg-white
            text-gray-700 shadow-lg
            transition hover:bg-red-50 hover:text-red-600
          "
          title="Ẩn bảng điều khiển"
        >
          ✕
        </button>
      </div>

      {/* ================= NÚT MỞ PANEL ================= */}
      <button
        type="button"
        onClick={() => setIsPanelOpen(true)}
        className={`
          absolute top-3 left-3 z-[1000]
          flex items-center gap-2
          rounded-lg bg-white px-4 py-2.5
          text-sm font-semibold text-gray-700
          shadow-lg transition-all duration-300
          hover:bg-blue-50 hover:text-blue-600
          ${
            isPanelOpen
              ? "opacity-0 -translate-x-4 pointer-events-none"
              : "opacity-100 translate-x-0"
          }
        `}
        title="Mở bảng điều khiển"
      >
        ☰ Bảng điều khiển
      </button>

      {/* ================= CONTEXT MENU ================= */}
      {contextMenu && (
        <div
          className="
            fixed z-[999999]
            min-w-[160px]
            rounded-lg border border-gray-200
            bg-white p-2 shadow-xl
          "
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="border-b border-gray-100 px-3 py-2 text-sm font-semibold text-gray-800">
            Tọa độ: {contextMenu.cell.row}
            {contextMenu.cell.col}
          </div>

          <button
            type="button"
            onClick={() => {
              console.log("Selected cell:", contextMenu.cell);
              setContextMenu(null);
            }}
            className="
              block w-full rounded-md px-3 py-2
              text-left text-sm text-gray-700
              hover:bg-blue-50 hover:text-blue-600
            "
          >
            Chọn ô này
          </button>

          <button
            type="button"
            onClick={() => setContextMenu(null)}
            className="
              block w-full rounded-md px-3 py-2
              text-left text-sm text-gray-500
              hover:bg-gray-100
            "
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
}
