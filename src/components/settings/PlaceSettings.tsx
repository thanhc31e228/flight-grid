import { MapPin } from "lucide-react";

export default function PlaceSettings() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <MapPin size={20} />
        </div>

        <div>
          <h3 className="font-semibold text-slate-800">
            Quản lý địa điểm đánh dấu
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Thiết lập cách lưu trữ và hiển thị địa điểm trên bản đồ.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <MapPin size={28} className="mx-auto text-slate-400" />

        <p className="mt-3 text-sm font-medium text-slate-600">
          Cài đặt địa điểm
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Chức năng thiết lập địa điểm sẽ được bổ sung tại đây.
        </p>
      </div>
    </section>
  );
}
