import { Place } from "../../features/places/place.types";

// Tọa độ sân bay kép
export const CENTER: [number, number] = [106.263569, 21.394697];
// export const CENTER: [number, number] = [106.272851, 21.395142];

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
export const DEFAULT_PLACES: Place[] = [
  {
    id: "c31",
    name: "C31",
    phone: "846 632",
    lat: 21.39515,
    lng: 106.272843,
  },

  {
    id: "c32",
    name: "C32",
    phone: "123456",
    lat: 21.38627,
    lng: 106.248248,
  },
  {
    id: "c5",
    name: "C5",
    phone: "123456",
    lat: 21.393254,
    lng: 106.252048,
  },
  {
    id: "c4",
    name: "C4",
    phone: "123456",
    lat: 21.403599,
    lng: 106.271729,
  },
];
