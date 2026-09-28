// All browser API traffic is isolated; these are UI fixtures, never production finances.
async page => {
  const amounts = { retailAmountSum: 38000000, forPaySum: 29500000, bankPaymentSum: 2410025, deliveryServiceSum: 3500000, paidStorageSum: 125000, paidAcceptanceSum: 75000, deductionSum: 90000, penaltySum: 3400, additionalPaymentSum: 5000, cashbackAmountSum: null, cashbackDiscountSum: 0, cashbackCommissionChangeSum: 0 };
  let mode = "ready", writes = 0;
  await page.route("**/api/**", async route => {
    const path = "/api" + route.request().url().split("/api")[1].split("?")[0];
    let body = [];
    if (path === "/api/auth/me") body = { username: "finance_fixture", role: "USER" };
    else if (path === "/api/stores") body = [{ id: "finance-fixture", name: "Cửa hàng kiểm thử", platform: mode === "ozon" ? "ozon" : "wb", status: "ready" }];
    else if (path.endsWith("/finance/sync")) { writes++; body = { id: "fixture-task", status: "queued" }; }
    else if (route.request().method() !== "GET") throw new Error("Unexpected mutation blocked");
    else if (path.endsWith("/finance")) body = { supported: mode !== "ozon", status: mode === "stale" ? "unavailable" : "ready", checkedAt: "2026-09-28T05:00:00Z", succeededAt: ["ready", "stale"].includes(mode) ? "2026-09-28T04:00:00Z" : null,
      reports: ["ready", "stale"].includes(mode) ? [{ id: "25017383020260815", from: "2026-09-20", to: "2026-09-20", created: "2026-09-21", currency: "RUB", reportType: 1, amounts }] : [],
      totals: ["ready", "stale"].includes(mode) ? [{ currency: "RUB", amounts }] : [],
      warnings: [mode === "stale" ? "Chưa cập nhật được quyết toán. Số liệu cũ được giữ nguyên." : "Số liệu theo kỳ quyết toán; chưa xác nhận tiền vào ngân hàng.", "Chưa tính lợi nhuận: cần giá vốn, thuế và chi phí ngoài sàn."], task: null };
    else if (path === "/api/events") { await route.fulfill({ status:200, contentType:"text/event-stream", body:": fixture\n\n" }); return; }
    await route.fulfill({ status:200, contentType:"application/json", body:JSON.stringify(body) });
  });
  try {
    await page.setViewportSize({width:1440,height:1080});
    await page.goto("http://localhost:3000/dashboard/finance");
    await page.getByRole("heading",{name:"Các khoản phí & khấu trừ",exact:true}).waitFor();
    await page.screenshot({path:"/Users/rupphi/Projects/default-camera/outputs/sellerpro-finance-desktop.png",fullPage:true});
    await page.getByRole("button",{name:"Chi tiết báo cáo 25017383020260815",exact:true}).click();
    const modal = page.getByRole("dialog");
    await modal.waitFor();
    if (!(await modal.getByText("25017383020260815",{exact:false}).isVisible())) throw new Error("Long ID corrupted");
    if (!(await modal.getByText("—",{exact:true}).isVisible())) throw new Error("Missing money must show dash");
    await modal.getByRole("button",{name:"Đóng",exact:true}).click();
    await page.getByRole("button",{name:"Cập nhật báo cáo",exact:true}).click();
    await page.getByText("Đã yêu cầu cập nhật báo cáo tài chính.",{exact:true}).waitFor();
    if (writes !== 1) throw new Error("Expected exactly one request");
    await page.setViewportSize({width:390,height:844});
    if (await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)) throw new Error("Finance mobile page overflows");
    await page.screenshot({path:"/Users/rupphi/Projects/default-camera/outputs/sellerpro-finance-mobile.png",fullPage:true});
    mode="stale"; await page.reload();
    await page.getByText("Chưa cập nhật được quyết toán. Số liệu cũ được giữ nguyên.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Chi tiết báo cáo 25017383020260815",exact:true}).waitFor();
    mode="empty"; await page.reload();
    await page.getByRole("heading",{name:"Sàn chưa có báo cáo cho kỳ này",exact:true}).waitFor();
    mode="ozon"; await page.reload();
    await page.getByText("Quyết toán Ozon đang chờ kết nối; không hiển thị số liệu ước đoán.",{exact:true}).waitFor();
    if (await page.getByRole("button",{name:"Cập nhật báo cáo",exact:true}).isEnabled()) throw new Error("Unsupported Ozon must not sync");
    return {ok:true,checks:["desktop","detail and exact ID","null money","sync button","mobile","stale data","empty","Ozon unsupported"]};
  } finally { await page.unroute("**/api/**"); await page.goto("about:blank"); }
}
