import { Skeleton } from "./ui";

/** Same image size, metadata lines and column geometry as the real price rows. */
export function ProductSkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} aria-hidden="true">
          <td>
            <div className="product-cell">
              <Skeleton className="product-image" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-5 w-5/6" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </td>
          {[1, 2, 3, 4, 5, 6].map((column) => (
            <td key={column}>
              <Skeleton
                className={
                  column === 6
                    ? "h-6 w-10 ml-auto rounded-full"
                    : "h-4 w-2/3 ml-auto"
                }
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Đang tải dữ liệu"
      className="divide-y divide-gray-100"
    >
      <span className="sr-only">Đang tải dữ liệu…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="p-5 flex items-center gap-6 min-h-24">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-3 w-24 hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({
  variant = "products",
}: {
  variant?: "products" | "overview" | "tasks";
}) {
  return (
    <section role="status" aria-label="Đang tải trang" aria-busy="true">
      <span className="sr-only">Đang tải trang…</span>
      <Skeleton className="h-3 w-48 mb-5" />
      <Skeleton className="h-8 w-72 max-w-full mb-3" />
      <Skeleton className="h-4 w-80 max-w-full mb-7" />
      {variant === "overview" ? (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5">
          <div className="card p-6 space-y-6">
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-6 w-40" />
            <ListSkeleton rows={4} />
          </div>
          <div className="space-y-5">
            <div className="card p-6">
              <Skeleton className="h-5 w-48 mb-5" />
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            </div>
            <div className="card">
              <ListSkeleton rows={5} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            className={
              variant === "tasks"
                ? "grid md:grid-cols-3 gap-4 my-7"
                : "stat-grid"
            }
          >
            {Array.from({ length: variant === "tasks" ? 3 : 4 }, (_, i) => (
              <div className="card p-5 space-y-4" key={i}>
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-7 w-1/3" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
          <div className="card overflow-hidden">
            <div className="toolbar">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-6 w-32 ml-auto" />
            </div>
            {variant === "tasks" ? (
              <ListSkeleton rows={5} />
            ) : (
              <div className="table-scroll">
                <table className="price-table">
                  <thead>
                    <tr>
                      {[
                        "Sản phẩm",
                        "Giá bán",
                        "Giảm giá",
                        "Giá sau giảm",
                        "Chiết khấu sàn",
                        "Giá khách đã mua",
                        "Khóa giá",
                      ].map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <ProductSkeletonRows />
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
