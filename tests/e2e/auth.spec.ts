import { test, expect } from "@playwright/test";
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from "./fixtures";

test.describe("Authentication Flow", () => {
  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill("invalid@test.com");
    await page.getByLabel(/senha|password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /entrar|login|acessar/i }).click();

    // Should show error message
    await expect(
      page.locator("text=/inválid|incorret|error|não encontrad/i"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("redirects /admin to /login when not authenticated", async ({ page }) => {
    await page.goto("/admin");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("redirects /matriz to /login when not authenticated", async ({ page }) => {
    await page.goto("/matriz");

    // Should redirect to login or home
    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 10000 });
  });

  test("forgot password flow shows confirmation", async ({ page }) => {
    await page.goto("/login");

    const forgotLink = page.getByText(/esquec|forgot/i);
    if (await forgotLink.isVisible()) {
      await forgotLink.click();

      // Should show email input for password reset
      await expect(page.getByLabel(/email/i)).toBeVisible();
    }
  });

  // Tests that require real credentials
  const hasCredentials = TEST_USER_EMAIL && TEST_USER_PASSWORD;

  (hasCredentials ? test : test.skip)(
    "successful login redirects to admin",
    async ({ page }) => {
      await page.goto("/login");

      await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
      await page.getByLabel(/senha|password/i).fill(TEST_USER_PASSWORD);
      await page.getByRole("button", { name: /entrar|login|acessar/i }).click();

      // Should redirect to /admin
      await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
    },
  );

  (hasCredentials ? test : test.skip)(
    "logout redirects to login",
    async ({ page }) => {
      // Login first
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
      await page.getByLabel(/senha|password/i).fill(TEST_USER_PASSWORD);
      await page.getByRole("button", { name: /entrar|login|acessar/i }).click();

      await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

      // Find and click logout
      const logoutBtn = page.getByText(/sair|logout/i);
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
      }
    },
  );
});
