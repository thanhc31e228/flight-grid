import type {
  FilterSpecification,
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";

import { LAYER } from "./constants";

export const hoverState = {
  line: null as string | null,
  label: null as string | null,
  // Aircraft được ghim bằng cách click vào label đầu tiên
  pinned: null as string | null,
};

let appliedHoverId = "";
let appliedLabelHoverId = "";

/** Label đầu tiên của mỗi aircraft, key = aircraftId. */
export const firstWaypointMarkers = new Map<string, Marker>();

/** Label được ưu tiên hơn đường bay; "" nghĩa là không có gì đang hover. */
/** Hover được ưu tiên hơn aircraft đã ghim; "" nghĩa là không có gì đang active. */
const getActiveHoverId = () =>
  hoverState.label ?? hoverState.line ?? hoverState.pinned ?? "";

export const routeHoverFilter = (aircraftId: string): FilterSpecification => [
  "==",
  ["get", "aircraftId"],
  aircraftId,
];

function setRouteHoverFilter(map: MapLibreMap, aircraftId: string) {
  if (map.getLayer(LAYER.routeHover)) {
    map.setFilter(LAYER.routeHover, routeHoverFilter(aircraftId));
  }
}

function setLabelHighlight(marker: Marker, active: boolean) {
  marker
    .getElement()
    .querySelectorAll<HTMLElement>("[data-hit]")
    .forEach((el) => {
      el.style.background = active ? "rgba(255,255,255,0.85)" : "transparent";
      el.style.boxShadow = active ? "0 0 0 1.5px currentColor" : "none";
    });
}

export function syncLabelHighlight(force = false) {
  const activeId = getActiveHoverId();

  if (!force && activeId === appliedLabelHoverId) return;
  appliedLabelHoverId = activeId;

  firstWaypointMarkers.forEach((marker, aircraftId) => {
    setLabelHighlight(marker, aircraftId === activeId);
  });
}

/** Áp dụng hiệu ứng theo activeId hiện tại (chỉ cập nhật khi có thay đổi). */
export function applyHover(map: MapLibreMap) {
  const activeId = getActiveHoverId();

  if (activeId !== appliedHoverId) {
    appliedHoverId = activeId;
    setRouteHoverFilter(map, activeId);
  }

  syncLabelHighlight();
}

export function setHover(
  map: MapLibreMap,
  source: "line" | "label",
  aircraftId: string | null,
) {
  if (hoverState[source] === aircraftId) return;

  hoverState[source] = aircraftId;
  applyHover(map);
}

// /** Click lần 1: ghim hiệu ứng; click lần 2 vào cùng aircraft: bỏ ghim và tắt luôn hiệu ứng. */
// export function togglePinned(map: MapLibreMap, aircraftId: string) {
//   const isUnpin = hoverState.pinned === aircraftId;

//   hoverState.pinned = isUnpin ? null : aircraftId;

//   if (isUnpin) {
//     // Chuột vẫn đang nằm trên label nên chưa có mouseleave:
//     // xóa hover thủ công để hiệu ứng tắt ngay lập tức.
//     hoverState.label = null;
//     if (hoverState.line === aircraftId) hoverState.line = null;
//   }

//   applyHover(map);
// }
// /** Click để ghim aircraft, không toggle unpin */
// export function pinAircraft(map: MapLibreMap, aircraftId: string) {
//   hoverState.pinned = aircraftId;

//   applyHover(map);
// }

export function resetHover(map?: MapLibreMap) {
  hoverState.line = null;
  hoverState.label = null;
  hoverState.pinned = null;

  appliedHoverId = "";
  appliedLabelHoverId = "";

  if (map) setRouteHoverFilter(map, "");

  firstWaypointMarkers.forEach((marker) => setLabelHighlight(marker, false));
}

/** Xóa trạng thái đã áp dụng của label (dùng khi dọn dẹp label). */
export function resetAppliedLabelHover() {
  appliedLabelHoverId = "";
}
