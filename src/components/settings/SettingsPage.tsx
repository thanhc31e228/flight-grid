import { useState } from "react";
import { SettingsMenu } from "../../types/settings";
import { SETTINGS_MENU_ITEMS } from "./settings.menu";
import CoordinateSettings from "./CoordinateSettings";
import PlaceSettings from "./PlaceSettings";
import CenterSettings from "./CenterSettings";
import SettingsHeader from "./SettingsHeader";
import SettingsSidebar from "./SettingsSidebar";
import { Place } from "../../features/places/place.types";

type Props = {
  labelInput: string;
  onLabelInputChange: (value: string) => void;
  onSaveLabels: (labels: string[]) => Promise<void>;
  onFocusLocation: (loc: Place) => void;
  onBack: () => void;
};

export default function SettingsPage({
  labelInput,
  onLabelInputChange,
  onSaveLabels,
  onFocusLocation,
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
        return <PlaceSettings onFocus={onFocusLocation} />;

      case "center":
        return <CenterSettings />;

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      <SettingsHeader onBack={onBack} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SettingsSidebar
          activeMenu={activeMenu}
          onSelect={setActiveMenu}
          onBack={onBack}
        />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-5xl">
            {/* Tiêu đề */}
            <div className="mb-5 border-b border-gray-200 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeItem.label}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {activeItem.description}
              </p>
            </div>

            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
