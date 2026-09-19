import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildNovelEpisode, markdownToHtml, titleFromSource} from '../src/novel-markdown.mjs';

test('converts one episode without allowing raw HTML through', () => {
  const html = markdownToHtml('# ［E01］題名\n\n## 場面\n\n本文 **強調** <script>alert(1)</script> [資料](https://example.com)');
  assert.match(html, /^<h2>場面<\/h2>/m);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /target="_blank"/);
  assert.doesNotMatch(html, /<script>/);
});

test('keeps the source heading id for manifest validation', () => {
  assert.deepEqual(titleFromSource('# ［C01-E01］ 第1話', 'fallback'), {id: 'C01-E01', title: '第1話'});
  assert.deepEqual(titleFromSource('本文だけ', 'fallback'), {id: null, title: 'fallback'});
});

test('builds one episode payload instead of an all-episode bundle', async () => {
  const content = await buildNovelEpisode({
    rootDir: '/source',
    workId: 'work-a',
    chapter: {id: 'C01', title: '章'},
    episode: {id: 'E01', title: '話', path: 'episode.md'},
    readFile: async relativePath => { assert.equal(relativePath, 'episode.md'); return '# ［E01］ 話\n\n本文'; },
  });
  assert.deepEqual(content, {format: 'novel', workId: 'work-a', episodeId: 'E01', title: '話', chapterId: 'C01', chapterTitle: '章', html: '<p>本文</p>'});
});
