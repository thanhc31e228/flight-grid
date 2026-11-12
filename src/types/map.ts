export interface Coordinate {
  lat: number;
  lng: number;
}

export interface FlightPoint {
  id: string;
  groupId: string;
  cellId: string;
  pointIndex: number;
  coordinate: Coordinate;
}

export interface GridCell {
  id: string;
  bounds: [
    [number, number],
    [number, number]
  ];
}