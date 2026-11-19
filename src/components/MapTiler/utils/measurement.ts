type Position = [number, number];

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Tính cự ly theo công thức Haversine
export function getDistanceKm(start: Position, end: Position): number {
  const [lng1, lat1] = start;
  const [lng2, lat2] = end;

  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLng / 2) ** 2;

  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Tính bearing: 0° Bắc, tăng theo chiều kim đồng hồ
export function getBearing(start: Position, end: Position): number {
  const [lng1, lat1] = start.map((v) => v * DEG_TO_RAD);
  const [lng2, lat2] = end.map((v) => v * DEG_TO_RAD);

  const dLng = lng2 - lng1;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
}

// Đổi bearing sang thang mil 6000
// 0-00 Nam, 15-00 Đông, 30-00 Bắc, 45-00 Tây
export function bearingToMil(bearing: number): number {
  // 6000 đơn vị / 360 độ = 16.6667 đơn vị mỗi độ
  return ((180 - bearing + 360) % 360) * (6000 / 360);
}

export function formatMil(mil: number): string {
  const value = Math.round(mil) % 6000;

  const major = Math.floor(value / 100);
  const minor = value % 100;

  return `${major}-${String(minor).padStart(2, "0")}`;
}
