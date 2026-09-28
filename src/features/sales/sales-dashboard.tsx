"use client";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, RefreshCw, Search, TrendingUp, AlertCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/features/stores/workspace";
import { api } from "@/lib/api";
import { price } from "@/lib/utils";
import { Button, Badge, Input, Skeleton } from "@/components/ui";
import { type Report, type SalesEvent, type Traffic, channelNames, eventNames, statusNames } from "./types";
import { OrderDetail, salesTime } from "./order-detail";
import { DateRangePicker } from "@/components/date-range-picker";
import { formatRange, previousRange, rangeDays, recentRange, shiftDay } from "@/lib/date-range";

const number = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString("vi-VN");
const money = (n: number | null | undefined) => n == null ? "—" : price(n);
const percentage = (a: number, b: number) => b ? `${(a / b * 100).toFixed(1)}%` : "—";
function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return <div className="card p-5"><p className="text-sm text-muted">{label}</p><p className={`font-semibold text-2xl mt-3 tabular-nums ${tone || ""}`}>{value}</p><p className="text-xs text-muted mt-2 leading-relaxed">{note}</p></div>;
}
export default function SalesDashboard() {
  const { store } = useStore();
  // Key the inner screen by store to discard the previous store's detail/filter state.
  return <SalesScreen key={store.id} storeId={store.id} platform={store.platform} />;
}
function SalesScreen({ storeId, platform }: { storeId: string; platform: string }) {
  const [period, setPeriod] = useState(() => recentRange(7));
  const [comparison, setComparison] = useState(() => previousRange(period));
  const [channel, setChannel] = useState("all"), [kind, setKind] = useState("all");
  const [search, setSearch] = useState(""), [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false), [selected, setSelected] = useState<SalesEvent | null>(null);
  const client = useQueryClient(), sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => { const timer = setTimeout(() => setTerm(search), 300); return () => clearTimeout(timer); }, [search]);
  const selectedPeriod = { ...period, compareFrom: comparison.from, compareTo: comparison.to };
  const params = new URLSearchParams({ ...selectedPeriod, channel }).toString();
  const report = useQuery({ queryKey: ["sales-report", storeId, params], queryFn: () => api<Report>(`/stores/${storeId}/sales?${params}`), refetchInterval: q => q.state.data?.task ? 3000 : 60000 });
  const events = useInfiniteQuery({ queryKey: ["sales-events", storeId, params, term, kind], initialPageParam: "",
    queryFn: ({ pageParam }) => api<{ items: SalesEvent[]; nextCursor: string | null }>(`/stores/${storeId}/sales/events?${params}&${new URLSearchParams({ search: term, kind, ...(pageParam ? { cursor: pageParam } : {}) })}`),
    getNextPageParam: last => last.nextCursor || undefined,
  });
  const previousTask = useRef<string | null>(null);
  useEffect(() => {
    if (previousTask.current && !report.data?.task) void client.invalidateQueries({ queryKey: ["sales-events", storeId] });
    previousTask.current = report.data?.task?.id || null;
  }, [report.data?.task, client, storeId]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting && events.hasNextPage && !events.isFetchingNextPage && !events.isFetchNextPageError) void events.fetchNextPage(); }, { rootMargin: "200px" });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [events.hasNextPage, events.isFetchingNextPage, events.isFetchNextPageError, events.fetchNextPage]);
  async function sync() {
    setBusy(true);
    try { await api(`/stores/${storeId}/sales/sync`, { method: "POST", body: JSON.stringify(selectedPeriod) }); toast.success("Đã yêu cầu cập nhật phễu bán hàng."); await report.refetch(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  const data = report.data, s = data?.current, prev = data?.previous;
  const rows = events.data?.pages.flatMap(p => p.items) || [];
  const traffic = data?.traffic?.products.reduce((sum, p) => ({ views: sum.views + p.current.views, carts: sum.carts + p.current.carts, orders: sum.orders + p.current.orders, buyouts: sum.buyouts + p.current.buyouts }), { views: 0, carts: 0, orders: 0, buyouts: 0 } as Traffic);
  const completedDays = !!data && new Date(data.period.to + "T23:59:59+03:00") < new Date();
  const actionable = s?.ordersReady && s?.salesReady;
  const actions: string[] = [];
  if (actionable && s.cohort.ordered >= 20 && s.cohort.returned / s.cohort.ordered >= .15) actions.push(`${percentage(s.cohort.returned, s.cohort.ordered)} đơn trong nhóm đã có trả hàng. Ưu tiên kiểm bảng size, mô tả và chất lượng trước khi tăng quảng cáo.`);
  if (actionable && s.cohort.cancelled) actions.push(`${number(s.cohort.cancelled)} đơn trong nhóm đã hủy. Lọc đơn đặt và kiểm tra tồn kho, thời gian xử lý; chưa thể kết luận nguyên nhân từ số đơn hủy.`);
  if (completedDays && s?.ordersReady && prev?.ordersReady && prev.orders > 0 && s.orders < prev.orders * .8) actions.push(`Đơn đặt giảm ${percentage(prev.orders - s.orders, prev.orders)} so với kỳ so sánh. Đối chiếu lượt xem → giỏ → đơn để chọn đúng bước cần cải thiện.`);
  if (traffic && traffic.views >= 100 && traffic.orders === 0) actions.push("Đã có ít nhất 100 lượt xem nhưng chưa có đơn trong báo cáo phễu. Kiểm ảnh, giá và lựa chọn size trước khi mua thêm lượt truy cập.");
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between items-start gap-4"><div><div className="breadcrumb"><TrendingUp size={15} />Phân tích bán hàng</div><h1 className="page-title">Phễu bán hàng</h1><p className="page-subtitle">Hiểu đơn hàng, nhận diện thất thoát và chọn việc cần làm tiếp.</p></div>
      <Button onClick={sync} loading={busy || !!data?.task} disabled={platform !== "wb"}><RefreshCw size={17} />Cập nhật dữ liệu</Button></div>
    <section className="sales-date-toolbar" aria-label="Khoảng thời gian báo cáo">
      <div className="sales-date-controls">
        <DateRangePicker label="Khoảng ngày báo cáo" value={period} resetValue={recentRange(7)} onChange={range => { setPeriod(range); setComparison(previousRange(range)); }} />
        <span className="sales-compare-label">So sánh<br />với kỳ</span>
        <DateRangePicker label="Khoảng ngày so sánh" value={comparison} resetValue={previousRange(period)} maxDate={shiftDay(period.from, -1)} requiredDays={rangeDays(period)} onChange={setComparison} />
        <select aria-label="Hình thức giao hàng" className="input sales-channel" value={channel} onChange={e => setChannel(e.target.value)}><option value="all">Tất cả hình thức giao hàng</option><option value="fbo">Kho sàn · FBO/FBW</option><option value="fbs">Kho người bán · FBS</option><option value="unknown">Chưa rõ kho</option></select>
      </div>
      <p className="text-xs text-muted mt-3">Giờ Moscow (UTC+3) · Đổi kỳ báo cáo sẽ đặt lại kỳ so sánh liền trước, cùng số ngày.</p>
    </section>
    {report.isError && <div className="card p-5" role="alert"><p>{report.error.message}</p><Button onClick={() => report.refetch()} className="mt-3">Thử lại</Button></div>}
    {report.isPending ? <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div> : data && s && <>
      {data.task && <div className="notice" role="status"><RefreshCw size={17} className="animate-spin" />Đang cập nhật dữ liệu · {data.task.progress}%. Bạn có thể tiếp tục xem số liệu đã lưu.</div>}
      {data.warnings.length > 0 && <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm space-y-1" role="status">{[...new Set(data.warnings)].map(w => <p key={w}>{w}</p>)}</div>}
      <div className="flex flex-wrap justify-between gap-2 text-sm text-muted"><span>Kỳ so sánh: {formatRange({ from: data.period.previousFrom, to: data.period.previousTo })}</span><span>Giờ dữ liệu: Moscow · Các nguồn có thể cập nhật khác nhau</span></div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">{["wb_orders", "wb_sales"].map(key => { const source = data.sources.find(x => x.source === key); return <span key={key}>{key === "wb_orders" ? "Đơn đặt" : "Bán / trả"}: {source?.coveredTo ? salesTime(source.coveredTo) : "Chưa đồng bộ"}{source && source.status !== "ready" ? " · Chưa cập nhật đủ" : ""}</span>; })}{data.traffic && data.trafficCheckedAt && <span>Lượt xem / giỏ: {salesTime(data.trafficCheckedAt)}</span>}</div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric label="Đơn đặt" value={number(s.ordersReady ? s.orders : null)} note={s.ordersReady && prev?.ordersReady ? `Kỳ so sánh: ${number(prev.orders)} đơn · ${number(s.units)} sản phẩm` : "Đơn phát sinh trong khoảng đã chọn"} />
        <Metric label="Kho sàn · FBO/FBW" value={number(s.ordersReady ? s.fbo : null)} note="WB gọi hình thức kho sàn là FBW" />
        <Metric label="Kho người bán · FBS" value={number(s.ordersReady ? s.fbs : null)} note={`${number(s.unknown)} đơn chưa phân loại kho`} />
        <Metric label="Giá trị đơn đặt" value={money(s.ordersReady ? s.orderedValue : null)} note="Bao gồm đơn hủy; không phải doanh thu đã bán" />
        <Metric label="Giá trị đã bán · tạm tính" value={money(s.salesReady ? s.sales.value : null)} note={`${s.salesReady ? number(s.sales.units) : "—"} sản phẩm bán phát sinh trong kỳ`} />
        <Metric label="Hàng trả trong kỳ" value={number(s.salesReady ? s.returns.units : null)} note="Có thể từ đơn đặt của kỳ trước" />
        <Metric label="Trừ giá trị hàng trả" value={s.salesReady && s.returns.value != null ? `−${money(s.returns.value)}` : "—"} note="Giá trị hàng; chưa gồm phí hoàn và vận chuyển" tone="text-red-600" />
        <Metric label="Doanh thu sau trả · tạm tính" value={money(s.salesReady ? s.netRevenue : null)} note="Chưa trừ giá vốn, phí sàn, vận chuyển, quảng cáo, thuế" tone="text-brand" />
      </div>
      <section className="card p-6"><h2 className="text-lg font-semibold">Từ lượt xem đến mua hàng</h2><p className="text-sm text-muted mt-2">Cùng một báo cáo phễu WB; kết quả mua được quy về ngày đặt, không cộng với doanh thu theo ngày bán bên trên.</p>
        {traffic ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">{[["Lượt xem", traffic.views, ""], ["Thêm giỏ", traffic.carts, `${percentage(traffic.carts, traffic.views)} từ lượt xem`], ["Đặt hàng", traffic.orders, `${percentage(traffic.orders, traffic.carts)} từ giỏ`], ["Đã mua", traffic.buyouts, `${percentage(traffic.buyouts, traffic.orders)} từ đơn đặt`]].map(([label, n, note]) => <div key={String(label)} className="rounded-xl bg-surface p-4"><p className="text-sm text-muted">{label}</p><p className="text-2xl font-semibold mt-2">{number(Number(n))}</p><p className="text-xs text-muted mt-2">{note || "Toàn bộ sản phẩm trong báo cáo"}</p></div>)}</div> : <p className="mt-5 text-sm text-muted">{channel !== "all" ? "Phễu lượt xem không tách được FBO/FBS. Chọn Tất cả để xem." : "Chưa có dữ liệu lượt xem và giỏ hàng cho khoảng ngày này. Không thay thế bằng số 0."}</p>}
      </section>
      <div className="grid xl:grid-cols-2 gap-5">
        <section className="card p-6"><h2 className="text-lg font-semibold">Đơn đặt trong kỳ đang ở đâu?</h2><p className="text-sm text-muted mt-2">Trạng thái mới nhất của cùng nhóm đơn, kể cả kết quả đến sau ngày kết thúc.</p>
          {actionable ? <div className="space-y-4 mt-5">{[["Đã bán, chưa ghi nhận trả", s.cohort.delivered], ["Có trả hàng", s.cohort.returned], ["Đã hủy", s.cohort.cancelled], ["Chưa có kết quả cuối", s.cohort.pending]].map(([label, n]) => <div key={String(label)}><div className="flex justify-between text-sm mb-2"><span>{label}</span><strong>{number(Number(n))} · {percentage(Number(n), s.cohort.ordered)}</strong></div><div className="h-2 bg-surface rounded-full overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${s.cohort.ordered ? Number(n) / s.cohort.ordered * 100 : 0}%` }} /></div></div>)}</div> : <p className="text-sm text-muted mt-5">Cần đủ nguồn đơn đặt và bán/trả để đánh giá nhóm đơn.</p>}
          <p className="text-xs text-muted mt-5">Đơn mới chưa hoàn tất có thể làm tỷ lệ mua thấp tạm thời. “Có trả hàng” không có nghĩa toàn bộ kiện đều bị trả.</p>
        </section>
        <section className="card p-6"><h2 className="text-lg font-semibold">Việc nên ưu tiên</h2><p className="text-sm text-muted mt-2">Gợi ý kiểm tra dựa trên dữ liệu, không tự thay đổi giá hoặc quảng cáo.</p><div className="space-y-3 mt-5">{actions.length ? actions.map(a => <div key={a} className="flex gap-3 bg-amber-50 rounded-xl p-4 text-sm"><AlertCircle size={18} className="shrink-0 text-amber-600" /><p>{a}</p></div>) : <p className="text-sm text-muted">{actionable ? "Chưa đủ tín hiệu để ưu tiên tăng hoặc giảm quảng cáo. Xem SKU và chi tiết đơn trước khi quyết định." : "Đồng bộ đủ dữ liệu trước khi đưa ra quyết định bán hàng."}</p>}<div className="bg-surface rounded-xl p-4 text-sm">Muốn biết sản phẩm thực sự có lãi: cần thêm giá vốn, phí sàn, phí vận chuyển/hoàn, chi phí quảng cáo và thuế. Bản này chưa gọi doanh thu là lợi nhuận.</div></div></section>
      </div>
      <section className="card p-6"><h2 className="text-lg font-semibold">Nhịp đơn theo ngày</h2><div className="flex items-end gap-2 h-36 mt-6 overflow-x-auto pb-1">{data.daily.map(d => <div className="flex-1 min-w-7 flex flex-col items-center justify-end h-full" key={d.day} title={`${d.day}: ${s.ordersReady ? number(d.orders) : "Chưa đủ dữ liệu"} đơn`}><span className="text-xs mb-1">{s.ordersReady ? d.orders : "—"}</span><div className="w-full max-w-12 bg-brand/70 rounded-t" style={{ height: s.ordersReady ? `${Math.max(2, d.orders / Math.max(1, ...data.daily.map(v => v.orders)) * 85)}px` : "2px" }} /><span className="text-[10px] text-muted mt-2">{d.day.slice(8)}</span></div>)}</div></section>
      <section className="card overflow-hidden"><div className="p-6"><h2 className="text-lg font-semibold">Sản phẩm cần theo dõi</h2><p className="text-sm text-muted mt-2">Ưu tiên giá trị trả lớn, sau đó số đơn đặt. Tối đa 20 SKU; đây không phải xếp hạng lợi nhuận.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface text-muted"><tr>{["Sản phẩm", "Đơn đặt", "Hủy trong nhóm", "Giá trị trả trong kỳ", "Sau trả · tạm tính", ""].map((h, i) => <th key={i} className="p-4 text-left font-medium">{h}</th>)}</tr></thead><tbody>{data.products.map(p => <tr className="border-t border-gray-100" key={p.productKey}><td className="p-4 max-w-72"><p className="font-semibold truncate">{p.title || p.article}</p><p className="text-muted mt-1">{p.article} · {p.productKey}</p></td><td className="p-4 font-semibold">{s.ordersReady ? p.orders : "—"}</td><td className="p-4">{actionable ? p.cohort.cancelled : "—"}</td><td className="p-4 text-red-600">{money(s.salesReady ? p.returns.value : null)}</td><td className="p-4 font-semibold">{money(s.salesReady ? p.netRevenue : null)}</td><td className="p-4"><Button aria-label={`Xem giao dịch ${p.article}`} onClick={() => { setSearch(p.article); document.getElementById("sales-ledger")?.scrollIntoView({ behavior: "smooth" }); }}><ArrowRight size={15} /></Button></td></tr>)}</tbody></table></div>{!data.products.length && <p className="p-6 text-muted text-sm">Chưa có giao dịch sản phẩm trong dữ liệu đã lưu.</p>}</section>
    </>}
    <section id="sales-ledger" className="card overflow-hidden"><div className="p-6 flex flex-wrap gap-4 justify-between"><div><h2 className="text-lg font-semibold">Chi tiết đơn & giao dịch</h2><p className="text-sm text-muted mt-2">Mỗi dòng là một sự kiện; một đơn có thể xuất hiện nhiều lần.</p></div><div className="flex flex-wrap gap-2"><Input aria-label="Tìm đơn hoặc article" placeholder="Tìm mã đơn, article, tên…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Loại giao dịch" className="input" value={kind} onChange={e => setKind(e.target.value)}><option value="all">Tất cả giao dịch</option><option value="order">Đặt hàng</option><option value="sale">Đã bán</option><option value="return">Trả hàng</option></select></div></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface text-muted"><tr>{["Đơn / ngày", "Sản phẩm", "Hình thức", "Sự kiện", "SL", "Giá trị", ""].map((h, i) => <th key={i} className="p-4 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead><tbody>
        {events.isPending ? Array.from({ length: 5 }, (_, i) => <tr key={i}>{Array.from({ length: 7 }, (_, j) => <td key={j} className="p-4"><Skeleton className="h-8" /></td>)}</tr>) : rows.map(row => <tr className="border-t border-gray-100 hover:bg-surface/50" key={row.id}><td className="p-4 max-w-60"><p className="truncate font-medium" title={row.orderKey}>{row.orderKey}</p><p className="text-xs text-muted mt-1">{salesTime(row.occurredAt)}</p></td><td className="p-4 max-w-64"><p className="truncate font-semibold">{row.title || row.article}</p><p className="text-muted mt-1">{row.article}</p></td><td className="p-4 whitespace-nowrap">{channelNames[row.channel]}</td><td className="p-4"><Badge tone={row.kind === "return" || row.status === "cancelled" ? "red" : row.kind === "sale" ? "green" : "neutral"}>{eventNames[row.kind]}</Badge><p className="text-xs text-muted mt-1">{statusNames[row.status]}</p></td><td className="p-4">{row.quantity}</td><td className={`p-4 whitespace-nowrap font-semibold ${row.kind === "return" ? "text-red-600" : ""}`}>{row.amount === null ? "Chờ giá trị" : `${row.kind === "return" ? "−" : ""}${price(row.amount, row.currency)}`}</td><td className="p-4"><Button aria-label={`Chi tiết đơn ${row.orderKey} ${row.kind}`} onClick={() => setSelected(row)}><Search size={16} /></Button></td></tr>)}
      </tbody></table></div>
      {events.isError && <div role="alert" className="p-5 text-sm">{events.error.message}<Button className="ml-3" onClick={() => events.isFetchNextPageError ? events.fetchNextPage() : events.refetch()}>Thử lại</Button></div>}
      {!events.isPending && !events.isError && !rows.length && <div className="p-10 text-center text-muted"><ShoppingBag size={26} className="mx-auto mb-3" />Chưa có giao dịch phù hợp trong dữ liệu đã lưu.</div>}
      <div ref={sentinel} className="p-4 text-center text-xs text-muted">{events.isFetchingNextPage ? <Skeleton className="h-10" /> : rows.length ? `Đang hiển thị ${rows.length} giao dịch${events.hasNextPage ? " · Cuộn để tải tiếp" : ""}` : ""}</div>
    </section>
    {selected && <OrderDetail storeId={storeId} event={selected} close={() => setSelected(null)} />}
  </div>;
}
