import { test, expect } from "@playwright/test";
test("room → category → activity → login preserves the chosen flow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Well, That Happened." }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Come in/ }).click();
  await expect(page).toHaveURL(/\/categories$/);
  await expect(page.locator(".category-card")).toHaveCount(8);
  await page.getByRole("link", { name: /Work Per my last/ }).click();
  await expect(page).toHaveURL(/\/categories\/work$/);
  await page.getByRole("link", { name: /Make it funny/ }).click();
  await expect(page).toHaveURL(/\/login\?next=.*work.*create/);
  await expect(
    page.getByRole("button", { name: /Sign in with Google/ }),
  ).toBeVisible();
});
test("public pages fit viewport; all categories have both activities", async ({
  page,
}) => {
  for (const path of ["/", "/categories", "/categories/dating"]) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await expect(
    page.getByRole("link", { name: /Just here to rate/ }),
  ).toBeVisible();
});
test("protected pages redirect signed-out visitors and direct mutations reject them", async ({
  request,
}) => {
  for (const path of [
    "/categories/work/create",
    "/categories/work/rate",
    "/members",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/login?next=");
  }
  for (const path of ["/api/generate", "/api/ratings", "/api/share"]) {
    const response = await request.post(path, { data: {} });
    expect(response.status()).toBe(401);
    expect(await response.json()).toHaveProperty("error");
  }
});
test("rating choice also preserves category and intent", async ({ page }) => {
  await page.goto("/categories/student-life");
  await page.getByRole("link", { name: /Just here to rate/ }).click();
  await expect(page).toHaveURL(/\/login\?next=.*student-life.*rate/);
});

test("main controls fit common screens and screenshots support visual review", async ({
  page,
}, testInfo) => {
  const desktop = (page.viewportSize()?.width || 0) >= 1000;
  for (const [path, name, controls] of [
    ["/", "room", ".home .button, .home-room, .home h1"],
    ["/categories", "categories", ".category-card"],
    [
      "/categories/cooking-disasters",
      "activity",
      ".activity-card, .collection .entry-card",
    ],
    ["/login", "login", ".login button"],
  ]) {
    await page.goto(path);
    await page.screenshot({
      path: testInfo.outputPath(`${name}.png`),
      fullPage: true,
    });
    if (path === "/" && desktop) {
      const caption = await page
        .locator(".home-room figcaption")
        .evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return {
            lines: range.getClientRects().length,
            fits: el.scrollWidth <= el.clientWidth,
          };
        });
      expect(caption.lines).toBe(1);
      expect(caption.fits).toBeTruthy();
    }
    if (path === "/categories") {
      const cards = page.locator(".category-card");
      await expect(cards.nth(6)).toHaveAttribute(
        "data-category",
        "roommate-life",
      );
      await expect(cards.last()).toHaveAttribute(
        "data-category",
        "something-else",
      );
      if (desktop) {
        const grid = await page.locator(".category-grid").boundingBox();
        const last = await cards.last().boundingBox();
        expect(
          Math.abs(last!.x + last!.width - grid!.x - grid!.width),
        ).toBeLessThan(2);
        for (const box of await cards.evaluateAll((items) =>
          items.map((el) => el.getBoundingClientRect().top),
        ))
          expect(box).toBeLessThanOrEqual(last!.y + 1);
      }
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    if (desktop || path === "/") {
      const bounds = await page.locator(controls).evaluateAll((elements) =>
        elements.map((el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom };
        }),
      );
      for (const rect of bounds) {
        expect(rect.top).toBeGreaterThanOrEqual(0);
        expect(rect.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
      }
    }
  }
});

test("Roommate Life opens both activities and preserves the sign-in destination", async ({
  page,
}) => {
  await page.goto("/categories");
  await page.getByRole("link", { name: /Roommate Life Shared space/ }).click();
  await expect(page).toHaveURL(/\/categories\/roommate-life$/);
  await expect(
    page.getByText(
      "Public stories and AI jokes. Seeded entries are fictional.",
    ),
  ).toHaveCount(0);
  await page.getByRole("link", { name: /Make it funny/ }).click();
  await expect(page).toHaveURL(/\/login\?next=.*roommate-life.*create/);
  await page.goto("/categories/roommate-life");
  await page.getByRole("link", { name: /Just here to rate/ }).click();
  await expect(page).toHaveURL(/\/login\?next=.*roommate-life.*rate/);
});

test("each category shows complete public cards without desktop clipping", async ({
  page,
}) => {
  const slugs = [
    "dating",
    "friendship-drama",
    "cooking-disasters",
    "late-again",
    "work",
    "student-life",
    "roommate-life",
    "something-else",
  ];
  for (const slug of slugs) {
    await page.goto(`/categories/${slug}`);
    const cards = page.locator(".collection .entry-card");
    await expect(cards).toHaveCount(3);
    const bounds = await cards.evaluateAll((elements) =>
      elements.map((el) => ({
        bottom: el.getBoundingClientRect().bottom,
        clipped: el.scrollHeight > el.clientHeight + 1,
      })),
    );
    for (const rect of bounds) {
      expect(rect.clipped).toBeFalsy();
      if (page.viewportSize()!.width >= 1000)
        expect(rect.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
