// Tọa độ của một điểm trên bản đồ
export type Point = {
  lng: number;
  lat: number;
};

// Thông tin của một ô lưới
export type GridCell = {
  row: number;
  col: number;
};
export type AirCraft = {
  id: string;
  name: string;
  color: string;
  points: Point[];
};
