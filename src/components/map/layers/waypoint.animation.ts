import { MapLibreMap } from "maplibre-gl";

export function startWaypointPlaneBlink(map: MapLibreMap) {
  let frameId = 0;
  let startTime: number | null = null;

  const DURATION = 1200;
  const MIN_RADIUS = 4;
  const MAX_RADIUS = 15;

  function animate(now: number) {
    if (startTime === null) startTime = now;

    const elapsed = now - startTime;

    // Nháy máy bay
    const isRed = Math.floor(elapsed / 400) % 2 === 0;

    map.setPaintProperty("points-layer", "icon-color", [
      "case",
      ["==", ["get", "isLast"], true],
      isRed ? "#ff0000" : ["get", "color"],
      ["get", "color"],
    ]);

    // Tính tiến trình của mỗi vòng
    const progress1 = (elapsed % DURATION) / DURATION;
    const progress2 = ((elapsed + DURATION / 2) % DURATION) / DURATION;

    updatePulse("waypoint-pulse-1", progress1);
    updatePulse("waypoint-pulse-2", progress2);

    frameId = requestAnimationFrame(animate);
  }

  function updatePulse(layerId: string, progress: number) {
    const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * progress;

    // Vòng càng lan rộng càng mờ
    const opacity = 1 - progress;

    map.setPaintProperty(layerId, "circle-radius", radius);
    map.setPaintProperty(layerId, "circle-stroke-opacity", opacity);
    map.setPaintProperty(layerId, "circle-opacity", 0);
  }

  frameId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(frameId);

    map.setPaintProperty("points-layer", "icon-color", ["get", "color"]);

    for (const id of ["waypoint-pulse-1", "waypoint-pulse-2"]) {
      map.setPaintProperty(id, "circle-stroke-opacity", 0);
      map.setPaintProperty(id, "circle-opacity", 0);
    }
  };
}
