import { useState, type ChangeEvent, type FormEvent } from "react";

import type { AircraftDetails, AircraftSide } from "./factory/aircraft.factory";

const SIDE_LABEL: Record<AircraftSide, string> = {
  friendly: "ta",
  enemy: "địch",
};

type Props = {
  side: AircraftSide;
  initialTime: string; // thời gian xuất hiện điền sẵn
  onSubmit: (details: AircraftDetails) => void;
  onBack: () => void; // quay lại bước chọn phe
};

export default function NewAircraftForm({
  side,
  initialTime,
  onSubmit,
  onBack,
}: Props) {
  const [form, setForm] = useState({
    aircraftCode: "",
    altitude: "",
    appearanceTime: initialTime,
  });

  const change =
    (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Ô trống -> undefined (đúng với AircraftDetails)
    onSubmit({
      aircraftCode: form.aircraftCode.trim() || undefined,
      altitude: form.altitude.trim() || undefined,
      appearanceTime: form.appearanceTime.trim() || undefined,
    });
  };

  const inputClass =
    "mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-500";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-1 pt-2">
      <div className="text-sm font-semibold text-gray-800">
        Thông tin top máy bay {SIDE_LABEL[side]}
      </div>

      <label className="text-xs text-gray-500">
        Số hiệu (vd: 0122)
        <input
          value={form.aircraftCode}
          onChange={change("aircraftCode")}
          className={inputClass}
          autoFocus
        />
      </label>

      <label className="text-xs text-gray-500">
        Độ cao (vd: 005)
        <input
          value={form.altitude}
          onChange={change("altitude")}
          className={inputClass}
        />
      </label>

      <label className="text-xs text-gray-500">
        Thời gian xuất hiện (phút)
        <input
          value={form.appearanceTime}
          onChange={change("appearanceTime")}
          className={inputClass}
        />
      </label>

      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
        >
          Quay lại
        </button>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Thêm
        </button>
      </div>
    </form>
  );
}
