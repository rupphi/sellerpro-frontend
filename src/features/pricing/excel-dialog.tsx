"use client";
import { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api, type Store, type Change } from "@/lib/api";
import { Modal, Button, Badge, Skeleton } from "../../components/ui";
export function ExcelDialog({
  store,
  open,
  onOpenChange,
  onSubmitted,
}: {
  store: Store;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
      changes: Change[];
      errors: { row: number; message: string }[];
      total: number;
    } | null>(null),
    [name, setName] = useState(""),
    [phase, setPhase] = useState<"upload" | "save" | "download" | null>(null);
  const busy = phase !== null;
  async function download() {
    if (busy) return;
    setPhase("download");
    try {
      const response = await fetch(`/api/stores/${store.id}/excel`);
      if (!response.ok)
        throw new Error("Không tải được mẫu Excel. Vui lòng thử lại.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "sellerpro-prices.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPhase(null);
    }
  }
  async function upload(file?: File) {
    if (!file || busy) return;
    setPreview(null);
    setName(file.name);
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File tối đa 5 MB.");
      return;
    }
    setPhase("upload");
    try {
      const form = new FormData();
      form.append("file", file);
      setPreview(
        await api(`/stores/${store.id}/excel/preview`, {
          method: "POST",
          body: form,
        }),
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPhase(null);
    }
  }
  async function save() {
    if (!preview?.changes.length || busy) return;
    setPhase("save");
    try {
      await api(`/stores/${store.id}/prices`, {
        method: "POST",
        body: JSON.stringify({ changes: preview.changes }),
      });
      toast.success("Đã đưa các thay đổi Excel vào hàng đợi.");
      onSubmitted();
      onOpenChange(false);
      setPreview(null);
      setName("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPhase(null);
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
      title="Cập nhật giá bằng Excel"
      description={`Cửa hàng ${store.name}. Kiểm tra dữ liệu trước khi gửi thay đổi lên sàn.`}
    >
      <h3 className="text-sm font-semibold mb-3">1. Tải mẫu có sẵn sản phẩm</h3>
      <p className="text-xs text-muted leading-relaxed mb-4">
        Điền giá mới, mức giảm giá và lựa chọn bảo vệ trong file. Giữ nguyên các
        cột còn lại.
      </p>
      <Button onClick={download} loading={phase === "download"} disabled={busy}>
        <Download size={17} />
        Tải mẫu Excel
      </Button>
      <h3 className="text-sm font-semibold mt-7 mb-3">
        2. Tải lên và xem kết quả kiểm tra
      </h3>
      <button
        type="button"
        className="upload-zone w-full"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files[0]);
        }}
        disabled={busy}
        aria-busy={phase === "upload"}
      >
        <span className="empty-icon w-12! h-12! mb-0!">
          {phase === "upload" ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <Upload size={22} />
          )}
        </span>
        <span className="text-brand font-semibold text-sm">
          {name || "Chọn file hoặc kéo thả vào đây"}
        </span>
        <span className="text-xs text-muted">
          XLSX · Tối đa 5 MB · 1.000 thay đổi/lần
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".xlsx"
        className="sr-only"
        aria-label="Chọn file Excel"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <div className="excel-preview-slot" aria-busy={phase === "upload"}>
        {phase === "upload" ? (
          <div
            role="status"
            aria-label="Đang kiểm tra file Excel"
            className="space-y-3"
          >
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : (
          preview && (
            <div>
              <Badge tone={preview.errors.length ? "red" : "green"}>
                {preview.errors.length
                  ? `${preview.errors.length} lỗi cần sửa`
                  : `${preview.total} sản phẩm thay đổi`}
              </Badge>
              <div className="max-h-32 overflow-auto mt-2">
                {preview.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 py-1">
                    {e.row ? `Dòng ${e.row}: ` : ""}
                    {e.message}
                  </p>
                ))}
              </div>
              {!preview.errors.length && (
                <p className="text-xs text-muted mt-2">
                  {preview.total
                    ? "Dữ liệu hợp lệ. Nhấn Cập nhật để gửi các thay đổi."
                    : "Không có giá hoặc trạng thái khóa nào thay đổi."}
                </p>
              )}
            </div>
          )
        )}
      </div>
      <div className="flex justify-end gap-3 mt-7">
        <Button disabled={busy} onClick={() => onOpenChange(false)}>
          Đóng
        </Button>
        <Button
          variant="primary"
          loading={phase === "save"}
          disabled={busy || !preview?.changes.length || !!preview.errors.length}
          onClick={save}
        >
          Cập nhật {preview?.changes.length || ""}
        </Button>
      </div>
    </Modal>
  );
}
