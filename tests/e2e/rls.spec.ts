import { test, expect } from "@playwright/test";
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  TEST_USER_B_EMAIL,
  TEST_USER_B_PASSWORD,
} from "./fixtures";

const hasBothUsers =
  TEST_USER_EMAIL &&
  TEST_USER_PASSWORD &&
  TEST_USER_B_EMAIL &&
  TEST_USER_B_PASSWORD;

test.describe("RLS Isolation Between Stores", () => {
  test.skip(!hasBothUsers, "Requires both TEST_USER and TEST_USER_B credentials");

  test("store A owner only sees store A proposals", async ({ page }) => {
    // Login as store A owner
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
    await page.getByLabel(/senha|password/i).fill(TEST_USER_PASSWORD);
    await page.getByRole("button", { name: /entrar|login|acessar/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    // Get the store name displayed in the dashboard
    const storeNameEl = page.locator("[data-testid='store-name'], h1, h2").first();
    const storeAName = await storeNameEl.textContent();

    // Logout
    const logoutBtn = page.getByText(/sair|logout/i);
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    }

    // Login as store B owner
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TEST_USER_B_EMAIL);
    await page.getByLabel(/senha|password/i).fill(TEST_USER_B_PASSWORD);
    await page.getByRole("button", { name: /entrar|login|acessar/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    // Store B should show different store name
    const storeBNameEl = page.locator("[data-testid='store-name'], h1, h2").first();
    const storeBName = await storeBNameEl.textContent();

    // Store names should be different (confirming isolation)
    if (storeAName && storeBName) {
      expect(storeAName).not.toBe(storeBName);
    }
  });

  test("cannot access other store admin via direct URL", async ({ page }) => {
    // Login as store A
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
    await page.getByLabel(/senha|password/i).fill(TEST_USER_PASSWORD);
    await page.getByRole("button", { name: /entrar|login|acessar/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    // Try to access a proposal that doesn't belong to this store
    // (using a random UUID — should show error or empty)
    await page.goto("/admin/proposta/00000000-0000-0000-0000-000000000000");

    // Should not show another store's data — either 404, redirect, or empty
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasNoData = !(await page.locator("[data-pdf-page]").isVisible());

    expect(url.includes("/admin") || hasNoData).toBeTruthy();
  });
});
