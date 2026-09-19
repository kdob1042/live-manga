export type PublicationFormat = 'novel' | 'manga';

export type PublicationEpisode = {
  episodeId: string;
  title: string;
  chapterId: string | null;
  chapterTitle: string | null;
  releaseAt: string | null;
  locked: boolean;
  href: string;
};

export type PublicationFormatEntry = {
  format: PublicationFormat;
  episodes: PublicationEpisode[];
};

export type PublicationWork = {
  workId: string;
  title: string;
  description: string;
  formats: PublicationFormatEntry[];
};

export type PublicationCatalog = {
  schemaVersion: 'publication/v1';
  environment: 'production' | 'dev';
  works: PublicationWork[];
};

export type ViewerRoute =
  | {kind: 'library'}
  | {kind: 'work'; workId: string}
  | {kind: 'episode'; workId: string; format: PublicationFormat; episodeId: string}
  | {kind: 'unknown'};

const ID = '[a-zA-Z0-9:_-]{1,128}';

export function parseViewerRoute(pathname: string): ViewerRoute {
  const value = pathname.replace(/\/+$/, '') || '/';
  if (value === '/') return {kind: 'library'};
  const work = new RegExp(`^/works/(${ID})$`).exec(value);
  if (work) return {kind: 'work', workId: work[1]};
  const episode = new RegExp(`^/works/(${ID})/(novel|manga)/(${ID})$`).exec(value);
  if (episode) return {kind: 'episode', workId: episode[1], format: episode[2] as PublicationFormat, episodeId: episode[3]};
  return {kind: 'unknown'};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validatePublicationCatalog(value: unknown): PublicationCatalog {
  if (!isRecord(value) || value.schemaVersion !== 'publication/v1' || !Array.isArray(value.works)) {
    throw new Error('公開一覧の形式が不正です');
  }
  if (value.environment !== 'production' && value.environment !== 'dev') {
    throw new Error('公開環境の指定が不正です');
  }
  return value as unknown as PublicationCatalog;
}

export async function fetchPublicationCatalog(): Promise<PublicationCatalog> {
  const response = await fetch('/catalog.json', {
    headers: {Accept: 'application/json'},
    cache: 'no-cache',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(response.status === 404 ? '公開一覧がありません' : '公開一覧を取得できません');
  const text = await response.text();
  if (text.length > 1024 * 1024) throw new Error('公開一覧が大きすぎます');
  return validatePublicationCatalog(JSON.parse(text));
}

export function findWork(catalog: PublicationCatalog, workId: string) {
  return catalog.works.find(work => work.workId === workId) ?? null;
}

export function findEpisode(catalog: PublicationCatalog, workId: string, format: PublicationFormat, episodeId: string) {
  const work = findWork(catalog, workId);
  return work?.formats.find(item => item.format === format)?.episodes.find(episode => episode.episodeId === episodeId) ?? null;
}

export function formatLabel(format: PublicationFormat) {
  return format === 'novel' ? '小説' : '漫画';
}
