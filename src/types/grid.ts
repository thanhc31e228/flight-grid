import type {
  Feature,
  FeatureCollection,
  Polygon,
} from "geojson";

export type GridLevel = 1 | 2 | 3;

export interface GridProperties {
  id: string;
  level: GridLevel;
  parentId?: string;

  row?: number;
  col?: number;

  widthMeters: number;
  heightMeters: number;

  // Tọa độ mét tương đối so với CENTER
  xMin: number;
  yMin: number;
}

export type GridFeature = Feature<
  Polygon,
  GridProperties
>;

export type GridCollection = FeatureCollection<
  Polygon,
  GridProperties
>;

export interface GridConfig {
  center: [number, number];
  rows: number;
  cols: number;

  cellSize: number;
  level2CellSize: number;
}

// ========================================
// CONFIG
// ========================================

export const GRID_CONFIG: GridConfig = {
  center: [106.7, 10.8], // Thay bằng CENTER của mày

  rows: 6,
  cols: 7,

  cellSize: 2000,

  level2CellSize: 500,
};

// ========================================
// GEO CONVERSION
// ========================================

function getMetersPerDegree(centerLat: number) {
  return {
    lat: 111320,
    lng:
      111320 *
      Math.cos((centerLat * Math.PI) / 180),
  };
}

// Chuyển tọa độ mét tương đối sang tọa độ địa lý
function metersToLngLat(
  x: number,
  y: number,
  center: [number, number]
): [number, number] {
  const [centerLng, centerLat] = center;

  const meters = getMetersPerDegree(centerLat);

  return [
    centerLng + x / meters.lng,
    centerLat + y / meters.lat,
  ];
}

// ========================================
// CREATE RECTANGLE
// ========================================

function createRectangle(
  xMin: number,
  yMin: number,
  width: number,
  height: number,
  config: GridConfig,
  properties: GridProperties
): GridFeature {
  const xMax = xMin + width;
  const yMax = yMin + height;

  const coordinates = [
    metersToLngLat(xMin, yMin, config.center),
    metersToLngLat(xMax, yMin, config.center),
    metersToLngLat(xMax, yMax, config.center),
    metersToLngLat(xMin, yMax, config.center),
    metersToLngLat(xMin, yMin, config.center),
  ];

  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}

// ========================================
// LEVEL 1: 42 MAIN CELLS
// ========================================

export function createGrid(
  config: GridConfig = GRID_CONFIG
): GridCollection {
  const { rows, cols, cellSize, center } = config;

  const totalWidth = cols * cellSize;
  const totalHeight = rows * cellSize;

  const startX = -totalWidth / 2;
  const startY = -totalHeight / 2;

  const features: GridFeature[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const xMin = startX + col * cellSize;
      const yMin = startY + row * cellSize;

      const id = `R${row + 1}-C${col + 1}`;

      features.push(
        createRectangle(
          xMin,
          yMin,
          cellSize,
          cellSize,
          config,
          {
            id,
            level: 1,
            row: row + 1,
            col: col + 1,
            widthMeters: cellSize,
            heightMeters: cellSize,
            xMin,
            yMin,
          }
        )
      );
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

// ========================================
// LEVEL 2: DIVIDE LEVEL 1 INTO SMALL CELLS
// ========================================

export function createLevel2(
  parent: GridFeature,
  config: GridConfig = GRID_CONFIG
): GridCollection {
  const {
    xMin,
    yMin,
    widthMeters,
    heightMeters,
    id,
  } = parent.properties;

  const features: GridFeature[] = [];

  const cellSize = config.level2CellSize;

  if (cellSize <= 0) {
    throw new Error("level2CellSize must be greater than 0");
  }

  let row = 0;

  for (
    let y = yMin;
    y < yMin + heightMeters;
    y += cellSize
  ) {
    let col = 0;

    const currentHeight = Math.min(
      cellSize,
      yMin + heightMeters - y
    );

    for (
      let x = xMin;
      x < xMin + widthMeters;
      x += cellSize
    ) {
      const currentWidth = Math.min(
        cellSize,
        xMin + widthMeters - x
      );

      const childId = `${id}-L2-R${row + 1}-C${col + 1}`;

      features.push(
        createRectangle(
          x,
          y,
          currentWidth,
          currentHeight,
          config,
          {
            id: childId,
            level: 2,
            parentId: id,
            row: row + 1,
            col: col + 1,
            widthMeters: currentWidth,
            heightMeters: currentHeight,
            xMin: x,
            yMin: y,
          }
        )
      );

      col++;
    }

    row++;
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

// ========================================
// LEVEL 3: 4 CORNERS + 1 CENTER
// ========================================

export function createLevel3(
  parent: GridFeature,
  config: GridConfig = GRID_CONFIG
): GridCollection {
  const {
    xMin,
    yMin,
    widthMeters,
    heightMeters,
    id,
  } = parent.properties;

  // Kích thước ô cấp 3 bằng 1/3 cạnh ngắn hơn
  const size = Math.min(
    widthMeters,
    heightMeters
  ) / 3;

  // Tính vị trí 4 góc và chính giữa
  const positions = [
    {
      name: "NW",
      x: xMin,
      y: yMin + heightMeters - size,
    },
    {
      name: "NE",
      x: xMin + widthMeters - size,
      y: yMin + heightMeters - size,
    },
    {
      name: "SW",
      x: xMin,
      y: yMin,
    },
    {
      name: "SE",
      x: xMin + widthMeters - size,
      y: yMin,
    },
    {
      name: "CENTER",
      x: xMin + (widthMeters - size) / 2,
      y: yMin + (heightMeters - size) / 2,
    },
  ];

  const features = positions.map((pos) =>
    createRectangle(
      pos.x,
      pos.y,
      size,
      size,
      config,
      {
        id: `${id}-L3-${pos.name}`,
        level: 3,
        parentId: id,
        widthMeters: size,
        heightMeters: size,
        xMin: pos.x,
        yMin: pos.y,
      }
    )
  );

  return {
    type: "FeatureCollection",
    features,
  };
}

// ========================================
// EMPTY COLLECTION
// ========================================

export function emptyGrid(): GridCollection {
  return {
    type: "FeatureCollection",
    features: [],
  };
}