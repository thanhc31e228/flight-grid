import type {
  Map as MapLibreMap,
  MapMouseEvent,
  GeoJSONSource,
} from "maplibre-gl";

import {
  createLevel2,
  createLevel3,
  emptyGrid,
} from "../../features/grid/grid.factory";

import type {
  GridFeature,
  GridCollection,
} from "../../features/grid/grid.types";

import type { Point } from "../../features/route/route.types";

import { showPointPopup } from "./MapPopup";

const GRID_LAYERS = ["grid-level-3-fill", "grid-level-2-fill", "grid-fill"];

export function registerMapEvents(
  map: MapLibreMap,
  onAddPoint: (point: Point) => number,
) {
  let activeParentId: string | null = null;
  let activeChildId: string | null = null;

  const setSourceData = (id: string, data: GridCollection) => {
    const source = map.getSource(id) as GeoJSONSource | undefined;

    source?.setData(data);
  };

  const clearLevel3 = () => {
    activeChildId = null;

    setSourceData("grid-level-3", emptyGrid());
  };

  const clearLevel2 = () => {
    activeParentId = null;
    activeChildId = null;

    setSourceData("grid-level-2", emptyGrid());
    setSourceData("grid-level-3", emptyGrid());
  };

  const showLevel2 = (parent: GridFeature) => {
    const parentId = parent.properties.id;

    if (activeParentId === parentId) return;

    activeParentId = parentId;
    activeChildId = null;

    setSourceData("grid-level-2", createLevel2(parent));

    clearLevel3();
  };

  const showLevel3 = (child: GridFeature) => {
    const childId = child.properties.id;

    if (activeChildId === childId) return;

    activeChildId = childId;

    setSourceData("grid-level-3", createLevel3(child));
  };

  // ======================================
  // HOVER
  // ======================================

  const handleMouseMove = (event: MapMouseEvent) => {
    const features = map.queryRenderedFeatures(event.point, {
      layers: GRID_LAYERS,
    });

    const level2 = features.find((f) => f.layer.id === "grid-level-2-fill");

    if (level2) {
      const child = level2 as unknown as GridFeature;
      const parentId = child.properties.parentId ?? null;

      if (activeParentId !== parentId) {
        activeParentId = parentId;
        clearLevel3();
      }

      showLevel3(child);

      map.getCanvas().style.cursor = "pointer";
      return;
    }

    const level1 = features.find((f) => f.layer.id === "grid-fill");

    if (level1) {
      showLevel2(level1 as unknown as GridFeature);

      map.getCanvas().style.cursor = "pointer";
      return;
    }

    clearLevel2();

    map.getCanvas().style.cursor = "crosshair";
  };

  // ======================================
  // CLICK
  // ======================================

  const handleClick = (event: MapMouseEvent) => {
    const point: Point = {
      lng: event.lngLat.lng,
      lat: event.lngLat.lat,
    };

    const pointNumber = onAddPoint(point);

    // Chỉ hiển thị popup tại điểm đầu tiên
    if (pointNumber === 1) {
      showPointPopup(
        {
          lng: point.lng,
          lat: point.lat,
          index: pointNumber,
          topNumber: 1,
          groupNumber: 1,
        },
        map,
      );
    }
  };

  map.on("mousemove", handleMouseMove);
  map.on("click", handleClick);

  // Cleanup event listeners.
  return () => {
    map.off("mousemove", handleMouseMove);
    map.off("click", handleClick);
  };
}
