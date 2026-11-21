import { useState } from "react";
import {
  ArrowLeft,
  Settings,
  Grid2X2,
  MapPin,
  Crosshair,
  ChevronRight,
} from "lucide-react";

import CoordinateSettings from "./CoordinateSettings";

type Props = {
  labelInput: string;
  onLabelInputChange: (value: string) => void;
  onSaveLabels: (labels: string[]) => Promise<void>;
  onBack: () => void;
};

type SettingsMenu = "coordinates" | "places" | "center";

const MENU_ITEMS: {
  id: SettingsMenu;
  label: string;
  description: string;
  icon: typeof Grid2X2;
}[] = [
  {
    id: "coordinates",
    label: "Cấu hình tọa độ",
    description: "Quản lý nhãn và hệ thống ô lưới",
    icon: Grid2X2,
  },
  {
    id: "places",
    label: "Địa điểm đánh dấu",
    description: "Quản lý các địa điểm đã lưu",
    icon: MapPin,
  },
  {
    id: "center",
    label: "Tâm hệ tọa độ",
    description: "Thiết lập tọa độ tâm và vị trí gốc của lưới",
    icon: Crosshair,
  },
];

export default function SettingsPage({
  labelInput,
  onLabelInputChange,
  onSaveLabels,
  onBack,
}: Props) {
  const [activeMenu, setActiveMenu] = useState<SettingsMenu>("coordinates");

  const activeItem = MENU_ITEMS.find((item) => item.id === activeMenu)!;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* ================= HEADER ================= */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="
            flex h-9 w-9 items-center justify-center rounded-lg
            border border-slate-200 bg-white text-slate-600
            transition-colors hover:bg-slate-100 hover:text-slate-900
          "
          title="Quay lại bản đồ"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <Settings size={18} className="text-slate-500" />

          <h1 className="text-base font-bold text-slate-800">Cài đặt</h1>
        </div>
      </header>

      {/* ================= BODY ================= */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ================= SIDEBAR ================= */}
        <aside
          className="
            flex w-64 shrink-0 flex-col
            border-r border-slate-200 bg-white
          "
        >
          {/* Sidebar heading */}
          <div className="border-b border-slate-100 px-4 py-4">
            <h2 className="text-sm font-bold text-slate-800">
              Thiết lập hệ thống
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Chọn danh mục cài đặt
            </p>
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMenu(item.id)}
                  className={`
                    group flex w-full items-center gap-3
                    rounded-xl px-3 py-3 text-left
                    transition-all duration-200
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  {/* Icon */}
                  <div
                    className={`
                      flex h-9 w-9 shrink-0 items-center justify-center
                      rounded-lg transition-colors
                      ${
                        isActive
                          ? "bg-blue-100 text-blue-600"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      }
                    `}
                  >
                    <Icon size={18} />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`
                        text-sm font-semibold
                        ${isActive ? "text-blue-700" : "text-slate-700"}
                      `}
                    >
                      {item.label}
                    </div>

                    <div className="mt-0.5 text-[11px] leading-4 text-slate-400">
                      {item.description}
                    </div>
                  </div>

                  {/* Active arrow */}
                  <ChevronRight
                    size={16}
                    className={`
                      shrink-0 transition-all
                      ${
                        isActive
                          ? "translate-x-0 text-blue-500 opacity-100"
                          : "-translate-x-1 text-slate-300 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                      }
                    `}
                  />
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={onBack}
              className="
                flex w-full items-center gap-2 rounded-lg px-3 py-2
                text-sm text-slate-500 transition-colors
                hover:bg-slate-100 hover:text-slate-800
              "
            >
              <ArrowLeft size={16} />
              Quay lại bản đồ
            </button>
          </div>
        </aside>

        {/* ================= CONTENT ================= */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Content heading */}
            <div className="border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <activeItem.icon size={21} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {activeItem.label}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {activeItem.description}
                  </p>
                </div>
              </div>
            </div>

            {/* ================= COORDINATES ================= */}
            {activeMenu === "coordinates" && (
              <CoordinateSettings
                labelInput={labelInput}
                onLabelInputChange={onLabelInputChange}
                onSaveLabels={onSaveLabels}
              />
            )}

            {/* ================= PLACES ================= */}
            {activeMenu === "places" && (
              <div
                className="
                  rounded-xl border border-slate-200 bg-white
                  p-5 shadow-sm
                "
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <MapPin size={20} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800">
                      Quản lý địa điểm đánh dấu
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Thiết lập cách lưu trữ, hiển thị và quản lý các địa điểm
                      đánh dấu trên bản đồ.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <MapPin size={28} className="mx-auto text-slate-400" />

                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Chưa có thiết lập
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Phần quản lý cài đặt địa điểm sẽ được bổ sung tại đây.
                  </p>
                </div>
              </div>
            )}

            {/* ================= CENTER ================= */}
            {activeMenu === "center" && (
              <div
                className="
                  rounded-xl border border-slate-200 bg-white
                  p-5 shadow-sm
                "
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Crosshair size={20} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800">
                      Thiết lập tâm hệ tọa độ
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Cấu hình vị trí tâm làm gốc để xây dựng và bố trí hệ thống
                      ô lưới trên bản đồ.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <Crosshair size={28} className="mx-auto text-slate-400" />

                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Chưa có thiết lập tâm tọa độ
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Phần cấu hình tọa độ tâm và gốc lưới sẽ được bổ sung tại
                    đây.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
