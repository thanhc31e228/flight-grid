import { useCallback, useEffect, useMemo, useState } from "react";

import MapView from "../components/map/MapView";
import MapControlPanel from "../components/controls/MapControlPanel";

import { createLevel3Index } from "../features/grid/grid.index";

import "../styles/map.css";

import type { GridCell } from "../components/MapTiler/types/map.types";
import { useAirCraftContext } from "../context/MakerContext";
import MeasurementBar from "../components/controls/MeasurementBar";
import { setPick, usePick } from "../components/MapTiler/utils/pick.store";
import {
  createAircraft,
  SIDE_CONFIG,
  type AircraftDetails,
  type AircraftSide,
} from "../components/controls/factory/aircraft.factory";
import NewAircraftForm from "../components/controls/NewAircraftForm";
import { useLocations } from "../hooks/useLocations";
import { Place } from "../features/places/place.types";
import { LocationPanel } from "../components/controls/LocationPanel";
import SettingsPage from "../components/settings/SettingsPage";

export default function MapTiler() {
  const {
    aircrafts,
    selectedAircraftId,
    setSelectedAircraftId,
    undoPoint,
    addAircraft,
  } = useAirCraftContext();
  // Máy bay đang được chọn
  // Danh sách tọa độ mặc định
  // Danh sách địa điểm (lưu localStorage)
  const { locations, addLocation, removeLocation } = useLocations();

  // Đóng/mở panel địa điểm
  const [isPlacePanelOpen, setIsPlacePanelOpen] = useState(false);

  // Yêu cầu bay tới 1 địa điểm. nonce đổi mỗi lần bấm để bấm lại cùng 1 chỗ vẫn chạy
  const [focusTarget, setFocusTarget] = useState<{
    lat: number;
    lng: number;
    nonce: number;
  } | null>(null);

  const handleFocusPlace = useCallback((place: Place) => {
    setFocusTarget({ lat: place.lat, lng: place.lng, nonce: Date.now() });
  }, []);
  const handleAddPlace = useCallback(
    (data: Omit<Place, "id">) => {
      addLocation(data);
    },
    [addLocation],
  );
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

    // if (remainingPoints === 0) {
    //   hidePointPopup();
    // }

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

  const pick = usePick();

  // Phe đang chờ nhập thông tin (null = đang ở bước chọn phe)
  const [pendingSide, setPendingSide] = useState<AircraftSide | null>(null);

  // Menu chốt điểm bị đóng từ nơi khác (pick = null) thì quay về bước chọn phe
  useEffect(() => {
    if (!pick) setPendingSide(null);
  }, [pick]);

  const closePick = () => {
    setPick(null);
    setPendingSide(null);
  };

  // Bấm "Thêm" trong form: tạo máy bay mới, điểm đầu chính là điểm vừa chốt
  const handleCreateAircraft = (details: AircraftDetails) => {
    if (!pick || !pendingSide) return;

    const aircraft = createAircraft(
      aircrafts,
      pendingSide,
      {
        lng: pick.lng,
        lat: pick.lat,
        appearanceTime: details.appearanceTime,
      },
      details,
    );

    if (!aircraft) {
      window.alert("Đã đủ số lượng top máy bay của phe này (99).");
      return;
    }

    addAircraft(aircraft);
    setSelectedAircraftId(aircraft.id); // các click tiếp theo thêm waypoint cho top này
    closePick();
  };
  const [onOpenSetting, setOpenSetting] = useState<boolean>(false);
  function handleOpenSetting() {
    setOpenSetting(true);
  }
  return (
    <div className="map-container flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      {/* ================= THANH TỌA ĐỘ ================= */}
      <MeasurementBar onOpenSettings={handleOpenSetting} />
      {/* ================= VÙNG BẢN ĐỒ ================= */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* ================= MAP ================= */}
        <div className="absolute inset-0 z-0">
          <MapView
            gridLabels={gridLabels}
            aircrafts={aircrafts}
            places={locations}
            focusTarget={focusTarget}
            onOpenGridContextMenu={handleOpenGridContextMenu}
          />
        </div>

        {/* ================= CHỌN MÁY BAY ================= */}
        <div
          className="
          absolute right-4 top-3 z-[1000]
          flex items-center gap-2
          rounded-xl border border-slate-200
          bg-white/95 p-2.5 shadow-lg shadow-slate-900/5
          backdrop-blur-sm
          transition-all duration-300
        "
        >
          <span className="whitespace-nowrap text-sm font-semibold text-slate-600">
            Máy bay:
          </span>

          <select
            value={selectedAircraftId ?? ""}
            onChange={(event) => handleSelectAircraft(event.target.value)}
            disabled={aircrafts.length === 0}
            className="
            max-w-[180px] cursor-pointer
            rounded-lg border border-slate-200
            bg-white px-3 py-2
            text-sm font-medium text-slate-700
            outline-none transition
            hover:border-blue-300
            focus:border-blue-500 focus:ring-2 focus:ring-blue-100
            disabled:cursor-not-allowed disabled:bg-slate-100
            disabled:text-slate-400
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
              className="
              h-3 w-3 shrink-0 rounded-full
              ring-2 ring-white shadow-sm
            "
              style={{
                backgroundColor:
                  aircrafts.find(
                    (aircraft) => aircraft.id === selectedAircraftId,
                  )?.color ?? "#999",
              }}
            />
          )}
        </div>

        {/* ================= NÚT ĐỊA ĐIỂM ================= */}
        <button
          type="button"
          onClick={() => setIsPlacePanelOpen((prev) => !prev)}
          className="
          absolute right-4 top-[68px] z-[1000]
          flex items-center gap-2
          rounded-xl border border-slate-200
          bg-white/95 px-4 py-2.5
          text-sm font-semibold text-slate-700
          shadow-lg shadow-slate-900/5
          backdrop-blur-sm
          transition-all duration-200
          hover:border-blue-200 hover:bg-blue-50
          hover:text-blue-600
          active:scale-[0.98]
        "
        >
          <span>📍</span>
          <span>Địa điểm</span>
          <span
            className={`
            text-xs transition-transform duration-200
            ${isPlacePanelOpen ? "rotate-180" : ""}
          `}
          >
            ▾
          </span>
        </button>

        {/* ================= PANEL ĐỊA ĐIỂM ================= */}
        <div className="absolute right-4 top-[116px] z-[1000] flex flex-col items-end gap-2">
          {isPlacePanelOpen && (
            <div
              className="
              max-h-[60vh] overflow-y-auto
              rounded-xl border border-slate-200
              bg-white shadow-xl shadow-slate-900/10
              animate-in fade-in slide-in-from-top-2
              duration-200
            "
            >
              <LocationPanel
                locations={locations}
                onAdd={handleAddPlace}
                onRemove={removeLocation}
                onFocus={handleFocusPlace}
              />
            </div>
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
            absolute -right-10 top-3
            flex h-9 w-9 items-center justify-center
            rounded-r-xl border border-l-0 border-slate-200
            bg-white text-slate-600
            shadow-lg shadow-slate-900/5
            transition-all duration-200
            hover:bg-red-50 hover:text-red-600
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
          absolute left-3 top-3 z-[1000]
          flex items-center gap-2
          rounded-xl border border-slate-200
          bg-white/95 px-4 py-2.5
          text-sm font-semibold text-slate-700
          shadow-lg shadow-slate-900/5
          backdrop-blur-sm
          transition-all duration-300
          hover:border-blue-200 hover:bg-blue-50
          hover:text-blue-600
          active:scale-[0.98]
          ${
            isPanelOpen
              ? "pointer-events-none -translate-x-4 opacity-0"
              : "translate-x-0 opacity-100"
          }
        `}
          title="Mở bảng điều khiển"
        >
          <span className="text-lg">☰</span>
          <span>Bảng điều khiển</span>
        </button>
      </div>

      {/* ================= CONTEXT MENU ================= */}
      {contextMenu && (
        <div
          className="
          fixed z-[999999]
          min-w-[180px]
          overflow-hidden rounded-xl
          border border-slate-200
          bg-white p-1.5
          shadow-2xl shadow-slate-900/15
          animate-in fade-in zoom-in-95
          duration-150
        "
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            className="
            border-b border-slate-100
            px-3 py-2.5
            text-sm font-semibold text-slate-800
          "
          >
            <span className="text-slate-400">Tọa độ: </span>
            <span className="text-blue-600">
              {contextMenu.cell.row}
              {contextMenu.cell.col}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              console.log("Selected cell:", contextMenu.cell);
              setContextMenu(null);
            }}
            className="
            block w-full rounded-lg px-3 py-2.5
            text-left text-sm font-medium text-slate-700
            transition-colors
            hover:bg-blue-50 hover:text-blue-600
          "
          >
            <span className="mr-2">▦</span>
            Chọn ô này
          </button>

          <button
            type="button"
            onClick={() => setContextMenu(null)}
            className="
            block w-full rounded-lg px-3 py-2.5
            text-left text-sm text-slate-500
            transition-colors hover:bg-slate-100
          "
          >
            Đóng
          </button>
        </div>
      )}

      {/* ================= MENU CHỐT ĐIỂM ĐO ================= */}
      {pick && (
        <>
          {/* Lớp nền bắt click bên ngoài để đóng menu */}
          <div
            className="fixed inset-0 z-[999998] bg-transparent"
            onClick={closePick}
            onContextMenu={(event) => {
              event.preventDefault();
              closePick();
            }}
          />

          <div
            className="
            fixed z-[999999]
            w-[240px] max-w-[calc(100vw-16px)]
            overflow-y-auto
            rounded-xl border border-slate-200
            bg-white p-2
            shadow-2xl shadow-slate-900/15
            animate-in fade-in zoom-in-95
            duration-150
          "
            style={{
              left: Math.max(
                8,
                Math.min(pick.clientX, window.innerWidth - 248),
              ),
              top: Math.max(
                8,
                Math.min(
                  pick.clientY,
                  window.innerHeight - (pendingSide ? 450 : 190),
                ),
              ),
              maxHeight: "calc(100dvh - 16px)",
            }}
          >
            {/* Thông tin đo */}
            <div className="border-b border-slate-100 px-3 pb-2.5 pt-1 text-xs leading-6 text-slate-500">
              <div className="flex items-center justify-between">
                <span>Phương vị</span>
                <span className="font-bold text-orange-600">
                  {pick.mil} ({pick.bearingDeg.toFixed(1)}°)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Cự ly</span>
                <span className="font-bold text-slate-800">
                  {pick.distanceKm.toFixed(2)} km
                </span>
              </div>
            </div>

            {pendingSide ? (
              /* Bước 2: nhập thông tin máy bay */
              <NewAircraftForm
                side={pendingSide}
                onSubmit={handleCreateAircraft}
                onBack={() => setPendingSide(null)}
              />
            ) : (
              /* Bước 1: chọn phe */
              <>
                <button
                  type="button"
                  onClick={() => setPendingSide("friendly")}
                  className="
                  mt-1 flex w-full items-center gap-2
                  rounded-lg px-3 py-2.5
                  text-left text-sm font-medium text-slate-700
                  transition-colors
                  hover:bg-blue-50
                "
                  style={
                    {
                      "--friendly-color": SIDE_CONFIG.friendly.color,
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: SIDE_CONFIG.friendly.color,
                    }}
                  />
                  Thêm top máy bay ta
                </button>

                <button
                  type="button"
                  onClick={() => setPendingSide("enemy")}
                  className="
                  mt-1 flex w-full items-center gap-2
                  rounded-lg px-3 py-2.5
                  text-left text-sm font-medium text-slate-700
                  transition-colors
                  hover:bg-red-50
                "
                  style={
                    {
                      "--enemy-color": SIDE_CONFIG.enemy.color,
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: SIDE_CONFIG.enemy.color,
                    }}
                  />
                  Thêm top máy bay địch
                </button>

                <button
                  type="button"
                  onClick={closePick}
                  className="
                  mt-1 block w-full rounded-lg
                  px-3 py-2.5 text-left text-sm
                  text-slate-500 transition-colors
                  hover:bg-slate-100
                "
                >
                  Hủy
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
