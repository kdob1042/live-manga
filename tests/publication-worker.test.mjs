import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../src/worker.mjs';

const manga = JSON.parse(await readFile('public/demo/live-manga.json'));
const novel = {format: 'novel', workId: manga.workId, episodeId: 'novel-1', title: '小説1', chapterId: null, chapterTitle: null, html: '<p>本文</p>'};
const catalog = {
  schemaVersion: 'publication/v1',
  environment: 'production',
  works: [{
    workId: manga.workId,
    title: manga.title,
    formats: [
      {format: 'manga', episodes: [{episodeId: manga.episodeId, title: '漫画1', state: 'published', approved: true, transferred: true, releaseId: manga.releaseId}]},
      {format: 'novel', episodes: [
        {episodeId: 'novel-1', title: '小説1', state: 'published', approved: true, transferred: true, releaseId: 'novel-r1'},
        {episodeId: 'novel-locked', title: '公開予定', state: 'scheduled', approved: true, announce: true, transferred: true, releaseAt: '2099-01-01T00:00:00Z', releaseId: 'novel-r2'},
      ]},
    ],
  }],
};

const env = {
  ENVIRONMENT: 'production',
  PUBLICATION_CATALOG_KEY: 'publication/catalog.json',
  REQUIRE_PUBLICATION_CATALOG: 'true',
  ASSETS: {fetch: () => new Response('ui')},
  MEDIA: {
    get: async (key) => {
      if (key === 'publication/catalog.json') return {size: 1000, json: async () => catalog};
      if (key === `releases/${manga.releaseId}/live-manga.json`) return {size: 3000, json: async () => manga};
      if (key === 'releases/novel-r1/novel.json') return {size: 1000, json: async () => novel};
      return null;
    },
    head: async () => null,
  },
};

const request = (path) => worker.fetch(new Request(`https://reader.test${path}`), env);

test('catalog does not expose release ids and keeps format episode ranges independent', async () => {
  const response = await request('/catalog.json');
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.equal(value.works[0].formats.length, 1);
  assert.equal('releaseId' in value.works[0].formats[0].episodes[0], false);
});

test('old novel routes never serve bodies or the SPA', async () => {
  const response = await request(`/works/${manga.workId}/novel/novel-1/content.json`);
  assert.equal(response.status, 404);
  assert.equal((await request(`/works/${manga.workId}/novel/novel-locked/content.json`)).status, 404);
  assert.equal((await request(`/works/${manga.workId}/novel/novel-1`)).status, 404);
});


test('manga viewer and manifest remain available', async () => {
  assert.equal((await request(`/works/${manga.workId}/manga/${manga.episodeId}`)).status, 200);
  const response = await request(`/works/${manga.workId}/manga/${manga.episodeId}/manifest.json`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).releaseId, manga.releaseId);
});
