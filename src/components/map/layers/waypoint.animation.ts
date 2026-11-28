import { MapLibreMap } from "maplibre-gl";

type BlinkState = {
  frameId: number;
  startTime: number | null;
  nearIds: string[]; // các aircraftId đang vào gần
  lastRed: boolean | null; // tránh setPaintProperty thừa
};

const animationStates = new WeakMap<MapLibreMap, BlinkState>();

const DURATION = 1200;
const MIN_RADIUS = 4;
const MAX_RADIUS = 15;
const PULSE_LAYERS = ["waypoint-pulse-1", "waypoint-pulse-2"];

// Điều kiện: là điểm cuối VÀ thuộc máy bay đang vào gần
function nearLastExpr(nearIds: string[]) {
  return [
    "all",
    ["==", ["get", "isLast"], true],
    ["in", ["get", "aircraftId"], ["literal", nearIds]],
  ] as any;
}

function applyPulseFilter(map: MapLibreMap, nearIds: string[]) {
  for (const id of PULSE_LAYERS) {
    map.setFilter(id, nearLastExpr(nearIds));
  }
}

function applyIconColor(map: MapLibreMap, nearIds: string[], isRed: boolean) {
  map.setPaintProperty("points-layer", "icon-color", [
    "case",
    nearLastExpr(nearIds),
    isRed ? "#ff0000" : ["get", "color"],
    ["get", "color"],
  ]);
}

// ========================
// START
// ========================
export function startWaypointPlaneBlink(
  map: MapLibreMap,
  nearIds: string[] = [],
) {
  if (animationStates.has(map)) {
    setNearAircraftIds(map, nearIds);
    return;
  }

  const state: BlinkState = {
    frameId: 0,
    startTime: null,
    nearIds,
    lastRed: null,
  };
  animationStates.set(map, state);
  applyPulseFilter(map, nearIds);

  function updatePulse(layerId: string, progress: number) {
    const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * progress;
    map.setPaintProperty(layerId, "circle-radius", radius);
    map.setPaintProperty(layerId, "circle-stroke-opacity", 1 - progress);
    map.setPaintProperty(layerId, "circle-opacity", 0);
  }

  function animate(now: number) {
    if (!animationStates.has(map)) return;
    if (state.startTime === null) state.startTime = now;

    const elapsed = now - state.startTime;

    // Nháy máy bay (chỉ cập nhật khi đổi trạng thái đỏ/thường)
    const isRed = Math.floor(elapsed / 400) % 2 === 0;
    if (isRed !== state.lastRed) {
      state.lastRed = isRed;
      applyIconColor(map, state.nearIds, isRed);
    }

    // Hai vòng pulse lệch pha
    updatePulse("waypoint-pulse-1", (elapsed % DURATION) / DURATION);
    updatePulse(
      "waypoint-pulse-2",
      ((elapsed + DURATION / 2) % DURATION) / DURATION,
    );

    state.frameId = requestAnimationFrame(animate);
  }

  state.frameId = requestAnimationFrame(animate);
}

// ========================
// CẬP NHẬT DANH SÁCH MÁY BAY VÀO GẦN
// ========================
export function setNearAircraftIds(map: MapLibreMap, nearIds: string[]) {
  const state = animationStates.get(map);
  if (!state) return;

  state.nearIds = nearIds;
  state.lastRed = null; // ép animate áp lại icon-color với danh sách mới
  applyPulseFilter(map, nearIds);
}

// ========================
// STOP
// ========================
export function stopWaypointPlaneBlink(map: MapLibreMap) {
  const state = animationStates.get(map);
  if (!state) return;

  cancelAnimationFrame(state.frameId);
  animationStates.delete(map);

  map.setPaintProperty("points-layer", "icon-color", ["get", "color"]);

  for (const id of PULSE_LAYERS) {
    map.setPaintProperty(id, "circle-stroke-opacity", 0);
    map.setPaintProperty(id, "circle-opacity", 0);
  }
}
// Đồng bộ danh sách máy bay đang nháy với danh sách vào gần hiện tại
export function syncWaypointPlaneBlink(map: MapLibreMap, nearIds: string[]) {
  if (nearIds.length === 0) {
    stopWaypointPlaneBlink(map); // không còn máy bay nào vào gần
    return;
  }
  // Đang chạy thì chỉ cập nhật danh sách, chưa chạy thì khởi tạo
  startWaypointPlaneBlink(map, nearIds);
}
