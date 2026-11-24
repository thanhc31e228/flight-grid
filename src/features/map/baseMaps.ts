import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import { MAP_CONFIG } from "../../config/map.config";

// Id lấy thẳng từ MAP_CONFIG.MAP_STYLES (streets | satellite | hybrid)
export type MapStyleId = keyof typeof MAP_CONFIG.MAP_STYLES;

// Tên hiển thị trong menu. Thêm style mới vào MAP_STYLES mà quên thêm tên ở đây thì TypeScript sẽ báo lỗi
export const MAP_STYLE_LABELS: Record<MapStyleId, string> = {
  streets: "Đường phố",
  satellite: "Vệ tinh",
  hybrid: "Vệ tinh + nhãn",
};

export const DEFAULT_MAP_STYLE: MapStyleId = "streets";

export function getMapStyleUrl(id: MapStyleId): string {
  return MAP_CONFIG.MAP_STYLES[id];
}

// Đọc style đã lưu
// export function loadMapStyleId(): MapStyleId {
//   try {
//     const saved = localStorage.getItem(STORAGE_KEY) as MapStyleId | null;
//     if (saved && saved in MAP_CONFIG.MAP_STYLES) return saved;
//   } catch {
//     // bỏ qua nếu localStorage không dùng được
//   }
//   return DEFAULT_MAP_STYLE;
// }

// export function saveMapStyleId(id: MapStyleId) {
//   try {
//     localStorage.setItem(STORAGE_KEY, id);
//   } catch {
//     // bỏ qua
//   }
// }

// Khi đổi style: giữ lại các source/layer tự thêm (lưới, đường bay, vòng phương vị...)
// Ở đây coi source "geojson" là của mình, còn style MapTiler chỉ có vector/raster
export function keepCustomLayers(
  prev: StyleSpecification | undefined,
  next: StyleSpecification,
): StyleSpecification {
  if (!prev) return next;

  const customSources = Object.fromEntries(
    Object.entries(prev.sources).filter(
      ([id, source]) => source.type === "geojson" && !(id in next.sources),
    ),
  );
  const customIds = new Set(Object.keys(customSources));

  const customLayers = prev.layers.filter(
    (layer) => "source" in layer && customIds.has(layer.source as string),
  );

  return {
    ...next,
    sources: { ...next.sources, ...customSources },
    // Layer của mình đặt sau cùng nên luôn nằm trên nền
    layers: [...next.layers, ...customLayers],
  };
}

// Đọc style đã lưu. Chưa có (hoặc giá trị không hợp lệ) thì ghi mặc định vào localStorage
export function loadMapStyleId(): MapStyleId {
  try {
    const saved = localStorage.getItem(MAP_CONFIG.STORAGE_KEY);

    if (saved && saved in MAP_CONFIG.MAP_STYLES) {
      return saved as MapStyleId;
    }

    localStorage.setItem(MAP_CONFIG.STORAGE_KEY, DEFAULT_MAP_STYLE);
  } catch {
    // bỏ qua nếu localStorage không dùng được
  }
  return DEFAULT_MAP_STYLE;
}

const VI_TEXT_FIELD = [
  "coalesce",
  ["get", "name:vi"],
  ["get", "name"],
] as unknown as ExpressionSpecification;

// Đổi tên địa danh sang tiếng Việt cho style mới, áp dụng trước khi style được nạp vào map
export function localizeLabels(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (layer.type !== "symbol" || !layer.layout?.["text-field"]) {
        return layer;
      }
      return {
        ...layer,
        layout: { ...layer.layout, "text-field": VI_TEXT_FIELD },
      };
    }),
  };
}
