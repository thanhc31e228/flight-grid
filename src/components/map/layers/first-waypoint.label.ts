import type { Map as MapLibreMap } from "maplibre-gl";

import { CENTER } from "../../MapTiler/map.constants";
import type { AirCraft } from "../../MapTiler/types/map.types";
import type { LngLat } from "./constants";
import { createAnchorMarker, escapeHtml } from "./helpers";
import {
  applyHover,
  firstWaypointMarkers,
  hoverState,
  resetAppliedLabelHover,
  setHover,
  syncLabelHighlight,
} from "./index";

const latestAircraftData = new Map<string, AirCraft>();

const TEXT_OUTLINE =
  "text-shadow:-1px 0 #fff,1px 0 #fff,0 -1px #fff,0 1px #fff;";

function buildFirstWaypointHtml(
  aircraft: AirCraft,
  firstPoint: AirCraft["points"][number],
  direction: "left" | "right",
) {
  const color = escapeHtml(aircraft.color);
  const isRight = direction === "right";

  const boxSide = isRight ? "left:8px;" : "right:8px;";
  const timeSide = isRight ? "right:7px;" : "left:7px;";
  const flexDir = isRight ? "row-reverse" : "row";
  const bracket = isRight ? "(" : ")";
  const bracketMargin = isRight
    ? "margin-left:-8px; margin-right:-2px;"
    : "margin-left:-2px; margin-right:-8px;";

  const bracketHtml = `<span style="font-size:25px; font-weight:300; line-height:0.5; ${bracketMargin}">${bracket}</span>`;
  const idHtml = escapeHtml(aircraft.id);
  const idWithBracket = isRight
    ? `${bracketHtml}${idHtml}`
    : `${idHtml}${bracketHtml}`;

  // Trạng thái mặc định (chưa hover): chỉ có chữ màu tốp, không nền, không viền
  return `
  <div data-hit style="
    position:absolute; ${boxSide} top:0;
    transform:translateY(-50%) scale(var(--label-scale, 1));
    transform-origin:${isRight ? "left" : "right"} center;
    display:flex; flex-direction:${flexDir};
    align-items:center; gap:5px;
    padding:4px 0px;
    white-space:nowrap; pointer-events:auto; cursor:pointer;
    color:${color}; font-weight:700; font-size:16px;
    ${TEXT_OUTLINE}
  ">
    <span style="
      display:inline-flex; align-items:center;
      flex-direction:row;
      font-size:16px; font-weight:700; position:relative;
    ">${idWithBracket}</span>

    <div style="
      display:grid; grid-template-rows:auto 3px auto;
      min-width:80px; text-align:center;
      font-size:14px; line-height:1.3;
      gap:2px;
    ">
      <span>${escapeHtml(aircraft.aircraftCode)}</span>
      <span style="background:${color};"></span>
      <span>${escapeHtml(aircraft.altitude)}</span>
    </div>
  </div>

  <span data-hit style="
    position:absolute; ${timeSide} bottom:7px;
    transform:scale(var(--label-scale, 1));
    transform-origin:${isRight ? "right" : "left"} bottom;
    padding:2px 5px;
    white-space:nowrap; pointer-events:auto; cursor:pointer;
    color:${color}; font-weight:700; font-size:14px;
    ${TEXT_OUTLINE}
  ">${escapeHtml(firstPoint.appearanceTime)}</span>
`;
}

/** Aircraft nằm bên phải tâm bản đồ thì label mở sang phải, ngược lại sang trái. */
function getAircraftLabelDirection(aircraftLng: number): "left" | "right" {
  return aircraftLng >= CENTER[0] ? "right" : "left";
}

export function updateFirstWaypointLabels(
  map: MapLibreMap,
  aircrafts: AirCraft[],
  setAircraftSelected: (aircraftSelected: AirCraft | null) => void,
) {
  aircrafts.forEach((aircraft) => {
    latestAircraftData.set(aircraft.id, aircraft);
  });

  const aircraftsWithPoints = aircrafts.filter(
    (aircraft) => aircraft.points.length > 0,
  );

  const activeIds = new Set(aircraftsWithPoints.map((aircraft) => aircraft.id));

  // Xóa label của aircraft không còn tồn tại
  firstWaypointMarkers.forEach((marker, id) => {
    if (activeIds.has(id)) return;

    marker.remove();
    firstWaypointMarkers.delete(id);
    latestAircraftData.delete(id);

    if (hoverState.pinned === id) {
      hoverState.pinned = null;
      applyHover(map);
    }
    if (hoverState.label === id) setHover(map, "label", null);
    if (hoverState.line === id) setHover(map, "line", null);
  });

  aircraftsWithPoints.forEach((aircraft) => {
    const firstPoint = aircraft.points[0];
    const lngLat: LngLat = [firstPoint.lng, firstPoint.lat];

    let marker = firstWaypointMarkers.get(aircraft.id);

    if (!marker) {
      marker = createAnchorMarker(map, lngLat);

      const element = marker.getElement();
      // thiết lập label hiển thị khi hover vào point
      element.addEventListener("mouseenter", () =>
        setHover(map, "label", aircraft.id),
      );
      element.addEventListener("mouseleave", () =>
        setHover(map, "label", null),
      );
      // Click vào first waypoint label
      element.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;

        if (!target.closest("[data-hit]")) return;

        event.stopPropagation();

        const latestAircraft = latestAircraftData.get(aircraft.id);

        if (!latestAircraft) return;

        // Click label đầu tiên: ghim / bỏ ghim hiệu ứng
        // togglePinned(map, aircraft.id);
        // sự kiện khi click vào cái label của point đầu tiên
        setAircraftSelected(aircraft);
        // handleFirstWaypointClick(latestAircraft);
      });
      firstWaypointMarkers.set(aircraft.id, marker);
    }

    marker.setLngLat(lngLat);

    const html = buildFirstWaypointHtml(
      aircraft,
      firstPoint,
      getAircraftLabelDirection(firstPoint.lng),
    );
    const element = marker.getElement();
    // Chỉ rebuild DOM khi nội dung label thay đổi.
    if (element.dataset.labelHtml !== html) {
      element.innerHTML = html;
      element.dataset.labelHtml = html;
    }
  });

  syncLabelHighlight(true);
}

export function clearFirstWaypointLabels() {
  firstWaypointMarkers.forEach((marker) => marker.remove());
  firstWaypointMarkers.clear();

  resetAppliedLabelHover();
}
