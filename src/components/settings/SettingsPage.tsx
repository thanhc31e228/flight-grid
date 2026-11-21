import { useState } from "react";
import { SettingsMenu } from "../../types/settings";
import { SETTINGS_MENU_ITEMS } from "./settings.menu";
import CoordinateSettings from "./CoordinateSettings";
import PlaceSettings from "./PlaceSettings";
import CenterSettings from "./CenterSettings";
import SettingsHeader from "./SettingsHeader";
import SettingsSidebar from "./SettingsSidebar";

type Props = {
  labelInput: string;
  onLabelInputChange: (value: string) => void;
  onSaveLabels: (labels: string[]) => Promise<void>;
  onBack: () => void;
};

export default function SettingsPage({
  labelInput,
  onLabelInputChange,
  onSaveLabels,
  onBack,
}: Props) {
  const [activeMenu, setActiveMenu] = useState<SettingsMenu>("coordinates");

  const activeItem = SETTINGS_MENU_ITEMS.find(
    (item) => item.id === activeMenu,
  )!;

  const renderContent = () => {
    switch (activeMenu) {
      case "coordinates":
        return (
          <CoordinateSettings
            labelInput={labelInput}
            onLabelInputChange={onLabelInputChange}
            onSaveLabels={onSaveLabels}
          />
        );

      case "places":
        return <PlaceSettings />;

      case "center":
        return <CenterSettings />;

      default:
        return null;
    }
  };

  const ActiveIcon = activeItem.icon;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* Header */}
      <SettingsHeader onBack={onBack} />

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <SettingsSidebar
          activeMenu={activeMenu}
          onSelect={setActiveMenu}
          onBack={onBack}
        />

        {/* Content */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Heading */}
            <div className="border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ActiveIcon size={21} />
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

            {/* Active component */}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
