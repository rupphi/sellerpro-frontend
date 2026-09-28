"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { price } from "@/lib/utils";
import { Button, Modal, Skeleton } from "@/components/ui";
import { type SalesEvent, channelNames, eventNames, statusNames } from "./types";

export const salesTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Europe/Moscow", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
export function OrderDetail({ storeId, event, close }: { storeId: string; event: SalesEvent; close: () => void }) {
  const query = useQuery({ queryKey: ["sales-order", storeId, event.id], queryFn: () => api<SalesEvent[]>(`/stores/${storeId}/sales/orders/${event.id}`) });
  return <Modal open onOpenChange={v => { if (!v) close(); }} title="Chi tiết đơn hàng" description={`Mã đơn: ${event.orderKey}`} wide>
    <p className="text-sm text-muted mb-5">Giờ Moscow · Giá trị bán và trả là tạm tính, chưa phải tiền quyết toán. Không lưu thông tin cá nhân người mua.</p>
    {query.isPending ? <Skeleton className="h-52" /> : query.isError ? <div role="alert">Không tải được chi tiết. <Button onClick={() => query.refetch()}>Thử lại</Button></div> : <ol className="space-y-4">
      {query.data?.map(row => <li key={row.id} className="rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap justify-between gap-3"><strong>{eventNames[row.kind]} · {statusNames[row.status] || row.status}</strong><span className={row.kind === "return" ? "font-semibold text-red-600" : "font-semibold"}>{row.amount === null ? "Chờ giá trị" : `${row.kind === "return" ? "−" : ""}${price(row.amount, row.currency)}`}</span></div>
        <p className="mt-2">{row.title || row.article} <span className="text-muted">· {row.article} · SL {row.quantity}</span></p>
        <p className="text-sm text-muted mt-2">{salesTime(row.occurredAt)} · {channelNames[row.channel]}</p>
      </li>)}
    </ol>}
    <p className="text-sm text-muted mt-5">Sự kiện trả hàng có thể đến sau ngày đặt nhiều ngày. Thiếu sự kiện đặt ban đầu không có nghĩa là đơn không tồn tại.</p>
  </Modal>;
}
