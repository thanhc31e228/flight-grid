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

    if (!lastLine || lastLine.length <= 3) return;

    const idTop = lastLine.slice(0, 3);
    const idGrid = lastLine.slice(3).trim();

    const cell = gridIndex.get(idGrid);

    if (!cell) {
      alert(`Không tìm thấy ô Grid: ${idGrid}`);
      return;
    }

    const point = getGridCenter(cell);

    const exists = isExistsAir(idTop);

    if (!exists) {
      const airCraft: AirCraft = {
        id: idTop,
        name: idTop,
        color: "red",
        points: [point],
      };

      addAircraft(airCraft);
    } else {
      addPoint(idTop, point);
    }

    // Luôn chọn đúng aircraft vừa thao tác
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
            event.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Nhập tọa độ"
      />
    </div>
  );
}
