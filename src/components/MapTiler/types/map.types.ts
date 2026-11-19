// Tọa độ của một điểm trên bản đồ
export type Point = {
  lng: number;
  lat: number;
  appearanceTime?: string; // Thời gian xuất hiện (phút)
};

// Thông tin của một ô lưới
export type GridCell = {
  row: number;
  col: number;
};
export type AirCraft = {
  id: string; //401
  name: string; //401
  color: string; // #23e3
  points: Point[];
  aircraftCode?: string; // vd: 0122
  altitude?: string; // Độ cao (mét) // vd 005
  appearanceTime?: string; // Thời gian xuất hiện (phút)
};
