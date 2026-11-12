
import { createGrid, createLevel2, createLevel3 } from "./grid.factory";

import type { GridFeature } from "./grid.types";

export function createLevel3Index(): Map<string, GridFeature> {
  const index = new Map<string, GridFeature>();

  const level1 = createGrid();

  for (const parent of level1.features) {
    const level2 = createLevel2(parent);

    for (const child of level2.features) {
      const level3 = createLevel3(child);

      for (const feature of level3.features) {
        index.set(feature.properties.id, feature);
      }
    }
  }

  return index;
}

export function findGridCellsByIds(
  ids: string[],
  index: Map<string, GridFeature>
): GridFeature[] {
  return ids.map((id) => {
    const cell = index.get(id);

    if (!cell) {
      throw new Error(`Không tìm thấy ô: ${id}`);
    }

    return cell;
  });
}
