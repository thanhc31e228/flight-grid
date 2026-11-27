import centroid from "@turf/centroid";
import type { Map as MapLibreMap } from "maplibre-gl";

import { createGrid, emptyGrid } from "../../../features/grid/grid.factory";
import {
  SOURCE,
  LineStyle,
  toFeatureCollection,
  getGeoJSONSource,
} from "./index";

function createGridLabelPoints(grid: ReturnType<typeof createGrid>) {
  return toFeatureCollection(
    grid.features.map((feature) => {
      const point = centroid(feature);
      point.properties = { ...(feature.properties ?? {}) };
      return point;
    }),
  );
}

function addGridFillAndOutline(
  map: MapLibreMap,
  id: string,
  source: string,
  line: LineStyle,
) {
  // Fill gần như trong suốt, chỉ để bắt sự kiện chuột trên ô lưới
  map.addLayer({
    id: `${id}-fill`,
    type: "fill",
    source,
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": 0.001,
    },
  });

  map.addLayer({
    id: `${id}-outline`,
    type: "line",
    source,
    paint: {
      "line-color": line.color,
      "line-width": line.width,
      "line-opacity": line.opacity,
    },
  });
}

function addGridLevel(map: MapLibreMap, id: string, line: LineStyle) {
  map.addSource(id, {
    type: "geojson",
    data: emptyGrid(),
  });

  addGridFillAndOutline(map, id, id, line);
}

export function addGridLayers(map: MapLibreMap) {
  const grid = createGrid();

  map.addSource(SOURCE.grid, { type: "geojson", data: grid });
  map.addSource(SOURCE.gridLabel, {
    type: "geojson",
    data: createGridLabelPoints(grid),
  });

  addGridFillAndOutline(map, "grid", SOURCE.grid, {
    color: "#64748b",
    width: 1,
    opacity: 0.45,
  });

  map.addLayer({
    id: "grid-label",
    type: "symbol",
    source: SOURCE.gridLabel,
    layout: {
      "text-field": [
        "coalesce",
        ["get", "label"],
        ["to-string", ["*", ["get", "row"], ["get", "col"]]],
      ],
      "text-size": 16,
      "text-font": ["Open Sans Bold"],
      "text-anchor": "center",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#020617",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
      "text-opacity": 1,
    },
  });

  addGridLevel(map, "grid-level-2", {
    color: "#94a3b8",
    width: 0.8,
    opacity: 0.5,
  });

  addGridLevel(map, "grid-level-3", {
    color: "#64748b",
    width: 0.7,
    opacity: 0.55,
  });
}

export function updateGridLabels(map: MapLibreMap, labels: string[]) {
  const source = getGeoJSONSource(map, SOURCE.grid);
  if (!source) return;

  const gridData = createGrid(labels);

  // Sắp xếp theo hàng rồi theo cột để gán nhãn theo thứ tự
  const sortedFeatures = [...gridData.features].sort(
    (a, b) =>
      Number(a.properties?.row) - Number(b.properties?.row) ||
      Number(a.properties?.col) - Number(b.properties?.col),
  );

  sortedFeatures.forEach((feature, index) => {
    const properties = { ...(feature.properties ?? {}) };

    if (index < labels.length) {
      properties.label = labels[index];
    } else {
      delete properties.label;
    }

    feature.properties = properties;
  });

  source.setData(gridData);

  getGeoJSONSource(map, SOURCE.gridLabel)?.setData(
    createGridLabelPoints(gridData),
  );
}
