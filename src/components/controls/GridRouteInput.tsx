import { useState } from "react";

import type { GridFeature } from "../../features/grid/grid.types";
import { getGridCenter } from "../../features/grid/grid.geometry";
import { AirCraft } from "../MapTiler/types/map.types";
import { useAirCraftContext } from "../../context/MakerContext";

type Props = {
  gridIndex: Map<string, GridFeature>;
};

export default function GridRouteInput({ gridIndex }: Props) {
  const [value, setValue] = useState("");

  const { addAircraft, addPoint, setSelectedAircraftId, getLastPoint } =
    useAirCraftContext();

  const handleSubmit = () => {
    const lastLine = value.trim().split(/\r?\n/).pop()?.trim();
    console.log("last line", lastLine);
    if (!lastLine || lastLine.length <= 3) return;

    const idTop = lastLine.slice(0, 3);
    const idGrid = lastLine.slice(3, 8).trim();

    const cell = gridIndex.get(idGrid);
    if (!cell) {
      alert(`Không tìm thấy ô Grid: ${idGrid}`);
      return;
    }
    const point = getGridCenter(cell);
    // top lần đầu xuất hiện
    if (lastLine.length === 17) {
      // 401 80 441 0122 005 04 , co toa do, do cao va thoi gian
      const aircraftCode = lastLine.slice(-9, -5); // "0122"
      const altitude = lastLine.slice(-5, -2); // "005"
      const appearanceTime = lastLine.slice(-2); // "04"
      point.appearanceTime = appearanceTime;
      const airCraft: AirCraft = {
        id: idTop,
        name: idTop,
        color: generateRandomHexColor(),
        points: [point],
        aircraftCode: aircraftCode,
        altitude: altitude,
        appearanceTime: point.appearanceTime,
      };
      addAircraft(airCraft);
    } else if (lastLine.length === 10) {
      // 401 80 551 02 , co thoi gian
      const appearanceTime = lastLine.slice(-2);
      point.appearanceTime = appearanceTime;
      addPoint(idTop, point);
    } else if (lastLine.length === 8) {
      // vd 401 81 441 , chi co toa do k co thoi gian
      // neu k co thoi gian thi lay thoi gian o diem cuoi cung xuat hien
      const lastPoint = getLastPoint(idTop);
      if (lastPoint) {
        point.appearanceTime = lastPoint?.appearanceTime;
      }
      addPoint(idTop, point);
    } else {
      window.alert(`Giá trị ${lastLine} không phù hợp !`);
    }
    console.log("lenght", lastLine.length);
    console.log("id top", idTop);
    console.log("id grid", idGrid);

    setSelectedAircraftId(idTop);
  };

  return (
    <div className="grid-route-input">
      <strong>NỐI Ô GRID CẤP 3</strong>

      <textarea
        id="coordinates-ids"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            setTimeout(() => {
              handleSubmit();
            }, 0);
          }
        }}
        placeholder="Nhập tọa độ"
      />
    </div>
  );
}
const generateRandomHexColor = (): string => {
  return (
    "#" +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
  );
};
