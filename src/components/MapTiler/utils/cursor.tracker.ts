import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { setCursorCoords } from "./cursor.store";

export function addCursorTracker(map: MapLibreMap) {
  const handleMouseMove = (event: MapMouseEvent) => {
    setCursorCoords({ lng: event.lngLat.lng, lat: event.lngLat.lat });
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
