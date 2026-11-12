import type {
  Coordinate,
  FlightPoint,
  GridCell
} from "../types/map";

const CONFIG = {
  rows: 6,
  cols: 7,
  subRows: 5,
  subCols: 5,

  // Tọa độ mẫu, cần thay bằng tọa độ thực tế
  minLat: 20,
  maxLat: 21,
  minLng: 105,
  maxLng: 106
};

const POINT_POSITIONS = [
  { x: 0.5, y: 0.5 },
  { x: 0.5, y: 0.2 },
  { x: 0.8, y: 0.5 },
  { x: 0.5, y: 0.8 },
  { x: 0.2, y: 0.5 }
];

export interface GridData {
  bigCells: GridCell[];
  smallCells: GridCell[];
  points: Record<string, FlightPoint>;
  center: Coordinate;
}

export const generateGrid = (): GridData => {
  const {
    rows,
    cols,
    subRows,
    subCols,
    minLat,
    maxLat,
    minLng,
    maxLng
  } = CONFIG;

  const latStep = (maxLat - minLat) / rows;
  const lngStep = (maxLng - minLng) / cols;

  const bigCells: GridCell[] = [];
  const smallCells: GridCell[] = [];

  const points: Record<string, FlightPoint> = {};

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const groupNumber = row * cols + col + 1;

      const groupId = `G${String(groupNumber).padStart(2, "0")}`;

      const north = maxLat - row * latStep;
      const south = north - latStep;

      const west = minLng + col * lngStep;
      const east = west + lngStep;

      bigCells.push({
        id: groupId,
        bounds: [
          [south, west],
          [north, east]
        ]
      });

      const subLatStep = latStep / subRows;
      const subLngStep = lngStep / subCols;

      for (let subRow = 0; subRow < subRows; subRow++) {
        for (let subCol = 0; subCol < subCols; subCol++) {
          const cellNumber = subRow * subCols + subCol + 1;

          const cellId = `C${String(cellNumber).padStart(2, "0")}`;

          const cellNorth = north - subRow * subLatStep;
          const cellSouth = cellNorth - subLatStep;

          const cellWest = west + subCol * subLngStep;
          const cellEast = cellWest + subLngStep;

          const cellKey = `${groupId}-${cellId}`;

          smallCells.push({
            id: cellKey,
            bounds: [
              [cellSouth, cellWest],
              [cellNorth, cellEast]
            ]
          });

          POINT_POSITIONS.forEach((position, index) => {
            const pointId =
              `${cellKey}-P${String(index + 1).padStart(2, "0")}`;

            const coordinate: Coordinate = {
              lat:
                cellSouth +
                (cellNorth - cellSouth) * position.y,

              lng:
                cellWest +
                (cellEast - cellWest) * position.x
            };

            points[pointId] = {
              id: pointId,
              groupId,
              cellId,
              pointIndex: index + 1,
              coordinate
            };
          });
        }
      }
    }
  }

  return {
    bigCells,
    smallCells,
    points,
    center: {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2
    }
  };
};