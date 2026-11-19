import type { Feature, Point, LineString } from "geojson";

type Position = [number, number];

interface AzimuthProperties {
  degree?: number;
  mil?: number;
  label?: string;
  major?: boolean;
  kind?: "deg" | "mil";
  type?: string;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

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

// Đổi hướng (độ, 0 = Bắc, theo chiều kim đồng hồ) sang mil
// Mil tăng ngược chiều kim đồng hồ: 0 = Nam, 15 = Đông, 30 = Bắc, 45 = Tây
// Mỗi 1 mil (đơn vị 100 mil) = 6 độ
function degreeToMil(degree: number): number {
  return (((30 - degree / 6) % 60) + 60) % 60;
}

function formatMil(mil: number): string {
  // 0-00 tại hướng Nam được hiển thị là 60-00 (khép vòng)
  return `${mil === 0 ? 60 : mil}-00`;
}

export function createAzimuth(center: Position, radiusKm = 100, interval = 6) {
  const circleFeatures: Feature<LineString>[] = [];
  const tickFeatures: Feature<LineString, AzimuthProperties>[] = [];
  const labelFeatures: Feature<Point, AzimuthProperties>[] = [];

  // =========================
  // VÒNG TRÒN DUY NHẤT
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
  // VẠCH CHIA + NHÃN ĐỘ (ngoài) + NHÃN MIL (trong)
  // =========================
  for (let degree = 0; degree < 360; degree += interval) {
    const isMajor = degree % 30 === 0;
    const isCardinal = degree % 90 === 0;

    // Vạch chia dùng chung cho cả độ và mil
    const tickInnerRadius = isMajor ? radiusKm * 0.96 : radiusKm * 0.985;
    const tickOuterRadius = radiusKm * 1.015;

    tickFeatures.push({
      type: "Feature",
      properties: {
        degree,
        major: isMajor,
        type: "tick",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          destination(center, degree, tickInnerRadius),
          destination(center, degree, tickOuterRadius),
        ],
      },
    });

    // Nhãn ĐỘ - phía ngoài vòng
    labelFeatures.push({
      type: "Feature",
      properties: {
        kind: "deg",
        degree: degree === 0 ? 360 : degree,
        major: isCardinal,
        type: "label",
      },
      geometry: {
        type: "Point",
        coordinates: destination(center, degree, radiusKm * 1.08),
      },
    });

    // Nhãn MIL - phía trong vòng (chỉ tại các hướng chia hết cho 6°)
    if (degree % 6 === 0) {
      const mil = degreeToMil(degree);

      labelFeatures.push({
        type: "Feature",
        properties: {
          kind: "mil",
          mil,
          degree,
          label: formatMil(mil),
          major: mil % 15 === 0,
          type: "label",
        },
        geometry: {
          type: "Point",
          coordinates: destination(center, degree, radiusKm * 0.9),
        },
      });
    }
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
    // Chứa cả nhãn độ (kind = "deg") và nhãn mil (kind = "mil")
    labels: {
      type: "FeatureCollection" as const,
      features: labelFeatures,
    },
  };
}
