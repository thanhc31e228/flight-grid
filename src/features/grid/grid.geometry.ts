import type { GridFeature, GridProperties } from "./grid.types";
import { metersToLngLat } from "../../utils/geo.utils";

export function createRectangle(
  xMin: number,
  yMin: number,
  width: number,
  height: number,
  properties: GridProperties,
): GridFeature {
  const xMax = xMin + width;
  const yMax = yMin + height;

  const coordinates = [
    metersToLngLat(xMin, yMin),
    metersToLngLat(xMax, yMin),
    metersToLngLat(xMax, yMax),
    metersToLngLat(xMin, yMax),
    metersToLngLat(xMin, yMin),
  ];

  const west = coordinates[0][0];
  const south = coordinates[0][1];
  const east = coordinates[2][0];
  const north = coordinates[2][1];
  // console.log("properties", properties.id);
  return {
    type: "Feature",
    properties: {
      ...properties,
      west,
      east,
      south,
      north,
    },
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}

export function getGridCenter(feature: GridFeature) {
  const { xMin, yMin, widthMeters, heightMeters } = feature.properties;

  const [lng, lat] = metersToLngLat(
    xMin + widthMeters / 2,
    yMin + heightMeters / 2,
  );

  return { lng, lat };
}
