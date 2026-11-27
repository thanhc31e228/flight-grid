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
  SIDE_CONFIG,
  type AircraftSide,
} from "../components/controls/factory/aircraft.factory";
import NewAircraftForm from "../components/controls/NewAircraftForm";
import { Place } from "../features/places/place.types";
import SettingsPage from "../components/settings/SettingsPage";
import { usePlaceContext } from "../context/PlaceContext";
import LayerToggleMenu, {
  LayerVisibility,
} from "../components/map/MapLayersMenu";
import AircraftInfoPanel from "../components/controls/AircraftInfoPanel";
import { calculateSpeed } from "../utils/calFunc";
import PlaceInfoPanel from "../components/controls/PlaceInfoPanel";
export default function MapTiler() {
  const {
    aircrafts,
    selectedAircraftId,
    setSelectedAircraftId,
    undoPoint,
    updateSpeed,
    aircraftSelected,
  } = useAirCraftContext();
  // Máy bay đang được chọn
  // Danh sách tọa độ mặc định
  // Danh sách địa điểm
  const { places, placeSelected } = usePlaceContext();

  // Đóng/mở panel địa điểm

  // Yêu cầu bay tới 1 địa điểm. nonce đổi mỗi lần bấm để bấm lại cùng 1 chỗ vẫn chạy
  const [focusTarget, setFocusTarget] = useState<{
    lat: number;
    lng: number;
    nonce: number;
  } | null>(null);

  const handleFocusPlace = useCallback((place: Place) => {
    setFocusTarget({ lat: place.lat, lng: place.lng, nonce: Date.now() });
  }, []);
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
      setSelectedAircraftId(null);
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
  // Undo waypoint của máy bay đang chọn
  const handleUndo = useCallback(() => {
    if (!selectedAircraftId || !aircraftSelected) return 0;

    const points = aircraftSelected.points;

    // Sau khi xóa điểm cuối:
    // -1 cũ sẽ trở thành điểm cuối mới
    // -2 cũ sẽ trở thành điểm gần cuối mới
    const previousPoint = points.at(-3);
    const currentPoint = points.at(-2);
    //tính lại tốc độ mới
    const newSpeed =
      previousPoint && currentPoint
        ? calculateSpeed(previousPoint, currentPoint)
        : 0;
    // Xóa waypoint hiện tại
    const remainingPoints = undoPoint(selectedAircraftId);
    aircraftSelected.speed = newSpeed;
    updateSpeed(aircraftSelected.id, newSpeed);
    return remainingPoints;
  }, [selectedAircraftId, aircraftSelected, undoPoint, updateSpeed]);

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenSetting = () => {
    setContextMenu(null);
    setPendingSide(null);
    setPick(null);
    setIsSettingsOpen(true);
  };

  const handleBackFromSettings = () => {
    setIsSettingsOpen(false);
  };
  const [layers, setLayers] = useState<LayerVisibility>({
    labels: true,
    places: true,
    bearingRings: false,
  });
  // ===== Đặt 2 hằng số này phía trên component (ngoài hàm) =====

  // Bề mặt chung cho mọi khối nổi trên bản đồ: bo góc, viền, đổ bóng đồng nhất
  const SURFACE =
    "pointer-events-auto rounded-xl border border-slate-200 bg-white/95 shadow-lg shadow-slate-900/5 backdrop-blur-sm";

  // Chiều rộng panel trái (dùng chung cho vỏ ngoài và nội dung bên trong)
  const PANEL_WIDTH = "w-[300px] max-w-[85vw]";

  // ===== Thay toàn bộ phần return cũ bằng đoạn này =====

  return (
    <div className="map-container flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      {/* ================= THANH TỌA ĐỘ (hàng riêng, không đè lên bản đồ) ================= */}
      <MeasurementBar onOpenSettings={handleOpenSetting} />

      {/* ================= VÙNG BẢN ĐỒ ================= */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* ---------- Lớp 1: bản đồ (nền) ---------- */}
        <div className="absolute inset-0 z-0">
          <MapView
            gridLabels={gridLabels}
            aircrafts={aircrafts}
            places={places}
            focusTarget={focusTarget}
            onOpenGridContextMenu={handleOpenGridContextMenu}
          />
        </div>

        {/* ---------- Lớp 2: toàn bộ UI nổi ----------
          Dùng flex thay cho absolute từng khối → các khối tự xếp cạnh nhau,
          không thể chồng lên nhau. Lớp này không bắt chuột, chỉ từng khối con mới bắt. */}
        <div className="pointer-events-none absolute inset-0 z-[1000] flex p-3">
          {/* ===== CỘT TRÁI: panel điều khiển (đẩy phần còn lại sang phải khi mở) ===== */}
          <aside
            aria-hidden={!isPanelOpen}
            className={`
            shrink-0 overflow-hidden
            transition-[width,margin,visibility] duration-300 ease-in-out
            ${isPanelOpen ? `mr-3 ${PANEL_WIDTH}` : "invisible mr-0 w-0"}
          `}
          >
            <div
              className={`${SURFACE} flex h-full flex-col overflow-hidden ${PANEL_WIDTH}`}
            >
              {/* Tiêu đề + nút đóng nằm trong panel, không thò ra ngoài */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <span className="text-sm font-semibold text-slate-700">
                  Bảng điều khiển
                </span>
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  title="Ẩn bảng điều khiển"
                  className="
                  flex h-7 w-7 items-center justify-center rounded-lg
                  text-slate-500 transition-colors
                  hover:bg-red-50 hover:text-red-600
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200
                "
                >
                  ✕
                </button>
              </div>

              {/* Nội dung panel cuộn riêng khi dài */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <MapControlPanel gridIndex={gridIndex} />
              </div>
            </div>
          </aside>

          {/* ===== KHU GIỮA: chia 2 hàng (trên / dưới) ===== */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            {/* ---- Hàng trên: nút mở panel (trái) | chọn tốp (phải) ---- */}
            <div className="flex shrink-0 items-start justify-between gap-3">
              {/* Chỉ hiện khi panel đang đóng → không bao giờ trùng với panel */}
              {!isPanelOpen ? (
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(true)}
                  title="Mở bảng điều khiển"
                  className={`
                  ${SURFACE}
                  flex items-center gap-2 px-4 py-2.5
                  text-sm font-semibold text-slate-700
                  transition-colors
                  hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200
                  active:scale-[0.98]
                `}
                >
                  <span className="text-lg leading-none">☰</span>
                  <span>Bảng điều khiển</span>
                </button>
              ) : (
                <span />
              )}

              {/* Chọn tốp máy bay */}
              <div className={`${SURFACE} flex min-w-0 items-center gap-2 p-2`}>
                <span className="whitespace-nowrap pl-1 text-sm font-semibold text-slate-600">
                  Tốp
                </span>

                <select
                  value={selectedAircraftId ?? ""}
                  onChange={(event) => handleSelectAircraft(event.target.value)}
                  disabled={aircrafts.length === 0}
                  className="
                  min-w-0 max-w-[160px] cursor-pointer truncate
                  rounded-lg border border-slate-200 bg-white
                  px-3 py-1.5 text-sm font-medium text-slate-700
                  outline-none transition
                  hover:border-blue-300
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                  disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400
                "
                >
                  {aircrafts.length === 0 ? (
                    <option value="">Chưa có tốp nào</option>
                  ) : (
                    aircrafts.map((aircraft) => (
                      <option key={aircraft.id} value={aircraft.id}>
                        {aircraft.id}
                      </option>
                    ))
                  )}
                </select>

                {selectedAircraftId && (
                  <span
                    className="mr-1 h-3 w-3 shrink-0 rounded-full shadow-sm ring-2 ring-white"
                    style={{
                      backgroundColor:
                        aircrafts.find(
                          (aircraft) => aircraft.id === selectedAircraftId,
                        )?.color ?? "#999",
                    }}
                  />
                )}
              </div>
            </div>

            {/* ---- Hàng dưới: menu lớp (trái) | các panel thông tin (phải) ----
              min-h-0 + max-h-full: cột phải không bao giờ cao quá vùng còn lại,
              nên không thể leo lên đè hàng trên. */}
            <div className="flex min-h-0 flex-1 items-end justify-between gap-3">
              {/* Menu lớp bản đồ: nằm trong luồng flex nên tự dịch theo panel trái,
                không cần hard-code left-[316px] nữa */}
              <div className="pointer-events-auto relative shrink-0">
                <LayerToggleMenu value={layers} onChange={setLayers} />
              </div>

              <div className="pointer-events-none flex max-h-full min-h-0 min-w-0 max-w-full flex-col items-end gap-3 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:max-w-full">
                <PlaceInfoPanel place={placeSelected} />
                <AircraftInfoPanel aircraft={aircraftSelected} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MENU CHUỘT PHẢI Ở Ô LƯỚI ================= */}
      {contextMenu && !isSettingsOpen && (
        <>
          {/* Lớp nền trong suốt: bấm ra ngoài thì đóng menu */}
          <div
            className="fixed inset-0 z-[999998]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu(null);
            }}
          />

          <div
            className="
            fixed z-[999999] w-[200px]
            overflow-hidden rounded-xl border border-slate-200
            bg-white p-1.5 shadow-2xl shadow-slate-900/15
            animate-in fade-in zoom-in-95 duration-150
          "
            style={{
              // Kẹp vào trong màn hình để menu không bị cắt mép
              left: Math.max(
                8,
                Math.min(contextMenu.x, window.innerWidth - 208),
              ),
              top: Math.max(
                8,
                Math.min(contextMenu.y, window.innerHeight - 150),
              ),
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold">
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
              mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2
              text-left text-sm font-medium text-slate-700
              transition-colors hover:bg-blue-50 hover:text-blue-600
            "
            >
              <span>▦</span>
              Chọn ô này
            </button>

            <button
              type="button"
              onClick={() => setContextMenu(null)}
              className="
              flex w-full items-center rounded-lg px-3 py-2
              text-left text-sm text-slate-500
              transition-colors hover:bg-slate-100
            "
            >
              Đóng
            </button>
          </div>
        </>
      )}

      {/* ================= MENU CHỐT ĐIỂM ĐO ================= */}
      {pick && !isSettingsOpen && (
        <>
          {/* Lớp nền bắt click bên ngoài để đóng menu */}
          <div
            className="fixed inset-0 z-[999998]"
            onClick={closePick}
            onContextMenu={(event) => {
              event.preventDefault();
              closePick();
            }}
          />

          <div
            className="
            fixed z-[999999] w-[240px] max-w-[calc(100vw-16px)]
            overflow-y-auto rounded-xl border border-slate-200
            bg-white p-2 shadow-2xl shadow-slate-900/15
            animate-in fade-in zoom-in-95 duration-150
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
            <div className="space-y-0.5 border-b border-slate-100 px-3 pb-2.5 pt-1 text-xs leading-6 text-slate-500">
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
                // onSubmit={handleCreateAircraft}
                onBack={closePick}
              />
            ) : (
              /* Bước 1: chọn phe */
              <div className="mt-1 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setPendingSide("friendly")}
                  className="
                  flex w-full items-center gap-2 rounded-lg px-3 py-2.5
                  text-left text-sm font-medium text-slate-700
                  transition-colors hover:bg-blue-50
                "
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: SIDE_CONFIG.friendly.color }}
                  />
                  Thêm tốp máy bay ta
                </button>

                <button
                  type="button"
                  onClick={() => setPendingSide("enemy")}
                  className="
                  flex w-full items-center gap-2 rounded-lg px-3 py-2.5
                  text-left text-sm font-medium text-slate-700
                  transition-colors hover:bg-red-50
                "
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: SIDE_CONFIG.enemy.color }}
                  />
                  Thêm tốp máy bay địch
                </button>

                <button
                  type="button"
                  onClick={closePick}
                  className="
                  w-full rounded-lg px-3 py-2.5 text-left text-sm
                  text-slate-500 transition-colors hover:bg-slate-100
                "
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================= TRANG CÀI ĐẶT (phủ toàn màn hình) ================= */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-[2000]">
          <SettingsPage
            onFocusLocation={handleFocusPlace}
            labelInput={labelInput}
            onLabelInputChange={setLabelInput}
            onSaveLabels={handleSaveLabels}
            onBack={handleBackFromSettings}
          />
        </div>
      )}
    </div>
  );
}
