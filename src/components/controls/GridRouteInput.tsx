import { useState } from "react";

import type { GridFeature } from "../../features/grid/grid.types";
import { getGridCenter } from "../../features/grid/grid.geometry";
import { AirCraft, Point } from "../MapTiler/types/map.types";
import { useAirCraftContext } from "../../context/MakerContext";

type Props = {
  gridIndex: Map<string, GridFeature>;
};

// Dòng hiển thị trong lịch sử (suy ra từ points của Tốp)
const formatPointLine = (aircraft: AirCraft, point: Point, index: number) => {
  const parts: (string | undefined)[] =
    index === 0
      ? [
          aircraft.id,
          point.coordinateGridId,
          aircraft.aircraftCode,
          aircraft.altitude,
          point.appearanceTime,
        ]
      : [aircraft.id, point.coordinateGridId, point.appearanceTime];

  return parts.filter(Boolean).join(" ");
};

export default function GridRouteInput({ gridIndex }: Props) {
  const [value, setValue] = useState("");

  // Tìm Tốp
  const [searchTop, setSearchTop] = useState("");

  const {
    aircrafts,
    selectedAircraftId,
    setSelectedAircraftId,
    addAircraft,
    addPoint,
    getLastPoint,
    undoPoint,
  } = useAirCraftContext();

  const handleSubmit = () => {
    const lastLine = value.trim().split(/\r?\n/).pop()?.trim();

    if (!lastLine || lastLine.length <= 3) return;

    if (![8, 10, 17].includes(lastLine.length)) {
      alert(`Giá trị ${lastLine} không phù hợp!`);
      return;
    }

    const idTop = lastLine.slice(0, 3);
    const idGrid = lastLine.slice(3, 8).trim();

    const cell = gridIndex.get(idGrid);

    if (!cell) {
      alert(`Không tìm thấy ô Grid: ${idGrid}`);
      return;
    }

    // Chưa có Tốp thì chỉ được nhập dòng đầy đủ (17 ký tự)
    if (lastLine.length !== 17 && !aircrafts.some((a) => a.id === idTop)) {
      alert(`Tốp ${idTop} chưa xuất hiện, hãy nhập đầy đủ thông tin lần đầu!`);
      return;
    }

    const point = getGridCenter(cell);

    // Lưu id ô grid cho mọi điểm để hiển thị lại lịch sử từ context
    point.coordinateGridId = idGrid;

    // Máy bay xuất hiện lần đầu
    if (lastLine.length === 17) {
      const aircraftCode = lastLine.slice(-9, -5);
      const altitude = lastLine.slice(-5, -2);
      const appearanceTime = lastLine.slice(-2);

      point.appearanceTime = appearanceTime;

      const airCraft: AirCraft = {
        id: idTop,
        name: idTop,
        points: [point],
        aircraftCode,
        altitude,
        appearanceTime,
      };

      const result = addAircraft(airCraft);
      if (!result) {
        alert("ID đã tồn tại!");
        return;
      }
    }
    // Có thời gian
    else if (lastLine.length === 10) {
      point.appearanceTime = lastLine.slice(-2);
      addPoint(idTop, point);
      // setFireZoneLayer
    }
    // Không có thời gian -> lấy thời gian của điểm trước
    else {
      point.appearanceTime = getLastPoint(idTop)?.appearanceTime;
      addPoint(idTop, point);
    }

    // Tự động chọn Tốp vừa nhập
    setSelectedAircraftId(idTop);

    // Xóa input sau khi thêm thành công
    setValue("");
  };

  // Chỉ Tốp đã có tọa độ, sắp xếp theo số
  const sortedAircrafts = aircrafts
    .filter((aircraft) => aircraft.points.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const totalPoints = sortedAircrafts.reduce(
    (sum, aircraft) => sum + aircraft.points.length,
    0,
  );

  // Lọc Tốp theo ô tìm kiếm
  const filteredAircrafts = sortedAircrafts.filter((aircraft) =>
    aircraft.id.toLowerCase().includes(searchTop.trim().toLowerCase()),
  );

  // Tốp đang được hiển thị (mặc định là Tốp cuối cùng nếu chưa chọn)
  const activeAircraft =
    sortedAircrafts.find((aircraft) => aircraft.id === selectedAircraftId) ??
    sortedAircrafts[sortedAircrafts.length - 1] ??
    null;

  // Lịch sử của Tốp đang chọn, mới nhất ở trên
  const selectedHistory = activeAircraft
    ? activeAircraft.points
        .map((point, index) => ({
          index,
          value: formatPointLine(activeAircraft, point, index),
        }))
        .reverse()
    : [];

  // Hoàn tác: chỉ cho phép điểm cuối cùng của Tốp
  // const handleUndo = (aircraft: AirCraft) => {
  //   // Điểm cuối cùng -> xóa luôn Tốp khỏi bản đồ
  //   if (aircraft.points.length <= 1) {
  //     return;
  //   }

  //   undoPoint(aircraft.id);
  // };

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-gray-200 pt-4">
      {/* Nhập tọa độ */}
      <label
        htmlFor="coordinates-ids"
        className="text-sm font-medium text-gray-900"
      >
        Nhập tọa độ
      </label>

      <textarea
        id="coordinates-ids"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Ví dụ: 401 80 441 0122 005 04"
        rows={2}
        className="
          mt-2 w-full resize-none rounded-md border border-gray-300
          bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none
          transition-colors placeholder:font-sans placeholder:text-gray-400
          focus:border-gray-900 focus:ring-1 focus:ring-gray-900
        "
      />

      <p className="mt-1.5 text-xs text-gray-500">Enter để thêm</p>

      {/* Lịch sử tọa độ */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Lịch sử tọa độ</h3>
          <span className="text-xs tabular-nums text-gray-500">
            {totalPoints}
          </span>
        </div>

        {!activeAircraft ? (
          <div className="rounded-md border border-dashed border-gray-300 px-3 py-6 text-center">
            <p className="text-sm text-gray-500">
              Chưa có tọa độ nào được nhập
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {/* Tìm Tốp */}
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 4 4" />
                </svg>
              </span>

              <input
                type="text"
                value={searchTop}
                onChange={(event) => setSearchTop(event.target.value)}
                placeholder="Tìm Tốp..."
                aria-label="Tìm Tốp"
                className="
                  h-9 w-full rounded-md border border-gray-300 bg-white
                  pl-9 pr-3 text-sm text-gray-900 outline-none
                  transition-colors placeholder:text-gray-400
                  focus:border-gray-900 focus:ring-1 focus:ring-gray-900
                "
              />
            </div>

            {/* Danh sách Tốp - scroll riêng */}
            <div className="max-h-[125px] shrink-0 overflow-y-auto overscroll-contain pr-1">
              {filteredAircrafts.length === 0 ? (
                <p className="py-3 text-center text-sm text-gray-500">
                  Không tìm thấy Tốp {searchTop}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {filteredAircrafts.map((aircraft) => {
                    const isSelected = activeAircraft.id === aircraft.id;

                    return (
                      <button
                        key={aircraft.id}
                        type="button"
                        onClick={() => setSelectedAircraftId(aircraft.id)}
                        aria-pressed={isSelected}
                        className={`
                          flex h-9 min-w-0 items-center justify-between
                          rounded-md border px-2.5 text-sm transition-colors
                          focus:outline-none focus-visible:ring-2
                          focus-visible:ring-gray-900
                          ${
                            isSelected
                              ? "border-gray-900 bg-gray-100 font-medium text-gray-900"
                              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                          }
                        `}
                      >
                        <span className="truncate">Tốp {aircraft.id}</span>
                        <span className="ml-2 shrink-0 text-xs tabular-nums text-gray-500">
                          {aircraft.points.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lịch sử Tốp được chọn */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-gray-200">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-sm font-medium text-gray-900">
                  Tốp {activeAircraft.id}
                </span>
                <span className="text-xs tabular-nums text-gray-500">
                  {activeAircraft.points.length} tọa độ
                </span>
              </div>

              {/* Danh sách tọa độ - scroll riêng */}
              <ul className="min-h-[120px] flex-1 divide-y divide-gray-100 overflow-y-auto overscroll-contain">
                {selectedHistory.map((item) => {
                  // Chỉ điểm cuối cùng mới được hoàn tác
                  const canUndo =
                    item.index === activeAircraft.points.length - 1;

                  return (
                    <li
                      key={`${activeAircraft.id}-${item.index}`}
                      className="flex items-center gap-3 px-3 py-1.5 hover:bg-gray-50"
                    >
                      <span className="w-6 shrink-0 text-xs tabular-nums text-gray-400">
                        {item.index + 1}
                      </span>

                      <p className="min-w-0 flex-1 truncate font-mono text-xs text-gray-900">
                        {item.value}
                      </p>

                      <button
                        type="button"
                        disabled={!canUndo}
                        onClick={() => undoPoint(activeAircraft.id)}
                        aria-label="Hoàn tác tọa độ"
                        title={
                          canUndo
                            ? "Hoàn tác tọa độ"
                            : "Hãy hoàn tác tọa độ phía sau trước"
                        }
                        className="
                          flex h-7 w-7 shrink-0 items-center justify-center
                          rounded-md text-gray-400 transition-colors
                          hover:bg-gray-100 hover:text-gray-900
                          focus:outline-none focus-visible:ring-2
                          focus-visible:ring-gray-900
                          disabled:cursor-not-allowed disabled:opacity-30
                          disabled:hover:bg-transparent
                          disabled:hover:text-gray-400
                        "
                      >
                        <span
                          aria-hidden="true"
                          className="text-lg leading-none"
                        >
                          ×
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
