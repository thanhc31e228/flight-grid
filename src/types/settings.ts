export type SettingsMenu = "coordinates" | "places" | "center";

export type SettingsMenuItem = {
  id: SettingsMenu;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};
