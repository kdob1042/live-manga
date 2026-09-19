import {promises as fs} from 'node:fs';
import path from 'node:path';
import {buildNovelEpisode} from '../src/novel-markdown.mjs';

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

const manifestPath = value('--manifest');
const episodeId = value('--episode');
const outputPath = value('--output');
if (!manifestPath || !episodeId || !outputPath) {
  console.error('Usage: node scripts/build-novel-episode.mjs --manifest <path> --episode <id> --output <path>');
  process.exit(2);
}

const absoluteManifest = path.resolve(manifestPath);
const rootDir = path.dirname(absoluteManifest);
const manifest = JSON.parse(await fs.readFile(absoluteManifest, 'utf8'));
const chapters = Array.isArray(manifest.chapters) ? manifest.chapters : [];
let found = null;
for (const chapter of chapters) {
  const episode = Array.isArray(chapter.episodes) ? chapter.episodes.find(item => item.id === episodeId) : null;
  if (episode) { found = {chapter, episode}; break; }
}
if (!found) throw new Error(`話が見つかりません: ${episodeId}`);
const workId = manifest.work?.workId ?? manifest.work?.slug;
if (typeof workId !== 'string' || !workId) throw new Error('manifest.jsonの作品IDが不正です');
const content = await buildNovelEpisode({
  rootDir,
  workId,
  chapter: found.chapter,
  episode: found.episode,
  readFile: (relativePath, baseDir) => fs.readFile(path.resolve(baseDir, relativePath), 'utf8'),
});
const output = path.resolve(outputPath);
await fs.mkdir(path.dirname(output), {recursive: true});
await fs.writeFile(output, JSON.stringify(content, null, 2) + '\n');
console.log(`Built one novel episode: ${episodeId}`);
