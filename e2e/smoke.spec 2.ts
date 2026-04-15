import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page) {
  const res = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      bodyScrollWidth: document.body?.scrollWidth ?? 0,
    };
  });
  expect(res.scrollWidth).toBeLessThanOrEqual(res.clientWidth + 2);
  expect(res.bodyScrollWidth).toBeLessThanOrEqual(res.clientWidth + 2);
}

test.describe("Sommelyx smoke QA (public flows)", () => {
  test("Landing: header CTAs + anchors + pricing CTA", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("requestfailed", (r) => {
      errors.push(`requestfailed: ${r.url()} (${r.failure()?.errorText ?? "unknown"})`);
    });

    // `networkidle` can hang due to long-lived connections (e.g. realtime/websocket).
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Header CTAs
    const header = page.getByRole("banner");
    await expect(header.getByRole("button", { name: /^Entrar$/i })).toBeVisible();
    await expect(header.getByRole("button", { name: /Começar grátis/i })).toBeVisible();

    // "Entrar" should go to login
    await header.getByRole("button", { name: /^Entrar$/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Back to landing via logo
    await page.getByRole("link", { name: /Sommelyx/i }).click();
    await expect(page).toHaveURL(/\/$/);

    // Anchors
    await page.getByRole("link", { name: /Funcionalidades/i }).click();
    await expect(page.locator("#features")).toBeVisible();

    await page.getByRole("link", { name: /Planos/i }).click();
    await expect(page.locator("#pricing")).toBeVisible();

    // Pricing CTA should route to /signup
    await page
      .locator("#pricing")
      .getByRole("button", { name: /Começar|Teste|Grátis/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/signup$/);

    expect(errors.filter(Boolean)).toEqual([]);
  });

  test("Landing: no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectNoHorizontalOverflow(page);
  });

  test("Signup: form renders and basic validation blocks empty submit", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Criar conta|Começar/i })).toBeVisible();

    const submit = page.getByRole("button", { name: /Criar conta|Começar|Cadastrar/i }).first();
    await submit.click();

    // Browser native validation should keep us on the page (no navigation / no loading state crash).
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("Routing: /dashboard redirects to /login when logged out", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /Acesse sua conta|Entrar/i })).toBeVisible();
  });

  test("Routing: protected routes redirect when logged out", async ({ page }) => {
    const protectedRoutes = [
      "/dashboard/inventory",
      "/dashboard/alerts",
      "/dashboard/wishlist",
      "/dashboard/consumption",
      "/dashboard/settings",
      "/dashboard/plans",
    ];

    for (const r of protectedRoutes) {
      await page.goto(r, { waitUntil: "domcontentloaded" });
      await page.waitForURL(/\/login$/);
    }
  });

  test("Login: form is interactive and does not overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await expect(page.getByLabel(/E-?mail/i)).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();

    // Toggle show password, if present
    const toggle = page.getByRole("button", { name: /Mostrar senha|Ocultar senha/i });
    if (await toggle.count()) await toggle.first().click();

    await expectNoHorizontalOverflow(page);
  });

  test("Forgot password: page loads and submit shows feedback", async ({ page }) => {
    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Esqueci|minha senha|Recupera/i })).toBeVisible();

    await page.getByLabel(/E-?mail/i).fill("qa+sommelyx@example.com");
    await page.getByRole("button", { name: /Enviar|Recuperar/i }).click();

    // Should show some success state (toast or inline text).
    await expect(page.getByRole("heading", { name: /Link enviado/i })).toBeVisible();
  });

  test("Reset password: invalid link shows message", async ({ page }) => {
    await page.goto("/reset-password", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Link inválido/i })).toBeVisible();
  });
});
