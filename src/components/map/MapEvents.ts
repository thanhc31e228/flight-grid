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
    // Ctrl + click là thao tác đo / chốt điểm, không thêm waypoint
    if (event.originalEvent.ctrlKey) return;
    if (!map.isStyleLoaded()) return;
    const features = map.queryRenderedFeatures(event.point, {
      layers: ["points-layer"],
    });

    // Nếu click vào waypoint thì không tạo waypoint mới
    if (features.length > 0) return;
    const selectedAircraftId = getSelectedAircraftId();
    // Chưa chọn máy bay thì không thêm điểm
    if (!selectedAircraftId) {
      // them top may bay moi
      return;
    }
    const lastPoint = getLastPoint(selectedAircraftId);
    // neu co diem cuoi thi tao them diem moi
    if (lastPoint) {
      const point: Point = {
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
        appearanceTime: lastPoint.appearanceTime,
      };
      // Thêm điểm vào đúng máy bay
      const pointNumber = onAddPoint(selectedAircraftId, point);
      // Chỉ hiển thị popup tại điểm đầu tiên của từng máy bay
      // if (pointNumber === 1) {
      //   showPointPopup(
      //     {
      //       lng: point.lng,
      //       lat: point.lat,
      //       index: pointNumber,
      //       topNumber: 1,
      //       groupNumber: 1,
      //     },
      //     map,
      //   );
      // }
    }
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
