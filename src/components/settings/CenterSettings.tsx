import { Crosshair } from "lucide-react";

export default function CenterSettings() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
        <Crosshair size={24} className="text-gray-400" />

        <p className="mt-3 text-sm font-medium text-gray-700">
          Thiết lập tâm tọa độ
        </p>

        <p className="mt-1 max-w-sm text-sm text-gray-500">
          Phần nhập kinh độ, vĩ độ và chọn tâm trên bản đồ sẽ được xây dựng tại
          đây.
        </p>
      </div>
    </section>
  );
}
