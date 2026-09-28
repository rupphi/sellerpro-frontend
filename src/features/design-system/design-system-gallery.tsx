"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Brand,
  Badge,
  Button,
  Input,
  Switch,
  Modal,
  Progress,
  MarketplaceLogo,
  Skeleton,
} from "@/components/ui";
import { PriceFilters } from "@/features/pricing/price-filters";
import {
  ArrowLeft,
  Check,
  Download,
  Plus,
  ShieldCheck,
  Search,
} from "lucide-react";
export default function DesignSystemGallery() {
  const [checked, setChecked] = useState(true),
    [modal, setModal] = useState(false),
    [filters, setFilters] = useState({
      categories: [] as string[],
      brands: [] as string[],
    });
  return (
    <>
      <header className="landing-header">
        <Link href="/">
          <Brand />
        </Link>
        <Link href="/dashboard" className="btn btn-secondary">
          Không gian làm việc
        </Link>
      </header>
      <main className="max-w-6xl mx-auto px-6 pb-20">
        <p className="text-xs text-brand font-semibold tracking-widest mt-8">
          MARKETLANE / DESIGN SYSTEM
        </p>
        <h1 className="page-title mt-4">Nhất quán từ những chi tiết nhỏ.</h1>
        <p className="page-subtitle max-w-xl">
          Thư viện component dùng chung cho sản phẩm, giá, tác vụ và các module
          tiếp theo. Mọi mẫu bên dưới đều có thể tương tác.
        </p>
        <div className="design-grid mt-8">
          <section className="card p-7">
            <h2 className="font-semibold mb-6">01 · Màu sắc & ngữ nghĩa</h2>
            <div className="grid grid-cols-5 gap-3">
              {[
                ["#8b3df5", "Primary"],
                ["#f2eaff", "Accent"],
                ["#158758", "Success"],
                ["#b57513", "Warning"],
                ["#dc4656", "Danger"],
              ].map(([color, name]) => (
                <div key={color}>
                  <div
                    className="h-16 rounded-xl"
                    style={{ background: color }}
                  />
                  <p className="text-xs font-semibold mt-3">{name}</p>
                  <p className="text-[10px] text-muted mt-1">{color}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap mt-6">
              <Badge tone="purple">Đang xử lý</Badge>
              <Badge tone="green">Đã xác minh</Badge>
              <Badge tone="amber">Cần kiểm tra</Badge>
              <Badge tone="red">Lỗi kết nối</Badge>
            </div>
          </section>
          <section className="card p-7">
            <h2 className="font-semibold mb-6">02 · Hành động</h2>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary">
                <Plus size={16} />
                Primary
              </Button>
              <Button>
                <Download size={16} />
                Secondary
              </Button>
              <Button variant="ghost">Ghost</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Đang lưu</Button>
            </div>
            <div className="mt-7 flex gap-6 items-center">
              <Switch
                checked={checked}
                onCheckedChange={setChecked}
                label="Bảo vệ giá mẫu"
              />
              <span className="text-sm text-muted">
                {checked ? "Bảo vệ giá đang bật" : "Bảo vệ giá đang tắt"}
              </span>
              <MarketplaceLogo platform="wb" />
              <MarketplaceLogo platform="ozon" />
            </div>
          </section>
          <section className="card p-7">
            <h2 className="font-semibold mb-6">03 · Bộ lọc & nhập liệu</h2>
            <label className="label" htmlFor="ds-search">
              Tìm sản phẩm
            </label>
            <Input id="ds-search" placeholder="Tên sản phẩm, article…" />
            <div className="flex items-center gap-3 mt-5">
              <PriceFilters
                value={filters}
                onChange={setFilters}
                facets={[
                  { category: "Áo khoác", brand: "Winstyle", _count: 70 },
                  { category: "Jeans", brand: "FASHION 67", _count: 226 },
                  { category: "Quần short", brand: "Winstyle", _count: 34 },
                  { category: "Blazer", brand: "FASHION 67", _count: 15 },
                ]}
              />
              <span className="text-xs text-muted">
                Chọn nhiều danh mục và thương hiệu
              </span>
            </div>
          </section>
          <section className="card p-7">
            <h2 className="font-semibold mb-6">04 · Phản hồi & trạng thái</h2>
            <div className="flex justify-between text-xs mb-3">
              <span>Đồng bộ sản phẩm</span>
              <span className="text-brand">65%</span>
            </div>
            <Progress value={65} />
            <div className="flex gap-3 mt-6">
              <Skeleton className="w-14 h-16" />
              <div className="flex-1 py-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2 mt-3" />
              </div>
            </div>
            <div className="notice mt-5">
              <ShieldCheck size={18} className="shrink-0" />
              Thông tin rõ ràng, đặt đúng nơi người dùng cần.
            </div>
          </section>
          <section className="card p-7">
            <h2 className="font-semibold mb-6">05 · Dialog & bề mặt</h2>
            <p className="text-sm text-muted leading-relaxed mb-5">
              Dialog có quản lý focus, phím Escape và lớp nền. Popover mở theo
              ngữ cảnh, bảng giá dùng thanh lưu cố định.
            </p>
            <Button onClick={() => setModal(true)} variant="primary">
              Mở dialog mẫu
            </Button>
          </section>
          <section className="card p-7">
            <h2 className="font-semibold mb-4">06 · Biểu đồ & số liệu</h2>
            <Badge>Dữ liệu minh họa</Badge>
            <div className="chart-grid mt-5">
              {[35, 52, 40, 68, 78, 62, 90].map((n, i) => (
                <div
                  key={i}
                  title={`Mẫu ${i + 1}: ${n}`}
                  className="chart-bar"
                  style={{ height: `${n}%` }}
                />
              ))}
            </div>
            <p className="text-xs text-muted mt-3">
              Component minh họa; không phải số liệu bán hàng.
            </p>
          </section>
        </div>
        <Modal
          open={modal}
          onOpenChange={setModal}
          title="Thiết kế để dễ sử dụng"
          description="Dialog dùng chung cho thêm cửa hàng, nhập Excel và giải thích trạng thái."
        >
          <div className="notice">
            <Check size={18} />
            Hỗ trợ bàn phím, focus trap và đóng bằng Escape.
          </div>
          <div className="flex justify-end mt-7">
            <Button variant="primary" onClick={() => setModal(false)}>
              Đã hiểu
            </Button>
          </div>
        </Modal>
      </main>
    </>
  );
}
