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
  const seenOldSearchTotals: number[] = [];
  const seenNewSearchTotals: number[] = [];

  await page.route('**/api/v1/books?**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const term = requestUrl.searchParams.get('search');
    if (!afterEdit || (term !== oldTitle && term !== newTitle)) return route.continue();

    // The first old-title response is empty; the next is deliberately nonempty
    // but omits the edited ID. Both must not resurrect the saved card.
    const oldSearchCount = seenOldSearchTotals.length;
    const body: BooksPage = term === oldTitle
      ? oldSearchCount === 0
        ? { items: [], total: 0 }
        : {
            items: [{ ...originalBook!, id: Number(id) + 1_000_000, title: '#744 unrelated match' }],
            total: 1,
          }
      : { items: [{ ...originalBook!, id: Number(id), title: newTitle }], total: 1 };
    if (term === oldTitle) seenOldSearchTotals.push(body.total);
    else seenNewSearchTotals.push(body.total);
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
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

  await page.locator('a[href="/app/"]').first().click();
  await expect(page).toHaveURL(/\/app\/$/);
  await expect(page.getByRole('searchbox', { name: 'Search books' })).toHaveValue(oldTitle);
  await expect.poll(() => seenOldSearchTotals).toContain(0);
  await expect(page.locator(`a[href$="/book/${id}"]`)).toHaveCount(0);
  await expect(page.getByText('No books match those criteria.')).toBeVisible();

  // Re-run the old search with a nonempty authoritative page that omits this
  // ID. The accumulator must not add the stale saved card back.
  await search(page, `${oldTitle} `);
  await search(page, oldTitle);
  await expect.poll(() => seenOldSearchTotals.some((total) => total === 1)).toBe(true);
  await expect(page.locator(`a[href$="/book/${id}"]`)).toHaveCount(0);

  await search(page, newTitle);
  await expect.poll(() => seenNewSearchTotals).toContain(1);
  const newCard = page.locator(`a[href$="/book/${id}"]`);
  await expect(newCard).toHaveCount(1);
  await expect(newCard).toHaveAttribute('aria-label', newTitle);
});
