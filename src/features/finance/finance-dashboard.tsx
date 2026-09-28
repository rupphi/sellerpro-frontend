"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Wallet, ArrowRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { price, time } from "@/lib/utils";
import { useStore } from "@/features/stores/workspace";
import { Button, Modal, Skeleton } from "@/components/ui";
import { DateRangePicker } from "@/components/date-range-picker";
import { recentRange, formatRange } from "@/lib/date-range";

const labels = {
  retailAmountSum: "Giá trị bán theo báo cáo",
  forPaySum: "Tiền hàng được ghi nhận cho người bán",
  bankPaymentSum: "Thanh toán theo báo cáo",
  deliveryServiceSum: "Vận chuyển",
  paidStorageSum: "Lưu kho",
  paidAcceptanceSum: "Tiếp nhận hàng",
  deductionSum: "Các khoản khấu trừ",
  penaltySum: "Tiền phạt",
  additionalPaymentSum: "Khoản bổ sung",
  cashbackAmountSum: "Cashback",
  cashbackDiscountSum: "Chiết khấu cashback",
  cashbackCommissionChangeSum: "Điều chỉnh hoa hồng cashback",
} as const;
type Amounts = Record<keyof typeof labels, number | null>;
type Report = { id: string; from: string; to: string; created: string; currency: string; reportType: number; amounts: Amounts };
type Response = { supported: boolean; status: string; checkedAt: string | null; succeededAt: string | null; reports: Report[]; totals: { currency: string; amounts: Amounts }[]; warnings: string[]; task: { id: string; progress: number; payload: { from: string; to: string } } | null };
const money = (value: number | null | undefined, currency: string) => value == null ? "—" : price(value, currency);
const fees = ["deliveryServiceSum", "paidStorageSum", "paidAcceptanceSum", "deductionSum", "penaltySum"] as const;

export default function FinanceDashboard() {
  const { store } = useStore();
  return <FinanceScreen key={store.id} storeId={store.id} platform={store.platform} />;
}
function FinanceScreen({ storeId, platform }: { storeId: string; platform: string }) {
  const [period, setPeriod] = useState(() => recentRange(30));
  const [busy, setBusy] = useState(false), [detail, setDetail] = useState<Report | null>(null);
  const report = useQuery({ queryKey: ["finance", storeId, period], queryFn: () => api<Response>(`/stores/${storeId}/finance?${new URLSearchParams(period)}`), refetchInterval: q => q.state.data?.task ? 3000 : 60000 });
  const data = report.data;
  async function sync() {
    setBusy(true);
    try { await api(`/stores/${storeId}/finance/sync`, { method: "POST", body: JSON.stringify(period) }); toast.success("Đã yêu cầu cập nhật báo cáo tài chính."); await report.refetch(); }
    catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="breadcrumb"><Wallet size={16} />Quản lý dòng tiền</div><h1 className="page-title">Báo cáo tài chính</h1><p className="page-subtitle">Biết tiền được nhận, khoản bị trừ và báo cáo cần kiểm tra.</p></div><Button loading={busy || !!data?.task} disabled={platform !== "wb"} onClick={sync}><RefreshCw size={17} />Cập nhật báo cáo</Button></header>
    <section className="flex flex-wrap items-center justify-between gap-4" aria-label="Kỳ quyết toán"><div><DateRangePicker label="Khoảng ngày quyết toán" value={period} onChange={p => { setPeriod(p); setDetail(null); }} resetValue={recentRange(30)} /><p className="text-xs text-muted mt-2">Báo cáo ngày · Kỳ quyết toán theo giờ Moscow · Tối đa 45 ngày</p></div><p className="text-sm text-muted">Cập nhật thành công: {time(data?.succeededAt)}</p></section>
    {report.isError && <div className="card p-5" role="alert"><p>{report.error.message}</p><Button className="mt-3" onClick={() => report.refetch()}>Thử lại</Button></div>}
    {report.isPending ? <div className="grid sm:grid-cols-3 gap-4" aria-label="Đang tải tài chính">{[0, 1, 2].map(n => <Skeleton key={n} className="h-36" />)}<Skeleton className="sm:col-span-3 h-80" /></div> : data && <>
      {data.task && <div className="notice" role="status"><RefreshCw size={16} className="animate-spin" />Đang cập nhật kỳ {formatRange(data.task.payload)} · {data.task.progress}%</div>}
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-2 text-sm" role="status">{data.warnings.map(w => <p key={w}>{w}</p>)}</div>
      {data.totals.map(total => <section key={total.currency} className="space-y-5" aria-label={`Tổng quyết toán ${total.currency}`}>
        <div className="grid md:grid-cols-3 gap-4">{(["retailAmountSum", "forPaySum", "bankPaymentSum"] as const).map((key, index) => <div className="card p-6" key={key}><p className="text-sm text-muted">{labels[key]}</p><p className={`text-2xl font-semibold tabular-nums mt-4 ${index === 2 ? "text-brand" : ""}`}>{money(total.amounts[key], total.currency)}</p><p className="text-xs text-muted leading-relaxed mt-3">{index === 0 ? "Theo các báo cáo trong kỳ; chưa tách riêng bán và trả." : index === 1 ? "Không phải lợi nhuận hoặc tiền đã về ngân hàng." : "Dùng để đối chiếu quyết toán, không thay thế sao kê."}</p></div>)}</div>
        <div className="grid lg:grid-cols-2 gap-5"><section className="card p-6"><h2 className="text-lg font-semibold">Các khoản phí & khấu trừ</h2><div className="divide-y divide-gray-100 mt-4">{fees.map(key => <div key={key} className="py-3 flex justify-between gap-4 text-sm"><span>{labels[key]}</span><strong className="tabular-nums whitespace-nowrap">{money(total.amounts[key], total.currency)}</strong></div>)}</div><p className="text-xs text-muted mt-3">Giữ nguyên dấu và giá trị từ sàn; không cộng thêm vào tiền thanh toán đã báo cáo.</p></section>
          <section className="card p-6"><h2 className="text-lg font-semibold">Việc cần kiểm tra</h2><ul className="mt-4 space-y-4 text-sm leading-relaxed"><li>Đối chiếu <strong>{money(total.amounts.bankPaymentSum, total.currency)}</strong> với các kỳ chuyển tiền và sao kê ngân hàng.</li>{total.amounts.penaltySum != null && total.amounts.penaltySum > 0 && <li className="rounded-xl bg-amber-50 p-3">Có tiền phạt: mở từng báo cáo để tìm kỳ phát sinh và kiểm chứng chứng từ trước khi khiếu nại.</li>}<li>Khoản khấu trừ có thể bao gồm nhiều dịch vụ. Chưa gán tất cả khoản này thành chi phí quảng cáo.</li><li>Chưa đủ dữ liệu để xếp hạng sản phẩm có lãi. Cần bổ sung chi tiết giao dịch và giá vốn theo SKU.</li></ul></section></div>
      </section>)}
      <section className="card overflow-hidden"><div className="p-6 flex justify-between items-center gap-4"><div><h2 className="text-lg font-semibold">Báo cáo quyết toán</h2><p className="text-sm text-muted mt-2">Chỉ cộng báo cáo ngày có toàn bộ kỳ nằm trong khoảng đã chọn.</p></div><span className="text-sm text-muted whitespace-nowrap">{data.reports.length} báo cáo</span></div>
        {data.reports.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface text-muted"><tr>{["Mã báo cáo / kỳ", "Giá trị bán", "Tiền người bán", "Thanh toán", ""].map((label, i) => <th className="p-4 text-left font-medium whitespace-nowrap" key={i}>{label}</th>)}</tr></thead><tbody>{[...data.reports].sort((a, b) => b.from.localeCompare(a.from) || a.id.localeCompare(b.id)).map(row => <tr key={row.id} className="border-t border-gray-100"><td className="p-4"><p className="font-semibold">{row.id}</p><p className="text-muted mt-1 whitespace-nowrap">{formatRange(row)}</p></td>{(["retailAmountSum", "forPaySum", "bankPaymentSum"] as const).map(key => <td key={key} className="p-4 font-semibold whitespace-nowrap tabular-nums">{money(row.amounts[key], row.currency)}</td>)}<td className="p-4"><Button aria-label={`Chi tiết báo cáo ${row.id}`} onClick={() => setDetail(row)}><ArrowRight size={17} /></Button></td></tr>)}</tbody></table></div> : <div className="p-12 text-center"><FileText size={30} className="mx-auto text-muted mb-4" /><h3 className="font-semibold">{data.status === "ready" ? "Sàn chưa có báo cáo cho kỳ này" : "Chưa có số liệu quyết toán"}</h3><p className="text-muted text-sm mt-2">{data.supported ? "Chọn kỳ khác hoặc cập nhật báo cáo. Không có báo cáo không đồng nghĩa doanh thu bằng 0." : "Quyết toán Ozon đang chờ kết nối; không hiển thị số liệu ước đoán."}</p></div>}
      </section>
    </>}
    {detail && <Modal open onOpenChange={open => !open && setDetail(null)} title="Chi tiết quyết toán" description={`Báo cáo ${detail.id} · ${formatRange(detail)}`}><div className="max-h-[60vh] overflow-y-auto"><p className="text-sm text-muted mb-3">Ngày lập: {detail.created} · Loại báo cáo: {detail.reportType}</p>{Object.entries(labels).map(([key, label]) => <div className="py-3 border-t border-gray-100 flex justify-between gap-4 text-sm" key={key}><span>{label}</span><strong className="whitespace-nowrap tabular-nums">{money(detail.amounts[key as keyof Amounts], detail.currency)}</strong></div>)}<p className="text-xs text-muted mt-4">Dấu — là sàn chưa cung cấp giá trị. Khoản bổ sung và cashback được giữ riêng, chưa tự suy diễn công thức quyết toán.</p></div></Modal>}
  </div>;
}
