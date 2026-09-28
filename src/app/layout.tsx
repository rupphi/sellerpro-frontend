import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: "sellerpro — Không gian quản lý cửa hàng",
  description:
    "Quản lý sản phẩm, giá và công việc trên Wildberries và Ozon trong một không gian.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
