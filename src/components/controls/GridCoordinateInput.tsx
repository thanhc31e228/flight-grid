import { useEffect, useState } from "react";

import type { GridCell } from "../MapTiler/types/map.types";

type Props = {
  cell: GridCell;
  onSave: (cell: GridCell) => void;
  onCancel: () => void;
};

export default function GridCoordinateInput({ cell, onSave, onCancel }: Props) {
  const [row, setRow] = useState(String(cell.row));
  const [col, setCol] = useState(String(cell.col));

  useEffect(() => {
    setRow(String(cell.row));
    setCol(String(cell.col));
  }, [cell]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newRow = Number(row);
    const newCol = Number(col);

    if (
      !Number.isInteger(newRow) ||
      !Number.isInteger(newCol) ||
      newRow < 1 ||
      newCol < 1
    ) {
      return;
    }

    onSave({
      row: newRow,
      col: newCol,
    });
  };

  return (
    <form className="coordinate-dialog" onSubmit={handleSubmit}>
      <h3>Đổi tọa độ ô vuông</h3>

      <p>
        Tọa độ hiện tại:
        {cell.row} - {cell.col}
      </p>

      <label>Row mới</label>
      <input
        type="number"
        min="1"
        value={row}
        onChange={(e) => setRow(e.target.value)}
      />

      <label>Column mới</label>
      <input
        type="number"
        min="1"
        value={col}
        onChange={(e) => setCol(e.target.value)}
      />

      <div className="coordinate-actions">
        <button type="submit">Lưu tọa độ</button>

        <button type="button" onClick={onCancel}>
          Hủy
        </button>
      </div>
    </form>
  );
}
