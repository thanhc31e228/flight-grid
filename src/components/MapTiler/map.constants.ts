// Tọa độ sân bay kép
export const CENTER: [number, number] = [106.263569, 21.394697];

// Kích thước toàn bộ khu vực lưới
export const GRID_WIDTH = 0.06;
export const GRID_HEIGHT = 0.04;

// Số cột và số hàng
export const COLS = 10;
export const ROWS = 10;

// Tổng số ô: 7 x 6 = 42

// MapTiler API Key
export const API_KEY = process.env.REACT_APP_MAPTILER_API_KEY;
export const SOURCE = {
  grid: "grid-source",
  gridLabel: "grid-label-source",
  route: "route-source",
  aircraft: "aircraft-source",
  points: "points-source",
  places: "places-source",
} as const;
