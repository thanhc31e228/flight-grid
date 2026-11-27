import { COLS, ROWS } from "../components/MapTiler/map.constants";

export const MAP_CONFIG = {
  CENTER_GRID: [106.263569, 21.394697] as [number, number],
  BASE_COORDINATES: [106.272851, 21.395142] as [number, number], // c31
  // CENTER_MIL: [106.272851, 21.395142] as [number, number], // trung tâm tọa độ vòng phương vị, cự ly

  INITIAL_ZOOM: 9,

  FIRE_ZONE_RADIUS_KM: 3, // vùng hỏa lực

  MAP_STYLES: {
    streets: "https://api.maptiler.com/maps/streets-v4/style.json",
    satellite: "https://api.maptiler.com/maps/satellite/style.json",
    hybrid: `https://api.maptiler.com/maps/hybrid/style.json`,
  },

  ROUTE: {
    COLOR: "#ff2222",
    WIDTH: 2,
  },
  DEFAULT_MAP_STYLE: "streets",
  STORAGE_KEY: "map-base-style",
  FIRE_RANGE_M: 3500,
};

// cấu hình lưới bản đồ
export const MAP_GRID_CONFIG = {
  COLS: COLS,
  ROWS: ROWS,
  // mỗi ô lưới cấp 1 có kích thước 20km x 20km
  CELL_SIZE: 20000, // 20km

  LEVEL_2_ROWS: 5,
  LEVEL_2_COLS: 5,

  ROUTE_RADIUS: 0.25,
  ROUTE_STEPS: 12,
};
// Cự ly bắn của pháo (m)
