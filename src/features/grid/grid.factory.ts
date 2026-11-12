
import { MAP_GRID_CONFIG } from "../../config/map.config";

import type {
  GridCollection,
  GridFeature,
} from "./grid.types";

import { createRectangle } from "./grid.geometry";

const {
  ROWS,
  COLS,
  CELL_SIZE,
  LEVEL_2_ROWS,
  LEVEL_2_COLS,
} = MAP_GRID_CONFIG;

export const emptyGrid = (): GridCollection => ({
  type: "FeatureCollection",
  features: [],
});

// ========================================
// LEVEL 1
// ========================================

export function createGrid(): GridCollection {
  const totalWidth = COLS * CELL_SIZE;
  const totalHeight = ROWS * CELL_SIZE;

  const startX = -totalWidth / 2;
  const startY = -totalHeight / 2;

  const features: GridFeature[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const xMin = startX + col * CELL_SIZE;

      const yMin =
        startY +
        (ROWS - 1 - row) * CELL_SIZE;

      const id = `R${row + 1}-C${col + 1}`;

      features.push(
        createRectangle(
          xMin,
          yMin,
          CELL_SIZE,
          CELL_SIZE,
          {
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
// LEVEL 2
// ========================================

export function createLevel2(
  parent: GridFeature
): GridCollection {
  const {
    xMin,
    yMin,
    widthMeters,
    heightMeters,
    id,
  } = parent.properties;

  const cellWidth = widthMeters / LEVEL_2_COLS;
  const cellHeight = heightMeters / LEVEL_2_ROWS;

  const features: GridFeature[] = [];

  for (let row = 0; row < LEVEL_2_ROWS; row++) {
    for (let col = 0; col < LEVEL_2_COLS; col++) {
      const x = xMin + col * cellWidth;
      const y = yMin + row * cellHeight;

      const childId =
        `${id}-L2-R${row + 1}-C${col + 1}`;

      features.push(
        createRectangle(
          x,
          y,
          cellWidth,
          cellHeight,
          {
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
// LEVEL 3
// ========================================

export function createLevel3(
  parent: GridFeature
): GridCollection {
  const {
    xMin,
    yMin,
    widthMeters,
    heightMeters,
    id,
  } = parent.properties;

  const size = Math.min(
    widthMeters,
    heightMeters
  ) / 2;

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

  return {
    type: "FeatureCollection",

    features: positions.map((pos) =>
      createRectangle(
        pos.x,
        pos.y,
        size,
        size,
        {
          id: `${id}-L3-${pos.name}`,
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
        }
      )
    ),
  };
}
