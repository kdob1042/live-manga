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
      novel: {episodes: [
        {episodeId: 'novel-1', title: '小説1', state: 'published', approved: true, transferred: true, releaseId: 'novel-r1'},
        {episodeId: 'novel-2', title: '小説2', state: 'scheduled', approved: true, transferred: true, announce: true, releaseAt: '2099-01-01T00:00:00Z', releaseId: 'novel-r2'},
      ]},
      manga: {episodes: [
        {episodeId: 'manga-1', title: '漫画1', state: 'published', approved: true, transferred: true, releaseId: 'manga-r1'},
      ]},
    },
  }, {
    workId: 'work-b',
    title: '作品B',
    formats: {novel: {episodes: [
      {episodeId: 'novel-1', title: '別作品の小説1', state: 'published', approved: true, transferred: true, releaseId: 'other-r1'},
    ]}},
  }],
};

test('publication key is independent for work, format and episode', () => {
  const catalog = normalizePublicationCatalog(source);
  assert.equal(catalog.entries.size, 4);
  assert.equal(catalog.entries.get('work-a\u0000novel\u0000novel-1').releaseId, 'novel-r1');
  assert.equal(catalog.entries.get('work-b\u0000novel\u0000novel-1').releaseId, 'other-r1');
});

test('scheduled entry is announced as locked but does not expose a release id', () => {
  const catalog = normalizePublicationCatalog(source);
  const visible = publicCatalog(catalog, new Date('2026-09-19T00:00:00Z'));
  const novel = visible.works[0].formats.find(item => item.format === 'novel');
  assert.equal(novel.episodes.length, 2);
  assert.equal(novel.episodes[1].locked, true);
  assert.equal(novel.episodes[1].releaseAt, '2099-01-01T00:00:00Z');
  assert.equal('releaseId' in novel.episodes[1], false);
});

test('scheduled entry becomes public only at releaseAt', () => {
  const catalog = normalizePublicationCatalog(source);
  const entry = catalog.entries.get('work-a\u0000novel\u0000novel-2');
  assert.equal(publicationDecision(entry, new Date('2098-12-31T23:59:59Z')).kind, 'locked');
  assert.equal(publicationDecision(entry, new Date('2099-01-01T00:00:00Z')).kind, 'public');
});

test('route parser separates viewer routes from per-episode resources', () => {
  assert.deepEqual(parsePublicationRoute('/works/work-a/'), {kind: 'work', workId: 'work-a'});
  assert.deepEqual(parsePublicationRoute('/works/work-a/novel/novel-1/content.json'), {
    kind: 'episode', workId: 'work-a', format: 'novel', episodeId: 'novel-1', resource: 'content.json', asset: null,
  });
  assert.equal(parsePublicationRoute('/works/work-a/novel/novel-1/../../secret'), null);
});
