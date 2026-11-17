import { useState } from "react";

import type { GridFeature } from "../../features/grid/grid.types";

import { getGridCenter } from "../../features/grid/grid.geometry";
import { Point } from "../../features/route/route.types";
import { AirCraft } from "../MapTiler/types/map.types";
import { useAirCraftContext } from "../../context/MakerContext";

type Props = {
  gridIndex: Map<string, GridFeature>;
  onCreateRoute: (points: Point[]) => void;
};

export default function GridRouteInput({ gridIndex, onCreateRoute }: Props) {
  const [value, setValue] = useState("");
  const {
    addAircraft,
    addPoint,
    isExistsAir,
    selectedAircraftId,
    setSelectedAircraftId,
  } = useAirCraftContext();

  const handleSubmit = () => {
    // Tách danh sách ID, hỗ trợ xuống dòng, dấu phẩy
    const lastLine = value.trim().split(/\r?\n/).pop();
    if (!lastLine) {
      return;
    }
    const [idTop, idGrid] = [lastLine.slice(0, 3), lastLine.slice(3)];
    // Tìm các Grid theo key của Map để tạo điểm point
    const cells: GridFeature[] = [];
    const cell = gridIndex.get(idGrid);
    if (!cell) {
      alert(`Không tìm thấy ô Grid: ${idGrid}`);
      return;
    }
    cells.push(cell);
    // Lấy tâm từng ô Grid
    const point = getGridCenter(cell);
    //kiem tra xem air da ton tai hay chua, neu chua thi them moi,
    // neu co roi thi chi can them toa do moi vao air cu theo id
    if (!isExistsAir(idTop)) {
      console.log("create air");
      // tạo 1 aircraft mới nếu chưa có
      const airCraft: AirCraft = {
        id: idTop,
        name: "401",
        color: "red",
        points: [point],
      };
      const result = addAircraft(airCraft);
      if (result === 0) {
        window.alert("Thêm ari craft thất bại!");
      }
      setSelectedAircraftId(idTop);
    } else {
      console.log("add point to air");
      addPoint(idTop, point);
    }
    // Tạo tuyến theo thứ tự nhập
    onCreateRoute([point]);
    console.log("selectedAircraftId", selectedAircraftId);
  };

  return (
    <div className="grid-route-input">
      <strong>NỐI Ô GRID CẤP 3</strong>

      <textarea
        id="coordinates-ids"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            // Vẫn xuống dòng và đồng thời submit
            setTimeout(() => {
              handleSubmit();
            }, 0);
          }
        }}
        placeholder={`Nhập tọa độ`}
      />
    </div>
  );
}
