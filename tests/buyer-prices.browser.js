// UI fixtures only: no real login, marketplace requests, or writes.
async (page) => {
  let platform = "wb", status = "ready";
  const checkedAt = "2026-09-28T00:47:00Z";
  await page.route("**/api/**", async route => {
    if (route.request().method() !== "GET") throw new Error("Unexpected mutation");
    const path = route.request().url().split("/api")[1].split("?")[0];
    let body = [];
    if(path === "/auth/me") body = {username:"visual_fixture"};
    else if(path === "/stores") body = [{id:"buyer-price-fixture",name:platform === "wb" ? "WB — Kiểm tra giao diện" : "Ozon — Kiểm tra giao diện",platform,status:"ready",lastSyncAt:checkedAt}];
    else if(path.endsWith("/products")) body = {
      items: [0,1].map(i=>({id:`buyer-${i}`,externalId:`139022120${i}`,article:`0413.${i?"den":"be"}`,title:"Брюки на резинке широкие вельветовые",brand:"MINHNGOC SHOP",category:"Брюки",image:"/products/placeholder.svg",price:platform === "wb" ? 342200 : 320000,oldPrice:platform === "wb" ? 0 : 450000,salePrice:platform === "wb" ? 174522 : 300000,discount:platform === "wb" ? 49 : 0,minPrice:320000,currency:"RUB",version:1,locked:false,protection:"off",stock:10,buyerPrice:i ? null : {customerPrice:112200,discountPercent:platform === "wb" ? 38 : 35.71,discountKind:platform === "wb" ? "reported":"price_difference",currency:"RUB",transactionAt:"2026-09-27T05:00:00Z",collectedAt:checkedAt,source:platform === "wb"?"wb_sale":"ozon_fbs"}})),
      total:2,pages:1,page:1,facets:[],stats:[],lockedCount:0,
      buyerPrices:{buyerPricesStatus:status,buyerPricesCheckedAt:checkedAt},
    };
    else if(path.endsWith("/events")){await route.fulfill({status:200,contentType:"text/event-stream",body:": fixture\n\n"});return;}
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(body)});
  });
  try {
    for(const selected of ["wb","ozon"]){
      platform=selected;
      await page.setViewportSize({width:1440,height:1000});
      await page.goto("http://localhost:3000/dashboard");
      await page.getByRole("switch",{name:"Bảo vệ giá 0413.be",exact:true}).waitFor();
      if(await page.locator("thead th").count() !== 7)throw new Error("Expected seven columns");
      if((await page.locator("thead").innerText()).includes("Giá tối thiểu"))throw new Error("Old column remains");
      const first=page.locator("tbody tr").filter({hasText:"0413.be"});
      if(!(await first.innerText()).includes("1.122,00"))throw new Error("Buyer price missing");
      if(!(await first.innerText()).includes("27/9/2026"))throw new Error("Transaction date missing");
      if(platform==="ozon" && !(await first.innerText()).includes("≈ 35,71%"))throw new Error("Derived discount not marked");
      if(platform==="ozon" && (!(await first.innerText()).includes("28,89%") || !(await first.innerText()).includes("4.500,00")))throw new Error("Reference price and derived reduction missing");
      const cells=page.locator("tbody tr").filter({hasText:"0413.den"}).locator("td");
      if(await cells.nth(4).innerText()!=="—" || await cells.nth(5).innerText()!=="—")throw new Error("Missing data presented as zero");
      await page.locator(".table-scroll").screenshot({path:`/Users/rupphi/Projects/default-camera/outputs/sellerpro-buyer-prices-${platform}.png`});
      await page.getByRole("button",{name:"Chỉnh sửa",exact:true}).click();
      await page.getByRole("spinbutton",{name:"Giá 0413.be",exact:true}).fill("4000");
      if(platform==="ozon" && !(await first.innerText()).includes("11,11%"))throw new Error("Ozon preview uses WB formula");
      if(!(await first.innerText()).includes("1.122,00"))throw new Error("Editing current price changed historical transaction");
      await page.getByRole("button",{name:"Hủy",exact:true}).click();
      await page.setViewportSize({width:390,height:844});
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error("Page overflows on mobile");
      await page.locator(".table-scroll").evaluate(el=>{el.scrollLeft=el.scrollWidth;});
      if(!await page.getByRole("columnheader",{name:"Giá khách đã mua Giao dịch gần nhất",exact:true}).isVisible())throw new Error("Buyer column inaccessible on mobile");
    }
    status="partial";
    await page.reload();
    await page.getByText("Chưa cập nhật đủ giá giao dịch. Kiểm tra quyền đọc đơn hàng; dữ liệu cũ được giữ nguyên.",{exact:true}).waitFor();
    return {platforms:["wb","ozon"],columns:7,unknownIsDash:true,derivedMarked:true,historicalPriceStableDuringEditing:true,mobile:true,partialWarning:true};
  } finally {
    await page.goto("about:blank");
    await page.unrouteAll({behavior:"ignoreErrors"});
  }
}
