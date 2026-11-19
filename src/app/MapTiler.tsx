import { useCallback, useEffect, useMemo, useState } from "react";

import MapView from "../components/map/MapView";
import MapControlPanel from "../components/controls/MapControlPanel";

import { createLevel3Index } from "../features/grid/grid.index";

import "../styles/map.css";

import type { GridCell } from "../components/MapTiler/types/map.types";
import { hidePointPopup } from "../components/map/MapPopup";
import { useAirCraftContext } from "../context/MakerContext";
import MeasurementBar from "../components/controls/MeasurementBar";

export default function MapTiler() {
  const { aircrafts, selectedAircraftId, setSelectedAircraftId, undoPoint } =
    useAirCraftContext();
  // Máy bay đang được chọn
  // Danh sách tọa độ mặc định

  const DEFAULT_GRID_LABELS = [
    "47",
    "46",
    "48",
    "42",
    "41",
    "44",
    "40",
    "49",
    "45",
    "43",
    "17",
    "16",
    "18",
    "12",
    "11",
    "14",
    "10",
    "19",
    "15",
    "13",
    "97",
    "96",
    "98",
    "92",
    "91",
    "94",
    "90",
    "99",
    "95",
    "93",
    "37",
    "36",
    "38",
    "35",
    "31",
    "34",
    "30",
    "39",
    "354",
    "33",
    "67",
    "66",
    "68",
    "62",
    "61",
    "64",
    "60",
    "69",
    "65",
    "63",
    "07",
    "06",
    "08",
    "02",
    "01",
    "04",
    "00",
    "09",
    "05",
    "03",
    "87",
    "86",
    "88",
    "82",
    "81",
    "84",
    "80",
    "89",
    "83",
    "85",
    "27",
    "26",
    "28",
    "22",
    "21",
    "24",
    "20",
    "29",
    "23",
    "25",
    "57",
    "56",
    "58",
    "52",
    "51",
    "54",
    "50",
    "59",
    "55",
    "53",
    "5gk5",
    "h5jy",
    "t4",
    "545",
    "h52343",
    "k4",
    "rtg",
    "35t",
    "12312",
    "123",
  ];

  const [labelInput, setLabelInput] = useState(DEFAULT_GRID_LABELS.join(" "));

  // Tự động chọn máy bay đầu tiên khi có danh sách
  useEffect(() => {
    if (aircrafts.length === 0) {
      setSelectedAircraftId("");
      return;
    }

    const selectedExists = aircrafts.some(
      (aircraft) => aircraft.id === selectedAircraftId,
    );
    if (!selectedExists) {
      setSelectedAircraftId(aircrafts[0].id);
    }
  }, [aircrafts, selectedAircraftId, setSelectedAircraftId]);

  // Danh sách labels
  const gridLabels = useMemo(() => {
    return labelInput.trim().split(/\s+/).filter(Boolean);
  }, [labelInput]);

  // Tạo grid index
  const gridIndex = useMemo(() => {
    return createLevel3Index(gridLabels);
  }, [gridLabels]);

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

  // Undo waypoint của máy bay đang chọn
  const handleUndo = useCallback(() => {
    if (!selectedAircraftId) return 0;

    const remainingPoints = undoPoint(selectedAircraftId);

    if (remainingPoints === 0) {
      hidePointPopup();
    }

    return remainingPoints;
  }, [selectedAircraftId, undoPoint]);

  // Lưu labels
  const handleSaveLabels = async (labels: string[]) => {
    // Có thể gọi API lưu tọa độ tại đây
    //
    // const response = await fetch("/api/grid-labels", {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ labels }),
    // });
    //
    // if (!response.ok) {
    //   throw new Error("Lưu tọa độ thất bại.");
    // }
  };

  // Chọn máy bay
  const handleSelectAircraft = (aircraftId: string) => {
    setSelectedAircraftId(aircraftId);
    hidePointPopup();
  };

  // Đóng context menu khi nhấn Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      // Không xử lý phím khi đang nhập nội dung
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        handleUndo();
      }

      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleUndo]);

  return (
    <div className="map-container flex h-screen w-full flex-col overflow-hidden">
      {/* ================= THANH TỌA ĐỘ ================= */}
      <MeasurementBar />

      {/* ================= VÙNG BẢN ĐỒ (nằm dưới thanh bar) ================= */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* ================= MAP ================= */}
        <div className="absolute inset-0 z-0">
          <MapView
            gridLabels={gridLabels}
            aircrafts={aircrafts}
            onOpenGridContextMenu={handleOpenGridContextMenu}
          />
        </div>

        {/* ================= CHỌN MÁY BAY ================= */}
        <div
          className={`
            absolute right-4 top-3 z-[1000]
            flex items-center gap-2
            rounded-lg bg-white p-2 shadow-lg
            transition-all duration-300
          `}
        >
          <span className="whitespace-nowrap text-sm font-semibold text-gray-700">
            Máy bay:
          </span>

          <select
            value={selectedAircraftId ?? ""}
            onChange={(event) => handleSelectAircraft(event.target.value)}
            disabled={aircrafts.length === 0}
            className="
              max-w-[180px] rounded-md border border-gray-200
              bg-white px-3 py-2 text-sm text-gray-700
              outline-none focus:border-blue-500
              disabled:cursor-not-allowed disabled:bg-gray-100
            "
          >
            {aircrafts.length === 0 ? (
              <option value="">Chưa có máy bay</option>
            ) : (
              aircrafts.map((aircraft) => (
                <option key={aircraft.id} value={aircraft.id}>
                  {aircraft.name}
                </option>
              ))
            )}
          </select>

          {selectedAircraftId && (
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  aircrafts.find(
                    (aircraft) => aircraft.id === selectedAircraftId,
                  )?.color ?? "#999",
              }}
            />
          )}
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
            gridIndex={gridIndex}
            labelInput={labelInput}
            onLabelInputChange={setLabelInput}
            onSaveLabels={handleSaveLabels}
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
                ? "pointer-events-none -translate-x-4 opacity-0"
                : "translate-x-0 opacity-100"
            }
          `}
          title="Mở bảng điều khiển"
        >
          ☰ Bảng điều khiển
        </button>
      </div>

      {/* ================= CONTEXT MENU (fixed nên để ngoài vùng bản đồ) ================= */}
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
          onContextMenu={(event) => event.preventDefault()}
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
