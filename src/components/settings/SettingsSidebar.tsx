import { ArrowLeft } from "lucide-react";
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
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Tiêu đề */}
      <div className="border-b border-gray-200 px-4 py-3.5">
        <h2 className="text-sm font-semibold text-gray-900">
          Thiết lập hệ thống
        </h2>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {SETTINGS_MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`
                flex w-full items-center gap-2.5 rounded-md px-3 py-2
                text-left text-sm transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900
                ${
                  isActive
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }
              `}
            >
              <Icon size={16} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quay lại */}
      <div className="border-t border-gray-200 p-2">
        <button
          type="button"
          onClick={onBack}
          className="
            flex w-full items-center gap-2.5 rounded-md px-3 py-2
            text-sm text-gray-600 transition-colors
            hover:bg-gray-50 hover:text-gray-900
            focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900
          "
        >
          <ArrowLeft size={16} className="shrink-0" />
          Quay lại bản đồ
        </button>
      </div>
    </aside>
  );
}
