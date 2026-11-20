export interface Place {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  side?: "left" | "right"; // bỏ trống = tự chọn theo vị trí so với CENTER
  offsetX?: number;
  offsetY?: number;
}
