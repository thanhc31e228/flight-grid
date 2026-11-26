import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { setCursorCoords } from "./cursor.store";
import { GRID_LAYERS } from "../../map/MapEvents";
import {
  bearingToMil,
  formatMil,
  getBearing,
  getDistanceMeters,
} from "./measurement";
import { getBaseCoordinates } from "../../../utils/map.storage";

export function addCursorTracker(map: MapLibreMap) {
  const handleMouseMove = (event: MapMouseEvent) => {
    // Lấy ID ô lưới cấp 3
    const gridFeatures = map.queryRenderedFeatures(event.point, {
      layers: [GRID_LAYERS[0]], // id của ô vuông nhỏ nhất
    });

    const gridId = gridFeatures[0]?.properties?.id;
    const bearingDeg = getBearing(getBaseCoordinates(), [
      event.lngLat.lng,
      event.lngLat.lat,
    ]);
    const mil = formatMil(bearingToMil(bearingDeg));
    const distance = getDistanceMeters(getBaseCoordinates(), [
      event.lngLat.lng,
      event.lngLat.lat,
    ]);
    if (gridId === undefined) return;
    setCursorCoords({
      lng: event.lngLat.lng,
      lat: event.lngLat.lat,
      gridId,
      distance: distance,
      mil: mil,
    });
  };

  const handleMouseLeave = () => setCursorCoords(null);

  map.on("mousemove", handleMouseMove);
  map.getCanvas().addEventListener("mouseleave", handleMouseLeave);

  return () => {
    map.off("mousemove", handleMouseMove);
    map.getCanvas().removeEventListener("mouseleave", handleMouseLeave);
    setCursorCoords(null);
  };
}
