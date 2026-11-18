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

  const { addAircraft, addPoint, isExistsAir, setSelectedAircraftId } =
    useAirCraftContext();

  const handleSubmit = () => {
    const lastLine = value.trim().split(/\r?\n/).pop()?.trim();
    console.log("last line", lastLine);
    if (!lastLine || lastLine.length <= 3) return;

    const idTop = lastLine.slice(0, 3);
    const idGrid = lastLine.slice(3).trim();

    const cell = gridIndex.get(idGrid);

    if (!cell) {
      alert(`Không tìm thấy ô Grid: ${idGrid}`);
      return;
    }

    const point = getGridCenter(cell);
    point.appearanceTime = 9;
    const exists = isExistsAir(idTop);

    if (!exists) {
      const airCraft: AirCraft = {
        id: idTop,
        name: idTop,
        color: generateRandomHexColor(),
        points: [point],
        aircraftCode: "0122",
        altitude: "005",
        appearanceTime: point.appearanceTime,
      };

      addAircraft(airCraft);
    } else {
      addPoint(idTop, point);
    }

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
