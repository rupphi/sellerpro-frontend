"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  Plus,
  LogOut,
  Package,
  LayoutDashboard,
  ListTodo,
  Check,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Store as StoreIcon,
  Settings2,
  Trash2,
  BookOpen,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type Store } from "@/lib/api";
import { Brand, Button, Popover, MarketplaceLogo, Badge, Skeleton } from "../../components/ui";
import { AddStore } from "./add-store";
import { DeleteStoreDialog } from "./delete-store-dialog";
import { PageSkeleton, ListSkeleton } from "../../components/loading-states";
import { time } from "@/lib/utils";
const StoreContext = createContext<{
  store: Store;
  openAdd: () => void;
} | null>(null);
export function useStore() {
  return useContext(StoreContext)!;
}
export function Workspace({ children }: { children: React.ReactNode }) {
  const router = useRouter(),
    path = usePathname(),
    client = useQueryClient();
  const [selected, setSelected] = useState(""),
    [add, setAdd] = useState(false),
    [storeMenu, setStoreMenu] = useState(false);
  const [reading, setReading] = useState(false),
    [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState<Store | null>(null);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ username: string; role: string }>("/auth/me"),
    retry: false,
  });
  const stores = useQuery({
    queryKey: ["stores"],
    queryFn: () => api<Store[]>("/stores"),
    enabled: !!me.data,
    refetchInterval: 10000,
  });
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<any[]>("/notifications"),
    enabled: !!me.data,
    refetchInterval: 30000,
  });
  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401)
      router.replace("/login");
  }, [me.error, router]);
  useEffect(() => {
    setSelected(localStorage.getItem("ml-store") || "");
  }, []);
  useEffect(() => {
    if (!me.data) return;
    const stream = new EventSource("/api/events");
    stream.onmessage = (e) => {
      const data = JSON.parse(e.data);
      toast(data.title, { description: data.body });
      void client.invalidateQueries({ queryKey: ["tasks"] });
      void client.invalidateQueries({ queryKey: ["products"] });
      void client.invalidateQueries({ queryKey: ["notifications"] });
      void client.invalidateQueries({ queryKey: ["stores"] });
    };
    return () => stream.close();
  }, [me.data, client]);
  function choose(id: string) {
    setSelected(id);
    localStorage.setItem("ml-store", id);
    setStoreMenu(false);
    router.push("/dashboard");
  }
  const store = stores.data?.find((s) => s.id === selected) || stores.data?.[0];
  const unread = notifications.data?.filter((x) => !x.readAt).length || 0;
  return (
    <>
      <header className="app-header">
        <Link
          href="/"
          className="header-brand"
          aria-label="sellerpro — Trang chủ"
        >
          <Brand />
        </Link>
        <nav className="top-nav" aria-label="Điều hướng chính">
          {[
            ["/dashboard/overview", "Tổng quan", LayoutDashboard],
            ["/dashboard", "Sản phẩm & giá", Package],
            ["/dashboard/sales", "Phễu bán hàng", TrendingUp],
            ["/dashboard/finance", "Tài chính", Wallet],
            ["/dashboard/tasks", "Công việc", ListTodo],
          ].map(([href, label, Icon]) => {
            const I = Icon as typeof Package;
            return (
              <Link
                key={String(href)}
                href={String(href)}
                aria-current={path === href ? "page" : undefined}
                className={`nav-item ${path === href ? "active" : ""}`}
              >
                <I size={16} />
                <span>{String(label)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="header-actions">
          <Popover
            align="end"
            trigger={
              <Button
                className="icon-btn relative"
                variant="ghost"
                aria-label="Thông báo"
              >
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 bg-brand text-white rounded-full text-[9px] px-1">
                    {unread}
                  </span>
                )}
              </Button>
            }
            className="w-[370px]"
          >
            <div className="flex justify-between items-center p-2">
              <strong>Thông báo</strong>
              <Button
                variant="ghost"
                className="text-xs!"
                loading={reading}
                onClick={async () => {
                  if (reading) return;
                  setReading(true);
                  try {
                    await api("/notifications/read", { method: "PATCH" });
                    await client.invalidateQueries({
                      queryKey: ["notifications"],
                    });
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setReading(false);
                  }
                }}
              >
                Đã đọc tất cả
              </Button>
            </div>
            <div className="max-h-80 overflow-auto">
              {notifications.data?.length ? (
                notifications.data.map((n) => (
                  <div key={n.id} className="p-3 border-t border-gray-100">
                    <p className="font-semibold text-xs">
                      {!n.readAt && (
                        <span className="inline-block w-1.5 h-1.5 bg-brand rounded-full mr-2" />
                      )}
                      {n.title}
                    </p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-muted mt-2">
                      {time(n.createdAt)}
                    </p>
                  </div>
                ))
              ) : notifications.isPending ? (
                <ListSkeleton rows={3} />
              ) : (
                <p className="p-6 text-center text-muted text-xs">
                  Bạn đã xem hết thông báo.
                </p>
              )}
            </div>
          </Popover>
          <span className="header-divider" />
          <Popover
            open={storeMenu}
            onOpenChange={setStoreMenu}
            align="end"
            trigger={
              <Button
                variant="ghost"
                className="store-trigger"
                aria-label={`Cửa hàng: ${store?.name || "Chưa kết nối"}`}
              >
                {store ? (
                  <MarketplaceLogo platform={store.platform} />
                ) : (
                  <StoreIcon size={20} />
                )}
                <span className="store-label max-w-36 truncate">
                  {store?.name || "Cửa hàng của bạn"}
                </span>
                <ChevronDown size={14} />
              </Button>
            }
            className="store-menu"
          >
            <p className="text-xs text-muted px-3 py-2">CỬA HÀNG CỦA BẠN</p>
            {stores.data?.map((s) => (
              <div className="flex items-center" key={s.id}>
              <button
                className="menu-row flex-1 min-w-0"
                key={s.id}
                onClick={() => choose(s.id)}
              >
                <MarketplaceLogo platform={s.platform} />
                <span className="flex-1">
                  <strong className="text-sm">{s.name}</strong>
                  <p className="text-[11px] text-muted mt-1">
                    {s.platform === "wb" ? "Wildberries" : "Ozon"}
                  </p>
                </span>
                {s.id === store?.id && (
                  <Check size={17} className="text-brand" />
                )}
              </button>
              <Button variant="ghost" className="icon-btn text-muted shrink-0" aria-label={`Xóa cửa hàng ${s.name}`}
                onClick={() => { setDeleting(s); setStoreMenu(false); }}><Trash2 size={16} /></Button>
              </div>
            ))}
            <button
              className="menu-row text-brand"
              onClick={() => {
                setAdd(true);
                setStoreMenu(false);
              }}
            >
              <Plus size={17} />
              Thêm cửa hàng
            </button>
            <div className="border-t border-gray-100 mt-2 pt-2">
              {me.data?.role === "ADMIN" && <Link href="/admin" className="menu-row" onClick={() => setStoreMenu(false)}>
                <Settings2 size={17} />Quản trị lịch tự động
              </Link>}
              <span className="menu-row">
                <span className="avatar">
                  {me.data?.username.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-xs">{me.data?.username}</span>
              </span>
              <Button
                variant="ghost"
                className="menu-row text-muted w-full justify-start"
                loading={loggingOut}
                onClick={async () => {
                  if (loggingOut) return;
                  setLoggingOut(true);
                  try {
                    await api("/auth/logout", { method: "POST" });
                    client.clear();
                    router.replace("/login");
                  } catch (e) {
                    toast.error((e as Error).message);
                    setLoggingOut(false);
                  }
                }}
              >
                <LogOut size={16} />
                Đăng xuất
              </Button>
            </div>
          </Popover>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Điều hướng trên điện thoại">
        <Link href="/dashboard/sales" aria-current={path === "/dashboard/sales" ? "page" : undefined}><TrendingUp size={16} />Phễu bán hàng</Link>
        <Link href="/dashboard/finance" aria-current={path === "/dashboard/finance" ? "page" : undefined}><Wallet size={16} />Tài chính</Link>
        <Link
          href="/dashboard/overview"
          aria-current={path === "/dashboard/overview" ? "page" : undefined}
        >
          <LayoutDashboard size={16} />
          Tổng quan
        </Link>
        <Link
          href="/dashboard"
          aria-current={path === "/dashboard" ? "page" : undefined}
        >
          <Package size={16} />
          Sản phẩm & giá
        </Link>
        <Link
          href="/dashboard/tasks"
          aria-current={path === "/dashboard/tasks" ? "page" : undefined}
        >
          <ListTodo size={16} />
          Công việc
        </Link>
      </nav>
      {deleting && <DeleteStoreDialog key={deleting.id} store={deleting} onClose={() => setDeleting(null)} onDeleted={async () => {
        const removedId = deleting.id;
        await client.cancelQueries({ queryKey: ["products", removedId] });
        for (const key of ["products", "tasks", "audit"]) client.removeQueries({ queryKey: [key, removedId] });
        if (store?.id === removedId) { localStorage.removeItem("ml-store"); setSelected(""); router.replace("/dashboard"); }
        await client.invalidateQueries({ queryKey: ["stores"] });
      }} />}
      <main className="app-main">
        {me.isPending || (!!me.data && stores.isPending) ? (
          <PageSkeleton
            variant={
              path.endsWith("overview")
                ? "overview"
                : path.endsWith("tasks")
                  ? "tasks"
                  : "products"
            }
          />
        ) : me.error || stores.error ? (
          <div className="card p-10">
            <h2 className="font-semibold text-lg">
              Không kết nối được máy chủ
            </h2>
            <p className="text-muted mt-3">
              {(me.error || stores.error)?.message}
            </p>
            <Button
              className="mt-5"
              loading={me.isFetching || stores.isFetching}
              onClick={() => {
                me.refetch();
                stores.refetch();
              }}
            >
              Thử lại
            </Button>
          </div>
        ) : path === "/dashboard/admin" ? children : store ? (
          <StoreContext.Provider value={{ store, openAdd: () => setAdd(true) }}>
            {children}
          </StoreContext.Provider>
        ) : (
          <div className="welcome">
            <div className="text-center">
              <span className="empty-icon mx-auto">
                <StoreIcon size={29} />
              </span>
              <Badge tone="purple">BẮT ĐẦU HÀNH TRÌNH</Badge>
              <h1 className="page-title mt-5">
                Xin chào, {me.data?.username} 👋
              </h1>
              <p className="page-subtitle max-w-md mx-auto">
                Kết nối cửa hàng đầu tiên để đưa sản phẩm và giá cả về cùng một
                không gian.
              </p>
            </div>
            <div className="welcome-steps">
              {[
                [
                  StoreIcon,
                  "01",
                  "Kết nối cửa hàng",
                  "Chọn Wildberries hoặc Ozon và nhập khóa API.",
                ],
                [
                  RefreshCw,
                  "02",
                  "Đồng bộ sản phẩm",
                  "Dữ liệu được tải nền. Theo dõi tiến độ ngay trong dashboard.",
                ],
                [
                  ShieldCheck,
                  "03",
                  "Chủ động quản lý giá",
                  "Chỉnh từng sản phẩm, nhập Excel và bật bảo vệ giá.",
                ],
              ].map(([Icon, no, title, desc]) => {
                const I = Icon as typeof StoreIcon;
                return (
                  <div className="card welcome-step" key={String(no)}>
                    <div className="flex justify-between">
                      <I size={22} className="text-brand" />
                      <span className="text-xs text-gray-300">
                        {String(no)}
                      </span>
                    </div>
                    <strong>{String(title)}</strong>
                    <p>{String(desc)}</p>
                  </div>
                );
              })}
            </div>
            <div className="card p-7 flex justify-between items-center gap-4">
              <div>
                <h2 className="font-semibold">Thêm cửa hàng đầu tiên</h2>
                <p className="text-muted text-xs mt-2">
                  Kết nối Wildberries hoặc Ozon để bắt đầu quản lý.
                </p>
              </div>
              <Button variant="primary" onClick={() => setAdd(true)}>
                <Plus size={17} />
                Thêm cửa hàng
              </Button>
            </div>
            <p className="help-footer">
              <ShieldCheck size={13} /> Dữ liệu của bạn được bảo vệ an toàn.
            </p>
          </div>
        )}
      </main>
      <AddStore
        open={add}
        onOpenChange={setAdd}
        onCreated={(s) => choose(s.id)}
      />
    </>
  );
}
