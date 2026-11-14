import { Popup } from "maplibre-gl";

import type { GridFeature } from "../../features/grid/grid.types";
import type { Map as MapLibreMap } from "maplibre-gl";

// Popup khi click vào ô lưới
export function showGridPopup(
  feature: GridFeature,
  lngLat: [number, number],
  map: MapLibreMap,
) {
  const props = feature.properties;

  const container = document.createElement("div");

  container.className = `
    w-72 overflow-hidden rounded-xl
    bg-white text-slate-700
    font-sans text-sm
  `;

  const title = document.createElement("div");
  title.className = `
    flex items-center gap-2
    border-b border-slate-100
    bg-slate-50 px-4 py-3
    text-base font-semibold text-slate-800
  `;

  title.innerHTML = `
    <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
      <svg xmlns="http://www.w3.org/2000/svg"
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 3v18M3 9h18"/>
      </svg>
    </span>
    <span>Thông tin ô lưới</span>
  `;

  const content = document.createElement("div");
  content.className = "space-y-3 p-4";

  const id = document.createElement("div");
  id.className = `
    rounded-lg bg-blue-50 px-3 py-2
    text-blue-700
  `;
  id.innerHTML = `
    <span class="text-xs font-medium text-blue-500">Mã ô</span>
    <div class="mt-0.5 font-semibold">${escapeHTML(String(props.id))}</div>
  `;

  const createRow = (label: string, value: unknown) => {
    const row = document.createElement("div");
    row.className = `
      flex items-center justify-between gap-3
      border-b border-slate-100 pb-2 last:border-0 last:pb-0
    `;

    const labelElement = document.createElement("span");
    labelElement.className = "text-xs text-slate-500";
    labelElement.textContent = label;

    const valueElement = document.createElement("span");
    valueElement.className = "text-right text-xs font-medium text-slate-800";
    valueElement.textContent = String(value ?? "-");

    row.append(labelElement, valueElement);

    return row;
  };

  const sectionTitle = document.createElement("div");
  sectionTitle.className = `
    text-xs font-semibold uppercase
    tracking-wider text-slate-400
  `;
  sectionTitle.textContent = "Thông tin vị trí";

  const locationInfo = document.createElement("div");
  locationInfo.className = "space-y-2";

  locationInfo.append(
    createRow("Hàng", props.row),
    createRow("Cột", props.col),
    createRow("Ô cha", props.parentId),
    createRow("Kích thước", `${props.widthMeters}m × ${props.heightMeters}m`),
  );

  const coordinateTitle = document.createElement("div");
  coordinateTitle.className = `
    border-t border-slate-100 pt-3
    text-xs font-semibold uppercase
    tracking-wider text-slate-400
  `;
  coordinateTitle.textContent = "Tọa độ địa lý";

  const coordinates = document.createElement("div");
  coordinates.className = "space-y-2";

  const format = (value: number) => value.toFixed(6);

  coordinates.append(
    createRow("Kinh độ Tây", format(props.west)),
    createRow("Kinh độ Đông", format(props.east)),
    createRow("Vĩ độ Nam", format(props.south)),
    createRow("Vĩ độ Bắc", format(props.north)),
  );

  content.append(id, sectionTitle, locationInfo, coordinateTitle, coordinates);

  container.append(title, content);

  new Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: "none",
    className: "grid-popup",
  })
    .setLngLat(lngLat)
    .setDOMContent(container)
    .addTo(map);
}

// Popup khi click vào điểm
export function showPointPopup(
  point: { lng: number; lat: number },
  index: number,
  map: MapLibreMap,
) {
  const container = document.createElement("div");

  container.className = `
    w-64 overflow-hidden rounded-xl
    bg-white font-sans text-sm
  `;

  const header = document.createElement("div");
  header.className = `
    flex items-center gap-3
    border-b border-slate-100
    bg-slate-50 px-4 py-3
  `;

  const icon = document.createElement("div");
  icon.className = `
    flex h-9 w-9 items-center justify-center
    rounded-full bg-emerald-100
    font-bold text-emerald-600
  `;
  icon.textContent = `P${index}`;

  const title = document.createElement("div");
  title.className = "font-semibold text-slate-800";
  title.textContent = `Điểm ${index}`;

  header.append(icon, title);

  const content = document.createElement("div");
  content.className = "space-y-3 p-4";

  const createCoordinate = (label: string, value: number) => {
    const wrapper = document.createElement("div");
    wrapper.className = "space-y-1";

    const labelElement = document.createElement("div");
    labelElement.className = "text-xs text-slate-400";
    labelElement.textContent = label;

    const valueElement = document.createElement("div");
    valueElement.className = `
      rounded-md bg-slate-50 px-3 py-2
      font-mono text-xs font-medium text-slate-700
    `;
    valueElement.textContent = value.toFixed(6);

    wrapper.append(labelElement, valueElement);

    return wrapper;
  };

  content.append(
    createCoordinate("Longitude", point.lng),
    createCoordinate("Latitude", point.lat),
  );

  container.append(header, content);

  new Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: "none",
    className: "point-popup",
  })
    .setLngLat([point.lng, point.lat])
    .setDOMContent(container)
    .addTo(map);
}

// Escape HTML để tránh XSS
function escapeHTML(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}
