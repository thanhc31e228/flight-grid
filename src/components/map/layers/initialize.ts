import type { Map as MapLibreMap } from "maplibre-gl";

import { addPlaces } from "./places.layers";
import { getBaseCoordinates } from "../../../utils/map.storage";
import { DEFAULT_PLACES } from "../../MapTiler/map.constants";
import { addCursorTracker } from "../../MapTiler/utils/cursor.tracker";
import { addAzimuthLayers } from "./azimuth.layers";
import { clearFirstWaypointLabels } from "./first-waypoint.label";
import { setFireZoneLayer } from "./fire-zone.layer";
import { addGridLayers } from "./grid.layers";
import { resetHover } from "./hover.state";
import { addRouteHoverEvents } from "./route.hover-events";
import { addRouteLayers } from "./route.layers";
import { clearWaypointCaches } from "./waypoint.update";
import { MAP_CONFIG } from "../../../config/map.config";

export function initializeMapLayers(map: MapLibreMap) {
  const baseCoordinates = getBaseCoordinates();
  addGridLayers(map);
  addRouteLayers(map);
  setFireZoneLayer(map, baseCoordinates, MAP_CONFIG.FIRE_RANGE_M, 0);
  addPlaces(map, DEFAULT_PLACES);
  const cleanupCursor = addCursorTracker(map);

  addAzimuthLayers(map, baseCoordinates, 40);

  const cleanupRouteHover = addRouteHoverEvents(map);
  // map.moveLayer("route-line", "azimuth-labels");
  return () => {
    cleanupRouteHover();
    cleanupCursor();
    clearFirstWaypointLabels();
    clearWaypointCaches(map);
    resetHover(map);
  };
}
