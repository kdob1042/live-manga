import {test, expect} from '@playwright/test';

const episode = (episodeId: string, title: string, locked = false) => ({
  episodeId, title, locked, chapterId: null, chapterTitle: null, releaseAt: null,
  href: `/works/work/manga/${episodeId}`,
});
const catalog = {
  schemaVersion: 'publication/v1', environment: 'dev', works: [
    {workId: 'work', title: 'テスト漫画', description: '', formats: [{format: 'manga', episodes: [
      episode('one', '始まり'), episode('two', '続き'), episode('three', '公開前', true),
    ]}]},
    {workId: 'other', title: '別の作品', description: '', formats: [{format: 'manga', episodes: [episode('other', '別の話')]}]},
  ],
};

// Production's Worker serves index.html for these routes. Vite uses mpa mode
// so unknown asset/private URLs never silently turn into a document.
test.beforeEach(async ({page, request}) => {
  await page.route('**/works/**', async route => {
    if (!route.request().isNavigationRequest()) return route.fallback();
    const response = await request.get('/');
    return route.fulfill({contentType: 'text/html', body: await response.text()});
  });
});

test('loading stays visible until the catalog is ready, then titles appear only once', async ({page}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/catalog.json', async route => { await gate; await route.fulfill({json: catalog}); });
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await expect(page.getByRole('status')).toHaveText('作品を読み込み中…');
  release();
  await expect(page.getByRole('heading', {name: '作品一覧'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'テスト漫画', exact: true})).toHaveCount(1);
  await page.getByRole('link', {name: 'テスト漫画', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'テスト漫画', exact: true})).toHaveCount(1);
  await expect(page.getByRole('link', {name: 'テスト漫画', exact: true})).toHaveCount(0);
  await page.screenshot({path: 'test-results/work-index.png', fullPage: true});
});

test('reader links directly to the next published episode and back to its work', async ({page, request}) => {
  const source = await (await request.get('/demo/live-manga.json')).json();
  await page.route('**/catalog.json', route => route.fulfill({json: catalog}));
  await page.route('**/works/work/manga/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/manifest.json')) {
      const manifest = structuredClone(source);
      manifest.workId = 'work'; manifest.episodeId = path.split('/')[4];
      return route.fulfill({json: manifest});
    }
    if (path.includes('/assets/')) return route.fulfill({response: await request.get('/demo/' + path.slice(path.indexOf('assets/')))});
    return route.fallback();
  });
  await page.goto('/works/work/manga/one');
  await expect(page.locator('.page')).toHaveCount(3);
  await expect(page.locator('.reader-sidebar')).toHaveAttribute('inert', '');
  await page.locator('.sidebar-toggle').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.panel-hit-area').first()).toBeFocused();
  await page.locator('.sidebar-toggle').click();
  await expect(page.locator('.reader-sidebar')).not.toHaveAttribute('inert', '');
  await expect(page.locator('.reader-sidebar').getByRole('link', {name: '別の話'})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.sidebar-toggle')).toBeFocused();
  await page.getByRole('link', {name: '次の話へ 続き'}).scrollIntoViewIfNeeded();
  await page.screenshot({path: 'test-results/episode-end.png'});
  await page.getByRole('link', {name: '次の話へ 続き'}).click();
  await expect(page).toHaveURL(/\/manga\/two$/);
  await expect(page.getByRole('link', {name: /次の話へ/})).toHaveCount(0);
  await expect(page.getByText('続きは公開予定です。')).toBeVisible();
  await page.locator('.sidebar-toggle').click();
  await page.locator('.reader-sidebar').getByRole('link', {name: '作品トップ', exact: true}).click();
  await expect(page).toHaveURL(/\/works\/work\/$/);
  await expect(page.getByRole('heading', {name: 'テスト漫画', exact: true})).toBeVisible();
});

test('legacy catalog is fetched once and a failed catalog does not silently reopen a demo', async ({page}) => {
  let requests = 0;
  await page.route('**/catalog.json', route => { requests++; return route.fulfill({json: {current: null}}); });
  await page.goto('/');
  await expect(page.locator('.page')).toHaveCount(3);
  expect(requests).toBe(1);
  await page.route('**/catalog.json', route => route.fulfill({status: 503}));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('公開一覧を取得できません');
  await expect(page.getByRole('button', {name: '再試行'})).toBeVisible();
  await expect(page.locator('.page')).toHaveCount(0);
});
