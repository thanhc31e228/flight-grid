
export const MAP_CONFIG = {
  CENTER: [106.263569, 21.394697] as [number, number],
  INITIAL_ZOOM: 12,

  AIRPORT_RADIUS_KM: 1.5,

  STYLE_URL: "https://api.maptiler.com/maps/streets-v4/style.json",

  ROUTE: {
    COLOR: "#ff2222",
    WIDTH: 2,
  },
};

// cấu hình lưới bản đồ
export const MAP_GRID_CONFIG = {
  COLS: 7,
  ROWS: 6,
  // mỗi ô lưới cấp 1 có kích thước 20km x 20km
  CELL_SIZE: 20000, // 20km

  LEVEL_2_ROWS: 5,
  LEVEL_2_COLS: 5,

  ROUTE_RADIUS: 0.25,
  ROUTE_STEPS: 12,
};
