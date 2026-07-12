import { test, expect, type Page } from '@playwright/test';

type BooksPage = { items: Array<Record<string, unknown>>; total: number };

async function search(page: Page, title: string) {
  const input = page.getByRole('searchbox', { name: 'Search books' });
  await input.fill(title);
  await page.waitForTimeout(350); // Catalog debounces the query by 300 ms.
}

test('editing removes a restored book from old-title search results', async ({ page }) => {
  await page.goto('/app');
  const initialCard = page.locator('a[href*="/book/"]').first();
  await expect(initialCard).toBeVisible();

  const href = await initialCard.getAttribute('href');
  const id = href?.match(/\/book\/(\d+)/)?.[1];
  const oldTitle = await initialCard.getAttribute('aria-label');
  expect(id, 'could not resolve a book id from the grid').toBeTruthy();
  expect(oldTitle, 'could not resolve the selected book title').toBeTruthy();
  if (!id || !oldTitle) throw new Error('seed book was missing an id or title');

  // Use the real initial search to seed Catalog's scroll snapshot with this card.
  const originalResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/v1/books?')
    && new URL(response.url()).searchParams.get('search') === oldTitle
    && response.status() === 200,
  );
  await search(page, oldTitle);
  const originalResponse = await originalResponsePromise;
  const originalPage = await originalResponse.json() as BooksPage;
  const originalBook = originalPage.items.find((book) => String(book.id) === id);
  expect(originalBook, 'exact-title search did not include the selected book').toBeTruthy();
  await expect(page.locator(`a[href$="/book/${id}"]`)).toBeVisible();

  const newTitle = `#744 edited title ${Date.now()}`;
  let afterEdit = false;
  let seenEmptyOldTitleSearch = false;

  await page.route('**/api/v1/books?**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const term = requestUrl.searchParams.get('search');
    if (!afterEdit || term !== oldTitle) return route.continue();

    // After the title changes, the authoritative old-title result is empty.
    // Without #744's removeBookFromCache(), Catalog restores the saved card and
    // dedupAppend cannot remove it when this empty page arrives. With the fix,
    // the restored snapshot is empty and Catalog renders its no-results state.
    seenEmptyOldTitleSearch = true;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 } satisfies BooksPage),
    });
  });
  await page.route(`**/api/v1/books/${id}/metadata`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    afterEdit = true;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ title: newTitle }) });
  });

  // Leaving the catalog persists its accumulated cards; saving triggers the
  // production metadata mutation, then the detail redirect mirrors real use.
  await page.locator(`a[href$="/book/${id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/book/${id}$`));
  await page.getByRole('link', { name: /^Edit$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/book/${id}/edit$`));
  const titleInput = page.getByLabel('Title');
  await expect(titleInput).toHaveValue(oldTitle);
  await titleInput.fill(newTitle);
  await page.getByRole('button', { name: /^Save changes$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/book/${id}$`));

  // A local Catalog search does not put its term in the URL. Catalog only
  // accepts a library snapshot when snapshot.search matches the URL's ?q, so a
  // plain /app/ link rejects this searched snapshot. Return through the global
  // search instead: it performs SPA navigation to /app/?q=<oldTitle>, remounts
  // Catalog, and satisfies the production snapshot-restoration guard.
  const restoredResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/v1/books?')
    && new URL(response.url()).searchParams.get('search') === oldTitle
    && response.status() === 200,
  );
  const globalSearch = page.getByRole('searchbox', { name: 'Search the library' });
  await globalSearch.fill(oldTitle);
  await globalSearch.press('Enter');
  await restoredResponsePromise;
  await expect(page).toHaveURL((url) =>
    url.pathname.endsWith('/app/') && url.searchParams.get('q') === oldTitle,
  );
  await expect.poll(() => seenEmptyOldTitleSearch).toBe(true);
  await expect(page.locator(`a[href$="/book/${id}"]`)).toHaveCount(0);
  await expect(page.getByText(`No results for "${oldTitle}".`)).toBeVisible();
});
