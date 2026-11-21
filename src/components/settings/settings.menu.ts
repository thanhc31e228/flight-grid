import { Grid2X2, MapPin, Crosshair } from "lucide-react";
import { SettingsMenuItem } from "../../types/settings";

export const SETTINGS_MENU_ITEMS: SettingsMenuItem[] = [
  {
    id: "coordinates",
    label: "Cấu hình tọa độ",
    description: "Quản lý hệ thống ô lưới",
    icon: Grid2X2,
  },
  {
    id: "places",
    label: "Địa điểm đánh dấu",
    description: "Quản lý địa điểm đã lưu",
    icon: MapPin,
  },
  {
    id: "center",
    label: "Tâm hệ tọa độ",
    description: "Thiết lập tâm và gốc lưới",
    icon: Crosshair,
  },
];
