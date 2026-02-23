import { test, expect } from "@playwright/test";
import { CERTIFIED_VIEWPORTS } from "./viewports";

const OVERFLOW_TOLERANCE_PX = 2;

const PAGES: { path: string; criticalSelector?: string; criticalLabel?: string }[] = [
  { path: "/", criticalSelector: "text=PAPI", criticalLabel: "heading/brand" },
  { path: "/booking", criticalSelector: "text=Vyberte kategóriu", criticalLabel: "booking step" },
  { path: "/auth", criticalSelector: "text=Prihlásenie", criticalLabel: "auth heading" },
  { path: "/demo", criticalSelector: "text=Demo", criticalLabel: "demo heading" },
];

for (const viewport of CERTIFIED_VIEWPORTS) {
  test.describe(`Viewport: ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    for (const { path, criticalSelector, criticalLabel } of PAGES) {
      test(`${path} – no horizontal overflow & page loaded`, async ({ page }) => {
        const response = await page.goto(path, { waitUntil: "networkidle" });
        expect(response?.status()).toBe(200);

        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(300);

        const overflow = await page.evaluate((vw) => {
          const doc = document.documentElement;
          const scrollWidth = doc.scrollWidth;
          return scrollWidth > vw;
        }, viewport.width);

        if (overflow) {
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          await page.screenshot({
            path: `e2e-results/screenshots/overflow-${viewport.name.replace(/\s+/g, "-")}-${path.replace(/\//g, "root") || "index"}.png`,
          }).catch(() => {});
        }

        expect(
          overflow,
          `Horizontal overflow on ${path} at ${viewport.name}: document.scrollWidth should be <= ${viewport.width}`
        ).toBe(false);
      });

      if (criticalSelector && criticalLabel) {
        test(`${path} – critical element visible (${criticalLabel})`, async ({ page }) => {
          // /auth is lazy-loaded; wait for networkidle so the chunk and heading render
          const waitUntil = path === "/auth" ? "networkidle" : "domcontentloaded";
          await page.goto(path, { waitUntil });
          if (path !== "/auth") await page.waitForTimeout(500);
          const locator =
            path === "/auth"
              ? page.getByText(/Prihlásenie|Registrácia|Obnova hesla/).first()
              : page.locator(criticalSelector).first();
          await expect(locator).toBeVisible({ timeout: 10_000 });
        });
      }
    }
  });
}
