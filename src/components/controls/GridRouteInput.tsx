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
    // Tách danh sách ID, hỗ trợ xuống dòng, dấu phẩy
    const ids = value
      .split(/[\n,;]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length < 2) {
      alert("Cần nhập ít nhất 2 ID ô Grid cấp 3");
      return;
    }

    // Tìm các Grid theo key của Map
    const cells: GridFeature[] = [];
    const missingIds: string[] = [];

    for (const id of ids) {
      const cell = gridIndex.get(id);

      if (!cell) {
        missingIds.push(id);
        continue;
      }

      cells.push(cell);
    }

    // Báo các ID không tồn tại
    if (missingIds.length > 0) {
      alert(`Không tìm thấy các ô Grid:\n${missingIds.join("\n")}`);
      return;
    }

    // Lấy tâm từng ô Grid
    const routePoints = cells.map((cell) => getGridCenter(cell));

    // Tạo tuyến theo thứ tự nhập
    onCreateRoute(routePoints);
  };

  return (
    <div className="grid-route-input">
      <strong>NỐI Ô GRID CẤP 3</strong>

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={`Nhập ID Grid:
                      61 112
                      61 125
                      61 225`}
      />

      <button onClick={handleSubmit}>NỐI CÁC TỌA ĐỘ THÀNH TUYẾN</button>
    </div>
  );
}
