// Tọa độ của một điểm trên bản đồ
export type Point = {
  lng: number;
  lat: number;
};

// Thông tin của một ô lưới
export type GridCell = {
  id: string;
  row: number;
  col: number;
  west: number;
  east: number;
  south: number;
  north: number;
};