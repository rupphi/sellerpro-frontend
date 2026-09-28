// Isolated UI fixtures: no production API writes or real store credentials.
async (page) => {
  let settings = { settings: { timezone: "Asia/Ho_Chi_Minh", buyer_prices: { enabled: true, times: ["08:00", "20:00"] }, guard: { enabled: true, times: ["02:00", "08:00", "14:00", "20:00"] }, catalog: { enabled: false, times: ["07:00"] }, sales: { enabled: false, times: ["09:00", "21:00"] }, finance: { enabled: false, times: ["10:00"] }, initializationGuard: false, initialization: ["catalog", "pricing"] }, updatedAt: null };
  let conflict = false, writes = 0;
  await page.route("**/api/**", async route => {
    const path = "/api" + route.request().url().split("/api")[1].split("?")[0];
    let body = [], status = 200;
    if (path === "/api/auth/me") body = { username: "schedule_fixture", role: "ADMIN" };
    else if (path === "/api/admin/accounts") body = [{ id: "fixture-user", username: "fixture seller", role: "USER", _count: { stores: 0 } }];
    else if (path === "/api/admin/accounts/fixture-user/automation") {
      if (route.request().method() === "PATCH") {
        if (conflict) { status = 409; body = { message: "Lịch đã thay đổi ở cửa sổ khác. Tải lại trước khi lưu." }; }
        else { settings = { ...route.request().postDataJSON(), updatedAt: new Date().toISOString() }; writes++; body = settings; }
      } else body = settings;
    } else if (path === "/api/events") { await route.fulfill({status:200,contentType:"text/event-stream",body:": fixture\n\n"}); return; }
    else if (route.request().method() !== "GET") throw new Error("Unexpected mutation blocked");
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  try {
    await page.setViewportSize({width:1440,height:1080});
    await page.goto("http://localhost:3000/admin");
    await page.getByRole("heading", { name: "Khi kết nối cửa hàng mới" }).waitFor();
    if (await page.getByRole("button", { name: "Lưu lịch", exact:true }).isEnabled()) throw new Error("Unchanged settings should not save");
    if (await page.locator('input[type="time"]').count() !== 10) throw new Error("Grouped daily defaults incorrect");
    await page.getByRole("switch", {name:"Khởi tạo Phễu bán hàng",exact:true}).click();
    await page.getByRole("switch", {name:"Bảo vệ giá khi khởi tạo",exact:true}).click();
    await page.getByLabel("Giá cả & chiết khấu lần 1",{exact:true}).fill("09:00");
    if (await page.getByRole("switch", { name: "Tự động Báo cáo tài chính", exact:true }).getAttribute("aria-checked") !== "false") throw new Error("Finance must stay opt-in");
    await page.getByRole("button", { name: "Mỗi giờ một lần", exact:true }).click();
    if (await page.locator('input[type="time"]').count() !== 32) throw new Error("Hourly preset must create 24 sales slots");
    await page.getByRole("button",{name:"Lưu lịch",exact:true}).click();
    await page.getByText("Đã lưu lịch tự động.",{exact:true}).waitFor();
    if (writes !== 1 || settings.settings.initialization.join(",") !== "catalog,pricing,sales" || !settings.settings.initializationGuard) throw new Error("Grouped initialization not saved");
    await page.reload();
    await page.getByRole("heading",{name:"Khi kết nối cửa hàng mới"}).waitFor();
    if (await page.getByLabel("Giá cả & chiết khấu lần 1",{exact:true}).inputValue() !== "09:00") throw new Error("Saved time not restored");
    await page.getByRole("heading", {name:"Khi kết nối cửa hàng mới",exact:true}).locator("..").screenshot({path:"/Users/rupphi/Projects/default-camera/outputs/sellerpro-admin-groups.png",animations:"disabled"});
    await page.screenshot({path:"/Users/rupphi/Projects/default-camera/outputs/sellerpro-automation-desktop.png",fullPage:true});
    await page.getByRole("switch",{name:"Tự động Kiểm tra bảo vệ giá",exact:true}).click();
    conflict = true;
    await page.getByRole("button",{name:"Lưu lịch",exact:true}).click();
    await page.getByText("Lịch đã thay đổi ở cửa sổ khác. Hãy tải lại.",{exact:true}).waitFor();
    if (await page.getByRole("button",{name:"Lưu lịch",exact:true}).isEnabled()) throw new Error("Conflicting save should be blocked");
    await page.getByRole("button",{name:"Tải lại",exact:true}).click();
    await page.getByText("Lịch đã được lưu",{exact:true}).waitFor();
    if (await page.getByRole("switch",{name:"Tự động Kiểm tra bảo vệ giá",exact:true}).getAttribute("aria-checked") !== "true") throw new Error("Reload must discard unsaved toggle");
    await page.setViewportSize({width:390,height:844});
    if (await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)) throw new Error("Admin page overflows mobile viewport");
    await page.screenshot({path:"/Users/rupphi/Projects/default-camera/outputs/sellerpro-automation-mobile.png",fullPage:true});
    await page.goto("http://localhost:3000/register");
    const password = page.getByPlaceholder("Tối thiểu 6 ký tự");
    await password.waitFor();
    if (await password.getAttribute("minlength") !== "6") throw new Error("Password limit not updated");
    return {ok:true,checks:["admin accessible before first store","grouped schedules","2/4 pricing defaults","hourly sales preset","fixed initialization dependencies","finance opt-in","save and reload","conflict handling","mobile layout"]};
  } finally { await page.unroute("**/api/**"); await page.goto("about:blank"); }
}
