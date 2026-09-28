"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, type Store } from "@/lib/api";
import { Button, Input, Modal } from "../../components/ui";

export function DeleteStoreDialog({ store, onClose, onDeleted }: { store: Store; onClose: () => void; onDeleted: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <Modal open onOpenChange={open => { if (!open && !busy) onClose(); }} title={`Xóa ${store.name}?`}
    description="Chỉ xóa kết nối, sản phẩm, lịch sử giá và tác vụ đã lưu trong sellerpro. Không xóa sản phẩm hay cửa hàng trên WB/Ozon. Dữ liệu trong ứng dụng không thể khôi phục bằng thao tác này.">
    <form onSubmit={async e => {
      e.preventDefault(); if (busy || name !== store.name) return;
      setBusy(true); setError("");
      try {
        await api(`/stores/${store.id}`, { method: "DELETE", body: JSON.stringify({ confirmName: name }) });
        toast.success("Đã xóa kết nối cửa hàng khỏi sellerpro.");
        try { await onDeleted(); }
        catch { toast.error("Đã xóa cửa hàng. Hãy tải lại trang để cập nhật danh sách."); }
        onClose();
      } catch (e) { setError((e as Error).message); setBusy(false); }
    }}>
      <label className="label" htmlFor="delete-store-name">Nhập đúng tên cửa hàng để xác nhận</label>
      <Input id="delete-store-name" value={name} onChange={e => setName(e.target.value)} placeholder={store.name} autoComplete="off" disabled={busy} />
      <p className="text-sm text-muted mt-3">Nếu cửa hàng đang xử lý tác vụ, hãy chờ hoàn tất rồi xóa.</p>
      <div role="alert" className="text-sm text-red-600 min-h-6 mt-3">{error}</div>
      <div className="flex justify-end gap-3 mt-5"><Button type="button" disabled={busy} onClick={onClose}>Hủy</Button>
        <Button type="submit" variant="danger" disabled={name !== store.name} loading={busy}><Trash2 size={16} />Xóa cửa hàng</Button></div>
    </form>
  </Modal>;
}
