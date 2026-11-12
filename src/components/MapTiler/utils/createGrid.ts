import {
  CENTER,
  GRID_WIDTH,
  GRID_HEIGHT,
  COLS,
  ROWS,
} from "../map.constants";

// Tạo dữ liệu GeoJSON cho toàn bộ lưới
export function createGrid() {
  const [centerLng, centerLat] = CENTER;

  // Tọa độ góc Tây Nam của khu vực lưới
  const minLng = centerLng - GRID_WIDTH / 2;
  const minLat = centerLat - GRID_HEIGHT / 2;

  // Kích thước của mỗi ô
  const cellWidth = GRID_WIDTH / COLS;
  const cellHeight = GRID_HEIGHT / ROWS;

  const features = [];

  // Duyệt từng hàng
  for (let row = 0; row < ROWS; row++) {

    // Duyệt từng cột
    for (let col = 0; col < COLS; col++) {

      // Tính tọa độ 4 cạnh của ô
      const west = minLng + col * cellWidth;
      const east = west + cellWidth;

      const south = minLat + row * cellHeight;
      const north = south + cellHeight;

      // Tạo một ô hình chữ nhật
      features.push({
        type: "Feature",

        // Thông tin của ô
        properties: {
          id: `R${row + 1}-C${col + 1}`,
          row: row + 1,
          col: col + 1,
          west,
          east,
          south,
          north,
        },

        // Hình học của ô
        geometry: {
          type: "Polygon",
          coordinates: [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ]],
        },
      });
    }
  }

  // Trả về dữ liệu GeoJSON
  return {
    type: "FeatureCollection",
    features,
  };
}