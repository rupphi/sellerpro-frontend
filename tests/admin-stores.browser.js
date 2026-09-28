// API fixtures only: never sends a deletion to a real store.
async (page) => {
  let stores = [{ id: "delete-fixture", name: "Cửa hàng kiểm thử", platform: "wb", status: "ready" }];
  let deletes = 0, busy = true, adminRequests = 0;
  await page.route("**/api/**", async route => {
    const path = "/api" + route.request().url().split("/api")[1].split("?")[0];
    const method = route.request().method();
    let body = [], status = 200;
    if (path === "/api/auth/me") body = { username: "user_fixture", role: "USER" };
    else if (path.startsWith("/api/admin")) { adminRequests++; status = 403; body = { message: "Forbidden" }; }
    else if (path === "/api/stores") body = stores;
    else if (path === "/api/stores/delete-fixture" && method === "DELETE") {
      if (route.request().postDataJSON().confirmName !== stores[0].name) throw new Error("Missing name confirmation");
      deletes++;
      if (busy) { status = 409; body = { message: "Cửa hàng đang xử lý tác vụ." }; }
      else { stores = []; body = { ok: true }; }
    } else if (path.endsWith("/products")) body = { items: [], total: 0, pages: 1, page: 1, facets: [], stats: [], lockedCount: 0 };
    else if (path === "/api/events") { await route.fulfill({ contentType: "text/event-stream", body: ": fixture\n\n" }); return; }
    else if (method !== "GET") throw new Error("Unexpected write blocked");
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("http://localhost:3000/admin");
    await page.getByRole("heading", { name: "Không có quyền truy cập" }).waitFor();
    if (adminRequests !== 0) throw new Error("Seller rendered admin content");
    await page.goto("http://localhost:3000/admin/login");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).waitFor();
    if (await page.getByRole("link", { name: "Đăng ký", exact: true }).count()) throw new Error("Admin self-registration exposed");
    await page.goto("http://localhost:3000/dashboard");
    const menu = page.getByRole("button", { name: "Cửa hàng: Cửa hàng kiểm thử", exact: true });
    await menu.click();
    if (await page.getByRole("link", { name: "Quản trị lịch tự động" }).count()) throw new Error("Admin menu exposed to USER");
    await page.getByRole("button", { name: "Xóa cửa hàng Cửa hàng kiểm thử", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const confirm = dialog.getByRole("button", { name: "Xóa cửa hàng", exact: true });
    if (await confirm.isEnabled()) throw new Error("Delete must require typed confirmation");
    await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
    if (deletes !== 0) throw new Error("Cancel deleted store");
    await menu.click();
    await page.getByRole("button", { name: "Xóa cửa hàng Cửa hàng kiểm thử", exact: true }).click();
    await dialog.getByLabel("Nhập đúng tên cửa hàng để xác nhận").fill("Cửa hàng kiểm thử");
    await page.screenshot({ path: "/Users/rupphi/Projects/default-camera/outputs/sellerpro-delete-store.png" });
    await confirm.click();
    await dialog.getByRole("alert").getByText("Cửa hàng đang xử lý tác vụ.", { exact: true }).waitFor();
    busy = false;
    await confirm.click();
    await dialog.waitFor({ state: "hidden" });
    await page.getByRole("heading", { name: "Xin chào, user_fixture 👋" }).waitFor();
    if (deletes !== 2) throw new Error("Unexpected delete attempts");
    const icon = page.locator('link[rel="icon"][href^="/icon.svg"]');
    if (await icon.count() !== 1) throw new Error("Favicon missing");
    return { ok: true, checks: ["USER blocked from admin", "separate admin login", "no admin registration", "trash icon", "typed confirmation", "cancel", "busy error", "delete fixture returns to welcome", "favicon"] };
  } finally { await page.unroute("**/api/**"); await page.goto("about:blank"); }
}
