import { Popup } from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";

type PointPopupData = {
  lng: number;
  lat: number;
  index: number;
  topNumber?: number;
  groupNumber?: number;
};

export function showPointPopup(point: PointPopupData, map: MapLibreMap) {
  const { lng, lat, topNumber = 1 } = point;

  // Container
  const container = document.createElement("div");

  container.className = `
    w-64 overflow-hidden rounded-xl
    border border-blue-100
    bg-white font-sans text-slate-700
    shadow-lg
  `;

  // ================================
  // HEADER
  // ================================

  const header = document.createElement("div");

  header.className = `
    flex items-center gap-3
    border-b border-blue-100
    bg-blue-50 px-4 py-3
  `;

  const left = document.createElement("div");
  left.className = "flex items-center gap-3";

  // Icon máy bay
  const planeIcon = document.createElement("div");

  planeIcon.className = `
    flex h-10 w-10 items-center justify-center
    rounded-xl bg-blue-100
    text-xl text-blue-600
  `;

  planeIcon.textContent = "✈";

  // Tên
  const titleWrapper = document.createElement("div");

  const title = document.createElement("div");
  title.className = "text-sm font-bold text-slate-800";
  title.textContent = "THÔNG TIN MÁY BAY";

  const subtitle = document.createElement("div");
  subtitle.className = "text-[10px] tracking-widest text-blue-500";
  subtitle.textContent = "AIRCRAFT INFORMATION";

  titleWrapper.append(title, subtitle);
  left.append(planeIcon, titleWrapper);

  header.append(left);

  // ================================
  // SỐ TOP
  // ================================

  const content = document.createElement("div");
  content.className = "space-y-3 p-4";

  const topBox = document.createElement("div");

  topBox.className = `
    flex items-center justify-between
    rounded-lg border border-blue-100
    bg-blue-50 px-3 py-3
  `;

  const topLabel = document.createElement("span");

  topLabel.className = "text-xs font-semibold text-slate-500";
  topLabel.textContent = "SỐ TOP";

  const topValue = document.createElement("span");

  topValue.className = "text-lg font-bold text-blue-600";
  topValue.textContent = String(topNumber).padStart(2, "0");

  topBox.append(topLabel, topValue);

  // ================================
  // THỜI GIAN XUẤT HIỆN
  // ================================

  const timeBox = document.createElement("div");

  timeBox.className = `
    flex flex-col gap-2
    rounded-lg border border-slate-100
    bg-slate-50 px-3 py-3
  `;

  // const timeLabel = document.createElement("span");

  // timeLabel.className = "text-xs font-semibold text-slate-500";
  // timeLabel.textContent = "THỜI GIAN XUẤT HIỆN";

  // const timeValue = document.createElement("span");

  // timeValue.className = `
  //   font-mono text-sm font-semibold
  //   text-emerald-600
  // `;

  // const appearedAt = new Date();

  // timeValue.textContent = appearedAt.toLocaleTimeString("vi-VN", {
  //   hour: "2-digit",
  //   minute: "2-digit",
  //   second: "2-digit",
  // });

  // timeBox.append(timeLabel, timeValue);

  content.append(topBox, timeBox);

  container.append(header, content);

  // ================================
  // POPUP
  // ================================

  new Popup({
    closeButton: true,
    closeOnClick: false,
    closeOnMove: false,
    maxWidth: "none",
    anchor: "bottom",
    offset: 12,
    className: "point-popup",
  })
    .setLngLat([lng, lat])
    .setDOMContent(container)
    .addTo(map);
}
