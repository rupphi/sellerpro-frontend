"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/features/stores/workspace";
import { api, type ProductsResponse, type Task } from "@/lib/api";
import {
  Badge,
  Button,
  MarketplaceLogo,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import {
  Package,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ChevronRight,
} from "lucide-react";
import { time } from "@/lib/utils";
export default function Overview() {
  const { store, openAdd } = useStore();
  const products = useQuery({
    queryKey: ["overview", store.id],
    queryFn: () => api<ProductsResponse>(`/stores/${store.id}/products`),
    refetchInterval: 10000,
  });
  const tasks = useQuery({
    queryKey: ["tasks", store.id],
    queryFn: () => api<Task[]>(`/stores/${store.id}/tasks`),
    refetchInterval: 5000,
  });
  const total = products.data?.total || 0;
  const groups = products.data?.stats || [];
  return (
    <>
      <div className="breadcrumb">
        <span>Không gian làm việc</span>
        <ChevronRight size={12} />
        <span>Tổng quan</span>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Cửa hàng trong tầm tay</h1>
          <p className="page-subtitle">Những thông tin cần chú ý hôm nay.</p>
        </div>
        <Button onClick={openAdd}>+ Thêm cửa hàng</Button>
      </div>
      {products.error && !products.data && (
        <EmptyState
          title="Chưa tải được thông tin cửa hàng"
          description={products.error.message}
          action={
            <Button
              loading={products.isFetching}
              onClick={() => products.refetch()}
            >
              Thử lại
            </Button>
          }
        />
      )}
      <div className="grid lg:grid-cols-[320px_1fr] gap-5 mt-7">
        <div className="space-y-5">
          <div className="card p-6">
            <MarketplaceLogo platform={store.platform} size="lg" />
            <h2 className="text-xl font-semibold mt-5">{store.name}</h2>
            <p className="text-muted text-xs mt-2">
              {store.platform === "wb" ? "Wildberries" : "Ozon"}
            </p>
            <div className="border-t border-gray-100 mt-6 pt-5 space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Tổng sản phẩm</span>
                {products.isPending ? (
                  <Skeleton className="h-4 w-10" />
                ) : (
                  <strong>
                    {products.error && !products.data ? "—" : total}
                  </strong>
                )}
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Đồng bộ lần cuối</span>
                <span>{time(store.lastSyncAt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Kiểm tra khóa giá</span>
                <span>{time(store.lastGuardAt)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-6 bg-[#eee4fd]">
            <ShieldCheck size={26} className="text-brand" />
            <h3 className="text-base font-semibold mt-4">
              Đặt giá theo cách của bạn
            </h3>
            <p className="text-xs text-muted leading-relaxed mt-3">
              Lưu giá mục tiêu và theo dõi thay đổi trên từng sản phẩm. Các
              trường hợp cần kiểm tra luôn được thông báo.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex gap-2 items-center text-brand font-semibold text-xs mt-5"
            >
              Đến bảng giá <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="font-semibold">Công việc cần chú ý</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              {[
                [
                  "Tác vụ đang chạy",
                  tasks.data?.filter((t) =>
                    ["queued", "running", "retrying"].includes(t.status),
                  ).length || 0,
                ],
                [
                  "Giá cần kiểm tra",
                  groups.find((x) => x.protection === "attention")?._count || 0,
                ],
                [
                  "Đã xác minh giá sàn",
                  groups.find((x) => x.protection === "floor_verified")
                    ?._count || 0,
                ],
                [
                  "Đang giám sát WB",
                  groups.find((x) => x.protection === "monitoring")?._count ||
                    0,
                ],
              ].map(([label, n]) => (
                <Link
                  href="/dashboard/tasks"
                  key={String(label)}
                  className="flex justify-between items-center bg-surface rounded-lg px-4 py-3 text-xs"
                >
                  <span>{label}</span>
                  {products.isPending || tasks.isPending ? (
                    <Skeleton className="h-5 w-8" />
                  ) : (
                    <Badge tone={Number(n) > 0 ? "purple" : "neutral"}>
                      {products.error || tasks.error ? "—" : n}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <div className="flex justify-between">
              <h2 className="font-semibold">Trạng thái bảo vệ sản phẩm</h2>
            </div>
            <div className="mt-7 space-y-5">
              {[
                ["Chưa bật", "off", "#d7d0e1"],
                ["Đang xử lý", "pending", "#b98afa"],
                ["Giá sàn đã xác minh", "floor_verified", "#8b3df5"],
                ["Đang giám sát", "monitoring", "#4f9bca"],
                ["Cần kiểm tra", "attention", "#e4ae53"],
              ].map(([label, key, color]) => {
                const n = groups.find((x) => x.protection === key)?._count || 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted">{label}</span>
                      {products.isPending ? (
                        <Skeleton className="h-3 w-8" />
                      ) : (
                        <strong>
                          {products.error && !products.data ? "—" : n}
                        </strong>
                      )}
                    </div>
                    <div
                      className={`h-2 rounded-full bg-surface overflow-hidden ${products.isPending ? "skeleton" : ""}`}
                    >
                      <div
                        style={{
                          width: `${total ? (n / total) * 100 : 0}%`,
                          background: color,
                        }}
                        className="h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="notice">
            <Clock3 size={19} className="shrink-0" />
            Giá được kiểm tra theo lịch đã thiết lập. Bạn sẽ nhận thông báo nếu có thay đổi cần
            chú ý.
          </div>
        </div>
      </div>
    </>
  );
}
