export function getAircraftColor(id: string | number): string {
  const prefix = String(id).charAt(0);

  switch (prefix) {
    case "4":
      return "#2196F3"; // Xanh dương
    case "5":
      return "#F44336"; // Đỏ
    default:
      return "#808080"; // Màu mặc định
  }
}
