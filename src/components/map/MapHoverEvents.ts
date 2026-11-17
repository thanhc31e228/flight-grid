import {
  Popup,
  type Map as MapLibreMap,
  type MapMouseEvent,
} from "maplibre-gl";

export function registerWaypointHoverEvents(map: MapLibreMap) {
  let popup: Popup | null = null;
  let currentName = "";

  const handleMouseMove = (e: MapMouseEvent) => {
    // Kiểm tra waypoint tam giác
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["points-layer"],
    });

    const feature = features[0];

    if (!feature || feature.geometry.type !== "Point") {
      popup?.remove();
      currentName = "";
      map.getCanvas().style.cursor = "crosshair";
      return;
    }

    const coordinates = feature.geometry.coordinates as [number, number];

    const name = String(feature.properties?.name ?? "Waypoint");

    map.getCanvas().style.cursor = "pointer";

    if (!popup) {
      popup = new Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
      });
    }

    if (currentName !== name) {
      const content = document.createElement("div");
      content.textContent = name;

      popup.setDOMContent(content);
      currentName = name;
    }

    popup.setLngLat(coordinates);

    if (!popup.isOpen()) {
      popup.addTo(map);
    }
  };

  const handleMouseOut = () => {
    popup?.remove();
    currentName = "";
    map.getCanvas().style.cursor = "crosshair";
  };

  map.on("mousemove", handleMouseMove);
  map.on("mouseout", handleMouseOut);

  return () => {
    map.off("mousemove", handleMouseMove);
    map.off("mouseout", handleMouseOut);

    popup?.remove();
    popup = null;
  };
}
