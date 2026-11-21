import { MapPin } from "lucide-react";

export default function PlaceSettings() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
        <MapPin size={24} className="text-gray-400" />

        <p className="mt-3 text-sm font-medium text-gray-700">
          Cài đặt địa điểm
        </p>

        <p className="mt-1 text-sm text-gray-500">
          Chức năng thiết lập địa điểm sẽ được bổ sung tại đây.
        </p>
      </div>
    </section>
  );
}
