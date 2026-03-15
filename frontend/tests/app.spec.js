import { test, expect } from '@playwright/test';

// ─── Test 1: Page loads with the tab UI and form is visible ──────────────────
test('page loads and input form is visible', async ({ page }) => {
  await page.goto('/');

  // The app title should be on screen
  await expect(page.getByText('Script It')).toBeVisible();

  // All three reference-script tabs should be present
  await expect(page.getByRole('button', { name: 'Video URL' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Drop / Upload' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Paste Text' })).toBeVisible();

  // Product fields below the tabs should always be visible
  await expect(page.getByPlaceholder('e.g. Lumi Sleep Mask')).toBeVisible();
  await expect(page.getByPlaceholder('e.g. busy professionals aged 25–40')).toBeVisible();

  // The generate button should be visible but disabled (no input yet)
  const button = page.getByRole('button', { name: /Generate Script/i });
  await expect(button).toBeVisible();
  await expect(button).toBeDisabled();
});

// ─── Test 2: You can switch to Paste Text and type into the fields ────────────
test('can switch to paste tab and type into the reference script and product fields', async ({ page }) => {
  await page.goto('/');

  // Switch to the Paste Text tab to get the textarea
  await page.getByRole('button', { name: 'Paste Text' }).click();

  // Type into the reference script textarea
  await page.getByPlaceholder('Paste the reference script here...').fill(
    'This is a sample reference script for testing.'
  );

  // Type into the product fields (these are always visible)
  await page.getByPlaceholder('e.g. Lumi Sleep Mask').fill('Test Product');
  await page.getByPlaceholder('e.g. busy professionals aged 25–40').fill('Developers');

  // Verify the values stuck
  await expect(page.getByPlaceholder('Paste the reference script here...')).toHaveValue(
    'This is a sample reference script for testing.'
  );
  await expect(page.getByPlaceholder('e.g. Lumi Sleep Mask')).toHaveValue('Test Product');
  await expect(page.getByPlaceholder('e.g. busy professionals aged 25–40')).toHaveValue('Developers');
});

// ─── Test 3: Clicking Generate triggers a response ───────────────────────────
test('clicking generate button triggers a response', async ({ page }) => {
  // Intercept the generate API call and return a fake SSE stream
  await page.route('**/api/generate', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"text":"This is a generated script."}\n\ndata: [DONE]\n\n',
    });
  });

  await page.goto('/');

  // Switch to Paste Text tab and fill in the reference script
  await page.getByRole('button', { name: 'Paste Text' }).click();
  await page.getByPlaceholder('Paste the reference script here...').fill('Reference script text.');

  // Fill all the product fields
  await page.getByPlaceholder('e.g. Lumi Sleep Mask').fill('My Product');
  await page.getByPlaceholder('e.g. busy professionals aged 25–40').fill('Everyone');
  await page.getByPlaceholder(/A weighted sleep mask/).fill('It does great things.');
  await page.getByPlaceholder(/Fall asleep 2x faster/).fill('Benefit one, benefit two.');

  // The button should now be enabled
  const button = page.getByRole('button', { name: /Generate Script/i });
  await expect(button).toBeEnabled();

  // Click it and check the mocked output appears
  await button.click();
  await expect(page.getByText('This is a generated script.')).toBeVisible();
});
