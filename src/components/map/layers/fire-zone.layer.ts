import circle from "@turf/circle";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection, Polygon } from "geojson";
import { getFireZoneRadius } from "./layer.utils";

const FIRE_ZONE_SOURCE = "base-fire-zone";

// Dữ liệu rỗng dùng để ẩn vùng hỏa lực
const EMPTY_FIRE_ZONE: FeatureCollection<Polygon> = {
  type: "FeatureCollection",
  features: [],
};

// Bán kính vùng hỏa lực trên mặt đất (m) = √(R² − h²)
// range: cự ly bắn (m) - cạnh huyền
// altitude: độ cao máy bay (m) - cạnh góc vuông
// export const getFireZoneRadius = (range: number, altitude: number): number => {
//   if (range <= 0 || altitude < 0 || altitude >= range) return 0; // ngoài tầm bắn
//   return Math.sqrt(range * range - altitude * altitude);
// };

// Vùng hỏa lực theo cự ly bắn và độ cao máy bay
export function setFireZoneLayer(
  map: MapLibreMap,
  coordinates: [lng: number, lat: number],
  rangeFire: number, // cự ly bắn (m)
  altitude: number, // độ cao máy bay (m), nhớ đổi hm -> m (hm * 100)
) {
  const radiusM = getFireZoneRadius(rangeFire, altitude);

  // Bán kính = 0 thì không vẽ vùng hỏa lực
  const data =
    radiusM > 0
      ? circle(coordinates, radiusM / 1000, {
          steps: 128,
          units: "kilometers",
        })
      : EMPTY_FIRE_ZONE;

  const source = map.getSource(FIRE_ZONE_SOURCE) as GeoJSONSource | undefined;

  // Đã có source thì chỉ cập nhật dữ liệu
  if (source) {
    source.setData(data);
    return;
  }

  map.addSource(FIRE_ZONE_SOURCE, {
    type: "geojson",
    data,
  });

  map.addLayer({
    id: "base-fire-zone-fill",
    type: "fill",
    source: FIRE_ZONE_SOURCE,
    paint: {
      "fill-color": "#ef4444",
      "fill-opacity": 0.22,
    },
  });

  map.addLayer({
    id: "base-fire-zone-outline",
    type: "line",
    source: FIRE_ZONE_SOURCE,
    paint: {
      "line-color": "#dc2626",
      "line-width": 2,
      "line-opacity": 0.9,
      "line-dasharray": [2, 1],
    },
  });
}
