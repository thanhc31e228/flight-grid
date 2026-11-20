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
    // Tìm phần tử cuối cùng của máy bay tương ứng
    const lastEntry = [...history]
      .reverse()
      .find((entry: CoordinateHistory) => entry.aircraftId === item.aircraftId);

    // Chỉ cho phép hoàn tác waypoint cuối cùng
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

    // Lưu chính xác chuỗi đã nhập
    addToHistory(idTop, lastLine);

    // Clear input sau khi thêm thành công
    setValue("");
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            ⌖
          </span>

          <h3 className="text-sm font-bold text-slate-800">NỐI Ô GRID CẤP 3</h3>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Nhập mã tọa độ và nhấn Enter để thêm vào tuyến đường.
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

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Enter để thêm tọa độ</span>

        <span className="text-[11px] text-slate-400">
          Shift + Enter để xuống dòng
        </span>
      </div>

      {/* Lịch sử tọa độ */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Lịch sử nhập
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
          /* Chỉ phần tử này được scroll */
          <div className="h-[220px] overflow-y-auto overscroll-contain pr-2">
            <div className="flex flex-col gap-1.5">
              {history
                .slice()
                .sort((a, b) => b.id - a.id)
                .map((item, index) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 hover:border-blue-200 hover:bg-blue-50/50"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-semibold text-slate-400">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-semibold tracking-wide text-slate-700">
                        {item.value}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Máy bay: {item.aircraftId}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!canUndo(item)}
                      onClick={() => handleUndo(item)}
                      title={
                        canUndo(item)
                          ? "Hoàn tác tọa độ"
                          : "Hãy hoàn tác tọa độ phía sau trước"
                      }
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      <span className="text-lg leading-none">×</span>
                    </button>
                  </div>
                ))}
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
