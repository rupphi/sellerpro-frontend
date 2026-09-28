"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Brand, Button, Skeleton } from "../../components/ui";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), router = useRouter(), client = useQueryClient();
  const login = path === "/admin/login";
  const [busy, setBusy] = useState(false);
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<{ username: string; role: string }>("/auth/me"), enabled: !login, retry: false });
  useEffect(() => { if (!login && me.error instanceof ApiError && me.error.status === 401) router.replace("/admin/login"); }, [me.error, login, router]);
  if (login) return children;
  if (me.isPending) return <main className="max-w-5xl mx-auto p-8 space-y-5"><Skeleton className="h-16" /><Skeleton className="h-80" /></main>;
  if (me.error) return <main className="max-w-xl mx-auto p-8"><p>Không thể xác minh quyền truy cập.</p><Button className="mt-4" onClick={() => me.refetch()}>Thử lại</Button></main>;
  if (me.data?.role !== "ADMIN") return <main className="max-w-xl mx-auto p-8"><h1 className="page-title">Không có quyền truy cập</h1><p className="mt-4">Trang này chỉ dành cho tài khoản quản trị.</p><Link className="text-brand inline-block mt-6" href="/dashboard">Về cửa hàng</Link></main>;
  return <>
    <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-white">
      <Link href="/admin"><Brand /></Link>
      <div className="flex items-center gap-3 text-sm"><ShieldCheck size={18} className="text-brand" /><span>Quản trị · {me.data.username}</span>
        <Link className="text-muted hidden sm:inline" href="/dashboard">Cửa hàng</Link>
        <Button aria-label="Đăng xuất quản trị" variant="ghost" loading={busy} onClick={async () => {
          setBusy(true); try { await api("/auth/logout", { method: "POST" }); client.clear(); router.replace("/admin/login"); }
          catch (e) { toast.error((e as Error).message); setBusy(false); }
        }}><LogOut size={18} /></Button>
      </div>
    </header><main className="p-4 sm:p-8">{children}</main>
  </>;
}
