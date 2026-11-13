import { useState } from "react";

import type { GridFeature } from "../../features/grid/grid.types";

import { getGridCenter } from "../../features/grid/grid.geometry";

type Props = {
  gridIndex: Map<string, GridFeature>;
  onCreateRoute: (points: { lng: number; lat: number }[]) => void;
};

export default function GridRouteInput({ gridIndex, onCreateRoute }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    console.log("value", value);
    const ids = value.split("\n");
    console.log("id", ids);
    console.log("gridindex", gridIndex);
    if (ids.length < 2) {
      alert("Cần nhập ít nhất 2 ID ô cấp 3");
      return;
    }

    const cells: GridFeature[] = [];

    for (const id of ids) {
      const cell = gridIndex.get(id);

      if (!cell) {
        alert(`Không tìm thấy ô: ${id}`);
        return;
      }

      cells.push(cell);
    }

    const routePoints = cells.map(getGridCenter);

    onCreateRoute(routePoints);
  };

  return (
    <div className="grid-route-input">
      <strong>NỐI Ô GRID CẤP 3</strong>

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={`Nhập ID từng ô:

R1-C1-L2-R1-C1-L3-NW
R1-C1-L2-R1-C1-L3-CENTER`}
      />

      <button onClick={handleSubmit}>NỐI CÁC Ô THÀNH TUYẾN</button>
    </div>
  );
}
