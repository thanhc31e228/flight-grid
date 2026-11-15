import { Popup } from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";

export type PointPopupData = {
  lng: number;
  lat: number;
  index: number;
  topNumber?: number;
  groupNumber?: number;
};

let pointPopup: Popup | null = null;

export function showPointPopup(point: PointPopupData, map: MapLibreMap): void {
  const { lng, lat, topNumber = 1 } = point;

  // Container
  const container = document.createElement("div");
  container.className = `
    w-48 overflow-hidden rounded-lg
    border border-blue-100
    bg-white font-sans text-slate-700
    shadow-md
  `;

  // Header
  const header = document.createElement("div");
  header.className = `
    flex items-center gap-2
    border-b border-blue-100
    bg-blue-50 px-2.5 py-2
  `;

  const icon = document.createElement("div");
  icon.className = `
    flex h-7 w-7 shrink-0 items-center justify-center
    rounded-lg bg-blue-100
    text-sm text-blue-600
  `;
  icon.textContent = "✈";

  const titleWrapper = document.createElement("div");

  const title = document.createElement("div");
  title.className = "text-[11px] font-bold text-slate-800";
  title.textContent = "THÔNG TIN MÁY BAY";

  const subtitle = document.createElement("div");
  subtitle.className = "text-[8px] tracking-wider text-blue-500";
  subtitle.textContent = "AIRCRAFT INFORMATION";

  titleWrapper.append(title, subtitle);
  header.append(icon, titleWrapper);

  // Content
  const content = document.createElement("div");
  content.className = "space-y-2 p-2.5";

  // Top number
  const topBox = document.createElement("div");
  topBox.className = `
    flex items-center justify-between
    rounded-md border border-blue-100
    bg-blue-50 px-2.5 py-2
  `;

  const topLabel = document.createElement("span");
  topLabel.className = "text-[10px] font-semibold text-slate-500";
  topLabel.textContent = "SỐ TOP";

  const topValue = document.createElement("span");
  topValue.className = "text-sm font-bold text-blue-600";
  topValue.textContent = String(topNumber).padStart(2, "0");

  topBox.append(topLabel, topValue);

  // Time box
  const timeBox = document.createElement("div");
  timeBox.className = `
    flex flex-col gap-1
    rounded-md border border-slate-100
    bg-slate-50 px-2.5 py-2
  `;

  content.append(topBox, timeBox);
  container.append(header, content);

  // Remove popup cũ
  hidePointPopup();

  // Create popup
  pointPopup = new Popup({
    closeButton: true,
    closeOnClick: false,
    closeOnMove: false,
    maxWidth: "none",
    anchor: "bottom",
    offset: 8,
    className: "point-popup",
  })
    .setLngLat([lng, lat])
    .setDOMContent(container)
    .addTo(map);
}

export function hidePointPopup(): void {
  pointPopup?.remove();
  pointPopup = null;
}
