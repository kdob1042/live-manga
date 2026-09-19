import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePublicationCatalog,
  parsePublicationRoute,
  publicationDecision,
  publicCatalog,
} from '../src/publication-policy.mjs';

const source = {
  schemaVersion: 'publication/v1',
  environment: 'production',
  works: [{
    workId: 'work-a',
    title: '作品A',
    formats: {
      manga: {episodes: [
        {episodeId: 'manga-1', title: '漫画1', state: 'published', approved: true, transferred: true, releaseId: 'manga-r1'},
        {episodeId: 'manga-2', title: '漫画2', state: 'scheduled', approved: true, transferred: true, announce: true, releaseAt: '2099-01-01T00:00:00Z', releaseId: 'manga-r2'},
      ]},
    },
  }, {
    workId: 'work-b',
    title: '作品B',
    formats: {manga: {episodes: [
      {episodeId: 'manga-1', title: '別作品の漫画1', state: 'published', approved: true, transferred: true, releaseId: 'other-r1'},
    ]}},
  }],
};

test('publication key is independent for work, format and episode', () => {
  const catalog = normalizePublicationCatalog(source);
  assert.equal(catalog.entries.size, 3);
  assert.equal(catalog.entries.get('work-a\u0000manga\u0000manga-1').releaseId, 'manga-r1');
  assert.equal(catalog.entries.get('work-b\u0000manga\u0000manga-1').releaseId, 'other-r1');
});

test('scheduled entry is announced as locked but does not expose a release id', () => {
  const catalog = normalizePublicationCatalog(source);
  const visible = publicCatalog(catalog, new Date('2026-09-19T00:00:00Z'));
  const manga = visible.works[0].formats.find(item => item.format === 'manga');
  assert.equal(manga.episodes.length, 2);
  assert.equal(manga.episodes[1].locked, true);
  assert.equal(manga.episodes[1].releaseAt, '2099-01-01T00:00:00Z');
  assert.equal('releaseId' in manga.episodes[1], false);
});

test('scheduled entry becomes public only at releaseAt', () => {
  const catalog = normalizePublicationCatalog(source);
  const entry = catalog.entries.get('work-a\u0000manga\u0000manga-2');
  assert.equal(publicationDecision(entry, new Date('2098-12-31T23:59:59Z')).kind, 'locked');
  assert.equal(publicationDecision(entry, new Date('2099-01-01T00:00:00Z')).kind, 'public');
});

test('route parser separates viewer routes from per-episode resources', () => {
  assert.deepEqual(parsePublicationRoute('/works/work-a/'), {kind: 'work', workId: 'work-a'});
  assert.deepEqual(parsePublicationRoute('/works/work-a/manga/manga-1/manifest.json'), {
    kind: 'episode', workId: 'work-a', format: 'manga', episodeId: 'manga-1', resource: 'manifest.json', asset: null,
  });
  assert.equal(parsePublicationRoute('/works/work-a/manga/manga-1/../../secret'), null);
});

test('legacy novel entries are ignored and external URLs need explicit publication', () => {
  for (const novelPublished of [undefined, false, true]) {
    const input = structuredClone(source);
    input.works[0].novelUrl = 'https://novel.example/works/work-a/';
    input.works[0].novelPublished = novelPublished;
    input.works[0].formats.novel = {episodes: [{privateBody: 'must not be read'}]};
    const visible = publicCatalog(normalizePublicationCatalog(input));
    assert.equal(visible.works[0].novelUrl, novelPublished === true ? input.works[0].novelUrl : undefined);
    assert.ok(!JSON.stringify(visible).includes('privateBody'));
    assert.ok(visible.works[0].formats.every(item => item.format === 'manga'));
  }
});

test('unsafe novel URLs are omitted even when marked published', () => {
  for (const novelUrl of ['javascript:alert(1)', '//example.test', 'http://example.test', 'https://user:pass@example.test', 'invalid']) {
    const input = structuredClone(source);
    Object.assign(input.works[0], {novelUrl, novelPublished: true});
    assert.equal(publicCatalog(normalizePublicationCatalog(input)).works[0].novelUrl, undefined);
  }
  assert.equal(parsePublicationRoute('/works/work-a/novel/episode/content.json'), null);
});
