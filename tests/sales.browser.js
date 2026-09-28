// Isolated UI fixtures; all API traffic intercepted, no real shop writes.
async page => {
  const summary = { orders: 100, units: 100, orderedValue: 24000000, fbo: 60, fbs: 40, unknown: 0,
    sales: { value: 18000000, known: 18000000, missing: 0, count: 75, units: 75 },
    returns: { value: 4800000, known: 4800000, missing: 0, count: 20, units: 20 }, netRevenue: 13200000,
    cancelled: 10, cohort: { ordered: 100, delivered: 60, returned: 20, cancelled: 10, pending: 10 }, ordersReady: true, salesReady: true };
  let calls = [], platform = "wb";
  const event = { id: "event1", orderKey: "ORDER-001", kind: "return", occurredAt: "2026-09-24T12:00:00Z", collectedAt: "2026-09-28T00:00:00Z", channel: "fbs", article: "0413.be", title: "Брюки на резинке широкие вельветовые", quantity: 1, amount: 240000, currency: "RUB", status: "returned", source: "wb_sales" };
  await page.route("**/api/**", async route => {
    const url = route.request().url(); calls.push(url);
    const path = "/api" + url.split("/api")[1].split("?")[0];
    let body = [];
    if (route.request().method() !== "GET") throw new Error("Unexpected production mutation blocked");
    if (path === "/api/auth/me") body = { username: "sales_fixture", role: "USER" };
    else if (path === "/api/stores") body = [{ id: "sales-fixture", name: "Cửa hàng kiểm thử", platform, status: "ready" }];
    else if (path.endsWith("/sales")) body = {
      current: platform === "wb" ? summary : { ...summary, ordersReady: false, salesReady: false }, previous: { ...summary, orders: 150 },
      period: Object.fromEntries(url.split("?")[1].split("&").map(part => { const [key,value] = part.split("="); return [key === "compareFrom" ? "previousFrom" : key === "compareTo" ? "previousTo" : key, decodeURIComponent(value)]; })),
      daily: [21,22,23,24,25,26,27].map((d,i) => ({ day: `2026-09-${d}`, orders: [11,13,9,21,18,15,13][i], revenue: 120000 })),
      products: [{ ...summary, productKey: "123", article: "0413.be", title: event.title }],
      sources: [{ source: "wb_orders", checkedAt: "2026-09-28T00:00:00Z", coveredTo: "2026-09-28T00:00:00Z", status: "ready" }],
      traffic: url.includes("channel=fbs") || platform === "ozon" ? null : { products: [{ productKey: "123", current: { views: 3000, carts: 700, orders: 100, buyouts: 60 } }] },
      warnings: platform === "ozon" ? ["Ozon: đang chờ xác minh API đơn hàng và tài chính mới. Chưa có dữ liệu báo cáo."] : [], task: null,
    };
    else if (path.endsWith("/sales/events")) body = url.includes("cursor=event1")
      ? { items: [{ ...event, id: "event2", orderKey: "ORDER-002" }], nextCursor: null }
      : { items: [event], nextCursor: "event1" };
    else if (path.endsWith("/sales/orders/event1")) body = [{ ...event, id: "order", kind: "order", status: "ordered" }, { ...event, id: "sale", kind: "sale", status: "delivered" }, event];
    else if (path === "/api/events") { await route.fulfill({ contentType: "text/event-stream", body: ": fixture\n\n" }); return; }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.goto("http://localhost:3000/dashboard/sales");
    await page.getByRole("heading", { name: "Việc nên ưu tiên" }).waitFor();
    await page.screenshot({ path: "/Users/rupphi/Projects/default-camera/outputs/sellerpro-sales-desktop.png", fullPage: true });
    await page.getByRole("button", { name: "Chi tiết đơn ORDER-001 return", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    if (await page.getByRole("dialog").locator("li").count() !== 3) throw new Error("Order timeline did not retain all events");
    await page.screenshot({ path: "/Users/rupphi/Projects/default-camera/outputs/sellerpro-sales-detail.png" });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Chi tiết đơn ORDER-002 return", exact: true }).waitFor();
    await page.getByLabel("Hình thức giao hàng").selectOption("fbs");
    await page.getByText("Phễu lượt xem không tách được FBO/FBS. Chọn Tất cả để xem.", { exact: true }).waitFor();
    await page.getByLabel("Tìm đơn hoặc article").fill("0413.be");
    await page.waitForResponse(r => r.url().includes("search=0413.be"));
    await page.getByRole("button", { name: "Khoảng ngày báo cáo", exact: true }).click();
    const beforeDraft = await page.getByLabel("Ngày bắt đầu", { exact: true }).inputValue();
    await page.getByRole("button", { name: "2 tuần", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Khoảng ngày báo cáo", exact: true }).click();
    if (await page.getByLabel("Ngày bắt đầu", { exact: true }).inputValue() !== beforeDraft) throw new Error("Cancelled draft was applied");
    await page.getByLabel("Ngày bắt đầu", { exact: true }).fill("2026-09-01");
    await page.getByLabel("Ngày kết thúc", { exact: true }).fill("2026-09-07");
    await Promise.all([page.waitForResponse(r => r.url().includes("from=2026-09-01") && r.url().includes("compareFrom=2026-08-25")), page.getByRole("button", { name: "Lưu", exact: true }).click()]);
    await page.getByRole("button", { name: "Khoảng ngày so sánh", exact: true }).click();
    await page.getByLabel("Ngày bắt đầu", { exact: true }).fill("2026-08-01");
    if (await page.getByRole("button", { name: "Lưu", exact: true }).isEnabled()) throw new Error("Unequal comparison accepted");
    await page.getByLabel("Ngày kết thúc", { exact: true }).fill("2026-08-07");
    await page.screenshot({ path: "/Users/rupphi/Projects/default-camera/outputs/sellerpro-sales-calendar.png", animations: "disabled" });
    await Promise.all([page.waitForResponse(r => r.url().includes("compareFrom=2026-08-01") && r.url().includes("compareTo=2026-08-07")), page.getByRole("button", { name: "Lưu", exact: true }).click()]);
    await page.getByText("Kỳ so sánh: 01.08.2026 – 07.08.2026", { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error("Sales page overflows mobile");
    await page.screenshot({ path: "/Users/rupphi/Projects/default-camera/outputs/sellerpro-sales-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "Khoảng ngày báo cáo", exact: true }).click();
    await page.getByRole("button", { name: "07.09.2026", exact: true }).click();
    await page.getByRole("button", { name: "01.09.2026", exact: true }).click();
    if (await page.getByLabel("Ngày bắt đầu", { exact: true }).inputValue() !== "2026-09-01") throw new Error("Reverse calendar selection failed");
    await page.screenshot({ path: "/Users/rupphi/Projects/default-camera/outputs/sellerpro-sales-calendar-mobile.png", animations: "disabled" });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error("Calendar overflows mobile");
    await page.keyboard.press("Escape");
    platform = "ozon";
    await page.reload();
    await page.getByText("Ozon: đang chờ xác minh API đơn hàng và tài chính mới. Chưa có dữ liệu báo cáo.", { exact: true }).waitFor();
    if (await page.getByRole("button", { name: "Cập nhật dữ liệu", exact: true }).isEnabled()) throw new Error("Unverified Ozon sync enabled");
    return { ok: true, checks: ["summary", "cohort and traffic separated", "timeline", "scroll loads next cursor", "FBS filter", "search", "date range", "mobile", "Ozon unavailable"] };
  } finally { await page.unroute("**/api/**"); await page.goto("about:blank"); }
}
