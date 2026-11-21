import CoordinateSettings from "./CoordinateSettings";

type Props = {
  labelInput: string;
  onLabelInputChange: (value: string) => void;
  onSaveLabels: (labels: string[]) => Promise<void>;
};

export default function SettingsPage({
  labelInput,
  onLabelInputChange,
  onSaveLabels,
}: Props) {
  return (
    <div className="min-h-full bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý cấu hình bản đồ và các thiết lập hệ thống.
          </p>
        </div>

        {/* Coordinate settings */}
        <CoordinateSettings
          labelInput={labelInput}
          onLabelInputChange={onLabelInputChange}
          onSaveLabels={onSaveLabels}
        />
      </div>
    </div>
  );
}
