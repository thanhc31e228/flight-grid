import { Crosshair } from "lucide-react";

export default function CenterSettings() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <Crosshair size={20} />
        </div>

        <div>
          <h3 className="font-semibold text-slate-800">
            Thiết lập tâm hệ tọa độ
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Cấu hình tọa độ tâm làm gốc để bố trí hệ thống ô lưới.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <Crosshair size={28} className="mx-auto text-slate-400" />

        <p className="mt-3 text-sm font-medium text-slate-600">
          Thiết lập tâm tọa độ
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Phần nhập kinh độ, vĩ độ và chọn tâm trên bản đồ sẽ được xây dựng tại
          đây.
        </p>
      </div>
    </section>
  );
}
