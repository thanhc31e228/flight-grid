import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";

import { LAYER } from "./constants";
import { resetHover, setHover } from "./index";

export function addRouteHoverEvents(map: MapLibreMap) {
  let cursorActive = false;

  const setPointerCursor = (active: boolean) => {
    if (cursorActive === active) return;

    map.getCanvas().style.cursor = active ? "pointer" : "";
    cursorActive = active;
  };

  const handleMouseMove = (e: MapLayerMouseEvent) => {
    const aircraftId = e.features?.[0]?.properties?.aircraftId;

    if (aircraftId === undefined || aircraftId === null) {
      setPointerCursor(false);
      setHover(map, "line", null);
      return;
    }

    setPointerCursor(true);
    setHover(map, "line", String(aircraftId));
  };

  const handleMouseLeave = () => {
    setPointerCursor(false);
    setHover(map, "line", null);
  };

  map.on("mousemove", LAYER.routeHitbox, handleMouseMove);
  map.on("mouseleave", LAYER.routeHitbox, handleMouseLeave);

  return () => {
    map.off("mousemove", LAYER.routeHitbox, handleMouseMove);
    map.off("mouseleave", LAYER.routeHitbox, handleMouseLeave);

    map.getCanvas().style.cursor = "";
    resetHover(map);
  };
}
