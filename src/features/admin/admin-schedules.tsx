"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Plus, X, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { type AutomationSettings, type AutomationResponse, stepNames } from "@/lib/automation";
import { Button, Input, Switch, Skeleton } from "@/components/ui";

export default function AdminSchedules() {
  const accounts = useQuery({ queryKey: ["admin-accounts"], queryFn: () => api<{ id: string; username: string; _count: { stores: number } }[]>("/admin/accounts") });
  const [selected, setSelected] = useState("");
  const [dirty, setDirty] = useState(false);
  const id = selected || accounts.data?.find(a => a._count.stores > 0)?.id || accounts.data?.[0]?.id;
  return <div className="max-w-5xl mx-auto">
    <label className="block text-sm font-medium mb-6">Tài khoản cần quản lý
      <select aria-label="Tài khoản cần quản lý" className="input mt-2" value={id || ""} disabled={dirty || accounts.isPending}
        onChange={e => setSelected(e.target.value)}>
        {accounts.data?.map(a => <option key={a.id} value={a.id}>{a.username} · {a._count.stores} cửa hàng</option>)}
      </select>
      {dirty && <span className="text-muted block mt-2 font-normal">Lưu hoặc tải lại lịch trước khi đổi tài khoản.</span>}
    </label>
    {accounts.isError ? <p role="alert">Không tải được danh sách tài khoản.</p> : id ? <ScheduleEditor key={id} accountId={id} onDirtyChange={setDirty} /> : <Skeleton className="h-64" />}
  </div>;
}
function ScheduleEditor({ accountId, onDirtyChange }: { accountId: string; onDirtyChange: (dirty: boolean) => void }) {
  const client = useQueryClient();
  const endpoint = `/admin/accounts/${accountId}/automation`;
  const query = useQuery({ queryKey: ["admin-automation", accountId], queryFn: () => api<AutomationResponse>(endpoint) });
  const [draft, setDraft] = useState<AutomationResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  useEffect(() => { if (query.data && !draft) setDraft(structuredClone(query.data)); }, [query.data, draft]);
  const dirty = !!draft && JSON.stringify(draft.settings) !== JSON.stringify(query.data?.settings);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (update: (s: AutomationSettings) => AutomationSettings) => {
    setDraft(d => d ? { ...d, settings: update(d.settings) } : d);
  };
  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const result = await api<AutomationResponse>(endpoint, { method: "PATCH", body: JSON.stringify(draft) });
      client.setQueryData(["admin-automation", accountId], result);
      void client.invalidateQueries({ queryKey: ["automation"] });
      setDraft(result);
      setConflict(false);
      toast.success("Đã lưu lịch tự động.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(true);
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }
  return <div className="max-w-5xl mx-auto pb-12">
    <div className="breadcrumb"><Settings2 size={14} /><span>Quản trị tài khoản</span></div>
    <h1 className="page-title">Lịch tự động</h1>
    <p className="page-subtitle">Chọn thời gian và thứ tự công việc cho các cửa hàng thuộc tài khoản đã chọn.</p>
    {!draft ? query.isError ? <div className="card p-6 mt-6"><p>Chưa tải được lịch chạy.</p><Button className="mt-4" onClick={() => query.refetch()}>Thử lại</Button></div>
      : <div className="grid gap-5 mt-7" aria-label="Đang tải lịch"><Skeleton className="h-32" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      : <form onSubmit={e => { e.preventDefault(); void save(); }} className="mt-7 space-y-6">
        <fieldset disabled={saving} className="space-y-6 min-w-0">
          <section className="card p-6 sm:p-7 flex flex-wrap items-center justify-between gap-5">
            <div><h2 className="font-semibold text-lg">Múi giờ</h2><p className="text-sm text-muted mt-1">Áp dụng cho mọi giờ chạy bên dưới.</p></div>
            <label className="flex flex-col gap-2 text-sm">Giờ địa phương
              <select aria-label="Múi giờ" className="input min-w-60" value={draft.settings.timezone}
                onChange={e => change(s => ({ ...s, timezone: e.target.value }))}>
                {[...new Set([draft.settings.timezone, "Asia/Ho_Chi_Minh", "Europe/Moscow", "Asia/Shanghai", "UTC"])].map(t => <option key={t} value={t}>{({ "Asia/Ho_Chi_Minh": "Việt Nam · UTC+7", "Europe/Moscow": "Moscow · UTC+3", "Asia/Shanghai": "Trung Quốc · UTC+8", UTC: "UTC" } as Record<string,string>)[t] || t}</option>)}
              </select>
            </label>
          </section>
          <section className="card p-6 sm:p-7">
            <h2 className="font-semibold text-lg">Khi kết nối cửa hàng mới</h2>
            <p className="text-sm text-muted mt-2">Sản phẩm bắt buộc đầu tiên → Giá cả (gồm chiết khấu) → Phễu bán hàng → Báo cáo tài chính.</p>
            <ol className="mt-5 space-y-3">
              {(["catalog", "pricing", "sales", "finance"] as const).map((step, i) => <li key={step} className="flex flex-wrap gap-3 items-center rounded-xl bg-surface p-4">
                <span className="rounded-full bg-white w-8 h-8 flex items-center justify-center font-semibold text-brand">{i + 1}</span>
                <span className="font-medium flex-1">{stepNames[step]}</span>
                {step === "catalog" ? <span className="text-sm text-muted">Bắt buộc</span> : <Switch label={`Khởi tạo ${stepNames[step]}`} checked={draft.settings.initialization.includes(step)} onCheckedChange={enabled => change(s => {
                  const initialization: AutomationSettings["initialization"] = enabled ? ["catalog", "pricing", ...(step === "sales" || s.initialization.includes("sales") ? ["sales" as const] : []), ...(step === "finance" || s.initialization.includes("finance") ? ["finance" as const] : [])] : s.initialization.filter(x => x !== step && !(step === "pricing" && ["sales", "finance"].includes(x)));
                  return { ...s, initialization, initializationGuard: initialization.includes("pricing") && s.initializationGuard };
                })} />}
              </li>)}
            </ol>
            <p className="text-sm text-muted mt-4">Phễu và Tài chính cần bước Giá cả trước đó. Hai nhóm này hiện hỗ trợ Wildberries; cửa hàng Ozon sẽ được thông báo chưa khả dụng.</p>
            <p className="text-sm text-muted mt-2">Riêng Ozon, lần kết nối đầu tiên luôn chạy Sản phẩm → Giá cả (gồm giá gạch ngang và giao dịch), kể cả khi tắt bước Giá cả ở cấu hình này.</p>
          </section>
          <div className="space-y-6">
            {(["catalog", "pricing", "sales", "finance"] as const).map((group, groupIndex) => <section className="card p-6 sm:p-7" key={group} aria-label={`Nhóm ${stepNames[group]}`}>
              <h2 className="font-semibold text-xl">{groupIndex + 1}. {stepNames[group]}</h2>
              <p className="text-sm text-muted mt-2 mb-5">{group === "catalog" ? "Thông tin sản phẩm, hình ảnh, danh mục, mã hàng và tồn kho." : group === "pricing" ? "Giá bán và chiết khấu được đồng bộ cùng nhóm. Bảo vệ giá có lịch kiểm tra riêng bên dưới." : group === "sales" ? "Đơn đặt, bán/trả, lượt xem và giỏ hàng. Lấy 7 ngày đã kết thúc và kỳ so sánh; hiện chỉ hỗ trợ Wildberries." : "Báo cáo quyết toán theo ngày của Wildberries, cập nhật lại 30 ngày đã kết thúc. Không thay đổi giá hoặc quảng cáo."}</p>
              {<div className={`grid gap-5 ${group === "pricing" ? "lg:grid-cols-2" : ""}`}>{(group === "pricing" ? ["buyer_prices", "guard"] as const : [group] as const).map(kind => {
              const schedule = draft.settings[kind];
              return <section className="rounded-xl bg-surface p-5 min-w-0" key={kind}>
                <div className="flex justify-between items-start gap-4"><div><Clock3 className="text-brand mb-3" size={22} /><h2 className="font-semibold text-lg">{stepNames[kind]}</h2>
                  <p className="text-sm text-muted mt-2">{schedule.enabled ? `${schedule.times.length} lần mỗi ngày` : "Đã tạm dừng lịch tự động"}</p></div>
                  <Switch label={`Tự động ${stepNames[kind]}`} checked={schedule.enabled} onCheckedChange={enabled => change(s => ({ ...s, [kind]: { ...s[kind], enabled } }))} />
                </div>
                {kind === "sales" && <Button type="button" className="mt-4" onClick={() => change(s => ({ ...s, sales: { enabled: true, times: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`) } }))}>Mỗi giờ một lần</Button>}
                <div className={`gap-3 mt-5 ${schedule.times.length > 6 ? "grid sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}`}>{schedule.times.map((time, index) => <div className="flex items-center gap-3" key={index}>
                  <label className="text-sm text-muted w-12 shrink-0" htmlFor={`${kind}-${index}`}>Lần {index+1}</label>
                  <Input id={`${kind}-${index}`} aria-label={`${stepNames[kind]} lần ${index+1}`} type="time" required step={60} value={time} disabled={!schedule.enabled}
                    onChange={e => change(s => ({ ...s, [kind]: { ...s[kind], times: s[kind].times.map((t, i) => i === index ? e.target.value : t) } }))} />
                  <Button type="button" variant="ghost" disabled={schedule.times.length === 1} aria-label={`Xóa giờ ${kind} ${index+1}`} onClick={() => change(s => ({ ...s, [kind]: { ...s[kind], times: s[kind].times.filter((_, i) => i !== index) } }))}><X size={16} /></Button>
                </div>)}</div>
                <Button type="button" className="mt-4" disabled={schedule.times.length >= 24} onClick={() => change(s => {
                  const existing = s[kind].times.map(t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));
                  const minute = Array.from({ length: 48 }, (_, i) => i * 30).find(n => existing.every(m => Math.min(Math.abs(n-m), 1440-Math.abs(n-m)) >= 30));
                  if (minute === undefined) return s;
                  const time = `${String(Math.floor(minute/60)).padStart(2, "0")}:${String(minute%60).padStart(2, "0")}`;
                  return { ...s, [kind]: { ...s[kind], times: [...s[kind].times, time].sort() } };
                })}><Plus size={16} />Thêm giờ chạy</Button>
                {kind === "guard" && <div className="flex gap-3 items-center justify-between mt-4"><span className="text-sm">Kiểm tra sau khởi tạo giá cả</span><Switch label="Bảo vệ giá khi khởi tạo" disabled={!draft.settings.initialization.includes("pricing")} checked={draft.settings.initializationGuard} onCheckedChange={initializationGuard => change(s => ({ ...s, initializationGuard }))} /></div>}
                <p className="text-sm text-muted mt-4">{kind === "guard" ? "Chỉ kiểm tra sản phẩm đã bật khóa. Giữa các lần kiểm tra, giá lệch chưa được khôi phục ngay." : kind === "buyer_prices" ? "Lấy chiết khấu và giá từ giao dịch gần nhất, không phải giá thời gian thực." : "Không thay đổi giá bán hoặc bật khóa sản phẩm."}</p>
              </section>;
            })}</div>}</section>)}
          </div>
        </fieldset>
        <p className="text-sm text-muted leading-relaxed">Giờ chạy cách nhau ít nhất 30 phút. Các công việc cùng cửa hàng chạy lần lượt; có thể trễ nếu sàn giới hạn truy cập. Khi máy chủ khởi động lại, chỉ chạy bù mốc gần nhất. Đổi lịch không dừng công việc đang chạy và không chạy lại bước khởi tạo.</p>
        <div className="sticky bottom-4 card p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <span className="text-sm text-muted" role="status">{conflict ? "Lịch đã thay đổi ở cửa sổ khác. Hãy tải lại." : dirty ? "Có thay đổi chưa lưu" : "Lịch đã được lưu"}</span>
          <div className="flex gap-3"><Button type="button" disabled={saving} onClick={async () => { const result = await query.refetch(); if (result.data) { setDraft(structuredClone(result.data)); setConflict(false); } }}>Tải lại</Button>
            <Button type="submit" variant="primary" loading={saving} disabled={!dirty || conflict}><Save size={16} />Lưu lịch</Button></div>
        </div>
      </form>}
  </div>;
}
