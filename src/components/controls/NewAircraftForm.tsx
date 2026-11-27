import { useState, type ChangeEvent, type FormEvent } from "react";

import type { AircraftSide } from "./factory/aircraft.factory";
import { useAirCraftContext } from "../../context/MakerContext";
import { useMapContext } from "../../context/MapContext";
import { usePick } from "../MapTiler/utils/pick.store";

const SIDE_LABEL: Record<AircraftSide, string> = {
  friendly: "ta",
  enemy: "địch",
};

// Lấy giờ hiện tại theo local time, định dạng HHmm
function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}${minutes}`;
}

// Chuẩn hóa thành 4 số HHmm
function normalizeTime(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.padStart(4, "0");
}

type Props = {
  side: AircraftSide;
  onBack: () => void;
};

export default function NewAircraftForm({ side, onBack }: Props) {
  const { addAircraft, setAircraftSelected } = useAirCraftContext();
  const { gridSelected } = useMapContext();
  const pick = usePick();

  const [form, setForm] = useState({
    id: "",
    aircraftCode: "",
    altitude: "",
    appearanceTime: getCurrentTime(),
  });

  const change =
    (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      if (field === "appearanceTime") {
        value = value.replace(/\D/g, "").slice(0, 4);
      }

      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const id = form.id.trim();

    if (!id) return;

    // Kiểm tra prefix theo phe
    const expectedPrefix = side === "enemy" ? "4" : "5";

    if (!id.startsWith(expectedPrefix)) {
      alert(
        side === "enemy"
          ? "ID máy bay địch phải bắt đầu bằng số 4!"
          : "ID máy bay ta phải bắt đầu bằng số 5!",
      );
      return;
    }

    // Chuẩn hóa thời gian xuất hiện
    const appearanceTime = form.appearanceTime.trim()
      ? normalizeTime(form.appearanceTime)
      : getCurrentTime();

    // Bắt buộc phải chọn điểm trên bản đồ trước khi thêm máy bay
    if (!pick) {
      alert("Vui lòng chọn điểm xuất hiện trên bản đồ!");
      return;
    }

    // Thêm aircraft
    const result = addAircraft({
      id,
      name: id,
      aircraftCode: form.aircraftCode.trim() || "chưa xác định",
      altitude: form.altitude.trim() || "chưa xác định",
      appearanceTime,
      points: [
        {
          lng: pick.lng,
          lat: pick.lat,
          appearanceTime,
          coordinateGridId: gridSelected?.id || "",
        },
      ],
    });
    // ID trùng
    if (!result) {
      alert("ID máy bay đã tồn tại!");
      return;
    }
    setAircraftSelected(result);

    // Thành công → đóng form
    onBack();
  };

  const inputClass =
    "mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-500";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-1 pt-2">
      <div className="text-sm font-semibold text-gray-800">
        Thông tin máy bay {SIDE_LABEL[side]}
      </div>

      <label className="text-xs text-gray-500">
        Số tốp
        <input
          value={form.id}
          onChange={change("id")}
          className={inputClass}
          placeholder={side === "enemy" ? "401" : "501"}
          required
        />
      </label>

      <label className="text-xs text-gray-500">
        SL-KL (vd: 0122)
        <input
          value={form.aircraftCode}
          onChange={change("aircraftCode")}
          className={inputClass}
          placeholder="0122"
        />
      </label>

      <label className="text-xs text-gray-500">
        Độ cao (hm)
        <input
          value={form.altitude}
          onChange={change("altitude")}
          className={inputClass}
          placeholder="005"
        />
      </label>

      <label className="text-xs text-gray-500">
        Thời gian xuất hiện (HHmm)
        <input
          value={form.appearanceTime}
          onChange={change("appearanceTime")}
          onBlur={() => {
            setForm((prev) => ({
              ...prev,
              appearanceTime: prev.appearanceTime
                ? normalizeTime(prev.appearanceTime)
                : getCurrentTime(),
            }));
          }}
          className={inputClass}
          placeholder="1030"
          inputMode="numeric"
          maxLength={4}
        />
        <span className="mt-0.5 block text-[10px] text-gray-400">
          Định dạng 24 giờ, ví dụ 0631 = 06:31
        </span>
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
