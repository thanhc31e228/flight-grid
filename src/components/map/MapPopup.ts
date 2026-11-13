import { Popup } from "maplibre-gl";

import type { GridFeature } from "../../features/grid/grid.types";
import type { Map as MapLibreMap } from "maplibre-gl";
// map popup khi click vào ô lưới hoặc điểm trên bản đồ
export function showGridPopup(
  feature: GridFeature,
  lngLat: [number, number],
  map: MapLibreMap,
) {
  const props = feature.properties;

  const container = document.createElement("div");

  container.style.fontSize = "14px";

  const title = document.createElement("strong");
  title.textContent = `Ô: ${props.id}`;

  const details = document.createElement("div");

  details.innerHTML = `
    <hr/>
    Hàng: ${props.row ?? "-"}<br/>
    Cột: ${props.col ?? "-"}<br/>
    Ô cha: ${props.parentId ?? "-"}<br/>
    Kích thước: ${props.widthMeters}m × ${props.heightMeters}m<br/>
    Kinh độ Tây: ${props.west.toFixed(6)}<br/>
    Kinh độ Đông: ${props.east.toFixed(6)}<br/>
    Vĩ độ Nam: ${props.south.toFixed(6)}<br/>
    Vĩ độ Bắc: ${props.north.toFixed(6)}
  `;

  container.append(title, details);

  new Popup().setLngLat(lngLat).setDOMContent(container).addTo(map);
}

export function showPointPopup(
  point: { lng: number; lat: number },
  index: number,
  map: MapLibreMap,
) {
  new Popup()
    .setLngLat([point.lng, point.lat])
    .setText(
      `P${index} | Longitude: ${point.lng.toFixed(6)} | Latitude: ${point.lat.toFixed(6)}`,
    )
    .addTo(map);
}
