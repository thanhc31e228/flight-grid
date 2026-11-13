type Props = {
  x: number;
  y: number;
  onChangeCoordinate: () => void;
  onChangeLabel: () => void;
  onDeleteLabel: () => void;
  onClose: () => void;
};

export default function GridContextMenu({
  x,
  y,
  onChangeCoordinate,
  onChangeLabel,
  onDeleteLabel,
  onClose,
}: Props) {
  return (
    <>
      <div
        className="context-menu-overlay"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      <div
        className="grid-context-menu"
        style={{
          left: x,
          top: y,
        }}
      >
        <button onClick={onChangeCoordinate}>
          <span>✏️</span>
          Đổi tọa độ
        </button>

        <button onClick={onChangeLabel}>
          <span>🏷️</span>
          Đổi label
        </button>

        <button onClick={onDeleteLabel}>
          <span>🗑️</span>
          Xóa label
        </button>
      </div>
    </>
  );
}
