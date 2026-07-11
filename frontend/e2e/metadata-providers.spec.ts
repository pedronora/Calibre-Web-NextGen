import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openMetadataPanel(page: Page) {
  await page.goto('/app');
  const href = await page.locator('a[href*="/book/"]').first().getAttribute('href');
  const id = href?.match(/\/book\/(\d+)/)?.[1];
  expect(id, 'could not resolve a book id from the grid').toBeTruthy();
  await page.goto(`/app/book/${id}/edit`);
  await page.getByRole('button', { name: /fetch metadata from web/i }).click();
}

test('provider toggle persists to the server SSOT before the combined search', async ({ page }) => {
  let googleActive = true;
  let toggleBody: unknown;
  let searchObservedAfterToggle = false;

  await page.route('**/metadata/provider', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'google', name: 'Google Books', active: googleActive, initial: googleActive, globally_enabled: true },
        { id: 'openlibrary', name: 'Open Library', active: true, initial: true, globally_enabled: true },
        { id: 'admin-off', name: 'Admin Disabled', active: true, initial: true, globally_enabled: false },
      ]),
    });
  });
  await page.route('**/metadata/provider/google', async (route) => {
    toggleBody = route.request().postDataJSON();
    await new Promise((resolve) => setTimeout(resolve, 100));
    googleActive = (toggleBody as { value: boolean }).value;
    await route.fulfill({ status: 200, body: '' });
  });
  await page.route('**/metadata/search', async (route) => {
    searchObservedAfterToggle = !googleActive;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: googleActive ? [
          { title: 'Google-only result', authors: [], cover: '', source: { id: 'google' } },
        ] : [
          { title: 'Open Library result', authors: [], cover: '', source: { id: 'openlibrary' } },
        ],
        providers: [
          { id: 'google', name: 'Google Books', status: googleActive ? 'ok' : 'disabled', count: googleActive ? 1 : 0, message: '' },
          { id: 'openlibrary', name: 'Open Library', status: 'ok', count: 1, message: '' },
        ],
      }),
    });
  });

  await openMetadataPanel(page);

  const google = page.getByRole('switch', { name: /Google Books/ });
  await expect(google).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Admin Disabled')).toHaveCount(0);

  const a11y = await new AxeBuilder({ page })
    .include('[class*="providerSection"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(a11y.violations.filter((violation) =>
    violation.impact === 'critical' || violation.impact === 'serious')).toEqual([]);

  await google.focus();
  await page.keyboard.press('Space');
  await expect(google).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('button', { name: /^Search$/ })).toBeDisabled();
  await expect(google).toBeEnabled();

  expect(toggleBody).toEqual({ id: 'google', value: false });
  await page.getByRole('button', { name: /^Search$/ }).click();
  await expect(page.getByText('Open Library result')).toBeVisible();
  await expect(page.getByText('Google-only result')).toHaveCount(0);
  expect(searchObservedAfterToggle, 'search reached the combined endpoint after the toggle persisted').toBe(true);
});
