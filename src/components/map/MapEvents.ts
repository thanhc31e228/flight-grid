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

import { Point } from "../MapTiler/types/map.types";

const GRID_LAYERS = ["grid-level-3-fill", "grid-level-2-fill", "grid-fill"];

export function registerMapEvents(
  map: MapLibreMap,
  onAddPoint: (aircraftId: string, point: Point) => number,
  getSelectedAircraftId: () => string | null,
  getLastPoint: (aircraftId: string) => Point | undefined,
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
    // Ctrl + click dùng cho đo đạc
    if (event.originalEvent.ctrlKey) return;
    if (!map.isStyleLoaded()) return;

    // Click vào waypoint có sẵn thì không tạo waypoint mới
    const pointFeatures = map.queryRenderedFeatures(event.point, {
      layers: ["points-layer"],
    });
    if (pointFeatures.length > 0) return;

    // Lấy ID ô lưới cấp 3
    const gridFeatures = map.queryRenderedFeatures(event.point, {
      layers: ["grid-level-3-fill"],
    });
    const gridId = gridFeatures[0]?.properties?.id;
    const selectedAircraftId = getSelectedAircraftId();

    if (!selectedAircraftId) return;

    const lastPoint = getLastPoint(selectedAircraftId);

    if (!lastPoint) return;

    const point: Point = {
      lng: event.lngLat.lng,
      lat: event.lngLat.lat,
      appearanceTime: lastPoint.appearanceTime,
      coordinateGrid: gridId != null ? String(gridId) : undefined,
    };

    onAddPoint(selectedAircraftId, point);
  };

  map.on("mousemove", handleMouseMove);
  map.on("click", handleClick);

  // ======================================
  // CLEANUP
  // ======================================

  return () => {
    map.off("mousemove", handleMouseMove);
    map.off("click", handleClick);
  };
}
