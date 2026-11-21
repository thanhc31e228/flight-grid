import { Fragment, useState, useMemo, useEffect } from "react";
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

// Ô nhập label hàng / cột
const inputClass = `
  h-9 w-full min-w-0 rounded-md border border-gray-300 bg-white px-1
  text-center text-sm font-semibold text-gray-900 outline-none
  placeholder:font-normal placeholder:text-gray-300
  transition-colors
  focus:border-gray-900 focus:ring-1 focus:ring-gray-900
  disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400
`;

const btnBase = `
  inline-flex h-9 items-center justify-center rounded-md px-4
  text-sm font-medium transition-colors
  focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900
  focus-visible:ring-offset-2
  disabled:cursor-not-allowed disabled:opacity-50
`;
const btnSecondary = `${btnBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;
const btnPrimary = `${btnBase} bg-gray-900 text-white hover:bg-gray-800`;

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
    ariaLabel: string,
    onChange: (value: string) => void,
  ) => (
    <input
      value={value}
      maxLength={10}
      disabled={saving}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={inputClass}
    />
  );

  return (
    <>
      <section className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
        {/* Header */}
        <header className="flex items-start gap-3 border-b border-gray-200 px-4 py-3.5 sm:px-5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700">
            <Grid2X2 size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">
              Tọa độ bản đồ
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Đặt tên cho 10 hàng và 10 cột. Tọa độ của mỗi ô là label hàng ghép
              với label cột.
            </p>
          </div>
        </header>

        {/* Editor */}
        <div className="px-4 py-4 sm:px-5">
          {/* Cuộn ngang trên màn hình nhỏ để ô không bị bóp nhỏ */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="grid min-w-[640px] grid-cols-[3.5rem_repeat(10,minmax(0,1fr))] gap-1.5">
              {/* Góc trên trái */}
              <div className="flex h-9 items-center justify-center text-xs text-gray-400">
                Hàng / Cột
              </div>

              {/* Label cột */}
              {colLabels.map((label, index) => (
                <div key={`col-${index}`} className="min-w-0">
                  {renderLabelInput(
                    label,
                    `${index + 1}`,
                    `Label cột ${index + 1}`,
                    (value) => handleColChange(index, value),
                  )}
                </div>
              ))}

              {/* Label hàng + các ô tọa độ */}
              {rowLabels.map((rowLabel, rowIndex) => (
                <Fragment key={`row-${rowIndex}`}>
                  {renderLabelInput(
                    rowLabel,
                    `${rowIndex + 1}`,
                    `Label hàng ${rowIndex + 1}`,
                    (value) => handleRowChange(rowIndex, value),
                  )}

                  {colLabels.map((colLabel, colIndex) => {
                    const coordinate = `${rowLabel.trim()}${colLabel.trim()}`;

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        title={coordinate}
                        className={`
                          flex h-9 min-w-0 items-center justify-center
                          overflow-hidden rounded-md bg-gray-50 px-1 text-xs
                          tabular-nums
                          ${coordinate ? "text-gray-700" : "text-gray-300"}
                        `}
                      >
                        <span className="truncate">{coordinate || "—"}</span>
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Lỗi */}
          {error && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-xs tabular-nums text-gray-500">
            {filledCount}/20 label đã nhập
          </span>

          <div className="flex gap-2 sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={handleReset}
              className={`${btnSecondary} flex-1 sm:flex-none`}
            >
              Khôi phục
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleRequestSave}
              className={`${btnPrimary} flex-1 sm:flex-none`}
            >
              Lưu tọa độ
            </button>
          </div>
        </footer>
      </section>

      {/* Popup xác nhận */}
      {pendingLabels &&
        createPortal(
          <div
            className={`
              fixed inset-0 z-[99999] flex items-center justify-center
              bg-black/40 p-4 transition-opacity duration-200
              ${confirmAnimated ? "opacity-100" : "opacity-0"}
            `}
            onClick={() => !saving && setPendingLabels(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="coordinate-confirm-title"
              className={`
                w-full max-w-sm rounded-xl bg-white p-5 shadow-xl
                transition-all duration-200
                ${
                  confirmAnimated
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-2 scale-95 opacity-0"
                }
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <h4
                id="coordinate-confirm-title"
                className="text-base font-semibold text-gray-900"
              >
                Xác nhận lưu tọa độ
              </h4>

              <p className="mt-1.5 text-sm text-gray-600">
                Bạn có chắc muốn thay đổi toàn bộ tọa độ không? Tọa độ cũ sẽ bị
                ghi đè.
              </p>

              <p className="mt-4 rounded-md bg-gray-50 px-3 py-2 text-center text-sm font-medium tabular-nums text-gray-700">
                {pendingLabels[0]} … {pendingLabels[pendingLabels.length - 1]}
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setPendingLabels(null)}
                  className={btnSecondary}
                >
                  Hủy
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleConfirmSave}
                  className={btnPrimary}
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
              rounded-lg border px-4 py-3 text-sm shadow-lg
              ${
                toast.type === "success"
                  ? "border-gray-200 bg-white text-gray-900"
                  : "border-red-200 bg-red-50 text-red-700"
              }
            `}
          >
            <span aria-hidden="true" className="font-semibold">
              {toast.type === "success" ? "✓" : "⚠"}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setToast(null)}
              className="-mr-1 px-1 text-lg leading-none opacity-50 hover:opacity-100"
            >
              ×
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
