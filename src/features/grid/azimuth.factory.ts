import type { Feature, Point, LineString } from "geojson";

type Position = [number, number];

interface AzimuthProperties {
  degree?: number;
  major?: boolean;
  type?: string;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Tính tọa độ đích từ:
 * - điểm xuất phát
 * - bearing (0 = Bắc, tăng theo chiều kim đồng hồ)
 * - khoảng cách (km)
 */
function destination(
  center: Position,
  bearing: number,
  distanceKm: number,
): Position {
  const [lng, lat] = center;

  const angularDistance = distanceKm / 6371.0088;
  const bearingRad = bearing * DEG_TO_RAD;
  const lat1 = lat * DEG_TO_RAD;
  const lng1 = lng * DEG_TO_RAD;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad),
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [lng2 * RAD_TO_DEG, lat2 * RAD_TO_DEG];
}

/**
 * Tạo vòng tròn, vạch chia 6 độ và label 6 độ
 */
export function createAzimuth(center: Position, radiusKm = 100, interval = 6) {
  const circleFeatures: Feature<LineString>[] = [];
  const tickFeatures: Feature<LineString, AzimuthProperties>[] = [];
  const labelFeatures: Feature<Point, AzimuthProperties>[] = [];

  // =========================
  // CIRCLE
  // =========================

  const circleCoordinates: Position[] = [];

  for (let degree = 0; degree <= 360; degree++) {
    circleCoordinates.push(destination(center, degree, radiusKm));
  }

  circleFeatures.push({
    type: "Feature",
    properties: { type: "circle" },
    geometry: {
      type: "LineString",
      coordinates: circleCoordinates,
    },
  });

  // =========================
  // TICKS + LABELS
  // =========================

  for (let degree = 0; degree < 360; degree += interval) {
    const isMajor = degree % 30 === 0;
    const isCardinal = degree % 90 === 0;

    // Vạch lớn dài hơn vạch nhỏ
    const tickInnerRadius = isMajor ? radiusKm * 0.96 : radiusKm * 0.985;

    const tickOuterRadius = radiusKm * 1.015;

    const start = destination(center, degree, tickInnerRadius);

    const end = destination(center, degree, tickOuterRadius);

    tickFeatures.push({
      type: "Feature",
      properties: {
        degree,
        major: isMajor,
        type: "tick",
      },
      geometry: {
        type: "LineString",
        coordinates: [start, end],
      },
    });

    // Label cách vòng tròn một khoảng nhỏ
    const labelPosition = destination(center, degree, radiusKm * 1.08);

    // Hiển thị 360 ở phía Bắc thay vì 0
    const labelDegree = degree === 0 ? 360 : degree;

    labelFeatures.push({
      type: "Feature",
      properties: {
        degree: labelDegree,
        major: isCardinal,
        type: "label",
      },
      geometry: {
        type: "Point",
        coordinates: labelPosition,
      },
    });
  }

  return {
    circle: {
      type: "FeatureCollection" as const,
      features: circleFeatures,
    },
    ticks: {
      type: "FeatureCollection" as const,
      features: tickFeatures,
    },
    labels: {
      type: "FeatureCollection" as const,
      features: labelFeatures,
    },
  };
}
