import { test, expect } from "@playwright/test";

/**
 * Unlimited Monthly Ride Pack — Core Tests
 *
 * Run:  npx playwright test
 * Headed: npx playwright test --headed
 * Env:  Needs Chrome installed. On WSL2, run from Windows:
 *       cmd.exe /c "cd /d C:\Users\omkar\Desktop\cityflo-qa-assignment && node node_modules\@playwright\test\cli.js test"
 *
 * OTP approach:
 *   Session persisted via storageState (auth.json), created by logging in
 *   manually in a Chrome instance launched with --remote-debugging-port=9222,
 *   then saving context.storageState() via playwright-core connectOverCDP.
 *   auth.json is gitignored and never committed.
 *   Assumption: staging tokens last several hours (refresh token ~30 days).
 *   If tests land on /login or show "Send OTP", session expired — re-authenticate.
 */

// PRD-sourced constants
const PRD_PRICE_UNLIMITED_MONTHLY = 3000; // PRD §3: "flat ₹3,000"
const PLAN_SLUG_UNLIMITED = "unlimited-rides-30-days";
const PICKUP_SEARCH_TERM = "Powai";
const DROPOFF_SEARCH_TERM = "BKC";

/** Ensure pickup and dropoff are set, then click Search and wait for route results. */
async function searchRoute(page: import("@playwright/test").Page) {
  // Dismiss any overlay dialogs (office time, seat confirmation) by pressing Escape
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  // If pickup says "Select pickup", we need to set it; if already populated, skip
  const needsPickup = await page.getByText(/select pickup location/i).first().isVisible().catch(() => false);
  if (needsPickup) {
    await page.getByText(/select pickup location/i).first().click();
    const pickupInput = page.locator("input").first();
    await expect(pickupInput).toBeVisible({ timeout: 5000 });
    await pickupInput.fill(PICKUP_SEARCH_TERM);
    await expect(page.getByText(/Rambaug.*Powai|Bayroute.*Powai/i).first()).toBeVisible({ timeout: 5000 });
    await page.getByText(/Rambaug.*Powai|Bayroute.*Powai/i).first().click();
    await page.waitForLoadState("networkidle");
  }

  const needsDropoff = await page.getByText(/select drop location/i).first().isVisible().catch(() => false);
  if (needsDropoff) {
    await page.getByText(/select drop location/i).first().click();
    const dropInput = page.locator("input").first();
    await expect(dropInput).toBeVisible({ timeout: 5000 });
    await dropInput.fill(DROPOFF_SEARCH_TERM);
    await expect(page.getByText(/Bandra Kurla Complex/i).first()).toBeVisible({ timeout: 5000 });
    await page.getByText(/Bandra Kurla Complex/i).first().click();
    await page.waitForLoadState("networkidle");
  }

  // Click Search and wait for search results page to load
  await page.getByText(/^search$/i).first().click();
  await expect(page.getByText(/Search Bus/i).first()).toBeVisible({ timeout: 15000 });

  // If today has no routes (departed), try the next available date tab
  const hasProceed = await page.getByText(/proceed/i).first().isVisible({ timeout: 5000 }).catch(() => false);
  if (!hasProceed) {
    // Click on a future date tab (e.g. "Fri, 6th Nov" or whatever is next)
    const dateTabs = page.locator("button").filter({ hasText: /\d{1,2}(st|nd|rd|th)\s/i });
    const tabCount = await dateTabs.count();
    for (let i = 1; i < tabCount; i++) {
      await dateTabs.nth(i).click();
      const found = await page.getByText(/proceed/i).first().isVisible({ timeout: 5000 }).catch(() => false);
      if (found) break;
    }
  }

  await expect(page.getByText(/proceed/i).first()).toBeVisible({ timeout: 10000 });
}

test.describe("Unlimited Monthly Ride Pack", () => {
  test.describe.configure({ mode: "serial" });

  // Session guard — fail fast if auth.json is stale
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(page.url(), "Session expired — redirected to login. Re-authenticate and save auth.json.").not.toContain("login");
    const body = await page.locator("body").innerText();
    expect(body, "Session expired — OTP page shown.").not.toContain("Send OTP");
  });

  test("T1 [G1]: Ride Pack page loads and shows auto-renew controls", async ({ page }) => {
    await page.goto("/ride-pack");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText();
    const hasAutoRenew = bodyText.includes("auto-renew") || bodyText.includes("auto-renewal");
    expect(hasAutoRenew, "Ride Pack page should mention auto-renew").toBe(true);
  });

  test("T2 [B1,B2]: Route search returns results with Pack of rides option", async ({ page }) => {
    await searchRoute(page);

    // Click Proceed on first route → should show booking type
    await page.getByText(/proceed/i).first().click({ force: true });
    await expect(page.getByText(/Pack of rides/i)).toBeVisible({ timeout: 10000 });
  });

  // BUG-001: no_of_rides should be null (unlimited) — currently 50
  // BUG-002: total_cost should be ₹3,000 — currently ₹5,700
  test.fail("T3 [C5,H1,D4]: Unlimited Monthly — ride cap and price match PRD", async ({ page }) => {
    // Set up API interception BEFORE triggering navigation
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("get-lite-pack-details-with-plans") && r.status() === 200
    );

    await searchRoute(page);

    // Route → booking type
    await page.getByText(/proceed/i).first().click({ force: true });
    await expect(page.getByText(/Pack of rides/i)).toBeVisible({ timeout: 10000 });

    // Click Proceed on Pack of rides to load plans
    await page.getByText(/proceed/i).first().click({ force: true });

    // Wait for API response deterministically
    const response = await responsePromise;
    const litePackData = await response.json();

    // Verify Unlimited Monthly is visible on screen
    await expect(page.getByText("Unlimited Monthly").first()).toBeVisible({ timeout: 10000 });

    // Verify API data
    const unlimitedPlan = litePackData.plans.find(
      (p: any) => p.plan_slug === PLAN_SLUG_UNLIMITED
    );
    expect(unlimitedPlan, `Plan ${PLAN_SLUG_UNLIMITED} not found in API`).toBeDefined();

    // PRD §4: "no cap on the number of rides" → no_of_rides should be null
    // BUG-001: currently 50 — test.fail() marks this as expected failure
    expect(unlimitedPlan.no_of_rides).toBeNull();

    // PRD §3: "flat ₹3,000" → total_cost should be 3000
    // BUG-002: currently 5700 — test.fail() marks this as expected failure
    expect(unlimitedPlan.total_cost).toBe(PRD_PRICE_UNLIMITED_MONTHLY);
  });

  // BUG-005: duplicate "Unlimited Monthly" plans (should be 1, currently 2)
  // BUG-006: all plan amounts are null (should have values)
  test.fail("T4 [E1,E2]: Autorenew API — plan amounts and uniqueness", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("ride-pack-autorenew") && r.status() === 200
    );

    await page.goto("/ride-pack");

    const response = await responsePromise;
    const autorenewData = await response.json();
    const plans = autorenewData.available_plans;

    // BUG-005: exactly one plan named "Unlimited Monthly"
    const unlimitedPlans = plans.filter(
      (p: any) => p.pack_name === "Unlimited Monthly"
    );
    expect(unlimitedPlans.length, "BUG-005: duplicate Unlimited Monthly plans").toBe(1);

    // BUG-006: plan amounts should not be null
    const unlimitedPlan = plans.find(
      (p: any) => p.plan_slug === PLAN_SLUG_UNLIMITED
    );
    expect(unlimitedPlan.amount, "BUG-006: amount is null").not.toBeNull();
  });
});
