import React from 'react';
import {findWork, type PublicationCatalog} from './publication-client';
import {episodeHref, workHref} from './PublicationNav';

export default function EpisodeEnd({catalog, workId, episodeId}: {
  catalog: PublicationCatalog;
  workId: string;
  episodeId: string;
}) {
  const work = findWork(catalog, workId);
  const episodes = work?.formats.find(item => item.format === 'manga')?.episodes;
  const index = episodes?.findIndex(episode => episode.episodeId === episodeId) ?? -1;
  if (index < 0 || !episodes) return null;
  const next = episodes[index + 1];
  return <nav className="episode-end" aria-label="読み終わったら">
    {next && !next.locked && <a className="episode-next" rel="next" href={episodeHref(workId, 'manga', next.episodeId)}>
      <span>次の話へ</span><strong>{next.title}</strong>
    </a>}
    {next?.locked && <p>続きは公開予定です。</p>}
    <a className="episode-back" href={workHref(workId)}>作品トップ</a>
  </nav>;
}
