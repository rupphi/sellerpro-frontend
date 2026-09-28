// Isolated visual/interaction regression. All /api responses are mocked.
async (page) => {
  let mode = "products", releaseProducts, productsStarted, releaseTasks, tasksStarted, releaseAudit;
  const product = { id: "fixture-product", externalId: "1001", article: "UX-01", title: "Quần dài kiểm thử", brand: "sellerpro", category: "Quần", image: "/products/placeholder.svg", price: 200000, salePrice: 180000, discount: 10, minPrice: 0, currency: "RUB", version: 1, stock: 5, locked: false, protection: "off" };
  await page.route("**/api/**", async route => {
    const path = route.request().url().split("/api")[1].split("?")[0];
    let body = [];
    if (route.request().method() !== "GET") throw new Error("Unexpected write in read-only fixture");
    if (path === "/auth/me") body = { username: "ux_fixture" };
    else if (path === "/stores") body = [{ id: "ui-fixture", name: "Cửa hàng kiểm thử", platform: "wb", status: "ready" }];
    else if (path.endsWith("/products")) {
      await new Promise(resolve => { releaseProducts = resolve; productsStarted(); });
      body = { items: [product], total: 1, pages: 1, page: 1, facets: [], stats: [{ protection: "off", _count: 1 }], lockedCount: 0 };
    } else if (path.endsWith("/tasks") && mode === "tasks") await new Promise(resolve => { releaseTasks = resolve; tasksStarted(); });
    else if (path.endsWith("/audit")) await new Promise(resolve => { releaseAudit = resolve; });
    else if (path.endsWith("/events")) { await route.fulfill({ status: 200, contentType: "text/event-stream", body: ": fixture\n\n" }); return; }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    let ready = new Promise(resolve => { productsStarted = resolve; });
    await page.goto("http://localhost:3000/dashboard");
    await ready;
    const count = await page.locator("tbody .skeleton").count();
    if (count < 30) throw new Error("Missing table-shaped skeleton");
    if (await page.getByText("Không tìm thấy sản phẩm", { exact: true }).count()) throw new Error("False empty state while loading");
    const skeletonBox = await page.locator(".table-scroll").boundingBox();
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (await page.locator('tbody .skeleton').first().evaluate(el => getComputedStyle(el).animationName) !== 'none') throw new Error('Reduced motion not respected');
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.screenshot({ path: "/Users/rupphi/Projects/default-camera/outputs/sellerpro-products-skeleton.png" });
    releaseProducts();
    await page.getByRole("switch", { name: "Bảo vệ giá UX-01", exact: true }).waitFor();
    const loadedBox = await page.locator(".table-scroll").boundingBox();
    if (Math.abs(skeletonBox.y - loadedBox.y) > 1) throw new Error(`Table header shifted after loading: ${JSON.stringify({skeletonBox,loadedBox})}`);
    if (Math.abs(skeletonBox.height - loadedBox.height) > 1) throw new Error('Table viewport collapsed');
    ready = new Promise(resolve => { productsStarted = resolve; });
    await page.getByRole("textbox", { name: "Tìm sản phẩm", exact: true }).fill("UX-01");
    await ready;
    if (!await page.getByRole("switch", { name: "Bảo vệ giá UX-01", exact: true }).isVisible()) throw new Error("Previous rows disappeared during filter fetch");
    if (await page.locator("tbody .skeleton").count()) throw new Error("Background fetch replaced the table");
    releaseProducts();
    mode = "tasks";
    const tasksReady = new Promise(resolve => { tasksStarted = resolve; });
    await page.goto("http://localhost:3000/dashboard/tasks");
    await tasksReady;
    if (await page.getByText("Chưa có tác vụ", { exact: true }).count()) throw new Error("False empty tasks while loading");
    if (!await page.getByRole("status", { name: "Đang tải dữ liệu", exact: true }).count()) throw new Error("Missing tasks skeleton");
    const tasksBefore = await page.locator('.task-list-region').boundingBox();
    releaseTasks(); releaseAudit?.();
    await page.getByText("Chưa có tác vụ", { exact: true }).waitFor();
    const tasksAfter = await page.locator('.task-list-region').boundingBox();
    if (tasksBefore.height !== tasksAfter.height) throw new Error('Tasks viewport collapsed');
    await page.emulateMedia({ reducedMotion: "reduce" });
    return { productSkeletons: count, tableHeaderStable: true, filterRetainsRows: true, tasksLoadingNotEmpty: true };
  } finally {
    releaseProducts?.(); releaseTasks?.(); releaseAudit?.();
    await page.goto("about:blank");
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
}
