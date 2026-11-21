import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Grid2X2 } from "lucide-react";

type Props = {
  labelInput: string;
  onLabelInputChange: (value: string) => void;
  onSaveLabels: (labels: string[]) => Promise<void>;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const inputClass = `
  h-8 w-full min-w-0 rounded-md border border-gray-200
  bg-gray-50 px-0.5 text-center text-xs font-medium outline-none
  transition-colors duration-200
  focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100
  disabled:cursor-not-allowed disabled:opacity-60
`;

const SIZE = 10;
const TOAST_DURATION = 3500;

// Tách 100 label thành label hàng / cột
const parseLabels = (labels: string[]) => {
  if (labels.length === SIZE * SIZE) {
    return {
      rows: Array.from(
        { length: SIZE },
        (_, i) => labels[i * SIZE]?.slice(0, -1) ?? "",
      ),
      cols: Array.from({ length: SIZE }, (_, i) => labels[i]?.slice(-1) ?? ""),
    };
  }

  return {
    rows: Array<string>(SIZE).fill(""),
    cols: Array<string>(SIZE).fill(""),
  };
};

export default function CoordinateSettings({
  labelInput,
  onLabelInputChange,
  onSaveLabels,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Popup xác nhận + thông báo kết quả
  const [pendingLabels, setPendingLabels] = useState<string[] | null>(null);
  const [confirmAnimated, setConfirmAnimated] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const [rowLabels, setRowLabels] = useState<string[]>(() =>
    Array<string>(SIZE).fill(""),
  );
  const [colLabels, setColLabels] = useState<string[]>(() =>
    Array<string>(SIZE).fill(""),
  );

  const gridLabels = useMemo(
    () => labelInput.trim().split(/\s+/).filter(Boolean),
    [labelInput],
  );

  // Đồng bộ editor mỗi khi labelInput thay đổi (lúc mount + sau khi lưu)
  useEffect(() => {
    const { rows, cols } = parseLabels(gridLabels);
    setRowLabels(rows);
    setColLabels(cols);
    setError("");
  }, [gridLabels]);

  // Animation popup xác nhận
  useEffect(() => {
    if (!pendingLabels) {
      setConfirmAnimated(false);
      return;
    }

    const frame = requestAnimationFrame(() => setConfirmAnimated(true));

    return () => cancelAnimationFrame(frame);
  }, [pendingLabels]);

  // Đóng popup bằng phím Esc
  useEffect(() => {
    if (!pendingLabels) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) setPendingLabels(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingLabels, saving]);

  // Tự ẩn thông báo
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(null), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRowChange = (index: number, value: string) => {
    setRowLabels((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleColChange = (index: number, value: string) => {
    setColLabels((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  // Khôi phục về tọa độ đang lưu
  const handleReset = () => {
    const { rows, cols } = parseLabels(gridLabels);
    setRowLabels(rows);
    setColLabels(cols);
    setError("");
  };

  // Bấm "Lưu tọa độ": kiểm tra dữ liệu rồi mở popup xác nhận
  const handleRequestSave = () => {
    const rows = rowLabels.map((label) => label.trim());
    const cols = colLabels.map((label) => label.trim());

    if (rows.some((label) => !label) || cols.some((label) => !label)) {
      setError("Vui lòng nhập đầy đủ 10 label hàng và 10 label cột.");
      return;
    }

    const labels = rows.flatMap((row) => cols.map((col) => `${row}${col}`));

    if (new Set(labels).size !== SIZE * SIZE) {
      setError("Các tọa độ bị trùng nhau. Vui lòng kiểm tra lại label.");
      return;
    }

    setError("");
    setPendingLabels(labels);
  };

  // Xác nhận trong popup: gọi lưu và báo kết quả
  const handleConfirmSave = async () => {
    if (!pendingLabels) return;

    try {
      setSaving(true);

      await onSaveLabels(pendingLabels);
      onLabelInputChange(pendingLabels.join(" "));

      setPendingLabels(null);
      setToast({ type: "success", message: "Đã lưu tọa độ thành công." });
    } catch (err) {
      setPendingLabels(null);
      setToast({
        type: "error",
        message:
          err instanceof Error && err.message
            ? `Lưu tọa độ thất bại: ${err.message}`
            : "Lưu tọa độ thất bại. Vui lòng thử lại.",
      });
    } finally {
      setSaving(false);
    }
  };

  const filledCount =
    rowLabels.filter((label) => label.trim()).length +
    colLabels.filter((label) => label.trim()).length;

  const renderLabelInput = (
    value: string,
    placeholder: string,
    onChange: (value: string) => void,
  ) => (
    <input
      value={value}
      maxLength={10}
      disabled={saving}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );

  return (
    <>
      <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3">
          <Grid2X2 size={18} className="text-blue-600" />
          <h3 className="text-base font-bold text-gray-900">
            Thiết lập tọa độ
          </h3>
        </div>

        {/* Editor content */}
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-[56px_repeat(10,minmax(0,1fr))] gap-1">
            <div className="flex h-8 items-center justify-center text-xs text-gray-400">
              Hàng
            </div>

            {/* Column labels */}
            {colLabels.map((label, index) => (
              <div key={`col-${index}`} className="min-w-0">
                {renderLabelInput(label, `${index + 1}`, (value) =>
                  handleColChange(index, value),
                )}
              </div>
            ))}

            {/* Row labels and coordinates */}
            {rowLabels.map((rowLabel, rowIndex) => (
              <div key={`row-${rowIndex}`} className="contents">
                {renderLabelInput(rowLabel, `${rowIndex + 1}`, (value) =>
                  handleRowChange(rowIndex, value),
                )}

                {colLabels.map((colLabel, colIndex) => {
                  const coordinate = `${rowLabel.trim()}${colLabel.trim()}`;

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      title={coordinate}
                      className={`
                        flex h-8 min-w-0 items-center justify-center
                        overflow-hidden rounded-md border px-1 text-xs
                        font-semibold transition-colors
                        ${
                          coordinate
                            ? "border-blue-100 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-gray-50 text-gray-300"
                        }
                      `}
                    >
                      <span className="truncate">{coordinate || "—"}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-gray-500">
            {filledCount}/20 label đã nhập
          </span>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleReset}
              className="
                rounded-lg border border-gray-300 bg-white px-4 py-2
                text-sm font-semibold text-gray-600
                transition-colors hover:bg-gray-100 disabled:opacity-50
              "
            >
              Khôi phục
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleRequestSave}
              className="
                rounded-lg bg-blue-600 px-4 py-2
                text-sm font-semibold text-white shadow-sm
                transition-colors duration-200
                hover:bg-blue-700
                disabled:cursor-not-allowed disabled:opacity-60
              "
            >
              ✓ Lưu tọa độ
            </button>
          </div>
        </div>
      </div>

      {/* Popup xác nhận */}
      {pendingLabels &&
        createPortal(
          <div
            className={`
              fixed inset-0 z-[99999] flex items-center justify-center
              bg-black/50 p-4 backdrop-blur-sm
              transition-opacity duration-200
              ${confirmAnimated ? "opacity-100" : "opacity-0"}
            `}
            onClick={() => !saving && setPendingLabels(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="coordinate-confirm-title"
              className={`
                w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl
                transition-all duration-200
                ${
                  confirmAnimated
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-3 scale-95 opacity-0"
                }
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <h4
                id="coordinate-confirm-title"
                className="text-base font-bold text-gray-900"
              >
                Xác nhận lưu tọa độ
              </h4>

              <p className="mt-2 text-sm text-gray-600">
                Bạn có chắc muốn thay đổi toàn bộ tọa độ không? Tọa độ cũ sẽ bị
                ghi đè.
              </p>

              <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                {pendingLabels[0]} … {pendingLabels[pendingLabels.length - 1]}
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setPendingLabels(null)}
                  className="
                    rounded-lg border border-gray-300 bg-white px-4 py-2
                    text-sm font-semibold text-gray-600
                    transition-colors hover:bg-gray-100 disabled:opacity-50
                  "
                >
                  Hủy
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleConfirmSave}
                  className="
                    rounded-lg bg-blue-600 px-4 py-2
                    text-sm font-semibold text-white shadow-sm
                    transition-colors hover:bg-blue-700
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  {saving ? "Đang lưu..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Thông báo thành công / thất bại */}
      {toast &&
        createPortal(
          <div
            role="status"
            className={`
              fixed right-4 top-4 z-[100000] flex max-w-sm items-start gap-2.5
              rounded-xl border px-4 py-3 text-sm font-medium shadow-lg
              ${
                toast.type === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }
            `}
          >
            <span aria-hidden="true">
              {toast.type === "success" ? "✓" : "⚠"}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setToast(null)}
              className="-mr-1 px-1 text-lg leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
