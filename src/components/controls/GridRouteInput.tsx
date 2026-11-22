import { useState } from "react";

import type { GridFeature } from "../../features/grid/grid.types";
import { getGridCenter } from "../../features/grid/grid.geometry";
import { AirCraft } from "../MapTiler/types/map.types";
import { useAirCraftContext } from "../../context/MakerContext";
import { useMap } from "../../hooks/useMap";
import { useMapContext } from "../../context/MapContext";
import { formatGridId } from "../../utils/formatGridId";

type Props = {
  gridIndex: Map<string, GridFeature>;
};

type CoordinateHistory = {
  id: number;
  aircraftId: string;
  value: string;
};

export default function GridRouteInput({ gridIndex }: Props) {
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<CoordinateHistory[]>([]);
  const [nextId, setNextId] = useState(0);
  const { gridSelected } = useMapContext();
  // Tốp đang chọn
  const [selectedTop, setSelectedTop] = useState<string | null>(null);

  // Tìm Tốp
  const [searchTop, setSearchTop] = useState("");

  const {
    addAircraft,
    addPoint,
    setSelectedAircraftId,
    getLastPoint,
    undoPoint,
  } = useAirCraftContext();

  // Thêm tọa độ vào lịch sử nhập
  const addToHistory = (aircraftId: string, coordinate: string) => {
    setHistory((prev) => [
      ...prev,
      {
        id: nextId,
        aircraftId,
        value: coordinate,
      },
    ]);

    setNextId((prev) => prev + 1);
  };

  // Hoàn tác tọa độ
  const handleUndo = (item: CoordinateHistory) => {
    const lastEntry = [...history]
      .reverse()
      .find((entry) => entry.aircraftId === item.aircraftId);

    // Chỉ cho phép hoàn tác waypoint cuối cùng của Tốp
    if (!lastEntry || lastEntry.id !== item.id) {
      return;
    }

    undoPoint(item.aircraftId);

    setHistory((prev) => prev.filter((entry) => entry.id !== item.id));
  };

  // Kiểm tra tọa độ có thể hoàn tác hay không
  const canUndo = (item: CoordinateHistory) => {
    const lastEntry = [...history]
      .reverse()
      .find((entry) => entry.aircraftId === item.aircraftId);

    return lastEntry?.id === item.id;
  };

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

    const point = getGridCenter(cell);

    // Máy bay xuất hiện lần đầu
    if (lastLine.length === 17) {
      const aircraftCode = lastLine.slice(-9, -5);
      const altitude = lastLine.slice(-5, -2);
      const appearanceTime = lastLine.slice(-2);

      point.appearanceTime = appearanceTime;
      point.coordinateGridId = idGrid;

      const airCraft: AirCraft = {
        id: idTop,
        name: idTop,
        color: generateRandomHexColor(),
        points: [point],
        aircraftCode,
        altitude,
        appearanceTime,
      };

      addAircraft(airCraft);
    }

    // Có thời gian
    else if (lastLine.length === 10) {
      const appearanceTime = lastLine.slice(-2);

      point.appearanceTime = appearanceTime;
      addPoint(idTop, point);
    }

    // Không có thời gian
    else if (lastLine.length === 8) {
      const lastPoint = getLastPoint(idTop);

      if (lastPoint) {
        point.appearanceTime = lastPoint.appearanceTime;
      }

      addPoint(idTop, point);
    }

    setSelectedAircraftId(idTop);

    // Lưu lịch sử
    addToHistory(idTop, lastLine);

    // Tự động chọn Tốp vừa nhập
    setSelectedTop(idTop);

    // Xóa input sau khi thêm thành công
    setValue("");
  };

  // Gom lịch sử theo Tốp
  const groupedHistory = history.reduce<Record<string, CoordinateHistory[]>>(
    (groups, item) => {
      if (!groups[item.aircraftId]) {
        groups[item.aircraftId] = [];
      }

      groups[item.aircraftId].push(item);

      return groups;
    },
    {},
  );

  // Sắp xếp Tốp
  const sortedTopIds = Object.keys(groupedHistory).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  // Lọc Tốp theo ô tìm kiếm
  const filteredTopIds = sortedTopIds.filter((id) =>
    id.toLowerCase().includes(searchTop.trim().toLowerCase()),
  );

  // Tốp đang được hiển thị
  const activeTop =
    selectedTop && groupedHistory[selectedTop]
      ? selectedTop
      : (history[history.length - 1]?.aircraftId ?? null);

  // Lịch sử của Tốp đang chọn
  const selectedHistory = activeTop
    ? (groupedHistory[activeTop]?.slice().sort((a, b) => a.id - b.id) ?? [])
    : [];

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

      <p className="mt-1.5 text-xs text-gray-500">
        Enter để thêm, Shift + Enter để xuống dòng.
      </p>

      {/* Lịch sử tọa độ */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Lịch sử tọa độ</h3>
          <span className="text-xs tabular-nums text-gray-500">
            {history.length}
          </span>
        </div>

        {history.length === 0 ? (
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
              {filteredTopIds.length === 0 ? (
                <p className="py-3 text-center text-sm text-gray-500">
                  Không tìm thấy Tốp {searchTop}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {filteredTopIds.map((aircraftId) => {
                    const isSelected = activeTop === aircraftId;
                    const count = groupedHistory[aircraftId].length;

                    return (
                      <button
                        key={aircraftId}
                        type="button"
                        onClick={() => setSelectedTop(aircraftId)}
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
                        <span className="truncate">Tốp {aircraftId}</span>
                        <span className="ml-2 shrink-0 text-xs tabular-nums text-gray-500">
                          {count}
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
                  Tốp {activeTop}
                </span>
                <span className="text-xs tabular-nums text-gray-500">
                  {selectedHistory.length} tọa độ
                </span>
              </div>

              {/* Danh sách tọa độ - scroll riêng */}
              <ul className="min-h-[120px] flex-1 divide-y divide-gray-100 overflow-y-auto overscroll-contain">
                {[...selectedHistory].reverse().map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-1.5 hover:bg-gray-50"
                  >
                    <span className="w-6 shrink-0 text-xs tabular-nums text-gray-400">
                      {selectedHistory.length - index}
                    </span>

                    <p className="min-w-0 flex-1 truncate font-mono text-xs text-gray-900">
                      {item.value}
                    </p>

                    <button
                      type="button"
                      disabled={!canUndo(item)}
                      onClick={() => handleUndo(item)}
                      aria-label="Hoàn tác tọa độ"
                      title={
                        canUndo(item)
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
                      <span aria-hidden="true" className="text-lg leading-none">
                        ×
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

let colorIndex = 0;

const generateRandomHexColor = (): string => {
  const goldenAngle = 137.508;
  const hue = (colorIndex++ * goldenAngle) % 360;

  return hslToHex(hue, 85, 32);
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);

  const f = (n: number) =>
    Math.round(
      255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))),
    )
      .toString(16)
      .padStart(2, "0");

  return `#${f(0)}${f(8)}${f(4)}`;
};
