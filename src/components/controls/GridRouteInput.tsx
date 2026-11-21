import { useState } from "react";

import type { GridFeature } from "../../features/grid/grid.types";
import { getGridCenter } from "../../features/grid/grid.geometry";
import { AirCraft } from "../MapTiler/types/map.types";
import { useAirCraftContext } from "../../context/MakerContext";

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
    <div className="flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3">
        <p className="mt-1 text-xs text-slate-500">
          Nhập tọa độ và nhấn Enter để thêm.
        </p>
      </div>

      {/* Input */}
      <div className="relative">
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
            w-full resize-none rounded-lg
            border border-slate-200
            bg-slate-50 px-3 py-3
            font-mono text-sm text-slate-800
            placeholder:font-sans placeholder:text-slate-400
            outline-none transition-all duration-200
            focus:border-blue-400
            focus:bg-white
            focus:ring-2 focus:ring-blue-100
          "
        />
      </div>

      {/* Footer Input */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Enter để thêm tọa độ</span>
      </div>

      {/* Lịch sử tọa độ */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-slate-100 pt-3">
        {/* Header lịch sử */}
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Lịch sử tọa độ
            </span>

            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
              {history.length}
            </span>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center">
            <p className="text-xs text-slate-400">
              Chưa có tọa độ nào được nhập
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {/* Tìm Tốp */}
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
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
                className="
                  w-full rounded-lg border border-slate-200
                  bg-slate-50 py-2 pl-9 pr-3
                  text-xs text-slate-700
                  outline-none transition
                  placeholder:text-slate-400
                  focus:border-blue-400 focus:bg-white
                  focus:ring-2 focus:ring-blue-100
                "
              />
            </div>

            {/* Danh sách Tốp - scroll riêng */}
            <div className="max-h-[125px] shrink-0 overflow-y-auto overscroll-contain pr-1">
              {filteredTopIds.length === 0 ? (
                <div className="rounded-lg bg-slate-50 px-3 py-4 text-center">
                  <p className="text-xs text-slate-400">
                    Không tìm thấy Tốp {searchTop}
                  </p>
                </div>
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
                        className={`
                          flex min-w-0 items-center justify-between
                          rounded-lg border px-2.5 py-2
                          transition-all duration-150
                          ${
                            isSelected
                              ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50"
                          }
                        `}
                      >
                        <span className="truncate text-xs font-semibold">
                          Tốp {aircraftId}
                        </span>

                        <span
                          className={`
                            ml-1 shrink-0 rounded-full px-1.5 py-0.5
                            text-[10px] font-bold
                            ${
                              isSelected
                                ? "bg-blue-100 text-blue-600"
                                : "bg-slate-100 text-slate-500"
                            }
                          `}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lịch sử Tốp được chọn */}
            <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
              {/* Header Tốp đang chọn */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[10px] font-bold text-blue-700">
                    {activeTop}
                  </span>

                  <span className="text-xs font-semibold text-slate-700">
                    Tốp {activeTop}
                  </span>
                </div>

                <span className="text-[10px] text-slate-400">
                  {selectedHistory.length} tọa độ
                </span>
              </div>

              {/* Danh sách tọa độ - scroll riêng */}
              <div className="h-[180px] max-h-[180px] shrink-0 overflow-y-auto overscroll-contain p-2">
                <div className="flex flex-col gap-1.5">
                  {selectedHistory.reverse().map((item, index) => (
                    <div
                      key={item.id}
                      className="
                        group flex items-center gap-2
                        rounded-lg border border-slate-100
                        bg-slate-50 px-2.5 py-2
                        transition
                        hover:border-blue-200 hover:bg-blue-50/50
                      "
                    >
                      {/* Số thứ tự */}
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-semibold text-slate-400">
                        {selectedHistory.length - index}
                      </span>

                      {/* Nội dung tọa độ */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs font-semibold tracking-wide text-slate-700">
                          {item.value}
                        </p>
                      </div>

                      {/* Undo */}
                      <button
                        type="button"
                        disabled={!canUndo(item)}
                        onClick={() => handleUndo(item)}
                        title={
                          canUndo(item)
                            ? "Hoàn tác tọa độ"
                            : "Hãy hoàn tác tọa độ phía sau trước"
                        }
                        className="
                          flex h-7 w-7 shrink-0 items-center justify-center
                          rounded-md text-slate-400 transition
                          hover:bg-red-100 hover:text-red-600
                          disabled:cursor-not-allowed disabled:opacity-25
                        "
                      >
                        <span className="text-lg leading-none">×</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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
