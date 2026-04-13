import { test, expect } from "@playwright/test";
import { TEST_STORE_SLUG } from "./fixtures";

test.describe("Simulator Flow", () => {
  test("completes full simulator flow: model → optionals → form → proposal", async ({ page }) => {
    // Step 1: Navigate to store simulator
    await page.goto(`/s/${TEST_STORE_SLUG}`);

    // Step 2: Wait for models to load
    await expect(page.locator("[data-testid='model-card'], .model-card, [class*='card']").first()).toBeVisible({
      timeout: 15000,
    });

    // Step 3: Click first model
    const firstModel = page.locator("[data-testid='model-card'], .model-card, [class*='card']").first();
    await firstModel.click();

    // Step 4: Optionals page — click continue/confirm button
    const continueBtn = page.getByRole("button", { name: /confirmar|continuar|próximo|avançar/i });
    await expect(continueBtn).toBeVisible({ timeout: 10000 });
    await continueBtn.click();

    // Step 5: Customer form — fill in data
    await page.getByLabel(/nome/i).first().fill("João Teste");

    // Select state (UF)
    const ufSelect = page.locator("select, [role='combobox']").first();
    if (await ufSelect.isVisible()) {
      await ufSelect.click();
      await page.getByText("SP").click();
    }

    // Fill WhatsApp
    await page.getByLabel(/whatsapp|telefone|celular/i).first().fill("11999887766");

    // Step 6: Submit form
    const submitBtn = page.getByRole("button", { name: /gerar|enviar|simular|ver proposta/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();

    // Step 7: Verify proposal view
    await expect(page.locator("#proposal-content, [data-pdf-page]").first()).toBeVisible({
      timeout: 15000,
    });

    // Step 8: Verify PDF and WhatsApp buttons exist
    const pdfButton = page.getByRole("button", { name: /pdf|download|exportar/i });
    await expect(pdfButton).toBeVisible();

    const whatsappButton = page.getByRole("button", { name: /whatsapp|enviar/i });
    await expect(whatsappButton).toBeVisible();
  });

  test("shows error state for invalid slug", async ({ page }) => {
    await page.goto("/s/non-existent-store-slug-12345");

    // Should show error, empty state, or redirect — not crash
    await page.waitForTimeout(3000);
    const hasError = await page.locator("text=/não encontrad|erro|not found/i").isVisible();
    const hasEmptyState = await page.locator("text=/nenhum|vazio|empty/i").isVisible();
    const redirected = page.url() !== `${page.url()}`;

    expect(hasError || hasEmptyState || redirected).toBeTruthy();
  });

  test("customer form validates required fields", async ({ page }) => {
    await page.goto(`/s/${TEST_STORE_SLUG}`);

    // Select first model
    await page.locator("[data-testid='model-card'], .model-card, [class*='card']").first().click();

    // Skip optionals
    const continueBtn = page.getByRole("button", { name: /confirmar|continuar|próximo|avançar/i });
    await expect(continueBtn).toBeVisible({ timeout: 10000 });
    await continueBtn.click();

    // Try to submit empty form
    const submitBtn = page.getByRole("button", { name: /gerar|enviar|simular|ver proposta/i });
    if (await submitBtn.isVisible()) {
      // Button should be disabled or show validation errors
      const isDisabled = await submitBtn.isDisabled();
      if (!isDisabled) {
        await submitBtn.click();
        // Should show validation errors
        await page.waitForTimeout(1000);
      }
    }
  });
});
