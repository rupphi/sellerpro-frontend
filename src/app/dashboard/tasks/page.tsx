"use client";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/features/stores/workspace";
import { api, type Task } from "@/lib/api";
import { Badge, Progress, EmptyState, Button } from "@/components/ui";
import { time } from "@/lib/utils";
import { ListSkeleton } from "@/components/loading-states";
import { stepNames, type AutomationResponse } from "@/lib/automation";
import {
  Clock3,
  RefreshCw,
  Layers3,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
const labels: Record<string, string> = {
  queued: "Trong hàng đợi",
  retrying: "Chờ thử lại",
  running: "Đang chạy",
  completed: "Hoàn tất",
  needs_review: "Cần kiểm tra",
  failed: "Không hoàn tất",
  cancelled: "Đã hủy theo lịch mới",
};
export default function Tasks() {
  const { store } = useStore();
  const automation = useQuery({ queryKey: ["automation"], queryFn: () => api<AutomationResponse>("/automation") });
  const scheduleLabel = (kind: "guard" | "buyer_prices") => {
    const s = automation.data?.settings[kind];
    return !s ? "Đang tải lịch" : !s.enabled ? "Đã tạm dừng" : `${s.times.length} lần/ngày · ${s.times.join(", ")}`;
  };
  const tasks = useQuery({
    queryKey: ["tasks", store.id],
    queryFn: () => api<Task[]>(`/stores/${store.id}/tasks`),
    refetchInterval: 3000,
  });
  const audits = useQuery({
    queryKey: ["audit", store.id],
    queryFn: () => api<any[]>(`/stores/${store.id}/audit`),
    refetchInterval: 10000,
  });
  return (
    <>
      <div className="breadcrumb">
        <span>Không gian làm việc</span>
        <ChevronRight size={12} />
        <span>Công việc</span>
      </div>
      <h1 className="page-title">Công việc & lịch chạy</h1>
      <p className="page-subtitle">
        Theo dõi tiến độ, thời gian thực thi và kết quả của từng tác vụ.
      </p>
      <p className="text-sm text-muted mt-2">Múi giờ: {automation.data?.settings.timezone || "…"}</p>
      <div className="grid md:grid-cols-3 gap-4 my-7">
        {[
          [
            Clock3,
            "Kiểm tra bảo vệ giá",
            scheduleLabel("guard"),
          ],
          [
            Layers3,
            "Giá cả & chiết khấu",
            scheduleLabel("buyer_prices"),
          ],
          [
            RefreshCw,
            "Đồng bộ sản phẩm",
            "Giá và thông tin mới nhất từ cửa hàng",
          ],
        ].map(([Icon, title, desc]) => {
          const I = Icon as typeof Clock3;
          return (
            <div className="card p-5 flex gap-4" key={String(title)}>
              <I className="text-brand shrink-0" size={22} />
              <div>
                <h3 className="font-semibold text-sm">{String(title)}</h3>
                <p className="text-xs text-muted mt-2">{String(desc)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold">Tác vụ gần đây</h2>
          <Badge>{store.name}</Badge>
        </div>
        <div className="task-list-region">
          {tasks.isPending ? (
            <ListSkeleton rows={5} />
          ) : tasks.error && !tasks.data ? (
            <EmptyState
              title="Không tải được tác vụ"
              description={tasks.error.message}
            />
          ) : tasks.data?.length ? (
            <div className="overflow-auto">
              <table className="w-full text-sm text-left min-w-[700px]">
                <thead className="bg-surface text-xs text-muted">
                  <tr>
                    {[
                      "Công việc",
                      "Trạng thái",
                      "Tiến độ",
                      "Bắt đầu / kết thúc",
                      "Kết quả",
                    ].map((h) => (
                      <th key={h} className="p-5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.data.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="p-5">
                        <strong className="text-xs">
                          {t.kind === "finance" ? "Đồng bộ báo cáo tài chính" : t.kind === "sales" ? "Đồng bộ phễu bán hàng" : t.kind === "sync"
                            ? "Đồng bộ cửa hàng"
                            : t.kind === "buyer_prices"
                              ? "Đồng bộ giá cả & chiết khấu"
                              : t.kind === "catalog" ? "Đồng bộ sản phẩm"
                              : t.kind === "guard"
                              ? "Kiểm tra bảo vệ giá"
                              : t.kind === "locks"
                                ? "Thay đổi khóa giá"
                                : "Cập nhật giá"}
                        </strong>
                      </td>
                      <td className="p-5">
                        <Badge
                          tone={
                            t.status === "completed"
                              ? "green"
                              : t.status === "failed"
                                ? "red"
                                : t.status === "needs_review"
                                  ? "amber"
                                  : "purple"
                          }
                        >
                          {labels[t.status] || t.status}
                        </Badge>
                      </td>
                      <td className="p-5 min-w-36">
                        <Progress value={t.progress} />
                        <p className="text-[10px] text-muted mt-2">
                          {t.progress}%
                        </p>
                        {t.result?.activeStep && <p className="text-xs mt-2">{stepNames[t.result.activeStep as keyof typeof stepNames] || "Đang xử lý"}</p>}
                      </td>
                      <td className="p-5 text-[11px] text-muted">
                        <p>{time(t.createdAt)}</p>
                        <p className="mt-1">
                          {t.finishedAt ? time(t.finishedAt) : "Chưa kết thúc"}
                        </p>
                      </td>
                      <td className="p-5 text-xs text-muted max-w-xs leading-relaxed">
                        {t.error ||
                          t.result?.errors?.slice(0, 2).join(" ") ||
                          t.result?.message ||
                          (typeof t.result?.updated === "number"
                            ? `${t.result.updated} sản phẩm được xử lý`
                            : t.status === "running" ? "Đang thực hiện" : "Chờ kết quả")}
                        {t.result?.steps?.length > 0 && <ul className="mt-2 space-y-1">{t.result.steps.map((step: { step: string; status: string }) => <li key={step.step}>{stepNames[step.step as keyof typeof stepNames] || step.step}: {step.status === "ready" ? "Hoàn tất" : step.status === "unavailable" ? "Chưa hỗ trợ" : "Cần kiểm tra"}</li>)}</ul>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Chưa có tác vụ"
              description="Các lần đồng bộ và cập nhật giá sẽ xuất hiện tại đây."
            />
          )}
        </div>
      </div>
      <h2 className="text-lg font-semibold mt-9 mb-4">Nhật ký thay đổi</h2>
      <div className="card audit-list-region">
        {audits.isPending ? (
          <ListSkeleton />
        ) : audits.error && !audits.data ? (
          <EmptyState
            title="Không tải được lịch sử"
            description={audits.error.message}
          />
        ) : audits.data?.length ? (
          audits.data.map((a) => (
            <div
              key={a.id}
              className="p-5 border-b last:border-0 border-gray-100 flex flex-wrap justify-between gap-3"
            >
              <div>
                <Badge
                  tone={
                    a.action.includes("verified")
                      ? "green"
                      : a.action.includes("review")
                        ? "amber"
                        : "neutral"
                  }
                >
                  {(
                    {
                      "price.requested": "Yêu cầu cập nhật giá",
                      "guard.requested": "Kiểm tra bảo vệ giá",
                      "price.verified": "Đã xác nhận giá",
                      "price.needs_review": "Giá cần kiểm tra",
                    } as Record<string, string>
                  )[a.action] || "Thay đổi sản phẩm"}
                </Badge>
                <p className="text-[11px] text-muted mt-2">
                  {a.article || "Sản phẩm"} · {time(a.createdAt)}
                </p>
              </div>
              <div className="text-xs text-muted flex gap-3 items-center">
                {a.before?.price !== undefined && (
                  <span>
                    {(a.before.price / 100).toLocaleString("vi-VN")} ₽{" "}
                    <ArrowUpRight size={12} className="inline" />
                  </span>
                )}
                {a.after?.price !== undefined && (
                  <strong className="text-gray-700">
                    {(a.after.price / 100).toLocaleString("vi-VN")} ₽
                  </strong>
                )}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Lịch sử sẽ được lưu ở đây"
            description="Mỗi lần gửi giá và đọc lại xác minh đều được ghi nhận để dễ đối chiếu."
          />
        )}
      </div>
    </>
  );
}
