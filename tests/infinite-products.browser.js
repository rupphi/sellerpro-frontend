// All network responses are synthetic. No marketplace credentials or writes.
async (page) => {
  const calls = [];
  let releaseSecond, secondStarted, recover = false;
  const secondReady = new Promise(resolve => { secondStarted = resolve; });
  const makeProduct = n => ({ id: `fixture-${n}`, externalId: String(n), article: `SKU-${String(n).padStart(3, "0")}`, title: `Sản phẩm ${n}`, brand: "sellerpro", category: "Quần", image: "/products/placeholder.svg", price: 200000, salePrice: 200000, discount: 0, minPrice: 0, currency: "RUB", version: 1, stock: 5, locked: false, protection: "off" });
  await page.route("**/api/**", async route => {
    const url = route.request().url(), path = url.split("/api")[1].split("?")[0];
    if (route.request().method() !== "GET") throw new Error("Unexpected write");
    let body = [];
    if (path === "/auth/me") body = { username: "ux_fixture" };
    else if (path === "/stores") body = [{ id: "ui-fixture", name: "Cửa hàng kiểm thử", platform: "wb", status: "ready" }];
    else if (path.endsWith("/products")) {
      const batch = Number(url.match(/[?&]page=(\d+)/)?.[1] || 1);
      const filtered = /search=SKU/.test(url);
      calls.push({ batch, filtered });
      if (batch === 2 && !filtered) await new Promise(resolve => { releaseSecond = resolve; secondStarted(); });
      if (batch === 3 && !recover && !filtered) { await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({message:"Lỗi tải giả lập"}) }); return; }
      const indices = filtered ? [7] : Array.from({length: batch === 4 ? 5 : 30}, (_, i) => (batch - 1) * 30 + i + 1);
      // A duplicate at a batch boundary must not create duplicate rows/keys.
      if (batch === 2 && !filtered) indices[0] = 30;
      body = { items: indices.map(makeProduct), total: filtered ? 1 : 94, pages: filtered ? 1 : 4, page: batch, facets: [], stats: [{ protection: "off", _count: 94 }], lockedCount: 0 };
    } else if (path === "/events") { await route.fulfill({ contentType: "text/event-stream", body: ": fixture\n\n" }); return; }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("http://localhost:3000/dashboard");
    await page.getByRole("switch", { name: "Bảo vệ giá SKU-030", exact: true }).waitFor();
    if (calls.some(c => c.batch !== 1)) throw new Error("Fetched ahead without scrolling");
    if (await page.getByRole("button", { name: "Trang sau", exact: true }).count()) throw new Error("Pagination still visible");
    await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Giá SKU-001", exact: true }).fill("2500");
    const region = page.getByRole("region", { name: "Danh sách sản phẩm", exact: true });
    await region.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await secondReady;
    if (await page.getByRole("switch", { name: /^Bảo vệ giá SKU-/ }).count() !== 30) throw new Error("Old rows disappeared while fetching");
    if (!await page.getByText("Đang tải thêm sản phẩm…", { exact: true }).isVisible()) throw new Error("Missing append loading state");
    releaseSecond();
    await page.getByRole("switch", { name: "Bảo vệ giá SKU-060", exact: true }).waitFor();
    if (await page.getByRole("switch", { name: /^Bảo vệ giá SKU-/ }).count() !== 59) throw new Error("Duplicate items rendered");
    if (await page.getByRole("spinbutton", { name: "Giá SKU-001", exact: true }).inputValue() !== "2500") throw new Error("Draft lost during append");
    await page.getByRole("button", { name: "Hủy", exact: true }).click();
    await region.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.getByText("Chưa tải được sản phẩm tiếp theo.", { exact: true }).waitFor();
    if (await page.getByRole("switch", { name: /^Bảo vệ giá SKU-/ }).count() !== 59) throw new Error("Rows lost after fetch error");
    recover = true;
    await page.getByRole("button", { name: "Thử lại", exact: true }).click();
    await page.getByRole("switch", { name: "Bảo vệ giá SKU-090", exact: true }).waitFor();
    await region.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.getByText("Đã hiển thị tất cả sản phẩm", { exact: true }).waitFor();
    if (await page.getByRole("switch", { name: /^Bảo vệ giá SKU-/ }).count() !== 94) throw new Error("Last batch incomplete");
    await page.screenshot({ path: "/Users/rupphi/Projects/default-camera/outputs/sellerpro-infinite-products.png" });
    await page.getByRole("textbox", { name: "Tìm sản phẩm", exact: true }).fill("SKU-007");
    await page.waitForFunction(() => document.querySelectorAll('button[role="switch"][aria-label^="Bảo vệ giá SKU-"]').length === 1);
    if (await region.evaluate(el => el.scrollTop) !== 0) throw new Error("Filter did not reset scroll");
    if (calls.filter(c => c.filtered).some(c => c.batch !== 1)) throw new Error("Filter started on wrong batch");
    return { initialBatch: 30, uniqueLoaded: 94, draftsRetained: true, retryWorked: true, filterReset: true, calls };
  } finally {
    releaseSecond?.();
    const closeTestDialog = dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss();
    page.on('dialog', closeTestDialog);
    try { await page.goto("about:blank"); }
    finally { page.off('dialog', closeTestDialog); }
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
}
