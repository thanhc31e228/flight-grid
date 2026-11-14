import { MAP_GRID_CONFIG } from "../../config/map.config";

import type { GridCollection, GridFeature } from "./grid.types";

import { createRectangle } from "./grid.geometry";

const { ROWS, COLS, CELL_SIZE, LEVEL_2_ROWS, LEVEL_2_COLS } = MAP_GRID_CONFIG;

export const emptyGrid = (): GridCollection => ({
  type: "FeatureCollection",
  features: [],
});

// ========================================
// LEVEL 1 ô vuông lớn chứa 25 ô vuông nhỏ
// ========================================
export function createGrid(labels?: string[]): GridCollection {
  const totalWidth = COLS * CELL_SIZE;
  const totalHeight = ROWS * CELL_SIZE;

  // Dịch toàn bộ lưới sang trái 1 ô, nằm ở góc 4 ô 61,62,01,02
  const startX = -totalWidth / 2 - CELL_SIZE;
  const startY = -totalHeight / 2;

  const features: GridFeature[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const xMin = startX + col * CELL_SIZE;
      const yMin = startY + (ROWS - 1 - row) * CELL_SIZE;

      const index = row * COLS + col;
      const id = labels?.[index] ?? `R${row + 1}-C${col + 1}`;

      features.push(
        createRectangle(xMin, yMin, CELL_SIZE, CELL_SIZE, {
          id,
          level: 1,
          row: row + 1,
          col: col + 1,

          west: 0,
          east: 0,
          south: 0,
          north: 0,

          widthMeters: CELL_SIZE,
          heightMeters: CELL_SIZE,

          xMin,
          yMin,
        }),
      );
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

// ========================================
// LEVEL 2 ô vuông nhỏ bên trong ô lớn, mỗi ô lớn có 25 ô nhỏ
// ========================================

export function createLevel2(parent: GridFeature): GridCollection {
  const { xMin, yMin, widthMeters, heightMeters, id } = parent.properties;

  const cellWidth = widthMeters / LEVEL_2_COLS;
  const cellHeight = heightMeters / LEVEL_2_ROWS;

  const features: GridFeature[] = [];

  for (let row = 0; row < LEVEL_2_ROWS; row++) {
    for (let col = 0; col < LEVEL_2_COLS; col++) {
      const x = xMin + col * cellWidth;

      const y = yMin + (LEVEL_2_ROWS - 1 - row) * cellHeight;

      const childRow = row + 1;
      const childCol = col + 1;

      // id của ô con cấp 2, ví dụ: 61 12, ô vuông 61 ô dòng 1 cột 2
      const childId = `${id} ${childRow}${childCol}`;
      // console.log("child id", childId);
      //child id 00 21
      features.push(
        createRectangle(x, y, cellWidth, cellHeight, {
          id: childId,
          level: 2,
          parentId: id,

          row: row + 1,
          col: col + 1,

          west: 0,
          east: 0,
          south: 0,
          north: 0,

          widthMeters: cellWidth,
          heightMeters: cellHeight,

          xMin: x,
          yMin: y,
        }),
      );
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

// ========================================
// LEVEL 3 ô vuông nhỏ bên trong ô nhỏ cấp 2, mỗi ô nhỏ cấp 2 có 5 ô nhỏ cấp 3
// ========================================

export function createLevel3(parent: GridFeature): GridCollection {
  const { xMin, yMin, widthMeters, heightMeters, id } = parent.properties;
  const size = Math.min(widthMeters, heightMeters) / 2;

  const positions = [
    {
      name: "1", // TOP LEFT
      x: xMin,
      y: yMin + heightMeters - size,
    },
    {
      name: "2", // TOP RIGHT
      x: xMin + widthMeters - size,
      y: yMin + heightMeters - size,
    },
    {
      name: "3", // BOTTOM RIGHT
      x: xMin + widthMeters - size,
      y: yMin,
    },
    {
      name: "4", // BOTTOM LEFT
      x: xMin,
      y: yMin,
    },
    {
      name: "5", // CENTER
      x: xMin + (widthMeters - size) / 2,
      y: yMin + (heightMeters - size) / 2,
    },
  ];

  return {
    type: "FeatureCollection",

    features: positions.map((pos) =>
      createRectangle(pos.x, pos.y, size, size, {
        id: `${id}${pos.name}`,
        level: 3,
        parentId: id,

        west: 0,
        east: 0,
        south: 0,
        north: 0,

        widthMeters: size,
        heightMeters: size,

        xMin: pos.x,
        yMin: pos.y,
      }),
    ),
  };
}
