import { useMeasurement } from "../MapTiler/utils/measurement.store";

export default function MeasurementBar() {
  const measurement = useMeasurement();

  return (
    <div
      className="
        relative z-[1001] flex h-11 w-full shrink-0
        items-center justify-center gap-8
        overflow-x-auto whitespace-nowrap
        border-b border-gray-200 bg-white px-4
        text-sm text-gray-700 shadow-sm
      "
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold">Phương vị:</span>
        <span className="w-16 font-mono tabular-nums text-orange-700">
          {measurement ? measurement.mil : "--"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-semibold">Góc:</span>
        <span className="w-16 font-mono tabular-nums text-sky-700">
          {measurement ? `${measurement.bearingDeg.toFixed(1)}°` : "--"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-semibold">Cự ly:</span>
        <span className="w-24 font-mono tabular-nums">
          {measurement ? `${measurement.distanceKm.toFixed(2)} km` : "--"}
        </span>
      </div>
    </div>
  );
}
