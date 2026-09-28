// Run with the browser test runner's browser_run_code_unsafe filename option.
// Network is intercepted: no credentials or writes reach a real account.
async (page) => {
  const results = [];
  let release, started, calls = 0;
  await page.route("**/api/auth/*", async route => {
    calls++;
    await new Promise(resolve => { release = resolve; started(); });
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Tên đăng nhập hoặc mật khẩu không đúng." }) });
  });
  try {
    for (const width of [1440, 390]) for (const registration of [false, true]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`http://localhost:3000/${registration ? 'register' : 'login'}`);
      if (registration && width === 1440) await page.screenshot({path:'/Users/rupphi/Projects/default-camera/outputs/sellerpro-register-clean.png'});
      await page.getByRole("textbox", { name: "Tên đăng nhập", exact: true }).fill("ux_fixture");
      await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("Synthetic-test-only-928!");
      const button = page.getByRole("button", { name: registration ? "Tạo tài khoản" : "Đăng nhập", exact: true });
      const initial = { form: await page.locator("form").boundingBox(), button: await button.boundingBox() };
      const passwordBox = await page.getByRole('textbox', {name:'Mật khẩu', exact:true}).boundingBox();
      const alternateBox = await page.locator('.auth-alternate').boundingBox();
      if (Math.abs(initial.button.y - passwordBox.y - passwordBox.height - 24) > 1) throw new Error('Incorrect password-to-button gap');
      if (Math.abs(alternateBox.y - initial.button.y - initial.button.height - 20) > 1) throw new Error('Incorrect account-link gap');
      for (let attempt = 0; attempt < 2; attempt++) {
        const ready = new Promise(resolve => { started = resolve; });
        await button.click();
        await ready;
        const loading = { form: await page.locator("form").boundingBox(), button: await button.boundingBox() };
        if (await button.getAttribute("aria-busy") !== "true") throw new Error("Missing loading state");
        if (!await button.isDisabled()) throw new Error("Duplicate submits not blocked");
        if (await button.evaluate(el => getComputedStyle(el).opacity) !== "1") throw new Error("Loading button faded");
        if (!registration && width === 1440 && attempt === 0) await page.screenshot({ path: "/Users/rupphi/Projects/default-camera/outputs/sellerpro-button-loading.png" });
        release();
        await page.getByRole("alert").filter({ hasText: "Tên đăng nhập hoặc mật khẩu không đúng." }).waitFor();
        await page.locator('button[type="submit"]:not([disabled])').waitFor();
        const error = { form: await page.locator("form").boundingBox(), button: await button.boundingBox() };
        for (const state of [loading, error]) for (const element of ["form", "button"]) for (const key of ["x", "y", "width", "height"]) {
          if (Math.abs(state[element][key] - initial[element][key]) > 1) throw new Error(`Layout shifted: ${width}/${element}/${key}`);
        }
        results.push({ width, registration, attempt: attempt + 1, stable: true });
      }
      if (!registration && width === 1440) {
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.form-error')).opacity === '1');
        await page.screenshot({ path: "/Users/rupphi/Projects/default-camera/outputs/sellerpro-login-stable.png" });
      }
    }
    if (calls !== 8) throw new Error("Unexpected request count");
    return { results, requests: calls };
  } finally {
    release?.();
    await page.unroute("**/api/auth/*");
  }
}
