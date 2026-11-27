import type { Map as MapLibreMap } from "maplibre-gl";
import { LAYER } from "./constants";

// Lưu text-field gốc để khôi phục khi bật lại
const originalTextFields = new WeakMap<MapLibreMap, Map<string, unknown>>();

// Các layer của ứng dụng không được can thiệp
const EXCLUDED_LABEL_LAYERS = new Set(["grid-label", "points-layer"]);

export function togglePlaceLabel(map: MapLibreMap, visible: boolean) {
  const layers = map.getStyle()?.layers;
  if (!layers) return;

  let saved = originalTextFields.get(map);

  if (!saved) {
    saved = new Map();
    originalTextFields.set(map, saved);
  }

  layers.forEach((layer) => {
    // Chỉ xét symbol
    if (layer.type !== "symbol") return;

    // Bỏ qua layer của ứng dụng
    if (EXCLUDED_LABEL_LAYERS.has(layer.id)) return;

    // Chỉ xét layer có text-field
    const textField = map.getLayoutProperty(layer.id, "text-field");

    if (textField == null) return;

    // Lưu text-field gốc 1 lần
    if (!saved!.has(layer.id)) {
      saved!.set(layer.id, textField);
    }

    if (visible) {
      // Khôi phục text ban đầu
      map.setLayoutProperty(
        layer.id,
        "text-field",
        saved!.get(layer.id) as any,
      );
    } else {
      // Chỉ ẩn chữ, không ẩn toàn bộ layer
      map.setLayoutProperty(layer.id, "text-field", "");
    }
  });
}
/** Ẩn/hiện địa điểm được đánh dấu. */
export function togglePlaceLayers(map: MapLibreMap, visible: boolean) {
  const visibility = visible ? "visible" : "none";

  Object.values(LAYER).forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visibility);
    }
  });
}
