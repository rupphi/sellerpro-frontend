import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Layers3,
  RefreshCw,
  Check,
  LockKeyhole,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { Brand, MarketplaceLogo, Badge } from "@/components/ui";
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link href="/">
          <Brand />
        </Link>
        <nav className="landing-nav flex gap-8 text-sm text-muted">
          <a href="#features">Tính năng</a>
        </nav>
        <Link href="/login" className="btn btn-secondary">
          Đăng nhập <ArrowRight size={15} />
        </Link>
      </header>
      <main>
        <section className="hero">
          <Badge tone="purple">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> MỘT KHÔNG
            GIAN. MỌI CỬA HÀNG.
          </Badge>
          <h1>
            Tập trung bán hàng.
            <br />
            <em>Giá cả, để bạn làm chủ.</em>
          </h1>
          <p>
            Quản lý Wildberries và Ozon trong cùng một nơi. Đồng bộ sản phẩm,
            cập nhật giá và theo dõi mọi thay đổi của cửa hàng.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/register" className="btn btn-primary px-6!">
              Tạo không gian của bạn <ArrowRight size={17} />
            </Link>
            <a href="#features" className="btn btn-secondary">
              Khám phá tính năng
            </a>
          </div>
          <div className="flex justify-center items-center gap-5 mt-6 text-xs text-muted">
            <span className="flex items-center gap-2">
              <MarketplaceLogo platform="wb" /> Wildberries
            </span>
            <span className="w-px h-4 bg-gray-200" />
            <span className="flex items-center gap-2">
              <MarketplaceLogo platform="ozon" /> Ozon
            </span>
          </div>
          <div className="hero-preview">
            <div className="flex items-center justify-between mb-5">
              <span className="font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand" /> Không gian
                của bạn
              </span>
              <Badge>Minh họa giao diện</Badge>
            </div>
            <div className="preview-frame">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Sản phẩm & giá</span>
                <span className="btn btn-primary min-h-0! text-xs! py-2!">
                  Chỉnh sửa
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 mb-5">
                {[
                  ["Sản phẩm", "128"],
                  ["Đang bảo vệ giá", "96"],
                  ["Cần kiểm tra", "2"],
                ].map(([label, value]) => (
                  <div key={label} className="card p-4">
                    <p className="text-[11px] text-muted">{label}</p>
                    <p className="text-2xl font-semibold mt-2">{value}</p>
                  </div>
                ))}
              </div>
              <div className="card overflow-hidden">
                <div className="flex justify-between p-4 border-b border-gray-100 text-xs text-muted">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal size={14} /> Bộ lọc sản phẩm
                  </span>
                  <span>Giá bán • Bảo vệ giá</span>
                </div>
                {[
                  "Áo khoác mùa thu",
                  "Quần âu ống suông",
                  "Blazer tối giản",
                ].map((title, i) => (
                  <div
                    key={title}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex gap-3 items-center">
                      <img
                        src={`/products/product-${i}.svg`}
                        className="w-9 h-12 rounded"
                        alt="Minh họa sản phẩm"
                      />
                      <div>
                        <p className="text-xs font-semibold">{title}</p>
                        <p className="text-[10px] text-muted mt-1">
                          FASHION 67 · Bộ sưu tập mới
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-8 items-center text-xs font-semibold">
                      <span>3.200 ₽</span>
                      <LockKeyhole size={15} className="text-brand" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="landing-features">
          {[
            [
              Layers3,
              "Mọi cửa hàng, một màn hình",
              "Chuyển đổi tài khoản nhanh chóng. Dữ liệu, sản phẩm và giá được tách riêng cho từng cửa hàng.",
            ],
            [
              ShieldCheck,
              "Chủ động bảo vệ giá bán",
              "Đặt mức giá mục tiêu, kiểm tra định kỳ và nhận thông báo khi có thay đổi cần chú ý.",
            ],
            [
              RefreshCw,
              "Công việc luôn tiếp diễn",
              "Tác vụ chạy nền với tiến độ rõ ràng. Sửa hàng loạt bằng Excel và xem lại lịch sử bất cứ lúc nào.",
            ],
          ].map(([Icon, title, desc]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <article className="landing-feature" key={String(title)}>
                <span className="inline-flex p-3 rounded-xl bg-purple-50 text-brand">
                  <I size={23} />
                </span>
                <h3>{String(title)}</h3>
                <p>{String(desc)}</p>
              </article>
            );
          })}
        </section>
      </main>
      <footer className="border-t border-gray-100 px-8 py-7 flex items-center justify-between text-xs text-muted max-w-6xl mx-auto">
        <span>© {new Date().getFullYear()} sellerpro</span>
        <span>Được thiết kế cho công việc mỗi ngày.</span>
      </footer>
    </div>
  );
}
