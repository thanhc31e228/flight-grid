import { MapLibreMap } from "maplibre-gl";

// Lưu trạng thái animation theo từng map
const animationStates = new WeakMap<
  MapLibreMap,
  {
    frameId: number;
    startTime: number | null;
  }
>();

const DURATION = 1200;
const MIN_RADIUS = 4;
const MAX_RADIUS = 15;

// ========================
// START
// ========================
export function startWaypointPlaneBlink(map: MapLibreMap) {
  // Nếu đang chạy thì không khởi tạo thêm
  if (animationStates.has(map)) return;

  const state = {
    frameId: 0,
    startTime: null as number | null,
  };

  animationStates.set(map, state);

  function updatePulse(layerId: string, progress: number) {
    const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * progress;
    const opacity = 1 - progress;

    map.setPaintProperty(layerId, "circle-radius", radius);
    map.setPaintProperty(layerId, "circle-stroke-opacity", opacity);
    map.setPaintProperty(layerId, "circle-opacity", 0);
  }

  function animate(now: number) {
    if (!animationStates.has(map)) return;

    if (state.startTime === null) state.startTime = now;

    const elapsed = now - state.startTime;

    // Nháy máy bay
    const isRed = Math.floor(elapsed / 400) % 2 === 0;

    map.setPaintProperty("points-layer", "icon-color", [
      "case",
      ["==", ["get", "isLast"], true],
      isRed ? "#ff0000" : ["get", "color"],
      ["get", "color"],
    ]);

    // Hai vòng pulse lệch pha
    const progress1 = (elapsed % DURATION) / DURATION;
    const progress2 = ((elapsed + DURATION / 2) % DURATION) / DURATION;

    updatePulse("waypoint-pulse-1", progress1);
    updatePulse("waypoint-pulse-2", progress2);

    state.frameId = requestAnimationFrame(animate);
  }

  state.frameId = requestAnimationFrame(animate);
}

// ========================
// STOP
// ========================
export function stopWaypointPlaneBlink(map: MapLibreMap) {
  const state = animationStates.get(map);

  // Không chạy thì không cần stop
  if (!state) return;

  cancelAnimationFrame(state.frameId);

  animationStates.delete(map);

  // Khôi phục màu máy bay
  map.setPaintProperty("points-layer", "icon-color", ["get", "color"]);

  // Tắt vòng pulse
  for (const id of ["waypoint-pulse-1", "waypoint-pulse-2"]) {
    map.setPaintProperty(id, "circle-stroke-opacity", 0);
    map.setPaintProperty(id, "circle-opacity", 0);
  }
}
