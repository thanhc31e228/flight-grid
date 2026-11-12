import { Point } from "./types/map.types";

type Props = {
  points: Point[];
  onUndo: () => void;
  onClear: () => void;
};

export default function MapControls({
  points,
  onUndo,
  onClear,
}: Props) {
  return (
    <div
      style={{
        position: "absolute",
        top: 15,
        left: 15,
        zIndex: 10,
        background: "#fff",
        padding: 15,
        borderRadius: 8,
        boxShadow: "0 2px 8px #0003",
        minWidth: 190,
      }}
    >
      {/* Tiêu đề bảng điều khiển */}
      <div style={{ marginBottom: 12 }}>
        <strong>QUẢN LÝ TUYẾN ĐƯỜNG</strong>
      </div>

      {/* Tổng số điểm đã tạo */}
      <div style={{ marginBottom: 12 }}>
        Số điểm: <strong>{points.length}</strong>
      </div>

      {/* Nút hoàn tác và xóa */}
      <div>
        <button
          onClick={onUndo}
          disabled={points.length === 0}
          style={{
            padding: "7px 12px",
            marginRight: 6,
            cursor: "pointer",
          }}
        >
          Hoàn tác
        </button>

        <button
          onClick={onClear}
          disabled={points.length === 0}
          style={{
            padding: "7px 12px",
            cursor: "pointer",
          }}
        >
          Xóa tất cả
        </button>
      </div>

      {/* Danh sách tọa độ các điểm */}
      <div
        style={{
          marginTop: 12,
          maxHeight: 220,
          overflowY: "auto",
          fontSize: 12,
        }}
      >
        {points.map((point, index) => (
          <div
            key={index}
            style={{
              padding: "6px 0",
              borderTop: "1px solid #ddd",
            }}
          >
            <strong>P{index + 1}</strong>

            <br />

            Lng: {point.lng.toFixed(6)}

            <br />

            Lat: {point.lat.toFixed(6)}
          </div>
        ))}
      </div>
    </div>
  );
}