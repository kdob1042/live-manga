export const PUBLICATION_SCHEMA = 'publication/v1';
export const PUBLICATION_FORMATS = new Set(['manga']);
export const IDENTIFIER = /^[a-zA-Z0-9:_-]{1,128}$/;

export function publicNovelUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function normalizeFormats(work) {
  if (Array.isArray(work.formats)) return work.formats;
  if (!isRecord(work.formats)) return [];
  return Object.entries(work.formats).map(([format, value]) => ({format, ...(isRecord(value) ? value : {})}));
}

function normalizeEpisode(work, format, episode) {
  if (!isRecord(episode)) throw new Error('Invalid publication episode');
  const episodeId = assertIdentifier(episode.episodeId ?? episode.id, 'episodeId');
  const releaseId = episode.releaseId == null ? null : assertIdentifier(episode.releaseId, 'releaseId');
  if (episode.releaseAt != null && (typeof episode.releaseAt !== 'string' || Number.isNaN(Date.parse(episode.releaseAt)))) {
    throw new Error(`Invalid releaseAt for ${work.workId}/${format}/${episodeId}`);
  }
  const state = episode.state ?? (episode.published === true ? 'published' : 'draft');
  if (!['draft', 'scheduled', 'published', 'stopped'].includes(state)) throw new Error('Invalid publication state');
  return {
    ...episode,
    workId: work.workId,
    format,
    episodeId,
    title: typeof episode.title === 'string' && episode.title.length ? episode.title : episodeId,
    chapterId: episode.chapterId == null ? null : assertIdentifier(episode.chapterId, 'chapterId'),
    chapterTitle: typeof episode.chapterTitle === 'string' ? episode.chapterTitle : null,
    releaseId,
    releaseAt: episode.releaseAt ?? null,
    state,
    approved: episode.approved === true,
    transferred: episode.transferred === true,
    announce: episode.announce === true,
  };
}

export function normalizePublicationCatalog(value, environment = 'production') {
  if (!isRecord(value) || value.schemaVersion !== PUBLICATION_SCHEMA || !Array.isArray(value.works)) {
    throw new Error('Invalid publication catalog');
  }
  if (value.environment != null && value.environment !== environment) throw new Error('Publication environment mismatch');
  const workIds = new Set();
  const entries = new Map();
  const works = value.works.map((rawWork) => {
    if (!isRecord(rawWork)) throw new Error('Invalid publication work');
    const workId = assertIdentifier(rawWork.workId ?? rawWork.id, 'workId');
    if (workIds.has(workId)) throw new Error(`Duplicate workId: ${workId}`);
    workIds.add(workId);
    if (typeof rawWork.title !== 'string' || !rawWork.title.length) throw new Error(`Invalid title for ${workId}`);
    const formats = normalizeFormats(rawWork).filter(format => format?.format !== 'novel').map((rawFormat) => {
      if (!isRecord(rawFormat) || !PUBLICATION_FORMATS.has(rawFormat.format) || !Array.isArray(rawFormat.episodes)) {
        throw new Error(`Invalid format for ${workId}`);
      }
      const episodeIds = new Set();
      const episodes = rawFormat.episodes.map((rawEpisode) => {
        const episode = normalizeEpisode({workId}, rawFormat.format, rawEpisode);
        if (episodeIds.has(episode.episodeId)) throw new Error(`Duplicate episodeId: ${workId}/${rawFormat.format}/${episode.episodeId}`);
        episodeIds.add(episode.episodeId);
        const key = publicationKey(workId, rawFormat.format, episode.episodeId);
        if (entries.has(key)) throw new Error(`Duplicate publication key: ${key}`);
        entries.set(key, episode);
        return episode;
      });
      return {format: rawFormat.format, episodes};
    });
    return {workId, title: rawWork.title, description: typeof rawWork.description === 'string' ? rawWork.description : '', novelUrl: rawWork.novelPublished === true ? publicNovelUrl(rawWork.novelUrl) : null, formats};
  });
  return {schemaVersion: PUBLICATION_SCHEMA, environment, generatedAt: value.generatedAt ?? null, works, entries};
}

export function publicationKey(workId, format, episodeId) {
  return `${workId}\u0000${format}\u0000${episodeId}`;
}

export function publicationDecision(entry, now = new Date(), environment = 'production') {
  if (!entry || !entry.releaseId || !entry.transferred) return {kind: 'hidden', reason: 'not-transferred'};
  if (environment === 'dev') return {kind: 'public', locked: false, devOnly: true};
  if (!entry.approved || entry.state === 'draft' || entry.state === 'stopped') {
    return {kind: 'hidden', reason: entry.state ?? 'not-approved'};
  }
  const releaseAt = entry.releaseAt == null ? null : Date.parse(entry.releaseAt);
  if (releaseAt != null && releaseAt > now.getTime()) {
    return entry.announce ? {kind: 'locked', locked: true, releaseAt: entry.releaseAt} : {kind: 'hidden', reason: 'scheduled'};
  }
  return {kind: 'public', locked: false};
}

export function publicCatalog(catalog, now = new Date()) {
  const works = [];
  for (const work of catalog.works) {
    const formats = [];
    for (const format of work.formats) {
      const episodes = [];
      for (const entry of format.episodes) {
        const decision = publicationDecision(entry, now, catalog.environment);
        if (decision.kind === 'hidden') continue;
        episodes.push({
          episodeId: entry.episodeId,
          title: entry.title,
          chapterId: entry.chapterId,
          chapterTitle: entry.chapterTitle,
          releaseAt: decision.kind === 'locked' ? entry.releaseAt : null,
          locked: decision.kind === 'locked',
          href: `/works/${entry.workId}/${entry.format}/${entry.episodeId}`,
        });
      }
      if (episodes.length) formats.push({format: format.format, episodes});
    }
    if (formats.length) works.push({workId: work.workId, title: work.title, description: work.description, ...(work.novelUrl ? {novelUrl: work.novelUrl} : {}), formats});
  }
  return {schemaVersion: PUBLICATION_SCHEMA, environment: catalog.environment, works};
}

export function findPublication(catalog, workId, format, episodeId) {
  return catalog.entries.get(publicationKey(workId, format, episodeId)) ?? null;
}

export function findPublicationByRelease(catalog, releaseId, format = 'manga') {
  return [...catalog.entries.values()].find(entry => entry.releaseId === releaseId && entry.format === format) ?? null;
}

export function parsePublicationRoute(pathname) {
  const value = pathname.replace(/\/+$/, '') || '/';
  const work = new RegExp(`^/works/(${IDENTIFIER.source.slice(1, -1)})$`).exec(value);
  if (work) return {kind: 'work', workId: work[1]};
  const content = new RegExp(`^/works/(${IDENTIFIER.source.slice(1, -1)})/(manga)/(${IDENTIFIER.source.slice(1, -1)})(?:/(manifest\\.json|assets/([a-f0-9]{64}\\.(?:png|jpg|webp|mp4))))?$`).exec(value);
  if (!content) return null;
  return {kind: 'episode', workId: content[1], format: content[2], episodeId: content[3], resource: content[4] ?? null, asset: content[5] ?? null};
}
