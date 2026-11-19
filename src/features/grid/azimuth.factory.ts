import type { Feature, Point, LineString } from "geojson";

type Position = [number, number];

interface AzimuthProperties {
  degree?: number;
  mil?: number;
  label?: string;
  major?: boolean;
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

// Mil tăng ngược chiều kim đồng hồ
// 0 = Nam, 15 = Đông, 30 = Bắc, 45 = Tây
function milToBearing(mil: number): number {
  return (180 - mil * 6 + 360) % 360;
}

function formatMil(mil: number): string {
  return `${mil}-00`;
}

export function createAzimuth(center: Position, radiusKm = 100, interval = 6) {
  // =========================
  // DATA VÒNG 360 ĐỘ (GIỮ NGUYÊN)
  // =========================

  const circleFeatures: Feature<LineString>[] = [];
  const tickFeatures: Feature<LineString, AzimuthProperties>[] = [];
  const labelFeatures: Feature<Point, AzimuthProperties>[] = [];

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

  for (let degree = 0; degree < 360; degree += interval) {
    const isMajor = degree % 30 === 0;
    const isCardinal = degree % 90 === 0;

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

    const labelPosition = destination(center, degree, radiusKm * 1.08);

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

  // =========================
  // DATA VÒNG 60-00 (MỚI)
  // =========================

  const milCircleFeatures: Feature<LineString>[] = [];
  const milTickFeatures: Feature<LineString, AzimuthProperties>[] = [];
  const milLabelFeatures: Feature<Point, AzimuthProperties>[] = [];

  // Tạo vòng mil lệch ra ngoài vòng 360 một chút
  const milCircleRadius = radiusKm * 1.035;

  const milCircleCoordinates: Position[] = [];

  for (let degree = 0; degree <= 360; degree++) {
    milCircleCoordinates.push(destination(center, degree, milCircleRadius));
  }

  milCircleFeatures.push({
    type: "Feature",
    properties: { type: "mil-circle" },
    geometry: {
      type: "LineString",
      coordinates: milCircleCoordinates,
    },
  });

  // 60 vị trí, 0 đến 59; 60-00 khép vòng tại vị trí 0-00
  for (let mil = 0; mil < 60; mil++) {
    const bearing = milToBearing(mil);

    const isMajor = mil % 5 === 0;
    const isCardinal = mil % 15 === 0;

    // Vạch mil hướng ra ngoài để phân biệt với vòng độ
    const tickInnerRadius = isMajor
      ? milCircleRadius * 0.985
      : milCircleRadius * 0.992;

    const tickOuterRadius = milCircleRadius * 1.015;

    const start = destination(center, bearing, tickInnerRadius);
    const end = destination(center, bearing, tickOuterRadius);

    milTickFeatures.push({
      type: "Feature",
      properties: {
        mil,
        degree: bearing,
        label: formatMil(mil),
        major: isMajor,
        type: "mil-tick",
      },
      geometry: {
        type: "LineString",
        coordinates: [start, end],
      },
    });

    const labelPosition = destination(center, bearing, milCircleRadius * 0.9);

    milLabelFeatures.push({
      type: "Feature",
      properties: {
        mil,
        degree: bearing,
        label: formatMil(mil),
        major: isCardinal,
        type: "mil-label",
      },
      geometry: {
        type: "Point",
        coordinates: labelPosition,
      },
    });
  }

  // Label 60-00 tại đúng vị trí Nam, cùng vị trí 0-00
  milLabelFeatures.push({
    type: "Feature",
    properties: {
      mil: 60,
      degree: 180,
      label: "60-00",
      major: true,
      type: "mil-label",
    },
    geometry: {
      type: "Point",
      coordinates: destination(center, 180, milCircleRadius * 1.07),
    },
  });

  // =========================
  // RETURN
  // =========================

  return {
    // Vòng độ cũ
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

    // Vòng mil mới
    milCircle: {
      type: "FeatureCollection" as const,
      features: milCircleFeatures,
    },
    milTicks: {
      type: "FeatureCollection" as const,
      features: milTickFeatures,
    },
    milLabels: {
      type: "FeatureCollection" as const,
      features: milLabelFeatures,
    },
  };
}
