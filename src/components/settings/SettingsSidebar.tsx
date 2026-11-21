import { ArrowLeft, ChevronRight } from "lucide-react";
import { SettingsMenu } from "../../types/settings";
import { SETTINGS_MENU_ITEMS } from "./settings.menu";

type Props = {
  activeMenu: SettingsMenu;
  onSelect: (menu: SettingsMenu) => void;
  onBack: () => void;
};

export default function SettingsSidebar({
  activeMenu,
  onSelect,
  onBack,
}: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Sidebar heading */}
      <div className="border-b border-slate-100 px-4 py-4">
        <h2 className="text-sm font-bold text-slate-800">Thiết lập hệ thống</h2>

        <p className="mt-1 text-xs text-slate-500">Chọn danh mục cài đặt</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {SETTINGS_MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`
                group flex w-full items-center gap-3 rounded-xl
                px-3 py-3 text-left transition-all duration-200
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
                  flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                  transition-colors
                  ${
                    isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }
                `}
              >
                <Icon size={18} />
              </div>

              {/* Label */}
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-semibold ${
                    isActive ? "text-blue-700" : "text-slate-700"
                  }`}
                >
                  {item.label}
                </div>

                <div className="mt-0.5 text-[11px] leading-4 text-slate-400">
                  {item.description}
                </div>
              </div>

              {/* Arrow */}
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
  );
}
