import {
  Popup,
  type Map as MapLibreMap,
  type MapMouseEvent,
} from "maplibre-gl";

export function registerWaypointHoverEvents(map: MapLibreMap) {
  let popup: Popup | null = null;
  let currentName = "";

  const handleMouseMove = (e: MapMouseEvent) => {
    // Chỉ kiểm tra waypoint, không kiểm tra grid-fill
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["points-casing"],
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

    // Chỉ cập nhật nội dung khi chuyển sang waypoint khác
    if (currentName !== name) {
      const content = document.createElement("div");
      content.textContent = name; // An toàn hơn setHTML
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
