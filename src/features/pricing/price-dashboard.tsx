"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Pencil,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Package,
  LockKeyhole,
  AlertCircle,
  X,
  Check,
  Clock3,
  Info,
  ArrowUpRight,
} from "lucide-react";
import {
  api,
  type Product,
  type ProductsResponse,
  type Change,
  type Task,
} from "@/lib/api";
import { price, time } from "@/lib/utils";
import { useStore } from "../stores/workspace";
import {
  Badge,
  Button,
  Input,
  Switch,
  Skeleton,
  EmptyState,
  Progress,
  Popover,
  Modal,
} from "../../components/ui";
import { PriceFilters, type Filters } from "./price-filters";
import { ExcelDialog } from "./excel-dialog";
import { ProductSkeletonRows } from "../../components/loading-states";
import { ozonReferenceDiscount } from "./ozon-price";
import { stepNames } from "@/lib/automation";
export const protectionLabel: Record<string, string> = {
  off: "Chưa bật",
  pending: "Đang thiết lập",
  floor_verified: "Đã xác minh giá sàn",
  monitoring: "Đã khóa giá",
  attention: "Cần kiểm tra",
};
type PriceDraft = Change & { originalPrice: number; originalDiscount: number };
export function PriceDashboard() {
  const { store } = useStore(),
    client = useQueryClient();
  const [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [filters, setFilters] = useState<Filters>({ categories: [], brands: [] }),
    [lockedOnly, setLockedOnly] = useState(false),
    [noPrice, setNoPrice] = useState(false),
    [editing, setEditing] = useState(false),
    [drafts, setDrafts] = useState<Record<string, PriceDraft>>({}),
    [excel, setExcel] = useState(false),
    [saving, setSaving] = useState(false),
    [syncing, setSyncing] = useState(false),
    [info, setInfo] = useState(false);
  const [bulkLock, setBulkLock] = useState<boolean | null>(null);
  const scrollRoot = useRef<HTMLDivElement>(null);
  const loadMore = useRef<HTMLDivElement>(null);
  const [lockRequests, setLockRequests] = useState<
    Record<string, { locked: boolean; taskId?: string }>
  >({});
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setDrafts({});
    setEditing(false);
    setSearch("");
    setDebounced("");
    setLockedOnly(false);
    setNoPrice(false);
    setFilters({ categories: [], brands: [] });
    setBulkLock(null);
  }, [store.id]);
  useEffect(() => {
    if (!Object.keys(drafts).length) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [drafts]);
  const params = new URLSearchParams({
    search: debounced,
    categories: filters.categories.join("|"),
    brands: filters.brands.join("|"),
    locked: String(lockedOnly),
    noPrice: String(noPrice),
  }).toString();
  const data = useInfiniteQuery({
    queryKey: ["products", store.id, "infinite", params],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api<ProductsResponse>(
        `/stores/${store.id}/products?${params}&page=${pageParam}`,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.items.length > 0 && last.page < last.pages
        ? last.page + 1
        : undefined,
    refetchInterval: editing ? false : 10000,
    placeholderData: (previous, query) =>
      query?.queryKey[1] === store.id ? previous : undefined,
  });
  const catalog = data.data?.pages[0];
  const products = useMemo(() => {
    // A background catalog update can move a product between result batches.
    const unique = new Map<string, Product>();
    for (const batch of data.data?.pages || [])
      for (const product of batch.items) unique.set(product.id, product);
    return [...unique.values()];
  }, [data.data]);
  useEffect(() => {
    scrollRoot.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [store.id, params]);
  const { fetchNextPage, hasNextPage, isFetching, isError, isPlaceholderData } =
    data;
  useEffect(() => {
    const target = loadMore.current,
      root = scrollRoot.current;
    if (
      !target ||
      !root ||
      !hasNextPage ||
      isFetching ||
      isError ||
      isPlaceholderData
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting))
          void fetchNextPage({ cancelRefetch: false });
      },
      { root, rootMargin: "0px 0px 240px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetching,
    isError,
    isPlaceholderData,
    store.id,
    params,
  ]);
  useEffect(() => {
    // A lock-only change may advance the version without changing the price.
    // Rebase only when the original price is unchanged; genuine price conflicts
    // still fail safely on save instead of overwriting another update.
    setDrafts((current) => {
      let next = current;
      for (const product of products) {
        const draft = current[product.id];
        if (
          draft &&
          draft.version !== product.version &&
          draft.originalPrice === product.price &&
          draft.originalDiscount === product.discount
        ) {
          next = {
            ...next,
            [product.id]: {
              ...draft,
              version: product.version,
              locked: product.locked,
            },
          };
        }
      }
      return next;
    });
  }, [products]);
  const tasks = useQuery({
    queryKey: ["tasks", store.id],
    queryFn: () => api<Task[]>(`/stores/${store.id}/tasks`),
    refetchInterval: 3000,
  });
  const active = tasks.data?.find((t) =>
    ["queued", "running", "retrying"].includes(t.status),
  );
  useEffect(() => {
    const finished = Object.entries(lockRequests).filter(([, request]) =>
      tasks.data?.some(
        (t) =>
          t.id === request.taskId &&
          ["completed", "failed", "needs_review"].includes(t.status),
      ),
    );
    if (!finished.length) return;
    void client.invalidateQueries({ queryKey: ["products", store.id] });
    for (const [, request] of finished) {
      const task = tasks.data!.find((t) => t.id === request.taskId)!;
      if (task.status === "completed") toast.success("Đã cập nhật khóa giá.");
      else
        toast.error(
          task.error ||
            "Có sản phẩm chưa cập nhật được khóa giá. Xem Công việc để kiểm tra.",
        );
    }
    setLockRequests((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([key]) => !finished.some(([id]) => id === key),
        ),
      ),
    );
  }, [tasks.data, lockRequests, client, store.id]);
  const bulkRequest = lockRequests[store.id];
  const lockBusy = !!bulkRequest || products.some((p) => !!lockRequests[p.id]);
  async function changeLock(locked: boolean, productId?: string) {
    const storeId = store.id,
      key = productId || storeId;
    setLockRequests((current) => ({ ...current, [key]: { locked } }));
    setBulkLock(null);
    try {
      const task = await api<Task>(`/stores/${storeId}/locks`, {
        method: "POST",
        body: JSON.stringify(
          productId
            ? { scope: "product", productId, locked }
            : { scope: "all", locked },
        ),
      });
      setLockRequests((current) => ({
        ...current,
        [key]: { locked, taskId: task.id },
      }));
      void client.invalidateQueries({ queryKey: ["tasks", storeId] });
    } catch (e) {
      setLockRequests((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      toast.error((e as Error).message);
    }
  }
  const all = catalog?.stats.reduce((s, x) => s + x._count, 0) || 0,
    protectedN =
      catalog?.stats
        .filter((x) => ["floor_verified", "monitoring"].includes(x.protection))
        .reduce((s, x) => s + x._count, 0) || 0,
    attention =
      catalog?.stats.find((x) => x.protection === "attention")?._count || 0;
  const invalid = Object.values(drafts).some(
    (d) =>
      !Number.isFinite(d.price) ||
      d.price < 100 ||
      d.discount < 0 ||
      d.discount > 95 ||
      !Number.isInteger(d.discount) ||
      (store.platform === "wb" && d.price % 100 !== 0),
  );
  function edit(p: Product, patch: Partial<Change>) {
    setDrafts((d) => ({
      ...d,
      [p.id]: {
        ...(d[p.id] || {
          id: p.id,
          version: p.version,
          price: p.price,
          discount: p.discount,
          locked: p.locked,
          originalPrice: p.price,
          originalDiscount: p.discount,
        }),
        ...patch,
      },
    }));
  }
  async function save() {
    setSaving(true);
    try {
      await api(`/stores/${store.id}/prices`, {
        method: "POST",
        body: JSON.stringify({
          changes: Object.values(drafts).map(
            ({ originalPrice, originalDiscount, ...change }) => change,
          ),
          preserveLocks: true,
        }),
      });
      setDrafts({});
      setEditing(false);
      toast.success(
        "Đã nhận thay đổi. Bạn sẽ được thông báo khi cập nhật hoàn tất.",
      );
      client.invalidateQueries({ queryKey: ["tasks", store.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function sync() {
    if (syncing) return;
    setSyncing(true);
    try {
      await api(`/stores/${store.id}/sync`, { method: "POST" });
      client.invalidateQueries({ queryKey: ["tasks", store.id] });
      toast.success("Đã tạo tác vụ đồng bộ.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }
  return (
    <>
      <div className="breadcrumb">
        <span>Không gian làm việc</span>
        <ChevronRight size={12} />
        <span>{store.name}</span>
        <ChevronRight size={12} />
        <span>Sản phẩm & giá</span>
      </div>
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex gap-3 items-center">
            <h1 className="page-title">Sản phẩm & giá</h1>
          </div>
          <p className="page-subtitle">
            Quản lý giá bán và bảo vệ giá sản phẩm của bạn.
          </p>
        </div>
        <Button
          aria-label="Đồng bộ sản phẩm"
          onClick={sync}
          disabled={!!active || editing}
          loading={syncing || active?.kind === "sync"}
        >
          <RefreshCw size={15} />
          <span className="hidden sm:inline">Đồng bộ</span>
        </Button>
      </div>
      <div className="stat-grid">
        {[
          [
            Package,
            "Tổng sản phẩm",
            all.toLocaleString("vi-VN"),
            "Trong cửa hàng hiện tại",
          ],
          [
            ShieldCheck,
            "Đang bảo vệ giá",
            protectedN.toLocaleString("vi-VN"),
            "Theo dõi giá bán đã chọn",
          ],
          [
            AlertCircle,
            "Cần kiểm tra",
            String(attention),
            attention ? "Có thay đổi cần đối chiếu" : "Chưa có cảnh báo về giá",
          ],
          [
            Clock3,
            "Đồng bộ gần nhất",
            store.lastSyncAt
              ? new Intl.DateTimeFormat("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(store.lastSyncAt))
              : "—",
            store.lastSyncAt
              ? "Dữ liệu lưu trong cửa hàng"
              : "Chờ đồng bộ đầu tiên",
          ],
        ].map(([Icon, label, value, foot]) => {
          const I = Icon as typeof Package;
          return (
            <div className="card stat-card" key={String(label)}>
              <div className="stat-label">
                {String(label)}
                <I size={17} className="text-[#a69ab7]" />
              </div>
              <div className="stat-value">
                {data.isPending ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  String(value)
                )}
              </div>
              <p className="stat-foot">{String(foot)}</p>
            </div>
          );
        })}
      </div>
      {active && (
        <div className="sync-panel sync-panel-floating" role="status">
          <span className="sync-symbol">
            <RefreshCw size={19} />
          </span>
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <strong className="text-sm">
                {active.kind === "sync"
                  ? `Đang đồng bộ ${stepNames[active.result?.activeStep as keyof typeof stepNames]?.toLowerCase() || "cửa hàng"}`
                  : active.kind === "buyer_prices"
                    ? "Đang đồng bộ giá cả & chiết khấu"
                    : active.kind === "catalog" ? "Đang đồng bộ sản phẩm"
                    : active.kind === "sales" ? "Đang đồng bộ phễu bán hàng"
                    : active.kind === "finance" ? "Đang đồng bộ báo cáo tài chính"
                    : active.kind === "guard"
                    ? "Đang kiểm tra bảo vệ giá"
                    : "Đang cập nhật giá"}
              </strong>
              <span className="text-xs text-brand">
                {active.status === "queued"
                  ? "Đang chờ xử lý"
                  : `${active.progress}%`}
              </span>
            </div>
            <Progress value={active.progress} />
            <p className="text-[11px] text-muted mt-2">
              {active.kind === "buyer_prices"
                ? "Bạn có thể tiếp tục làm việc. Giá giao dịch sẽ được cập nhật khi hoàn tất."
                : "Bạn có thể tiếp tục làm việc. Thông báo sẽ xuất hiện khi hoàn tất."}
            </p>
          </div>
        </div>
      )}
      <div className="tabs">
        <button
          className={`tab ${!lockedOnly ? "active" : ""}`}
          onClick={() => setLockedOnly(false)}
        >
          Tất cả sản phẩm{" "}
          {data.isPending ? (
            <Skeleton className="h-[25px] w-6" />
          ) : (
            <Badge>{all}</Badge>
          )}
        </button>
        <button
          className={`tab ${lockedOnly ? "active" : ""}`}
          onClick={() => setLockedOnly(true)}
        >
          <ShieldCheck size={15} />
          Đã bật bảo vệ
        </button>
        <button
          className="ml-auto text-xs text-muted flex gap-1.5 items-center"
          onClick={() => setInfo(true)}
          aria-label="Cách bảo vệ giá"
        >
          <Info size={14} />
          <span className="hidden sm:inline">Cách bảo vệ giá</span>
        </button>
      </div>
      <div className="card overflow-hidden">
        <div className="toolbar">
          <Button
            variant={editing ? "secondary" : "primary"}
            onClick={() => {
              if (editing) {
                setDrafts({});
                setEditing(false);
              } else setEditing(true);
            }}
            disabled={!!active || data.isPlaceholderData || !products.length}
          >
            <Pencil size={15} />
            {editing ? "Đang chỉnh sửa" : "Chỉnh sửa"}
          </Button>
          <PriceFilters
            disabled={editing}
            value={filters}
            onChange={setFilters}
            facets={catalog?.facets || []}
          />
          <span className="hidden sm:block w-px h-5 bg-gray-200 mx-1" />
          <label className="flex items-center gap-2 text-xs text-muted toggle-label">
            <Switch
              checked={noPrice}
              onCheckedChange={setNoPrice}
              label="Chưa có giá"
              disabled={editing}
            />
            Chưa có giá
          </label>
          <label className="flex items-center gap-2 text-xs text-muted toggle-label">
            <Switch
              checked={
                bulkRequest?.locked ?? (all > 0 && catalog?.lockedCount === all)
              }
              onCheckedChange={setBulkLock}
              label="Đã khóa giá — toàn bộ cửa hàng"
              disabled={!all || lockBusy}
            />
            Đã khóa giá
            {!!catalog?.lockedCount && catalog.lockedCount < all && (
              <span className="text-[10px]">
                {catalog.lockedCount}/{all}
              </span>
            )}
          </label>
          <div className="ml-auto">
            <Button
              onClick={() => setExcel(true)}
              disabled={editing || !!active}
            >
              <FileSpreadsheet size={16} className="text-green-700" />
              Excel
              <ChevronDown size={13} />
            </Button>
          </div>
        </div>
        {(filters.categories.length > 0 || filters.brands.length > 0) && (
          <div className="flex gap-2 px-5 py-3 bg-[#fcfaff]">
            {[...filters.categories, ...filters.brands].map((v) => (
              <Badge tone="purple" key={v}>
                {v}
              </Badge>
            ))}
            <button
              className="text-xs text-muted"
              onClick={() => setFilters({ categories: [], brands: [] })}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
        {editing && (
          <div className="notice mx-5 mt-4">
            <Info size={16} className="shrink-0 mt-0.5" />
            <div>
              {store.platform === "wb"
                ? "WB: hệ thống kiểm tra và khôi phục giá theo lịch bạn đã thiết lập. Khóa tự động giảm giá cần bật thêm trong WB Seller."
                : "Ozon: bật bảo vệ để đặt giá tối thiểu bằng giá bán và tắt các chế độ giá tự động. Khuyến mại đã lên lịch cần kiểm tra riêng."}
              <button
                className="ml-2 underline text-brand"
                onClick={() => setInfo(true)}
              >
                Chi tiết
              </button>
            </div>
          </div>
        )}
        <p className="buyer-price-note" role="status">
          {catalog?.buyerPrices?.buyerPricesStatus === "unavailable" ||
          catalog?.buyerPrices?.buyerPricesStatus === "partial"
            ? "Chưa cập nhật đủ giá giao dịch. Kiểm tra quyền đọc đơn hàng; dữ liệu cũ được giữ nguyên."
            : catalog?.buyerPrices?.buyerPricesStatus === "pending"
              ? "Đồng bộ cửa hàng để xem chiết khấu sàn và giá khách đã mua."
              : "Giao dịch gần nhất trong 30 ngày; không phải giá khách đang thấy trên sàn."}
        </p>
        <div
          className="table-scroll"
          ref={scrollRoot}
          aria-busy={data.isFetching}
          tabIndex={0}
          role="region"
          aria-label="Danh sách sản phẩm"
        >
          {data.isPending && (
            <span className="sr-only" role="status">
              Đang tải sản phẩm…
            </span>
          )}
          <table className="price-table">
            <thead>
              <tr>
                <th>
                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-3 text-muted"
                    />
                    <Input
                      aria-label="Tìm sản phẩm"
                      placeholder="Tìm tên, article hoặc mã sàn…"
                      className="price-search pl-10! bg-surface! border-transparent! min-h-10!"
                      value={search}
                      disabled={editing}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </th>
                <th>
                  {store.platform === "ozon" ? <>Giá bán<br />bạn đặt</> : <>Giá bán<br />trước giảm giá</>}
                </th>
                <th>
                  {store.platform === "ozon" ? <>Giá gạch ngang<br /><span className="transaction-caption">Giá tham chiếu</span></> : <>Giảm giá<br />của người bán</>}
                </th>
                <th>
                  {store.platform === "ozon" ? <>Giảm so với<br />giá gạch ngang</> : <>Giá sau<br />giảm giá</>}
                </th>
                <th>
                  {store.platform === "wb" ? "Chiết khấu WB %" : "Chênh lệch giá khách %"}
                  <br />
                  <span className="transaction-caption">
                    {store.platform === "ozon"
                      ? "Ước tính · giao dịch gần nhất"
                      : "Giao dịch gần nhất"}
                  </span>
                </th>
                <th>
                  Giá khách đã mua
                  <br />
                  <span className="transaction-caption">
                    Giao dịch gần nhất
                  </span>
                </th>
                <th>
                  <span className="inline-flex gap-1 items-center">
                    Bảo vệ giá
                    <ShieldCheck size={13} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.isPending ? (
                <ProductSkeletonRows />
              ) : (
                products.map((p) => {
                  const d = drafts[p.id],
                    value = d || p;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="product-cell">
                          <img
                            className="product-image"
                            src={p.image || "/products/placeholder.svg"}
                            alt={p.title}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/products/placeholder.svg";
                            }}
                          />
                          <div className="product-summary">
                            <p className="product-title" title={p.title}>
                              {p.title}
                            </p>
                            <p
                              className="product-meta"
                              title={[
                                p.category,
                                p.brand,
                                p.externalId,
                                p.article,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            >
                              {[p.category, p.brand, p.externalId, p.article]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {editing ? (
                          <div className="relative inline-block">
                            <Input
                              className="number-input pr-7"
                              type="number"
                              step={store.platform === "wb" ? 1 : 0.01}
                              min="1"
                              aria-label={`Giá ${p.article}`}
                              value={value.price / 100}
                              onChange={(e) =>
                                edit(p, {
                                  price: Math.round(
                                    Number(e.target.value) * 100,
                                  ),
                                })
                              }
                            />
                            <span className="absolute right-2 top-3 text-muted text-xs">
                              ₽
                            </span>
                          </div>
                        ) : (
                          <strong className="product-price">
                            {price(p.price, p.currency)}
                          </strong>
                        )}
                        {store.platform === "ozon" && !editing && p.salePrice > 0 && p.salePrice !== p.price && <p className="text-xs text-muted mt-2">Theo chương trình: {price(p.salePrice, p.currency)}</p>}
                      </td>
                      <td>
                        {editing && store.platform === "wb" ? (
                          <Input
                            className="number-input w-20!"
                            type="number"
                            min={0}
                            max={95}
                            step={1}
                            aria-label={`Giảm giá ${p.article}`}
                            value={value.discount}
                            onChange={(e) =>
                              edit(p, { discount: Number(e.target.value) })
                            }
                          />
                        ) : (
                          <span className="product-price">
                            {store.platform === "ozon"
                              ? p.oldPrice && p.oldPrice > 0 ? price(p.oldPrice, p.currency) : "—"
                              : `${value.discount}%`}
                          </span>
                        )}
                      </td>
                      <td>
                        <strong
                          className={`product-price${d ? " text-brand" : ""}`}
                        >
                          {store.platform === "ozon" ? (() => {
                            const percent = ozonReferenceDiscount(value.price, p.oldPrice);
                            return percent === null ? "—" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(percent)}%`;
                          })() : price(
                            editing
                              ? Math.round(
                                  (value.price * (100 - value.discount)) / 100,
                                )
                              : p.salePrice,
                            p.currency,
                          )}
                        </strong>
                        {d && (
                          <p className="text-[10px] text-brand mt-1">
                            Chưa lưu
                          </p>
                        )}
                      </td>
                      <td>
                        {p.buyerPrice?.discountPercent != null ? (
                          <strong
                            className="product-price"
                            title={
                              p.buyerPrice.discountKind === "price_difference"
                                ? "Chênh lệch giữa giá người bán và giá khách trả trong cùng giao dịch. Có thể gồm ưu đãi thanh toán, không khẳng định toàn bộ do Ozon tài trợ."
                                : "Chiết khấu WB ghi nhận trong giao dịch, không phải mức hiện tại trên sàn."
                            }
                          >
                            {p.buyerPrice.discountKind === "price_difference"
                              ? "≈ "
                              : ""}
                            {new Intl.NumberFormat("vi-VN", {
                              maximumFractionDigits: 2,
                            }).format(p.buyerPrice.discountPercent)}
                            %
                          </strong>
                        ) : (
                          <span
                            className="text-muted"
                            title="Chưa có dữ liệu chiết khấu của giao dịch"
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        {p.buyerPrice?.customerPrice != null ? (
                          <strong className="product-price">
                            {price(
                              p.buyerPrice.customerPrice,
                              p.buyerPrice.currency,
                            )}
                          </strong>
                        ) : (
                          <span
                            className="text-muted"
                            title="Chưa có giá khách trả được xác nhận"
                          >
                            —
                          </span>
                        )}
                        {p.buyerPrice && (
                          <p
                            className="transaction-caption"
                            title={`${p.buyerPrice.source === "wb_sale" ? "Ngày bán" : "Ngày đặt của đơn đã giao"}: ${new Date(p.buyerPrice.transactionAt).toLocaleString("vi-VN")} · Cập nhật: ${new Date(p.buyerPrice.collectedAt).toLocaleString("vi-VN")}`}
                          >
                            {new Date(
                              p.buyerPrice.transactionAt,
                            ).toLocaleDateString("vi-VN")}
                          </p>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-col items-end gap-2">
                          <Switch
                            checked={
                              lockRequests[p.id]?.locked ??
                              bulkRequest?.locked ??
                              p.locked
                            }
                            onCheckedChange={(locked) =>
                              changeLock(locked, p.id)
                            }
                            disabled={!!lockRequests[p.id] || !!bulkRequest}
                            label={`Bảo vệ giá ${p.article}`}
                          />
                          {(lockRequests[p.id] ||
                            bulkRequest ||
                            ["pending", "attention"].includes(
                              p.protection,
                            )) && (
                            <span
                              className={`text-[10px] ${p.protection === "attention" ? "text-amber-600" : p.locked ? "text-brand" : "text-muted"}`}
                            >
                              {lockRequests[p.id] || bulkRequest
                                ? "Đang cập nhật"
                                : protectionLabel[p.protection]}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              {data.isFetchingNextPage && <ProductSkeletonRows rows={2} />}
            </tbody>
          </table>
          <div ref={loadMore} className="product-load-more">
            {data.isFetchingNextPage ? (
              <span role="status">Đang tải thêm sản phẩm…</span>
            ) : data.isFetchNextPageError ? (
              <div
                role="alert"
                className="flex items-center justify-center gap-3"
              >
                <span>Chưa tải được sản phẩm tiếp theo.</span>
                <Button
                  onClick={() => data.fetchNextPage({ cancelRefetch: false })}
                  loading={data.isFetching}
                >
                  Thử lại
                </Button>
              </div>
            ) : products.length > 0 && !data.isPlaceholderData ? (
              <span>
                {data.hasNextPage
                  ? "Cuộn xuống để xem thêm"
                  : "Đã hiển thị tất cả sản phẩm"}
              </span>
            ) : null}
          </div>
        </div>
        {data.error && !data.isFetchNextPageError && (
          <EmptyState
            title="Chưa tải được sản phẩm"
            description={data.error.message}
            action={
              <Button loading={data.isFetching} onClick={() => data.refetch()}>
                Thử lại
              </Button>
            }
          />
        )}{" "}
        {!data.isLoading && !data.error && !products.length && (
          <EmptyState
            title={
              all ? "Không tìm thấy sản phẩm" : "Sản phẩm sẽ xuất hiện ở đây"
            }
            description={
              all
                ? "Thử thay đổi từ khóa hoặc bỏ bớt bộ lọc."
                : "Kết nối cửa hàng đã sẵn sàng. Dữ liệu sẽ được hiển thị sau tác vụ đồng bộ đầu tiên."
            }
            action={
              all ? (
                <Button
                  onClick={() => {
                    setFilters({ categories: [], brands: [] });
                    setSearch("");
                    setNoPrice(false);
                    setLockedOnly(false);
                  }}
                >
                  Xóa bộ lọc
                </Button>
              ) : (
                <Button onClick={sync} disabled={!!active} loading={syncing}>
                  <RefreshCw size={16} />
                  Đồng bộ sản phẩm
                </Button>
              )
            }
          />
        )}
        <div className="table-footer">
          <span>
            {data.isPending
              ? "Đang tải sản phẩm…"
              : `Đã tải ${products.length} / ${catalog?.total || 0} sản phẩm`}{" "}
            <span className="hidden sm:inline">• Giá tính bằng RUB</span>
          </span>
        </div>
      </div>
      {editing && (
        <div className="save-bar">
          <span className="text-xs text-muted save-count mr-auto">
            {Object.keys(drafts).length} thay đổi
            {invalid && (
              <span className="block text-red-500 mt-1">
                Kiểm tra giá và % giảm
              </span>
            )}
          </span>
          <Button
            onClick={() => {
              setEditing(false);
              setDrafts({});
            }}
          >
            <X size={16} />
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={save}
            loading={saving}
            disabled={!Object.keys(drafts).length || invalid || lockBusy}
          >
            <Check size={16} />
            Lưu thay đổi
          </Button>
        </div>
      )}
      <Modal
        open={bulkLock !== null}
        onOpenChange={(open) => {
          if (!open) setBulkLock(null);
        }}
        title={
          bulkLock
            ? "Khóa giá toàn bộ cửa hàng?"
            : "Tắt khóa giá toàn bộ cửa hàng?"
        }
        description={`Áp dụng cho toàn bộ ${all} sản phẩm của ${store.name}, kể cả sản phẩm chưa tải và ngoài bộ lọc hiện tại.`}
      >
        <p className="text-sm text-muted mb-6">
          {bulkLock
            ? "Sản phẩm chưa khóa sẽ sử dụng mức giá hiện tại trên sàn. Sản phẩm đã khóa giữ nguyên mức giá bảo vệ. Giá bạn đang sửa nhưng chưa lưu không được áp dụng."
            : "Hệ thống sẽ dừng bảo vệ giá. Giá bán và cài đặt đã gửi lên sàn được giữ nguyên."}
        </p>
        <div className="flex justify-end gap-3">
          <Button onClick={() => setBulkLock(null)}>Hủy</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (bulkLock !== null) void changeLock(bulkLock);
            }}
          >
            {bulkLock ? "Khóa giá tất cả" : "Tắt khóa giá tất cả"}
          </Button>
        </div>
      </Modal>
      <ExcelDialog
        key={store.id}
        store={store}
        open={excel}
        onOpenChange={setExcel}
        onSubmitted={() =>
          client.invalidateQueries({ queryKey: ["tasks", store.id] })
        }
      />
      <Modal
        open={info}
        onOpenChange={setInfo}
        title="Bảo vệ giá hoạt động thế nào?"
        description="Giá mục tiêu được lưu riêng và không bị ghi đè khi đồng bộ."
      >
        <div className="space-y-5 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold mb-2">Ozon</h3>
            <p className="text-muted">
              Giữ giá tối thiểu theo mức bạn chọn và tắt tự động giảm giá. Các
              chương trình khuyến mại đã lên lịch cần được kiểm tra thêm trong
              Ozon Seller.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Wildberries</h3>
            <p className="text-muted">
              Theo dõi và khôi phục mức giá bạn chọn khi có thay đổi. Bạn cần
              bật thêm khóa tự động giảm giá trong Wildberries Seller.
            </p>
          </div>
          <div className="notice warning">
            <Info size={18} className="shrink-0" />
            Ưu đãi do sàn tài trợ vẫn có thể làm giá người mua nhìn thấy thấp
            hơn. Việc kiểm tra diễn ra định kỳ, nên thay đổi có thể chưa được
            phát hiện ngay.
          </div>
          <p className="text-xs text-muted">
            Tắt bảo vệ dừng tự động khôi phục. Giá sàn/cài đặt đã gửi lên sàn
            được giữ nguyên.
          </p>
        </div>
      </Modal>
    </>
  );
}
