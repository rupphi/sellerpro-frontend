"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, ShieldCheck, Eye, EyeOff, Check } from "lucide-react";
import { Brand, Button, Input, MarketplaceLogo, Badge, FormError } from "../../components/ui";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
export function AuthForm({ register = false, admin = false }: { register?: boolean; admin?: boolean }) {
  const router = useRouter();
  const client = useQueryClient();
  const submitting = useRef(false);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const user = await api<{ id: string; username: string; role: "USER" | "ADMIN" }>(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      client.clear();
      client.setQueryData(["me"], user);
      if (admin && user.role !== "ADMIN") throw new Error("Tài khoản này không có quyền quản trị.");
      router.push(user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      submitting.current = false;
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Link href="/">
          <Brand />
        </Link>
        <div>
          <Badge tone="purple">KHÔNG GIAN LÀM VIỆC CỦA BẠN</Badge>
          <h2 className="text-4xl font-semibold tracking-tight leading-tight mt-6 mb-5">
            Một góc nhìn rõ ràng.
            <br />
            Mọi cửa hàng trong tay.
          </h2>
          <p className="text-muted leading-relaxed max-w-sm">
            Bắt đầu một ngày mới với sản phẩm, giá cả và những công việc đã được
            sắp xếp.
          </p>
          <div className="auth-art mt-7">
            <div className="auth-art-card">
              <div className="flex gap-3 items-center">
                <MarketplaceLogo platform="wb" size="lg" />
                <div>
                  <strong>FASHION STUDIO</strong>
                  <p className="text-xs text-muted mt-1">
                    Wildberries • Minh họa
                  </p>
                </div>
              </div>
              <div className="mt-6 h-px bg-gray-100" />
              <div className="flex justify-between mt-5 text-sm">
                <span className="text-muted">Sản phẩm của bạn</span>
                <strong>128</strong>
              </div>
              <div className="flex justify-between mt-3 text-sm">
                <span className="text-muted">Trạng thái</span>
                <Badge tone="green">
                  <Check size={12} /> Đã đồng bộ
                </Badge>
              </div>
            </div>
            <div className="auth-art-small flex gap-2 items-center text-xs text-brand">
              <ShieldCheck size={19} /> Giá bán trong tầm kiểm soát
            </div>
          </div>
        </div>
        <p className="text-xs text-muted">
          Wildberries & Ozon · Cùng một không gian quản lý
        </p>
      </aside>
      <div className="auth-form-wrap">
        <form
          onSubmit={submit}
          className="auth-form"
          aria-busy={busy}
          aria-label={register ? "Tạo tài khoản" : "Đăng nhập"}
        >
          <Link href="/" className="auth-back text-sm text-muted">
            ← Về trang chủ
          </Link>
          {register ? (
            <h1 className="sr-only">Tạo tài khoản</h1>
          ) : (
            <div className="auth-heading">
              <h1 className="text-3xl font-semibold tracking-tight">
                {admin ? "Đăng nhập quản trị" : "Chào mừng trở lại"}
              </h1>
              <p className="text-sm text-muted leading-relaxed">
                {admin ? "Khu vực dành riêng cho quản trị viên." : "Đăng nhập để tiếp tục quản lý cửa hàng."}
              </p>
            </div>
          )}
          <div className="field">
            <label htmlFor="username" className="label">
              Tên đăng nhập
            </label>
            <Input
              id="username"
              readOnly={busy}
              name="username"
              placeholder="vd. fashion67"
              autoComplete="username"
              required
              minLength={3}
              maxLength={40}
              pattern="[a-zA-Z0-9_.\-]+"
            />
          </div>
          <div className="field auth-password-field">
            <label htmlFor="password" className="label">
              Mật khẩu
            </label>
            <div className="relative">
              <Input
                id="password"
                readOnly={busy}
                name="password"
                type={show ? "text" : "password"}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={6}
                maxLength={128}
                required
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-3 text-muted"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <Button
            variant="primary"
            type="submit"
            className="w-full auth-submit"
            loading={busy}
          >
            {register ? "Tạo tài khoản" : "Đăng nhập"}
            <ArrowRight size={16} />
          </Button>
          {!admin && <p className="auth-alternate text-center text-sm text-muted">
            {register ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
            <Link
              className="text-brand font-semibold"
              href={register ? "/login" : "/register"}
            >
              {register ? "Đăng nhập" : "Đăng ký"}
            </Link>
          </p>}
          <FormError message={error} />
        </form>
      </div>
    </div>
  );
}
