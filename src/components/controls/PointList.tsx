
import type { Point } from "../../features/route/route.types";

type Props = {
  points: Point[];
};

export default function PointList({ points }: Props) {
  return (
    <div className="point-list">
      {points.map((point, index) => (
        <div key={index} className="point-item">
          <strong>P{index + 1}</strong>

          <div>Lng: {point.lng.toFixed(6)}</div>
          <div>Lat: {point.lat.toFixed(6)}</div>
        </div>
      ))}
    </div>
  );
}
