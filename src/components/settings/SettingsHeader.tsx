import { ArrowLeft, Settings } from "lucide-react";

type Props = {
  onBack: () => void;
};

export default function SettingsHeader({ onBack }: Props) {
  return (
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
  );
}
