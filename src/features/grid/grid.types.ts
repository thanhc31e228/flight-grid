
import type {
  Feature,
  FeatureCollection,
  Polygon,
} from "geojson";

export type GridLevel = 1 | 2 | 3;

export type GridProperties = {
  id: string;
  level: GridLevel;
  parentId?: string;

  row?: number;
  col?: number;

  west: number;
  east: number;
  south: number;
  north: number;

  widthMeters: number;
  heightMeters: number;

  xMin: number;
  yMin: number;
};

export type GridFeature = Feature<
  Polygon,
  GridProperties
>;

export type GridCollection = FeatureCollection<
  Polygon,
  GridProperties
>;

export type GridPoint = {
  lng: number;
  lat: number;
};
